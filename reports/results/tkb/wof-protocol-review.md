# TKB WOF: документальный протокол и границы одного initial debit

**Контекст:** `research/tkb-wof`, исходная ревизия `0c8bda0ec8912a3dc0aa0e19861234833ca2f958`. Read-only анализ банка; сетевых/финансовых вызовов этот review не выполнял. Значения карты, credentials, токенов, HTTP-тел и URL не сохранялись в отчёт. Документы читались через локальные очищенные копии с сохранением нумерации строк; raw Postman разбирался только приватным локальным парсером, наружу выводились имена полей, типы и структурные токены.

## 1. Главное для isolated harness

- **Документально подтверждён endpoint** `POST /api/v1/card/unregistered/debit/wof`: заявка по реквизитам карты без формы TKB PAY, форма мерчанта. Это не `/debit` (банковская форма), не `no3ds`, не hold и не 3DS2 finish. Источники: [индекс:83–84](<../../../../.audit-local/bank-review/doc-07.txt#L83-L84>), [очищенное описание Postman:59–61](<../../../../.audit-local/bank-review-safe/postman-descriptions-and-token-shape.txt#L59-L61>).
- **Полной актуальной WOF-таблицы обязательности/типов и response schema в поставке нет.** Поэтому точный «минимальный документированный WOF request» не восстановлен: ниже точная форма банковского **образца**, а не выдуманная required schema. В decoded docs 03–06 описаны bank-hosted debit-варианты, не WOF.
- Для единственного согласованного initial debit сумма **100 копеек = 1 RUB**; использовать новое `extId`. Уникальный ID сам по себе не доказывает идемпотентность. При неизвестном исходе не повторять WOF, не переключать endpoint/банк и не создавать fallback оплату.
- HTTP 200, код 0, `OrderId`, наличие ссылки или успешный Hello **не доказывают финальное списание**. Общий протокол банка отделяет приём заявки от получения финального статуса: [общие сведения:20–24](<../../../../.audit-local/bank-review/doc-02.txt#L20-L24>).

## 2. Точная WOF shape: что действительно видно

Postman request `RegisterOrderFromUnregisteredCardWOF`, source-line **2340**: [структура:182–186](<../../../../.audit-local/bank-review/postman-structure.txt#L182-L186>). Приватный структурный разбор установил **вложенный** `CardInfo`, а не плоские карточные поля: [токены:63–75](<../../../../.audit-local/bank-review-safe/postman-descriptions-and-token-shape.txt#L63-L75>).

| Wire path в банковском образце | Образец типа, без значений | Ограничение доказательства |
|---|---|---|
| `ExtId` | string | Уникальный идентификатор операции мерчанта; не гарантия безопасного replay |
| `Amount` | JSON number | Образец WOF числовой; актуальные debit-таблицы задают `long`, копейки |
| `Description` | string | Присутствует в WOF образце; необязателен в bank-hosted таблицах, но WOF required/optional не представлен |
| `CardInfo` | object | Карточные поля находятся внутри него |
| `CardInfo.CardNumber` | string | Только предоставленная тестовая карта, значение не выводить |
| `CardInfo.CardHolder` | string | Обязательность для WOF не установлена; не переносить исключение из другого метода |
| `CardInfo.ExpirationYear` | unquoted Postman variable placeholder | Сначала интерполировать; формат/тип года в актуальной WOF таблице неизвестен |
| `CardInfo.ExpirationMonth` | unquoted Postman variable placeholder | Сначала интерполировать; формат/тип месяца в актуальной WOF таблице неизвестен |
| `CardInfo.CVV` | JSON number | WOF образец числовой, Check3ds образец строковый: актуальный контракт типа отсутствует; не терять ведущие нули |

**Практическая минимальная кандидатная форма:** `extId`, `amount`, `cardInfo` с перечисленными пятью карточными полями. Если требуется наиболее близкий к банковскому образцу, а не доказанно минимальный request — оставить также безопасный `description`. Удаление `description` и любого карточного поля не доказано WOF-документом; не делать дополнительные денежные пробы только ради проверки optionality. Параметры receipt/receiver/MCC/маршрутизации/3DS-свидетельств в данный initial sample не добавлены.

**Единицы и casing 2026:** актуальные debit-таблицы дают `extId: string`, `amount: long`, сумму в копейках: [doc-03:25–36](<../../../../.audit-local/bank-review/doc-03.txt#L25-L36>), [doc-04:26–37](<../../../../.audit-local/bank-review/doc-04.txt#L26-L37>), [doc-05:25–36](<../../../../.audit-local/bank-review/doc-05.txt#L25-L36>), [doc-06:25–36](<../../../../.audit-local/bank-review/doc-06.txt#L25-L36>). Changelog **13.07.2026**: case-sensitive inputs особо отмечены только в `GetTransactList`, `PaymentOrderReport`, `SbpCheck`, `SbpConfirm`, `GetTicket`; остальные case-insensitive inputs приведены к **lowerCamelCase**, типы примеров исправлены по таблицам: [doc-01:26–42](<../../../../.audit-local/bank-review/doc-01.txt#L26-L42>). Это объясняет старые `ExtID`/`ExtId`/`Amount` в Postman, но не создаёт отсутствующую WOF-таблицу. Пример canonical карточных имён: `cardInfo.cardNumber`, `cardInfo.cardHolder`, `cardInfo.expirationYear`, `cardInfo.expirationMonth`; canonical написание аббревиатуры CVV и её тип непосредственно не показаны текущим WOF документом.

**Transport/signing:** POST JSON UTF-8; точные заголовки `TCB-Header-Login`, `TCB-Header-Sign` регистрозависимы; Base64(HMAC-SHA1) от **точных передаваемых байт JSON**, не от повторно сериализованного/нормализованного объекта: [doc-02:26–35](<../../../../.audit-local/bank-review/doc-02.txt#L26-L35>), [doc-08:21–30](<../../../../.audit-local/bank-review/doc-08.txt#L21-L30>). Подпись после интерполяции всех переменных. Принимать дополнительные response поля; банк предупреждает об их динамическом добавлении: [doc-02:16–18](<../../../../.audit-local/bank-review/doc-02.txt#L16-L18>).

## 3. Legacy и 3DS2 — разные семейства, без придуманной развилки

| Семейство | Подтверждённые пути/shape | Что НЕ подтверждено |
|---|---|---|
| Initial merchant-form WOF | `/api/v1/card/unregistered/debit/wof` | Какой ответ требует ACS; response field names; допустимость немедленного no-challenge debit |
| Legacy WOF continuation | `/api/v1/card/unregistered/debit/wof/finish`; sample `ExtId`, `md`, `paRes` | Полный ACS redirect/POST контракт исходного WOF ответа |
| Legacy специализированные finish | `/api/v1/card/unregistered/debit/wof/aft/finish`, `/wof/ecom/finish`; sample `ExtId`, `md`, `paRes` | Как выбирать AFT/ECOM на этом merchant/terminal |
| 3DS2 Check3ds | `/api/v1/card/unregistered/debit/3ds2check/storecard`; `ExtID`, `Amount`, nested `CardInfo`, `High_end_fee` в образце | Check response schema, BIN result enum, cardRefId обязательность/условия, повтор/сохранение карты |
| 3DS2 Authenticate3ds | `/api/v1/card/unregistered/debit/3ds2Authenticate`; `ExtID`, `ForceGate`, `AuthenticateInfo`, `Amount`, `CardInfo.CardRefId` | Значения branch/frictionless/challenge, Method URL, транзакционные ID/значения NotificationURL |
| 3DS2 Validate3ds | `/api/v1/card/unregistered/debit/3ds2Validate`; `ExtID`, `cRes`, `Amount`, `ForceGate`, `CardInfo.CardNumber` | Условия вызова/пропуска, cRes format/verification, result schema |
| 3DS2 financial finish | `/api/v1/card/unregistered/debit/3ds2/wof/finish`; `ExtId`, `Amount`, `ForceGate`, `Description`, `AuthenticationData.{Status,AuthenticationValue,DsTransID,Eci}`, `CardInfo.CardRefId`, `High_end_fee` | Auth status enum, допустимые ECI, происхождение и верификация proof, final debit status |

Пути: [индекс:71–108](<../../../../.audit-local/bank-review/doc-07.txt#L71-L108>). Legacy shape: [Postman:146–162](<../../../../.audit-local/bank-review/postman-structure.txt#L146-L162>); 3DS2 shape: [Postman:230–252](<../../../../.audit-local/bank-review/postman-structure.txt#L230-L252>), [очищенные типы/вложенность:28–79](<../../../../.audit-local/bank-review-safe/postman-topology.txt#L28-L79>).

`AuthenticateInfo` в образце содержит `BrowserInfo.{IP,AcceptHeader,JavaEnabled,Language,ColorDepth,ScreenHeight,ScreenWidth,TZ,UserAgent}`, `ChallengeWindowSize`, `ThreeDSCompInd`, `NotificationURL`, `ThreeDSServerTransID`. Это перечень входов, **не руководство по выбору значений**. Не подставлять выдуманные challenge/auth status, ECI, proof или успешные enums. Индекс называет проверку BIN, сбор auth информации, валидацию, списание, но **не задаёт точную последовательность/условия ветвления**. Полный frictionless/challenge/3DS Method протокол в поставке отсутствует.

Индекс отдельно говорит, что legacy `/wof/finish` — завершение **только** initial `/wof`: [doc-07:75–76](<../../../../.audit-local/bank-review/doc-07.txt#L75-L76>). Поэтому наличие 3DS2 endpoints не разрешает автоматически переключить уже начатую WOF-операцию на 3DS2 семейство. Остановиться на неизвестной развилке и получить конкретный банковский протокол/свидетельство.

**Postman traps:** `ForceGate` в Check3ds — commented field, хотя regex inventory ошибочно включает его; expiry — unquoted templates, Authenticate пример имеет trailing comma. Эти образцы нельзя буквально отправлять как готовый strict JSON. Authenticate/Validate используют literal hosts, не наследовать их как sandbox адрес: [facts:25–28](<../../../../.audit-local/bank-review/postman-facts.txt#L25-L28>). Активные prerequest scripts печатают secret/body; не исполнять/копировать: [facts:1,5–6,26–27](<../../../../.audit-local/bank-review/postman-facts.txt#L1-L27>).

## 4. Optional receipt, receiver, MCC/AFT risks

- **Receipt:** в bank-hosted tables `cartPositions` не указан → чек агенту ОФД не отправляется; `ofdParameters`/`taxationSystem` условно обязательны при отправке ОФД и зависят от ФФД 1.05/1.2: [doc-03:52–69,95–98](<../../../../.audit-local/bank-review/doc-03.txt#L52-L98>), аналогично docs 04–06. Changelog подтверждает такие условия для **3DS2 finish** и ряда legacy finish с 03.10.2025: [doc-01:399–413](<../../../../.audit-local/bank-review/doc-01.txt#L399-L413>). Не переносить всю эту схему в initial WOF без его таблицы. Омиссия в исследовательском test-only request не является утверждением юридической необязательности чека.
- **Receiver/AFT:** текущие bank-hosted docs делают `toCardNumber`, `paymentIdentifier`, `receiverPhone`, `receiverCountry`, `receiverSwift`, `receiverIban` условными для AFT; конкретные сочетания зависят от получателя. Для обычного domestic AFT одновременно `toCardNumber` и `paymentIdentifier` запрещены: [doc-03:70–105](<../../../../.audit-local/bank-review/doc-03.txt#L70-L105>), [doc-06:94–106](<../../../../.audit-local/bank-review/doc-06.txt#L94-L106>).
- **Важное расхождение с Postman:** changelog добавил в **initial WOF** `ToCardNumber`, `PaymentIdentifier`, `ReceiverCountry` с **08.12.2025**, а из `DebitFinishAFT`/`RegisterOrderFromCardFinish` удалил receiver ID fields; exclusivity действует с **01.12.2025**: [doc-01:241–255](<../../../../.audit-local/bank-review/doc-01.txt#L241-L255>). Старое AFT-finish описание Postman допускает оба с приоритетом одного — оно устарело: [описание:17–32](<../../../../.audit-local/bank-review-safe/postman-descriptions-and-token-shape.txt#L17-L32>).
- **MCC/terminal:** документация не задаёт MCC request field, MCC значения/классификатор AFT-vs-ECOM для этого merchant/terminal и его права. Не изобретать MCC, receiver data и маршрутизацию. Присутствие endpoint не подтверждает разрешение вызова: [doc-02:24–25](<../../../../.audit-local/bank-review/doc-02.txt#L24-L25>). Отсутствие receiver полей в образце 2025 года не доказывает их необязательность для конкретной WOF AFT операции в 2026 году.
- **Fees/routing:** `High_end_fee` в старом описании разрешён только при дополнительном соглашении с банком: [описание:16,28](<../../../../.audit-local/bank-review-safe/postman-descriptions-and-token-shape.txt#L16-L28>). Не добавлять `ForceGate`/`High_end_fee` «чтобы прошло».

## 5. Что можно считать response evidence

| Наблюдение | Допустимая интерпретация |
|---|---|
| Hello HTTP200/code0/эхо | Настройка/аутентификация этого служебного вызова; не WOF permission и не финансы |
| Initial HTTP200/code0, `ExtId`/`OrderId`, accepted response | Приём/регистрация запроса, если конкретное поле это документирует; **не** финальный дебит |
| Redirect/ACS/3DS/auth proof | Возможная необходимость клиентского действия/аутентификация; **не** финальное финансовое доказательство |
| Полученный status/callback | Кандидат authoritative bank evidence **только** с банковским определением его значения/финальности, привязкой к той же операции и проверенной аутентичностью |
| Timeout, malformed ответ, неизвестный enum/branch, нет финального подтверждения | `unknown`/`INCONCLUSIVE`; запрещён повтор денежного запроса и новый маршрут |

**Доступный документальный статус-канал:** `POST /api/v1/order/state` (`GetOrderState`), образец input `ExtID: string`: [индекс:37–38](<../../../../.audit-local/bank-review/doc-07.txt#L37-L38>), [Postman:62–66](<../../../../.audit-local/bank-review/postman-structure.txt#L62-L66>). По одной операции **не чаще одного раза в минуту**: [facts:2–4](<../../../../.audit-local/bank-review/postman-facts.txt#L2-L4>). Callback тоже назван банком, но его signing/verification protocol не поставлен.

**Отсутствует:** актуальная WOF response schema, `OrderInfo`/`OrderAdditionalInfo` status dictionary, перечень финальных debit success/failure enums, критерий финансовой финальности, callback trust protocol, documented idempotency. Changelog лишь фиксирует изменение status payload в январе 2026 и дополнительных параметров: [doc-01:147–176](<../../../../.audit-local/bank-review/doc-01.txt#L147-L176>). В Postman **120 requests / 0 saved responses**: [facts:1](<../../../../.audit-local/bank-review/postman-facts.txt#L1>). Нет основания объявлять какой-либо выдуманный auth/status enum успешным или окончательным. Статус-lookup этого subagent **NOT_RUN**.

## 6. Источники и итог проверки

Все восемь decoded документов проверены: [01 — changelog](<../../../../.audit-local/bank-review/doc-01.txt>), [02 — общие сведения](<../../../../.audit-local/bank-review/doc-02.txt>), [03 — bank-hosted unregistered debit](<../../../../.audit-local/bank-review/doc-03.txt>), [04 — registered debit with fee](<../../../../.audit-local/bank-review/doc-04.txt>), [05 — unregistered debit with fee](<../../../../.audit-local/bank-review/doc-05.txt>), [06 — registered debit](<../../../../.audit-local/bank-review/doc-06.txt>), [07 — индекс методов](<../../../../.audit-local/bank-review/doc-07.txt>), [08 — onboarding/Hello](<../../../../.audit-local/bank-review/doc-08.txt>). Frontend-референсы не использовались как доказательство серверного wire-контракта; их наличие не заменяет банковскую методную таблицу.

- **PASS (documentary only):** WOF endpoint, nested sample shape, отличие legacy от 3DS2 families, байтовая HMAC подпись, копейки/long в актуальных debit таблицах, 2026 casing, ограничение status polling.
- **INCONCLUSIVE:** истинно минимальные WOF required fields/types, конкретная branch protocol, WOF response/final status semantics, MCC/AFT/terminal rights и replay guarantees.
- **NOT_RUN:** все network, auth/ACS и финансовые проверки этим subagent. Из исходных/current документов ничего не изменено; выводы не заменяют банковскую верификацию.
