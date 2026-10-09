# Независимый аудит согласованности платёжных контрактов

- **Дата:** 2026-10-09, UTC; начало проверки окружения 19:53:20Z.
- **Ревизия:** `97784b9d69e5f7ce347f84429f69bacc5872cbf0`; ветка `research/initial-audit`.
- **Исполнитель:** независимый делегированный технический агент; банковское окружение **none**.
- **Разрешение:** только чтение актуальных материалов и безопасные локальные статические проверки; создание этого отчёта и отдельного журнала проверок. Нет разрешения на банковские/сетевые запросы.
- **Общий результат:** **FAIL — обнаружены противоречия/недостаточная строгость проектных контрактов**. Это не результат исполнения платёжного ядра или банковских сценариев.
- **Реально исполненные проверки:** [static-checks.md](<static-checks.md>), включая воспроизводимые синтетические контрпримеры CE01—CE08. Наличие YAML не означает исполнение сценария.

## 1. Область, источники истины и ограничения

Приоритет: [AGENTS:7–13](<../../../AGENTS.md#L7-L13>) → [согласованные BR](<../../../docs/current/payment-processing-decisions-v1.1.md>) и [NAME-01](<../../../docs/current/payment-naming-conventions-v1.1.md>) → lifecycle/Checkout → проект OpenAPI/SPI/профиля. Бизнес-решения не переопределялись.

Прочитаны все 15 файлов актуального каталога: [current README](<../../../docs/current/README.md>), [BR](<../../../docs/current/payment-processing-decisions-v1.1.md>), [naming](<../../../docs/current/payment-naming-conventions-v1.1.md>), [architecture](<../../../docs/current/payment-processing-architecture-v1.1.md>), [lifecycle](<../../../docs/current/payment-lifecycle-spec-v0.12.md>), [Checkout design](<../../../docs/current/payment-checkout-design-v0.2.md>), [OpenAPI](<../../../docs/current/payment-api-v0.12.openapi.yaml>), [connector MD](<../../../docs/current/acquirer-connector-contract-v1.1.md>), [connector TS](<../../../docs/current/acquirer-connector-v0.6.ts>), [TKB profile](<../../../docs/current/tkb-connector-profile-v0.2.yaml>), [core YAML](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml>), [Checkout YAML](<../../../docs/current/checkout-contract-cases-v0.2.yaml>), [checkout checker](<../../../docs/current/check-payment-checkout-v1.1.py>), [money checker](<../../../docs/current/check-payment-money-v1.1.py>), [name checker](<../../../docs/current/check-payment-names-v1.4.py>).

Также прочитаны [validate_current.py](<../../../scripts/validate_current.py>), [TASK-001](<../../../tasks/001-tkb-wof-3ds.md>), [TASK-002](<../../../tasks/002-core-simulator.md>), [TASK-003](<../../../tasks/003-checkout-pci.md>), [TASK-004](<../../../tasks/004-architecture-audit.md>), [PROJECT_CONTEXT](<../../../handoff/PROJECT_CONTEXT.md>), [STATUS](<../../../handoff/STATUS.md>), [TKB_OPEN_QUESTIONS](<../../../handoff/TKB_OPEN_QUESTIONS.md>), [START_PROMPT](<../../../handoff/START_PROMPT.md>), [EXECUTION_PROTOCOL](<../../../handoff/EXECUTION_PROTOCOL.md>), [MANIFEST](<../../../handoff/MANIFEST.json>), [корневой README](<../../../README.md>) и [шаблон эксперимента](<../../templates/experiment.md>).

Исторические версии и исходные банковские документы/Postman environments не открывались. Raw secrets, PAN/CVV, токены, банковские URL доступа не читались. Контрпримеры используют только фиктивные идентификаторы и строку `SYNTHETIC-NOT-A-SECRET`. Весь сетевой/финансовый слой **NOT_RUN**; права банка/PCI **BLOCKED** до выполнения предусловий, перечисленных [в handoff](<../../../handoff/TKB_OPEN_QUESTIONS.md#L3-L14>). Зависимости предоставлены родительским агентом в локальных isolated venv вне Git-репозитория; этот агент ничего не устанавливал.

Чтение больших файлов продолжено с последней фактически возвращённой строки. Отдельная длинная строка [OpenAPI:10](<../../../docs/current/payment-api-v0.12.openapi.yaml#L10>) обрезается read-инструментом после 2000 символов; её остаток проверен отдельно безопасным локальным парсингом `info.description`. Неполный вывод инструмента не принят за полное чтение.

**Severity:** HIGH — противоречие способно привести разработчика к неверному финансовому/терминальному состоянию; MEDIUM — определённое расхождение машинного/описательного контракта или существенная неполнота проверки; LOW — документационная/ссылочная ошибка. Severity описывает риск проектирования, **не подтверждённую runtime-уязвимость**.

## 2. Очищенные находки

### CR-01 — HIGH — глобальный mapping declined противоречит capture/void/refund

**Класс:** подтверждённая ошибка описательного контракта; локальное семантическое сравнение **FAIL**, runtime **NOT_RUN**.

**Источники:** [connector:102](<../../../docs/current/acquirer-connector-contract-v1.1.md#L102>) задаёт для любого `declined` действие `Payment.failed`; но [тот же документ:53–56](<../../../docs/current/acquirer-connector-contract-v1.1.md#L53-L56>) требует восстановления `requires_capture` после доказанного отказа capture/void при действующем холде. [Lifecycle:124–127](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L124-L127>) запрещает failed при активном холде. Для возврата [BR-04:148–151](<../../../docs/current/payment-processing-decisions-v1.1.md#L148-L151>) требует `Refund.failed` при отказе, сохраняя `Payment.succeeded`. [Connector:157–158](<../../../docs/current/acquirer-connector-contract-v1.1.md#L157-L158>) подтверждает этот отдельный mapping. Сценарии [CT-29/31](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L268-L294>), [CT-126](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1159-L1167>) и [CT-160](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1499-L1507>) согласованы с lifecycle, не с общей строкой таблицы.

**Воспроизведение (описательный контрпример, не банковский запуск):** исходный холд 100000, `paid=0`, capture 60000 → достоверный `declined`, холд остаётся действующим. Общая таблица даёт `Payment.failed`; специализированное правило даёт `PaymentOperation.failed` + `Payment.requires_capture`. Второй пример: успешная оплата 100000 и отказ refund 20000 — `Refund.failed`, а не `Payment.failed`.

**Предложение:** сузить общую строку до исходного debit/authorize без финансового эффекта; дать operation-aware таблицу для debit/authorize/capture/void/refund. Нового бизнес-решения не требуется; исправление отдельно, текущие файлы не изменялись.

### CR-02 — MEDIUM — RefundEvent допускает ложную пару типа события и статуса возврата

**Класс:** подтверждённая недостаточная строгость схемы; CE01 **FAIL** относительно инварианта, выполнен только JSON Schema test.

**Источники:** [BR-04:145–150](<../../../docs/current/payment-processing-decisions-v1.1.md#L145-L150>); [lifecycle:371–374](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L371-L374>); [OpenAPI:1545–1552](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1545-L1552>) независимо задаёт enum `type` и общий `Refund`; [пример:1564–1575](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1564-L1575>).

**Воспроизведение:** копия schema example `RefundEvent`, `type=refund.succeeded`, но `data.status=pending`, без completed_at. Draft202012Validator, в том числе с FormatChecker, принимает объект. Валидный по схеме сигнал исполнения не согласован с ресурсом, где исполнение не доказано.

**Предложение:** oneOf или if/then с привязкой `refund.pending/succeeded/failed/reversed` к соответствующему `data.status`; отрицательные примеры в checker. Это не доказательство, что реальный сервер уже выдаёт такие события.

### CR-03 — MEDIUM — CancelEvent не связывает type с ресурсом и результатом cancel

**Класс:** подтверждённая недостаточная строгость схемы; CE02/CE03 **FAIL** относительно описания.

**Источники:** [BR-05:167–174](<../../../docs/current/payment-processing-decisions-v1.1.md#L167-L174>); [lifecycle:219](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L219>); [OpenAPI:1520–1531](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1520-L1531>); [CT-175/176](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1649-L1667>).

**Воспроизведение:** `type=payment.cancel_failed` с `data` равным исходному примеру PaymentIntent (requires_payment_method, cancel=null) проходит. Также `type=payment.cancel_failed` с примером успешного Payment, но cancel=null, проходит. При этом описание обещает соответствующий ресурс после позднего успеха, `cancel.status=failed`, `reason=payment_succeeded`.

**Предложение:** связать тип события с типом data и требуемым cancel-итогом, не меняя правил BR-05. Отдельно сохранить служебные конфликтные события после доказанного canceled: они не должны маскироваться под штатный поздний успех.

### CR-04 — MEDIUM — multi_capture=true валиден в публичной v1 схеме

**Класс:** подтверждённая schema/prose ошибка; CE04 **FAIL** относительно явного ограничения v1.

**Источники:** [BR-03.1:97–102](<../../../docs/current/payment-processing-decisions-v1.1.md#L97-L102>); [OpenAPI:1638–1643](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1638-L1643>) — boolean и одновременно «всегда false»; [CT-128:1185–1186](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1185-L1186>).

**Воспроизведение:** полный MethodCapability для card с `multi_capture=true` и остальными required boolean полями проходит JSON Schema. Это локально проверяемое ограничение, не финансовая межресурсная арифметика.

**Предложение:** `const: false` в публичной v1 схеме; банковский CapabilityProfile может продолжать описывать документальную способность независимо от включённости продукта. Не переименовывать внешние capability-коды молча.

### CR-05 — MEDIUM — запрет карточных данных не закрыт машинной схемой metadata

**Класс:** подтверждённый пробел schema-level запрета; **не подтверждённая утечка**. CE05 принимается схемой, runtime DLP/logging **NOT_RUN**.

**Источники:** [BR-07:208](<../../../docs/current/payment-processing-decisions-v1.1.md#L208>), [Checkout:119](<../../../docs/current/payment-checkout-design-v0.2.md#L119>) прямо запрещает карточные данные в metadata; [CF-20](<../../../docs/current/checkout-contract-cases-v0.2.yaml#L62-L64>); [CreatePaymentRequest:955–958](<../../../docs/current/payment-api-v0.12.openapi.yaml#L955-L958>) разрешает произвольные строковые metadata. [Checkout checker:39–51](<../../../docs/current/check-payment-checkout-v1.1.py#L39-L51>) проверяет прямые поля PaymentMethodRequest, не metadata.

**Воспроизведение:** минимальный request `order_id=order_test, amount=1, currency=RUB` с `metadata={pan:SYNTHETIC-NOT-A-SECRET,cvv:SYNTHETIC-NOT-A-SECRET}` проходит. Настоящие реквизиты для проверки не нужны и не использовались.

**Предложение:** документировать и проверять отдельно schema reserved-key rejection и реальную защиту содержимого/логов; runtime нельзя доверять одному additionalProperties=false верхнего уровня. Не объявлять текущий checker доказательством отсутствия PAN/CVV во всех входах. Строковые значения могут содержать чувствительные данные под любым ключом, поэтому одной схемы недостаточно.

### CR-06 — MEDIUM — HTTPS для return/банковского redirect описан, но не выражен в соответствующих схемах

**Класс:** schema/security-contract gap; CE06/CE07 **FAIL** относительно опубликованных требований к URL. Нет подтверждения runtime-приёма или сетевого перехода.

**Источники:** [SPI:92–95](<../../../docs/current/acquirer-connector-v0.6.ts#L92-L95>) требует HTTPS/allowlist для return_url; [CF-04](<../../../docs/current/checkout-contract-cases-v0.2.yaml#L14-L16>) требует bank HTTPS URL; [OpenAPI return_url:954](<../../../docs/current/payment-api-v0.12.openapi.yaml#L954>) и [NextAction:980–983](<../../../docs/current/payment-api-v0.12.openapi.yaml#L980-L983>) задают только uri. В отличие от них [CheckoutInfo:2010–2015](<../../../docs/current/payment-api-v0.12.openapi.yaml#L2010-L2015>) уже содержит `^https://`.

**Воспроизведение:** `return_url=http://shop.example.invalid/result` в минимальном CreatePaymentRequest и `{type:redirect,url:http://bank.example.invalid/form}` в NextAction принимаются даже с FormatChecker. Это только синтетические значения, не реальные обращения.

**Предложение:** единая HTTPS-схема ссылок + runtime allowlist/канонизация; валидация домена и безопасность redirect не заменяются regex. Конкретные embed/ACS политики остаются открытыми, но перечисленные примеры не требуют их выбора.

### CR-07 — MEDIUM — CT-73 противоречит уже согласованным числовым пределам BR-02.1

**Класс:** подтверждённая устаревшая нормативная предпосылка в текущем YAML.

**Источники:** [CT-73:672–675](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L672-L675>) утверждает «числовые значения ещё не согласованы» и ожидает отсутствия якобы согласованного предела в промышленной документации. [BR-02.1:69–75](<../../../docs/current/payment-processing-decisions-v1.1.md#L69-L75>) согласовывает 30 минут/5 попыток и диапазоны; [тот же YAML:5](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L5>) и [CT-98:904–905](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L904-L905>) это подтверждают.

**Воспроизведение:** сравнить текст предпосылки/expected CT-73 с BR-02.1 и CT-98. Если воплотить CT-73 буквально, согласованные default/границы ошибочно скрываются или объявляются неутверждёнными.

**Предложение:** сохранить проверку соблюдения тестовой политики, убрать отрицание факта согласования. Сценарий не исполнялся; проверка count=215 не обнаруживает семантическую несогласованность.

### CR-08 — LOW — четыре сломанные локальные Markdown-ссылки current

**Класс:** воспроизводимая ссылочная ошибка. Локальный scanner обнаружил отсутствующие targets; history не открывалась.

| Источник | Target в Markdown | Актуальный существующий файл |
|---|---|---|
| [Connector MD:35](<../../../docs/current/acquirer-connector-contract-v1.1.md#L35>) | `acquirer-connector-v0.5.ts` | [connector v0.6](<../../../docs/current/acquirer-connector-v0.6.ts>) |
| [Connector MD:237](<../../../docs/current/acquirer-connector-contract-v1.1.md#L237>) | `tkb-connector-profile-v0.1.yaml` | [profile v0.2](<../../../docs/current/tkb-connector-profile-v0.2.yaml>) |
| [Architecture:202](<../../../docs/current/payment-processing-architecture-v1.1.md#L202>) | `acquirer-connector-v0.5.ts` | [connector v0.6](<../../../docs/current/acquirer-connector-v0.6.ts>) |
| [Lifecycle:827](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L827>) | label v0.2, target `payment-checkout-design-v0.1.md` | [design v0.2](<../../../docs/current/payment-checkout-design-v0.2.md>) |

**Воспроизведение:** разрешить каждый target относительно папки источника; файла там нет. Команда сканирования приведена [в журнале](<static-checks.md>).

Дополнительно несинхронизированы plain-text ориентиры: [Checkout:5](<../../../docs/current/payment-checkout-design-v0.2.md#L5>), [SPI:6](<../../../docs/current/acquirer-connector-v0.6.ts#L6>), [core YAML based_on:6–11](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L6-L11>), [naming:45–49](<../../../docs/current/payment-naming-conventions-v1.1.md#L45-L49>), [architecture:208](<../../../docs/current/payment-processing-architecture-v1.1.md#L208>), [lifecycle:813–818](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L813-L818>). Это не доказательство, что исторические файлы являются действующей нормой; корректные текущие headers/README имеют более высокий приоритет. Обновить ссылки отдельным PR.

### CR-09 — LOW — обязательная собственная форма всё ещё перечислена как открытый выбор; CF-01 вводит неопределённую сущность

**Класс:** подтверждённые документационные остатки, не новое открытое бизнес-решение.

**Источники:** [architecture:351](<../../../docs/current/payment-processing-architecture-v1.1.md#L351>) спрашивает, нужна ли собственная страница или только банковские формы, вопреки [BR-07:203–210](<../../../docs/current/payment-processing-decisions-v1.1.md#L203-L210>) и [той же architecture:378](<../../../docs/current/payment-processing-architecture-v1.1.md#L378>). [CF-01:6](<../../../docs/current/checkout-contract-cases-v0.2.yaml#L6>) использует `CheckoutIntent`; [Checkout:135](<../../../docs/current/payment-checkout-design-v0.2.md#L135>) и [lifecycle:823](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L823>) описывают PaymentIntent и Checkout без новой финансовой сущности.

**Воспроизведение:** сопоставить эти две фразы с нормативными определениями и списком 39 OpenAPI schemas: CheckoutIntent не определён. Вероятное исправление — PaymentIntent; не конструировать новую сущность по опечатке. Открыты только технический способ и сроки реализации BR-07, не обязательность собственного card-entry.

## 3. Открытые решения / пробелы проекта — НЕ объявлены ошибками бизнес-правил

| ID / приоритет ревью | Вопрос, воспроизводимый пример | Источники и граница вывода |
|---|---|---|
| OD-01 / MEDIUM | Где гарантируется проверка **исходной валюты банковского свидетельства**? В typed ConnectorResult/VerifiedBankEvent currency отсутствует; currency есть в исходной команде и SettlementRecord. CT-166/191/215 требуют отвергать иной amount/currency. Типизированный нормализованный результат не передаёт фактически увиденную currency; иначе она может оказаться только в неструктурированном provider_data либо проверяться внутри адаптера до нормализации. | [BR-06:186–191](<../../../docs/current/payment-processing-decisions-v1.1.md#L186-L191>), [SPI:182–209](<../../../docs/current/acquirer-connector-v0.6.ts#L182-L209>), [SPI:221–226](<../../../docs/current/acquirer-connector-v0.6.ts#L221-L226>), [CT-166](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1559-L1567>), [CT-191](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1809-L1817>), [CT-215](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L2049-L2057>). Выбрать typed currency/evidence или явный обязательный adapter validation contract и соответствующую точку теста. Не доказано, что будущий адаптер пропустит несовпадение. |
| OD-02 / MEDIUM | Какая нормализованная модель доказывает закрытие остатка после partial capture? `effect=captured, amount=60000` сам по себе не сообщает, свободны ли 40000. Можно опираться на проверенное rule_version, отдельный voided/settlement факт или расширение модели. | [BR-03.2:118,125](<../../../docs/current/payment-processing-decisions-v1.1.md#L118-L125>), [SPI effects/result:172–188](<../../../docs/current/acquirer-connector-v0.6.ts#L172-L188>), [connector:69](<../../../docs/current/acquirer-connector-contract-v1.1.md#L69>), [CT-143](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1329-L1337>). Нет отдельного typed released/remainder outcome; это техническая неполнота, не разрешение вычислять released по разнице. Политика sufficient evidence уже открыта в BR. |
| OD-03 / MEDIUM | Как SDK/ACS данные SPI превращаются в безопасный браузерный action? SPI sdk_action содержит action_name + opaque_parameters, а public NextAction sdk_action только action:string и запрещает дополнительные поля. Не определены payload/reference, origin binding, lifetime и browser API. | [SPI:167–170](<../../../docs/current/acquirer-connector-v0.6.ts#L167-L170>), [OpenAPI:991–996](<../../../docs/current/payment-api-v0.12.openapi.yaml#L991-L996>), [Checkout:52–55,135–139](<../../../docs/current/payment-checkout-design-v0.2.md#L52-L55>), [Checkout API proposal](<../../../docs/current/payment-checkout-design-v0.2.md#L135-L139>). Нельзя копировать opaque_parameters как есть в Merchant API. Требуется техническое решение, а не заявление о готовом 3DS flow. |
| OD-04 / MEDIUM | Чем подтверждается действие покупателя при новом Intent.confirm? В schema нет доказательства действия, только method/return/save/consent. Это осознанно незакрытый механизм, а не новая бизнес-норма. | [BR-01:40,46](<../../../docs/current/payment-processing-decisions-v1.1.md#L40-L46>), [OpenAPI:1778–1796](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1778-L1796>). Выбрать проверяемый browser/merchant trust contract; не считать наличие confirm признаком действия покупателя. |
| OD-05 / LOW | Приоритет expiry/limit/cancel/risk и судьба дальнейших разрешённых команд после доказанного void_failed требуют точной технической таблицы. | [BR-02:61–63](<../../../docs/current/payment-processing-decisions-v1.1.md#L61-L63>), [BR-02.1:91](<../../../docs/current/payment-processing-decisions-v1.1.md#L91>), [lifecycle:215–221](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L215-L221>), [CT-180](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1699-L1707>). Не выбирать приоритет от имени владельца. |
| OD-06 / MEDIUM | Правила ограничения способов/возможностей проверяются runtime: CE08 с manual+sbp проходит CreatePaymentRequest, но обычный СБП не имеет card hold. Ответ capabilities не фиксирует комбинации разных функций в одном маршруте. | [lifecycle:471–480](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L471-L480>), [OpenAPI:809–812](<../../../docs/current/payment-api-v0.12.openapi.yaml#L809-L812>), [MethodCapability](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1603-L1674>), [CT-130](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1199-L1207>). Это known capability-dependent validation, не самостоятельная ошибка JSON Schema. Нужно отрицательное исполняемое core-тестирование, а не банковский эксперимент сейчас. |

## 4. Матрица согласованности BR / NAME-01

`PASS (static)` ниже означает согласованность рассмотренного текста/формы схемы, не банковский факт или функциональную реализацию.

| Требование | Наблюдение и источники | Итог аудита |
|---|---|---|
| BR-01 | Самостоятельный terminal Payment, только последовательные children и buyer action; [lifecycle:28–40](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L28-L40>), [API confirm:177–179](<../../../docs/current/payment-api-v0.12.openapi.yaml#L177-L179>), [CT-55–60](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L502-L556>); SPI не принимает Intent ([TS:79–81](<../../../docs/current/acquirer-connector-v0.6.ts#L79-L81>)). | Основная семантика согласована; OD-04 открыт; atomic/races NOT_RUN. |
| BR-02 / 02.1 | Финальность только без неизвестного эффекта/холда, default/ranges и snapshot совпадают: [lifecycle:161–183](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L161-L183>), [API settings:1675–1723](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1675-L1723>). | CR-07 противоречит согласованию; прочая структура PASS static; приоритет причин открыт. |
| BR-03.1 | Public CaptureRequest не содержит final_capture ([API:1455–1475](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1455-L1475>)), internal SPI final:true ([TS:132](<../../../docs/current/acquirer-connector-v0.6.ts#L132>)); негативные CT-121/128 корректны. | CR-01 и CR-04; банковские capture/release доказательства BLOCKED, операции NOT_RUN. |
| BR-03.2 | reduce=true обязателен для child partial, final только после банка: [lifecycle:304–313](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L304-L313>), [CT-132–140](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1219-L1307>). | Положительная проектная семантика согласована; OD-02; runtime NOT_RUN. Запрет reduce для direct/full — техническая детализация, не приписывать как новый бизнес-выбор. |
| BR-04 | accepted ≠ succeeded; reserves; reversed отдельным фактом; original Payment остаётся succeeded: [TS:184–190,240](<../../../docs/current/acquirer-connector-v0.6.ts#L184-L190>), [API RefundStatus](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1576-L1592>). | CR-01/02; OD-01; bank mapping unverified. Наличие evidence field не доказывает достаточность конкретного банковского события. |
| BR-05 | Отдельный cancel, поздний успех до canceled, никаких auto-Refund: [lifecycle:202–221](<../../../docs/current/payment-lifecycle-spec-v0.12.md#L202-L221>), [API cancel](<../../../docs/current/payment-api-v0.12.openapi.yaml#L467-L478>), [CT-175–190](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1649-L1807>). | Проза согласована; CR-03; functional delivery/signature/recovery NOT_RUN. |
| BR-06 | RUB only, integer 1..9007199254740991/zero metrics, currency once, amounts group; [API:1364–1420](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1364-L1420>), [TS:12–14](<../../../docs/current/acquirer-connector-v0.6.ts#L12-L14>). | 33 supplied schema tests PASS; OD-01. TS number требует runtime safe-integer проверки — явно предусмотрено, не дефект само по себе. Межресурсная арифметика не подтверждена. |
| BR-07 | Собственный PAN/expiry/CVV ввод только в PCI, bank hosted fallback, ACS не card-entry, direct requires rights/PCI: [Checkout:10–30](<../../../docs/current/payment-checkout-design-v0.2.md#L10-L30>), [TS:97–105](<../../../docs/current/acquirer-connector-v0.6.ts#L97-L105>), [CF-23–30](<../../../docs/current/checkout-contract-cases-v0.2.yaml#L71-L94>). | CR-05/06/09; OD-03. Требование согласовано, реализация/PCI/WOF не доказаны. Все 17 bank capability статусов unknown ([profile:26–96](<../../../docs/current/tkb-connector-profile-v0.2.yaml#L26-L96>)). |
| NAME-01 | Схема и проверяемые TS property имена <=2 snake_case: [норма:7–14](<../../../docs/current/payment-naming-conventions-v1.1.md#L7-L14>), [checker:21–23,67–75](<../../../docs/current/check-payment-names-v1.4.py#L21-L23>). | PASS: 220 OpenAPI/76 regex TS, 0 violations; реальных SQL migrations не проверялось. Enum values capability-кодов и внешний wire не переименовывались; внутренние inline TS-поля не все попадают в простой regex — отсутствие regex violation не равно полному AST-анализу. |

## 5. Что подтверждено и что ещё не проверено

**Подтверждено локально:** все 4 current YAML парсятся без дублирующихся ключей; 26 уникальных operationId, 39 схем, 212 локальных refs разрешаются; 9 включённых примеров соответствуют схемам; все path parameters объявлены required; 4 Python-файла синтаксически корректны; supplied static pipeline проходит в системном venv. Отдельные точные дефекты/пробелы CR-01—09 подтверждены текстом или CE01—07.

**Не подтверждено:** денежная идемпотентность, atomic DB блокировки, корректные runtime financial states, источники окончательных банковских результатов, callback authenticity, реестры/сверка, 100 RPS, browser session security, реальная PCI readiness, 3DS/frictionless/challenge, доступ терминала, собственный card-entry и fallback end-to-end. Все 215 CT и 30 CF остаются описаниями с NOT_RUN; subset статических требований проверен отдельно, статусы в YAML не изменялись.

**Предлагаемое действие родителю:** завести отдельные review issues/PR для CR-01—09; прежде чем создавать симулятор, согласовать технические ответы OD-01—06. Не запускать существующий Postman, не тестировать банковские операции ради закрытия статической находки. Не менять BR при устранении технических противоречий.

Изменений existing code/current docs, git add/commit/push, смены ветки нет. Этот аудит не является PCI assessment и не подтверждает production readiness.
