# TKB / bank reference review: документированные возможности и безопасная проверка

**Дата:** 2026-10-09 (UTC). **Ветка:** research/initial-audit. **Исходная ревизия:** 97784b9d69e5f7ce347f84429f69bacc5872cbf0.
**Уровень доказательств:** независимое статическое чтение предоставленных материалов; банковские и браузерные E2E — **NOT_RUN**.
**Конфиденциальность:** отчёт содержит только выводы, имена методов/полей и указатели. Исходники банка, исходные MIME/JSON, декодированные документы и полные ответы **не предназначены для Git или публикации**. Локальные ссылки ниже доступны только владельцу материалов.

## 1. Результат и пределы доказательства

1. **DOCS_CONFIRMED:** TKB документирует банковскую форму, WOF с формой мерчанта, ветки 3DS2, hold/capture/reversal/refund, привязку и списание по сохранённой карте. Это не подтверждает доступ какого-либо метода конкретному merchant/terminal.
2. **NOT_RUN:** работоспособность WOF, frictionless/challenge, финальное списание, освобождение остатка холда, возвраты, идемпотентный повтор и достоверность callback. Ни наличие запроса в коллекции, ни код UI не являются испытанием.
3. **Статически обнаружены блокеры переноса:** логирование signing secret и resolved request body в Postman; полный введённый номер в URL quote и Faro; возможность сетевого capture тел/iframe в OpenReplay; передача PAN/CVC на обычный frontend API; browser tokens в общем localStorage. Нельзя копировать эти пути в новую архитектуру.
4. **Версионный разрыв:** коллекция именуется v11042025, а один из восьми документов является журналом изменений до июля 2026. Правила полей и обязательности менялись после коллекции. Профиль правильно сохраняет unknown, но не заменяет актуальную спецификацию терминала.
5. **UNKNOWN остаётся UNKNOWN:** исходная операция может быть отправлена при timeout/HTTP 500. Нельзя повторять денежную команду, менять банк/direct на provider или начинать новый дочерний Payment, пока эффект не исключён достоверным источником.
6. Референсы — три frontend-проекта. Реализация server handlers Payment Core/j-pay-form, серверного 3DS orchestration, подписанных callbacks и финансового ledger **не предоставлена в этих каталогах**. Исследованы вызываемые серверные точки, не их исполнение.
7. BR-07 требует собственный ввод карты через разрешённый direct хотя бы одного банка. Брендированный выбор + банковский ввод карты — ограниченный fallback/пилот, не закрытие BR-07: [решение BR-07](<../../../docs/current/payment-processing-decisions-v1.1.md#L203-L213>).

### Обозначения

- **DOCS_CONFIRMED** — буквально документирован метод/поле/назначение, без утверждения о реализации.
- **STATIC_OBSERVED** — наблюдение по прочитанному исходнику/локальному разбору JSON.
- **UNKNOWN** — в предоставленном наборе недостаточно контракта или доказательств.
- **NOT_RUN** — практическая проверка не выполнялась. **PASS/FAIL статической проверки не относятся к банку.**

## 2. Источники и полное покрытие восьми MIME-документов

Прочитаны [AGENTS](<../../../AGENTS.md>), [профиль TKB](<../../../docs/current/tkb-connector-profile-v0.2.yaml>), [checkout design](<../../../docs/current/payment-checkout-design-v0.2.md>), [comparative review](<../../../docs/research/checkout-forms-comparative-review-v1.md>), [TASK-001](<../../../tasks/001-tkb-wof-3ds.md>), контекст handoff и [вопросы TKB](<../../../handoff/TKB_OPEN_QUESTIONS.md>). Приоритет бизнес-норм выше старого исследовательского текста; current не изменялся.

Все восемь .doc распознаны как **multipart/related MHTML/mail MIME**, с одной HTML-частью UTF-8, а не бинарный Word DOC. Локально выполнено email.parser.BytesParser + MIME transfer decoding (включая quoted-printable) + lxml HTML extraction. Удалены script/style/head/iframe, сохранены границы таблиц; значения примеров удалены, идентификаторы/номера/контакты маскированы. Производные **только вне репозитория**, в локальном audit-каталоге. Успех конвертации не означает правильности банковского протокола.

| ID | Исходник (приватный) и прочитанные разделы | Локальная очищенная производная / покрытие |
|---|---|---|
| D1 | [Описание работы платежного шлюза](<../../../external-docs/tkb-docs/Описание+работы+платежного+шлюза.doc>): «Релизы документации», версии 2.25–2.35 и изменения 2026 | [doc-01](<../../../../.audit-local/bank-review/doc-01.txt>), 599/599 строк |
| D2 | [Общие сведения](<../../../external-docs/tkb-docs/Общие+сведения+по+использования+сервиса.doc>): принципы API, транзакционный сценарий, права, заголовки, подпись, Hello | [doc-02](<../../../../.audit-local/bank-review/doc-02.txt>), 44/44 |
| D3 | [RegisterOrderFromUnregisteredCard](<../../../external-docs/tkb-docs/Метод+RegisterOrderFromUnregisteredCard.doc>): описание, входы/выходы, ОФД и AFT-условия | [doc-03](<../../../../.audit-local/bank-review/doc-03.txt>), 208/208 |
| D4 | [RegisterOrderFromRegisteredCardFee](<../../../external-docs/tkb-docs/Метод+RegisterOrderFromRegisteredCardFee.doc>): hosted/CVV, комиссия плательщика, cardRefId/ean, входы/выходы | [doc-04](<../../../../.audit-local/bank-review/doc-04.txt>), 193/193 |
| D5 | [RegisterOrderFromUnregisteredCardFee](<../../../external-docs/tkb-docs/Метод+RegisterOrderFromUnregisteredCardFee.doc>): hosted, комиссия плательщика, возврат URL, входы/выходы | [doc-05](<../../../../.audit-local/bank-review/doc-05.txt>), 183/183 |
| D6 | [RegisterOrderFromRegisteredCard](<../../../external-docs/tkb-docs/Метод+RegisterOrderFromRegisteredCard.doc>): hosted/CVV, комиссия мерчанта, cardRefId/ean, TTL, входы/выходы | [doc-06](<../../../../.audit-local/bank-review/doc-06.txt>), 189/189 |
| D7 | [Операции платежного шлюза](<../../../external-docs/tkb-docs/Операции+платежного+шлюза.doc>): полный индекс информационных, WOF/3DS2, hold, refund, SBP, bind, recurrent, OFD и иных методов | [doc-07](<../../../../.audit-local/bank-review/doc-07.txt>), 229/229 |
| D8 | [Первичное подключение](<../../../external-docs/tkb-docs/Первичное+подключение+к+платежному+шлюзу.doc>): заголовки, HMAC, выдача доступа, Hello | [doc-08](<../../../../.audit-local/bank-review/doc-08.txt>), 51/51 |

Проверена непрерывность read: следующий offset = последняя возвращённая строка + 1 до totalLines. Исходный HTML содержит ссылки на другие страницы/диаграммы — **эти ссылки не означают, что полные связанные документы предоставлены или прочитаны**. В частности, D7 — индекс, D1 — changelog; полноценные страницы Check3ds/Authenticate3ds/Validate3ds/GetOrderState/Refund/HoldConfirm не входят в восемь отдельных detail-страниц.

[Исходный environment](<../../../external-docs/tkb-postman/104178.postman_environment.json>) содержит configured login/secret; значений нет в отчёте. Postman разобран **локально**, без вывода сырых environment/collection. Получено **120 request entries, 0 saved response entries** (включая дополнительные/непрофильные папки, а не 120 подтверждённых TKB capabilities). [Очищенная карта](<../../../../.audit-local/bank-review/postman-structure.txt>) содержит HTTP-методы, пути без host, имена полей и исходные line refs; [факты/риски](<../../../../.audit-local/bank-review/postman-facts.txt>) — только редактированные фрагменты. [Environment structure](<../../../../.audit-local/bank-review/environment-structure.txt>) содержит имена login/secret/url/digest/ExtId и служебных переменных, не значения. Некоторые ключи различаются скрытым переводом строки; не переносить environment как production config.

### 2.1. Transport и версия

- D2/D8 документируют HTTPS POST JSON UTF-8, заголовки TCB-Header-Login / TCB-Header-Sign, HMAC-SHA1 по **байтам передаваемого JSON**, затем Base64. Заголовки TCB… регистрозависимы. Подписывать фактически отправленные байты, а не повторно сериализованный объект. Это documentary-only; тест в этой работе не выполнялся.
- Приём заявки — отдельный шаг от финального статуса: [D2, общий сценарий](<../../../../.audit-local/bank-review/doc-02.txt#L19-L25>). Требуются права на методы; endpoint != разрешение.
- [D1, изменения июля 2026](<../../../../.audit-local/bank-review/doc-01.txt#L26-L43>) сообщает lowerCamelCase для большинства входов и отдельную регистрозависимость GetTransactList, PaymentOrderReport, SbpCheck, SbpConfirm, GetTicket. Это не разрешает самостоятельно менять wire-регистр на основании старых примеров.
- D3–D6 описывают extId/amount/cardRefId/ean на входе и ExtId/OrderId/FormUrl на выходе. Коллекция содержит ExtID/ExtId, Amount/amount, CardRefID/CardRefid и другие варианты. Нужно получить schema **для согласованной версии endpoint/терминала**, а не выбрать случайный пример.
- [D1, поздние изменения](<../../../../.audit-local/bank-review/doc-01.txt#L241-L255>) затрагивают WOF receiver/AFT-поля; [ОФД](<../../../../.audit-local/bank-review/doc-01.txt#L399-L413>) — условную обязательность фискальных параметров. Не распространять AFT/P2P-условия на ECOM за собственные товары: D3–D6 explicitly выделяют AFT. Новые продукты не добавлять без решения.

## 3. Карта основных методов: docs, запросы, неизвестное

В таблице пути и поля — **только структура из документов/коллекции**, не готовый исполняемый контракт. В коллекции встречаются JSON-with-comments/невалидные примеры: field inventory может включать закомментированные поля и не устанавливает их обязательность; проверенные вложенные пути берутся только из локально распарсенных примеров. Для всех строк terminal rights и runtime result = UNKNOWN / NOT_RUN. Ссылки P ведут к исходной приватной коллекции на строку **имени метода**, установленную локальным разбором; вывод JSON-значений запрещён.

| Возможность / метод | HTTP path / структура запроса | Источник и предел |
|---|---|---|
| Hello | POST /api/tcbpay/gate/hello; inputString | D8 «Метод Hello», [очищенный раздел](<../../../../.audit-local/bank-review/doc-08.txt#L36-L51>); нефинансовый тест интеграции, также требует допуска |
| Hosted debit: RegisterOrderFromUnregisteredCard | POST /api/v1/card/unregistered/debit; extId, amount; returnUrl, ttl и прочие условные поля | D3; [P debit](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L1736>); возвращает FormUrl/OrderId/ExtId, не факт оплаты |
| Hosted registered debit | POST /api/v1/card/registered/debit; cardRefId или ean, extId, amount | D6; [P registered](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L1394>); уже заполненная карта, CVV вводится покупателем, при необходимости 3DS |
| Fee hosted debit (registered / unregistered) | POST /api/v1/card/{registered,unregistered}/debit/with/fee | D4/D5; [P registered fee](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2084>), [P unregistered fee](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2170>); комиссия с плательщика не правило нашего продукта по умолчанию |
| RegisterOrderFromUnregisteredCardWOF | POST /api/v1/card/unregistered/debit/wof; ExtId, Amount, Description, CardInfo.{CardNumber,CardHolder,ExpirationYear,ExpirationMonth,CVV} | D7 «Операции погашения»; [P WOF](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2340>); direct PAN, PCI contour обязательный, возможные late changes D1 |
| Legacy WOF finish | POST /api/v1/card/unregistered/debit/wof/finish; ExtId, md, paRes | D7 завершение **только** WOF debit; [P finish](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2000>); отдельные aft/finish и ecom/finish [P AFT](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L1830>), [P ECOM](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L1915>); не смешивать |
| Check3ds | POST /api/v1/card/unregistered/debit/3ds2check/storecard; ExtID, Amount, CardInfo, High_end_fee, ForceGate | D7 3DS2: BIN involvement; [P check](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3017>). Название «BIN check» **не значит**, что запрос не содержит PAN/CVV: пример содержит CardInfo |
| Authenticate3ds | POST /api/v1/card/unregistered/debit/3ds2Authenticate; AuthenticateInfo.{BrowserInfo,ChallengeWindowSize,ThreeDSCompInd,NotificationURL,ThreeDSServerTransID}, CardInfo.CardRefId и другие поля | D7 сбор/передача auth data; [P auth](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3103>); literal host в коллекции, не переносить в sandbox |
| Validate3ds | POST /api/v1/card/unregistered/debit/3ds2Validate; ExtID, cRes, Amount, ForceGate, CardInfo.CardNumber | D7 валидация; [P validate](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3182>); literal host, response/status schema отсутствует |
| DebitUnregisteredCard3ds2WofFinish | POST /api/v1/card/unregistered/debit/3ds2/wof/finish; ExtId, Amount, AuthenticationData.{Status,AuthenticationValue,DsTransID,Eci}, CardInfo.CardRefId и др. | D7 финкоманда debit; [P 3DS2 finish](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3261>); результаты аутентификации не генерировать самостоятельно |
| Hold / hosted hold | POST /api/v1/card/unregistered/hold/register (CardInfo), /hold/form; registered /api/v1/card/registered/hold/form | D7 холдирование; [P Hold](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2437>), [P hosted](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2528>), [P registered hold](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2613>) |
| HoldFinish / Hold3Ds2.0 | POST /api/v1/card/unregistered/hold/register/finish (md,paRes); /hold/register/3ds2/finish (AuthenticationData,CardInfo.CardRefId) | D7; [P hold finish](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2859>), [P hold 3DS2](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3337>) |
| HoldConfirm / HoldReversal | POST /api/v1/card/unregistered/hold/confirm/partial (amount,ExtId); /hold/reversal/partial (ExtID,Amount) | D7; [P capture](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2784>), [P void](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2934>); partial URL не доказывает multicapture или освобождение остатка |
| Refund / Reverse | POST /api/v1/card/unregistered/debit/refund (ExtId исходного платежа,amount); /debit/reverse (ExtId исходного платежа) | D7; [P refund](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3508>), [P reverse](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3582>); регистрируют заявки, не доказывают финальный возврат |
| GetOrderState / GetOrders | POST /api/v1/order/state (ExtID); /api/v1/order/getorders (extId) | D7; [P state](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L708>), [P related orders](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L1227>); status dictionary/not_found finality не предоставлены |
| Bind / BindLite / Unbind | /api/v2/card/unregistered/bind/wof с/без CardInfo; /api/v1/card/unregistered/bindlite; /bindlitewof; /unbind (CardRefId) | D7 «Регистрация карты»; [P universal WOF](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L5089>), [P lite](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L5174>), [P lite WOF](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L5258>), [P unbind](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L5342>); legacy /bind также есть, не считать версии взаимозаменяемыми |
| RegisterDirectOrderFromRegisteredCard / DirectAFT / DirectECOM | /api/v1/card/registered/direct, /direct/aft, /direct/ecom; amount,ExtId,CardRefID (варианты регистра) | D7 recurrent; [P direct](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L5423>), [P AFT](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L5507>), [P ECOM](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L5592>); нужен отдельный consent/MIT/terminal scope |
| SbpRegisterQR / SbpCheck / SbpConfirm | /api/v1/sbp/register/qrc (ExtId,Amount,Static,ExpirationMinutes,redirectUrl); /sbp/check; /sbp/confirm | D7 SBP; [P QR](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3662>), [P check](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3908>), [P confirm](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3991>). Dualstage SBP != карточный hold/capture |
| Реестры/сверка | GetTransactList /api/trans/gateway/pay; GetReportRegistry /api/v1/report/registry; statement/document методы | D7 информационные; [P list](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L850>), [P registry](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L1149>); D1 добавляет новые report-status/download версии в 2026, доступ/полнота сверки неизвестны |

Документированы также B2B/C2B subscription, OCT/P2P/AFT, выплаты по счетам, идентификация, карты/лимиты, ОФД и дополнительные приватные/Absolut/CAMWS запросы. Они входят в статический инвентарь, **не в утверждённый checkout scope и не в доказанную capability matrix**. Запросы /wof/no3ds, HoldNo3DS и MO/TO не предлагаются как обход 3DS или автоматический fallback.

## 4. WOF и 3DS: что восстановлено и чего нет

### 4.1. Hosted ≠ direct ≠ saved-card MIT

D3/D5 дают ссылку на банковский ввод реквизитов; D4/D6 дают заполненную банковскую форму, но требуют CVV и при необходимости 3DS. Это **customer-present** hosted flow, не доказательство бесконтактного MIT. WOF/merchant form документирован отдельно D7 и коллекцией с CardInfo. Документов hosted-fields/tokenization SDK в наборе не найдено: [профиль form_fields=unknown](<../../../docs/current/tkb-connector-profile-v0.2.yaml#L83-L96>) сохраняется.

D3/D6 документируют default TTL банковского заказа 30 минут. Это не TTL любого WOF/QR/hold, не TTL checkout token и не правило завершения PaymentIntent. returnUrl описан как передаваемый банку без изменения: trust/allowlist должны быть установлены нашей системой **до** отправки, а не предполагаться банковской санацией.

### 4.2. Кандидатная последовательность, не tested flow

1. Сервер фиксирует Payment, bank/mode/terminal и собственный operation reference; допускает WOF только через изолированный PCI contour.
2. По актуальному банковскому контракту выполняется Check3ds. В предоставленном примере он уже получает CardInfo; Core не должен выполнять его с PAN.
3. Если банк требует 3DS Method, UI исполняет ограниченное POST/iframe действие; browser completion indicator и correlation передаются **серверной** оркестрации.
4. Authenticate3ds использует документированные BrowserInfo/authentication поля. Возможны frictionless или ACS challenge — **точные условия и response schema UNKNOWN**.
5. При challenge браузер отправляет предоставленный банком creq; cRes/notification коррелируется и проверяется сервером. Validate3ds не должен принимать произвольное утверждение браузера об успехе.
6. Завершение debit или hold выполняется **соответствующим** finish endpoint и только валидными bank-authentication data. Последний вызов также может иметь unknown outcome.
7. Финальный результат получает Core из доверенного банковского state/callback/reconciliation; browser return/iframe onload/challenge completion != debit/refund success.

Порядок 2–6 — **гипотеза для восстановления из оригинального протокола**, не инструкция к запуску. Не выяснены protocol versions, обязательность method, таймеры, NotificationURL origin, форматы CardRefId/AuthenticationData, ветка un-enrolled, ключи/TTL корреляции, response codes, источник truth и ответственность 3DS Server.

Референс TKB реализует browser POST threeDSMethodData в hidden iframe и дополнительные gather/server POST: [load3DSIframe / V2](<../../../../reference-code/tkb-payform/src/shared/utils/3ds.ts#L157-L251>). Challenge form отправляет creq/threeDSSessionData: [redirectToAcsCreqUrl](<../../../../reference-code/tkb-payform/src/shared/utils/3ds.ts#L347-L377>). Это браузерный transport, не полный EMV 3DS Server, не ACS и не финансовая проверка.

## 5. Unknown, capture, refund, idempotency

| Тема | Документальное наблюдение | Безопасный вывод / необходимое доказательство |
|---|---|---|
| Accepted vs final | D2 разделяет получение заявки и финальный статус | Ни HTTP 2xx, ни FormUrl/OrderId не означают списание. Нужен authoritative status dictionary по типу операции |
| Timeout / 500 | Нет полного error/result контракта и response examples | После possible send — unknown; блокировка повторной команды и rerouting, выяснение исхода; техническая ошибка не является доказанным decline |
| extId | D3–D6: уникальный ID операции мерчанта; D1 обновлял описание | Не известно пространство уникальности, срок дедупликации, replay response, конкуренция, поведение одинакового ID с другой суммой. Уникальность != банковская идемпотентность |
| Lookup | Коллекция комментариями ограничивает одну операцию одним опросом в минуту: [safe extraction](<../../../../.audit-local/bank-review/postman-facts.txt#L2-L4>) | Это documentary/example restriction, не испытанный SLA. Нельзя транслировать frontend 1s polling в bank polling; not_found не считать финальным без письменной гарантии |
| Capture | HoldConfirm подтверждает ранее удержанные средства, принимает amount и ExtId; partial путь | Нужен единственный окончательный full/partial capture v1. Multicapture, автоматическое освобождение остатка, expiry и finality неизвестны. Коллекция описывает сроки холда как зависимости от MPS/торговой точки, не универсальный TTL |
| Void | HoldReversal отдельный от refund/reverse | Требуются final status и сумма реально освобождённых средств; decline/404 не доказывают release |
| Refund | Заявка full/partial; ExtId исходного платежа + amount, не отдельный refund ID | Не подтверждены отдельный bank refund reference, repeated partial refunds, конкуренция, итоговое состояние, cumulative limits. Нельзя ставить Refund.succeeded на acceptance |
| Reverse | Заявка отмены debit по исходному ExtId | Применимость до/после clearing и конкретный cutoff неизвестны; D1 changelog менял срок подачи заявки в 2026, но detail-контракта в наборе нет |
| Callback / reconciliation | D3–D6 упоминают Callback Service и GetOrderState; D7/D1 — реестры | Нет подтверждённой аутентичности callback, retry/order/duplicate правил, полноты и ссылок операций. Unverified callback не меняет деньги |
| Saved card | cardRefId/ean и direct методы существуют | Scope токена merchant/terminal/provider, revocation, storage, consent/MIT и переносимость неизвестны; hosted registered CVV flow не равно MIT |

Следствия для нового коннектора: durable dispatch_started до возможной отправки; собственные operation IDs и bank refs раздельно; serialize mutating действия; unknown на уровне **операции**, включая capture/refund/void; lookup с rate limiting; отсутствие автоматического replay до доказательства по каждому методу; состояние денег отдельно от состояния browser action. Это предложения безопасной реализации существующих BR, **не изменения current**.

## 6. Независимое ревью reference-code и связанных серверных точек

### 6.1. Карта вызываемых server endpoints

| Референс | Серверная точка и поля | Прямой источник |
|---|---|---|
| pyment-form | GET /core/v1/public/payment?id=…; POST /core/v1/public/payment_data, payment_details.{pan,month,year,cvv} | [API](<../../../../reference-code/pyment-form/src/Api/index.js#L4-L27>), [submit](<../../../../reference-code/pyment-form/src/Components/PaymentByCard/PaymentByCard.js#L62-L94>) |
| 3ds-fronend | GET /core/v1/public/3ds?id=…; response gateway_id/status/tds_data | [API](<../../../../reference-code/3ds-fronend/src/Api/index.js#L4-L12>), [App](<../../../../reference-code/3ds-fronend/src/App.js#L18-L40>) |
| payform_rest / tkb-payform | POST /payments/{orderIdentifier}/assign, BrowserInfo → status/message/orderIdentifier/orderId/accessToken | [assign](<../../../../reference-code/tkb-payform/src/api/fetch-token.ts#L35-L58>), [response type](<../../../../reference-code/tkb-payform/src/shared/types/api.ts#L7-L13>) |
| payform_rest / tkb-payform | GET /payments/{orderId}; POST /payments/{orderId}, cardsInfoRequest/googleId/fingerprintData | [status](<../../../../reference-code/tkb-payform/src/api/fetch-status.ts#L10-L18>), [submit](<../../../../reference-code/tkb-payform/src/api/submit-payment.ts#L5-L8>), [payload](<../../../../reference-code/tkb-payform/src/hooks/use-pay-form.ts#L96-L128>) |
| payform_rest / tkb-payform | GET /payments/{orderId}/3ds; union legacy/Method/challenge | [3ds](<../../../../reference-code/tkb-payform/src/api/get-3ds.ts#L5-L8>), [3DS types](<../../../../reference-code/tkb-payform/src/shared/types/api.ts#L69-L96>) |
| payform_rest / tkb-payform | GET /payments/{orderId}/quote?bin=… | [quote](<../../../../reference-code/tkb-payform/src/api/quote-info.ts#L5-L8>), [caller](<../../../../reference-code/tkb-payform/src/hooks/use-quote-info.ts#L66-L79>) |

Указанный j-pay-form API — из [README](<../../../../reference-code/tkb-payform/README.md#L73-L85>). [nginx config](<../../../../reference-code/tkb-payform/nginx.conf#L45-L53>) раздаёт SPA; это не финансовый backend. По предоставленным каталогам/поиску не найдено server реализации этих методов. Нельзя проверить серверную авторизацию, схему сумм, антифрод, callback verification, real bank retries или ledger только чтением UI.

### 6.2. Что полезно как reference, а не готовое приложение

- pyment-form: компактная одноколоночная композиция, сумма/мерчант/заказ, переход фокуса PAN → expiry → CVV; [контейнер](<../../../../reference-code/pyment-form/src/Components/Container/container.module.css#L12-L26>), [форма](<../../../../reference-code/pyment-form/src/Components/PaymentByCard/PaymentByCard.js#L98-L123>). Перерисовать, не переносить её публичный PAN endpoint.
- 3ds-fronend: каталог GET redirect и POST creq/threeDSSessionData либо PaReq/MD/TermUrl; [gateway branches](<../../../../reference-code/3ds-fronend/src/App.js#L47-L115>), [Paygine alternatives](<../../../../reference-code/3ds-fronend/src/Components/PostRedirectPaygine/PostRedirectPaygine.js#L14-L29>). Требуется нормализованный server-owned action runner, не банк-switch в браузере.
- tkb-payform: reusable hooks/контролируемые поля/registered card, fee quote, multi-operation UI, Method/challenge transport; [TKB pay component](<../../../../reference-code/tkb-payform/src/partners-ui/tkb/components/pay-form/pay-form.tsx#L13-L39>), [operation mapping](<../../../../reference-code/tkb-payform/src/components/home/home.utils.ts#L9-L25>). Partner copies и P2P/refill не переносить как обязательные возможности нового checkout.

### 6.3. Конкретные статические риски

| ID / severity | Наблюдение и точный source | Что требуется перед reuse / любой практикой |
|---|---|---|
| SEC-01 / P0 | Postman prerequest печатает secret, Property, resolvedBody, encrypted: [WOF](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2383>), [Authenticate](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3129>), [capture](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L2810>), [refund](<../../../external-docs/tkb-postman/TKBPAY-v11042025.postman_collection.json#L3534>). Локальная метрика: 94 console lines без line-comment; это статический поиск, не выполнение JS | Не запускать оригинальные scripts; clean-room signing client, allowlist logging без secret/signature/request body. Если коллекция ранее запускалась с реальными доступами — владелец проверяет историю логов/ротацию по incident procedure |
| SEC-02 / P0 | [useQuoteInfo](<../../../../reference-code/tkb-payform/src/hooks/use-quote-info.ts#L24-L30>) выводит entered card, [66–79](<../../../../reference-code/tkb-payform/src/hooks/use-quote-info.ts#L66-L79>) передаёт весь number при length >=6 и логирует его; [quote URL](<../../../../reference-code/tkb-payform/src/api/quote-info.ts#L5-L7>) помещает его в query | Разрешённый BIN длины по bank contract, не полный PAN; никаких card strings в URL/Faro/errors; server gateway boundary и log scrubbing |
| SEC-03 / P0 conditional | [Faro/OpenReplay](<../../../../reference-code/tkb-payform/src/app/index.tsx#L14-L39>): captureConsole, capturePayload, captureInIframes. Ignore Authorization headers не очищает PAN/CVC тела | Telemetry отключить для card/3DS; отдельно доказать DOM/network/error sanitation и отсутствие egress. Flags в README не доказывают production config |
| SEC-04 / P0 architecture | [old public API](<../../../../reference-code/pyment-form/src/Api/index.js#L17-L25>) и [new reference payload](<../../../../reference-code/tkb-payform/src/hooks/use-pay-form.ts#L109-L125>) передают PAN/CVV/CVC backend; Axios errors могут включать request config | Только выделенный PCI gateway; не Core/Merchant API/events/provider-data; не сохранять CVV. Нет заявления о PCI readiness |
| SEC-05 / high | [localStorage token](<../../../../reference-code/tkb-payform/src/hooks/use-init-app.tsx#L67-L72>), [reuse token](<../../../../reference-code/tkb-payform/src/hooks/use-init-app.tsx#L114-L148>), [403 interceptor](<../../../../reference-code/tkb-payform/src/api/api-instance.ts#L18-L37>); shared jwt/id и token fragments в logs | Session scoping, TTL/resource/origin binding, CSP/XSS threat model; token values и fragments не логировать. Обновление токена не значит retry money |
| SEC-06 / high | [3ds App logs](<../../../../reference-code/3ds-fronend/src/App.js#L54-L75>), [PostRedirect](<../../../../reference-code/3ds-fronend/src/Components/PostRedirect/PostRedirect.js#L11-L25>), [Halyk](<../../../../reference-code/3ds-fronend/src/Components/PostRedirectHalyk/PostRedirectHalyk.js#L11-L27>) печатают auth payload/HTML form | Удалить body/auth/session logging. Allowlist HTTPS ACS/Method destinations и bound action expiry; DOM form action не безопасен только потому, что пришёл backend |
| REL-01 / high | [init 3DS branch](<../../../../reference-code/tkb-payform/src/hooks/use-init-app.tsx#L248-L259>) проверяет threeDSServerTransID, но читает threeDSServerTransId; [тип](<../../../../reference-code/tkb-payform/src/shared/types/api.ts#L76-L84>) и [post-submit branch](<../../../../reference-code/tkb-payform/src/hooks/use-payment-status-polling.ts#L88-L102>) используют Id | Contract fixture должен покрыть init после reload и post-submit. Потенциально Method пропускается; runtime impact не испытан |
| REL-02 / high | [polling](<../../../../reference-code/tkb-payform/src/hooks/use-payment-status-polling.ts#L30-L32>) 1s затем 5s; [init loop](<../../../../reference-code/tkb-payform/src/hooks/use-init-app.tsx#L226-L269>) после 3DS действия продолжает цикл. Метод onload в [V2](<../../../../reference-code/tkb-payform/src/shared/utils/3ds.ts#L236-L250>) только transport trigger | Poll UI обращается к собственному cache; bank rate limiter. Однократное действие, дедупликация/reload/cleanup/timeout; iframe load != auth success |
| REL-03 / high | [submit error](<../../../../reference-code/tkb-payform/src/hooks/use-pay-form.ts#L121-L128>) сбрасывает isSubmitted; [poll error/404](<../../../../reference-code/tkb-payform/src/hooks/use-payment-status-polling.ts#L70-L75>) и [132–136](<../../../../reference-code/tkb-payform/src/hooks/use-payment-status-polling.ts#L132-L136>) останавливают опрос | Не разблокировать финансовый повтор по UI network error. Нужен server durable unknown и action capability. Код не доказывает банковское двойное списание, но insufficient guard для нового продукта |
| SEC-07 / high | [old theme](<../../../../reference-code/pyment-form/src/ConfigContext.js#L12-L49>): remote CSS keys, общий app_config; [redirect](<../../../../reference-code/tkb-payform/src/components/home/home.tsx#L36-L46>) по merchant.redirectUrl | Trusted checkout snapshot с одним accent, schema/contrast validation; return allowlist и merchant-resource correlation, без внешнего произвольного CSS |
| UX-01 / medium | [old PAN mask](<../../../../reference-code/pyment-form/src/Components/PaymentByCard/CardField.js#L18-L25>) ограничивает 16 цифрами; [expiry](<../../../../reference-code/pyment-form/src/Components/PaymentByCard/validators.js#L22-L30>) исключает текущий месяц; [new schema](<../../../../reference-code/tkb-payform/src/shared/schemas/payform.schemas.ts#L16-L45>) 16–19 PAN/3 CVC при наличии AMEX в типах | Проверить разрешённые card brands/длины, текущий месяц, accessibility; не считать schema достаточно для всех карт |
| SEC-08 / medium | [old config debug](<../../../../reference-code/pyment-form/src/Api/config.js#L6-L11>) выводит process.env | Изъять env dump; клиентская сборка не место bank secret |

**Ни одна строка не является заявлением, что у действующего банка/production инсталляции произошла утечка.** Риски установлены по reference code и не очищенной диагностике; конфигурация deployment и действительные данные не запускались/не проверялись.

## 7. PCI / 3DS ограничения

- TLS, hidden input, Base64, reCAPTCHA, FingerprintJS и логотип PCI **не исключают** PCI scope. При WOF браузер и gateway обрабатывают PAN/CVV; scope определяется фактическим flow, service-provider ролью, банком и QSA.
- PAN/CVV отсутствуют в обычном Core/Merchant API/БД/брокере/analytics/trace/error dumps; CVV не хранится после авторизации. Сохранённый cardRefId не равен универсальному переносимому токену.
- Не строить SAQ/PCI-ready утверждение по этим исходникам или локальным тестам. Не переносить сторонние банковские SDK/assets/исходники без проверки прав.
- ACS challenge — внешняя аутентификация, не банковская форма ввода карты. Нельзя заменять его собственным OTP полем или /no3ds ради «успеха».
- Нужны origin/CORS/CSP/frame policies, allowlist destination, script inventory/integrity, session-bound single-use actions, CSRF/replay/callback verification и обработка reload/закрытия страницы.
- Производные документы приватны, локальная редактированность не даёт права на публикацию полных банковских инструкций. В этом отчёте не воспроизводятся полноценные request/response examples.

## 8. План безопасных практических проверок — всё NOT_RUN

**Разрешение текущей работы:** только локальное статическое исследование/декодирование. **Окружение:** none (без банка). **Практический результат:** NOT_RUN, ни browser app, ни Postman scripts, ни зависимости банковского проекта не выполнялись/не устанавливались. Ни один запрос к sandbox/production не сделан.

Каждый последующий запуск оформлять отдельно по [шаблону эксперимента](<../../../reports/templates/experiment.md>), с UTC, revision/harness version, маскированным terminal, разрешением, шагами, expected/observed, sanitised evidence и PASS/FAIL/BLOCKED/NOT_RUN/INCONCLUSIVE. Ниже — план, не execution authorization.

### 8.1. Допуски и stop gates

| Gate | Необходимое явное подтверждение / владелец |
|---|---|
| G0 — private handling | Владелец материалов: право анализа/reuse; bank docs/collection/environment вне staging/Git; local mode/access/retention; clean logging и cleanup policy |
| G1 — sandbox | Владелец + банк: точный approved sandbox host, merchant/terminal/method/mode, тестовые карты, разрешённые суммы и общий лимит операций, окно теста, support contact; никакого вывода credential values |
| G2 — card perimeter | Security/QSA/банк: разрешённый isolated test-only PCI/harness contour, секреты из vault, PAN/CVV dataflow, минимальный lifetime, отсутствие persistence/телеметрии; без допуска — только synthetic mock |
| G3 — protocol | Банк: актуальная versioned request/response/status schema, 3DS roles/origins/timeouts, signature bytes, callback auth, lookup SLA/finality, capture remainder/refund semantics |
| G4 — retries | Банк письменно: idempotency **по каждому** mutating endpoint, scope/TTL/payload mismatch/concurrency, lookup-after-timeout, независимые capture/refund IDs; без этого replay только в simulator, не в банке |
| G5 — evidence | Clean-room harness ревью: no debug script imports, outbound allowlist, одна активная money command, immutable request digest без body/secrets, response allowlist, bank polling не чаще разрешённого лимита |

**Остановка:** host/права сомнительны; PAN/CVV/secret замечен в логах/URL; неожиданный live effect; несовпадение суммы/ресурса/correlation; неизвестный ответ; доступный бюджет исчерпан. Остановить новые commands, сохранить только очищенные указатели, уведомить владельца/банк. После possible send не делать «cleanup refund/void» автоматически: сначала определить outcome, затем отдельно разрешить compensating operation. Не стирать финансовые свидетельства ради чистого теста.

### 8.2. Пошаговая матрица

| Test ID / гипотеза | Допуск и безопасные шаги | Acceptance / evidence / восстановление | Статус |
|---|---|---|---|
| BRV-01 — no secret/PAN logging | G0; isolated mock без запуска старого проекта. Synthetic canary strings в request/auth/error/DOM; перехват local logs/APM/browser network, outbound deny | Во всех sinks нет canary payload/token, только allowlisted fields. При утечке stop, исправить harness, очистить test-only artefacts по retention | NOT_RUN |
| BRV-02 — подпись exact bytes | G0/G5; clean-room unit fixtures, synthetic key, UTF-8/порядок/пробелы/escaping/null/числа; подписать одни байты и отправить те же в mock | Expected HMAC/Base64 совпадает; mutation одного байта отвергается mock. Секреты/подпись не в отчёте; никакого банковского вызова | NOT_RUN |
| BRV-03 — Hello connectivity | G1/G3/G5, отдельное разрешение даже нефинансовому методу; минимальная безопасная inputString на утверждённом host | Echo/структура errorInfo соответствует контракту; host/terminal rights фиксируются маскировано. No financial rollback; при неожиданном host stop | NOT_RUN |
| BRV-04 — provider fallback до dispatch | Сначала mock G0/G5; затем G1/G3 с explicit hosted-operation budget. Route/direct disabled, register hosted только после user action | Bank FormUrl/correlation получены, PAN не входит наш Core; одно resource/action. Отмена тестового заказа — только документированная нефинансовая процедура либо отдельный разрешённый bank flow | NOT_RUN |
| BRV-05 — WOF rights и Check3ds | G1/G2/G3/G5; разрешённый test CardInfo через изолированный gateway; один согласованный check request | Doc response structure, terminal/mode и cardRef correlation установлены; endpoint не провозглашается финансово успешным. Если непонятен эффект check, stop и bank lookup по допуску | NOT_RUN |
| BRV-06 — 3DS Method: supplied/absent | G0 mock response fixtures; банк только G1/G2/G3. Проверить empty URL, supplied packed data, indicator, notification success/timeout, init/reload | Правильный protocol completion indicator, связанный transId, одно действие, allowed destinations; iframe load не трактуется success; очистка DOM без financial retry | NOT_RUN |
| BRV-07 — frictionless | G1/G2/G3/G5; bank-supplied test scenario. Выполнить **утверждённую** цепочку без добавления guessed fields | Получены auth outcome и правильный finish contract; окончательный debit/hold отдельно подтверждён state/callback. Evidence только field names/status/time/masked refs | NOT_RUN |
| BRV-08 — challenge success | G1/G2/G3/G5; ACS test harness от банка, origin/NotificationURL allowlist, creq → bound callback/validate → согласованный finish | Auth correlation/version валидны, UI возвращается; Core не succeeded до bank truth. No OTP spoofing. Close/reload не запускает вторую оплату | NOT_RUN |
| BRV-09 — challenge fail/cancel/timeout | Сначала mock; банк только отдельный разрешённый negative test | Однозначный documented отказ без эффекта отделён от unknown; UI не повторяет автоматически; возможная отправка блокирует новый Payment. Исход выясняется lookup/reconciliation, не повтором finish | NOT_RUN |
| BRV-10 — HTTP500/connection-loss unknown | Simulator transport fault before send / after send / after accepted, без банка. Bank fault injection только письменно разрешённым bank harness | before-send proof может разрешить отправку; possible-send → operation unknown, intent locked, route immutable, lookup/backoff. Никаких случайных двойных финансовых запросов | NOT_RUN |
| BRV-11 — lookup finality | G1/G3/G5; известная test operation, duplicate poll schedule ≥ bank interval; simulate transient not_found и late success | Status dictionary verified; not_found nonfinal пока нет гарантий; отсутствие эффекта должно быть доказано. UI 1s poll только own cache; нет нагрузочного теста банка | NOT_RUN |
| BRV-12 — callback authenticity/replay | G0 mock для signed/tampered/old/duplicate/out-of-order callbacks; actual format только G1/G3 | Неаутентичный callback не меняет деньги; duplicate no-op; late success обновляет bank fact и уведомление. Не публиковать raw signed body | NOT_RUN |
| BRV-13 — single final capture | G1/G2/G3/G5; отдельный budget на hold + **один** согласованный full или partial capture на независимой тестовой операции | Hold authorised; amount в копейках; capture final evidence; остаток release подтверждён bank fact. Не делать второй capture ради проверки remainder. Cleanup только по separately approved void после установленного state | NOT_RUN |
| BRV-14 — void / hold expiry | G1/G3/G5; отдельные test holds для void и expiry, таймер от bank contract | Confirmed release/expired outcome и суммы, не просто acceptance; одно действие. Проверка expiry не требует polling storm; если late capture/unknown — stop и reconcile | NOT_RUN |
| BRV-15 — refund full/partial | G1/G3/G5; confirmed test debit; отдельная single-refund operation, банк подтверждает допустимую сумму и независимые ссылки | Acceptance != refunded; получить final refund evidence, cumulative accounting и original link. Если refund unknown — запрет второго возврата до результата | NOT_RUN |
| BRV-16 — repeated partial refunds | Сначала simulator; банк только G4 + отдельное согласование двух идентифицируемых refund commands | Bank distinct refund IDs/references, remaining/refunded totals, no overrefund. Без отдельных refs/guarantee банк не тестировать; conservative limitation фиксируется | NOT_RUN |
| BRV-17 — idempotency и concurrency | Simulator: same ID+same body, same ID+different body, concurrent create/capture/refund/void; банк **только G4** с детальной approved duplicate procedure | Replay возвращает ту же операцию, mismatch deterministic rejection, money effect один; dedupe scope/TTL доказаны отдельно по endpoint. Не принимать ExtId unique как допуск | NOT_RUN |
| BRV-18 — Reverse vs Refund / late success | Simulator late bank success после cancel; реальный reverse только G1/G3/G5 и bank cutoff | Payment success + failed cancellation, owner notification, без автовозврата; reverse/refund distinct final proofs и clearing applicability | NOT_RUN |
| BRV-19 — bind / saved-card customer vs MIT | G1/G2/G3/G5, отдельные права/consent; согласованная bind→scope check→customer-present flow; MIT только отдельный разрешённый сценарий | Token masked, not portable promise; hosted CVV не MIT; revoke tested по допуску. Unbind только подтверждённого test-only binding | NOT_RUN |
| BRV-20 — reconciliation | G1/G3/G5 read-only report scope; date/range/terminal and test refs allowlisted, минимальный approved query | Debit/hold/capture/refund/void links и финальные суммы сопоставлены с bank fact; missing/delayed feeds дают INCONCLUSIVE/unknown, не assumed success. Raw отчёты вне Git | NOT_RUN |
| BRV-21 — browser safety/UX | G0 offline fixtures, CSP/iframe sandbox allowlists и одноразовые actions; reload/back/две вкладки/подмена session/returnURL/Id vs ID; доступность/длины/expiry | Нет другого merchant/resource, произвольного origin, второго active Payment, повторного challenge; текущий месяц работает; результаты из Core, не URL | NOT_RUN |

Каждый PASS ограничен **конкретной ревизией harness, terminal, operation type, method, mode и условиями**. Sandbox PASS не означает production permission, PCI compliance, settlement completeness или поддерживаемость всеми банками.

## 9. Приватные материалы и Git safety

На момент проверки git ls-files external-docs не возвращал путей. Environment был ignored по правилу [ignore environment](<../../../.gitignore#L1-L14>), но исходная collection и восемь .doc **не покрывались ignore**: external-docs отображался untracked. Это privacy gap при будущем массовом git add, а не доказанная утечка.

**Рекомендация владельцу:** explicit ignore/exclude всего приватного external-docs либо хранение вне Git-root; повторно проверить git ls-files / check-ignore / diff --cached перед любыми будущими staging действиями. В рамках этого отчёта ignore/current/ветка не изменялись, git add/commit/push не выполнялись. Производные в [локальном bank-review каталоге](<../../../../.audit-local/bank-review/manifest.json>) также не переносить в Git. Возможное последующее исправление ignore другим исполнителем проверяется отдельно.

## 10. Учёт статических результатов и следующий шаг

| Проверка / 2026-10-09 / указанная исходная ревизия | Результат |
|---|---|
| Чтение проектных ограничений; 8 MIME decode/очищение/read с непрерывностью | PASS (локальная документальная обработка, не bank test) |
| Postman raw не выведен; values/redacted response bodies не включены в отчёт | PASS (локальный structural analysis) |
| Исходная диагностическая коллекция безопасна для запуска с secrets/cards | FAIL (static SEC-01) — не запускать оригинал |
| Reference quote/telemetry безопасны для собственного card contour без переработки | FAIL (static SEC-02/SEC-03/SEC-04) — не переносить |
| Доказательство terminal rights / actual 3DS/payment/hold/refund/idempotency | NOT_RUN; documentary capability и UNKNOWN различены |
| Подтверждение PCI-ready / production-ready | NOT_RUN; отсутствует formal assessment |

**Следующий допустимый шаг:** получить ответы банка по [открытым вопросам](<../../../handoff/TKB_OPEN_QUESTIONS.md>), актуальную versioned спецификацию и разрешения G0–G5; затем clean-room offline harness/fixtures, не запуск приватного reference project. Предлагать изменения current только через отдельное согласование/RFC с этими evidence. Источники не закрывают TASK-001 runtime DoD; этот отчёт закрывает **статический обзор и план допуска**.
