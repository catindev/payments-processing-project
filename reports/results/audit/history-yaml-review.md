# Исторический аудит YAML: API и контрактные сценарии

**Срез:** ветка `research/initial-audit`, HEAD `97784b9d69e5f7ce347f84429f69bacc5872cbf0`. **Время статического обзора:** 2026-10-09T20:09:10.754Z. Даты в документах — 2026-10-09; ниже «хронология» означает редакционную последовательность версий, не независимо доказанные даты событий.

**Статус:** полный статический обзор выполнен; банковские/симуляционные сценарии **NOT_RUN**. Изменён только этот новый отчёт; источники не исправлялись, add/commit/push не выполнялись.

## 1. Основание, методика и границы

Приоритет норм взят из [AGENTS.md:7–11](<../../../AGENTS.md#L7-L11>), [payment-processing-decisions-v1.1.md:32–215](<../../../docs/current/payment-processing-decisions-v1.1.md#L32-L215>) и [payment-naming-conventions-v1.1.md:5–14](<../../../docs/current/payment-naming-conventions-v1.1.md#L5-L14>). Контекст прочитан: [PROJECT_CONTEXT.md:13–38](<../../../handoff/PROJECT_CONTEXT.md#L13-L38>); исходная готовность — [STATUS.md:7–18](<../../../handoff/STATUS.md#L7-L18>). История не источник актуальных требований. Не принимались новые продуктовые решения.

1. Путевым glob найдено **19** целевых history YAML: **11** OpenAPI v0.1–v0.11 и **8** suites v0.1–v0.8. В дополнение полностью прочитаны текущие OpenAPI v0.12 и suite v0.9. Поиск по содержимому не заменял полный охват.
2. Каждый файл прочитан через `tools.read` последовательными блоками ≤200 строк; `lines.map(...).join('\n')`, проверены непрерывные `lines.number`, число строк и достижение последней строки. Первый пробный limit2000 оказался byte-truncated (958/1079) и не использовался как доказательство полного охвата.
3. Отдельно обнаружено **построчное** усечение до 2000 символов, не устранимое offset/limit: [payment-api-v0.11.openapi.yaml:10](<../../../docs/history/versions/payment-api-v0.11.openapi.yaml#L10>) и [payment-api-v0.12.openapi.yaml:10](<../../../docs/current/payment-api-v0.12.openapi.yaml#L10>). Точные хвосты двух уже наблюдённых строк восстановлены read-only локальным Node.js-процессингом; полные строки имеют соответственно **2169** и **2248** символов. Побайтовое сравнение всех 21 исходников с read-кэшем показало: все остальные строки совпали; ни одного неохваченного края не осталось. SHA-256 ниже вычислен от исходных UTF-8 байтов, включая заключительный newline.
4. Локальный parser `yaml` проверил уникальность ключей и полный AST. Строгий parse: **18/19 history**, **2/2 current**, итого **20/21 PASS**; единственный FAIL — duplicate key в историческом API v0.7. Для анализа этой единственной версии использована явно обозначенная last-key-wins проекция, а потерянное первое описание проверено отдельно по исходным строкам.
5. Сравнение выполнялось локально по всем узлам соседних AST, а suites — по устойчивому `cases[].id`, не индексам. Новые/изменённые фрагменты перечислены в приложениях; неизменённые значения не повторяются. Для строковых описаний показываются все добавленные/удалённые word-diff фрагменты с коротким контекстом; для enum/required — set delta. Изменения YAML-комментариев проверены дополнительно. Счётчик AST-fragments — техническая гранулярность сравнения, не число требований. В списках объектов (например tags) индексные перестановки также видны, но не трактуются как новые бизнес-правила.
6. Дополнительное точечное сопоставление старых имён выполнено по [acquirer-connector-v0.6.ts:45–71](<../../../docs/current/acquirer-connector-v0.6.ts#L45-L71>) и [acquirer-connector-v0.6.ts:121–142](<../../../docs/current/acquirer-connector-v0.6.ts#L121-L142>); полный аудит TS/банковских профилей не заявляется. Checkout-suite за рамками этого охвата.

Ни YAML-сценарий, ни локальный parse не подтверждают поддержку банка, PCI readiness, production readiness либо 100 RPS. Это прямо запрещено [AGENTS.md:17–31](<../../../AGENTS.md#L17-L31>) и оговорено [STATUS.md:12–18](<../../../handoff/STATUS.md#L12-L18>).

## 2. Полный inventory / provenance

История: **27 030 строк / 1 309 083 байта**. Current-comparators: **4 142 строки / 208 166 байт**. Всего: **31 172 строки / 1 517 249 байт / 21 файл**. Диапазон каждой строки ниже прочитан целиком.

| Файл и полный диапазон | Строки | Байты | Версия внутри | Paths / операции / schemas либо cases | Strict YAML | SHA-256 исходных байтов |
|---|---:|---:|---|---|---|---|
| [payment-api-v0.1.openapi.yaml:1–680](<../../../docs/history/versions/payment-api-v0.1.openapi.yaml#L1-L680>) | 680 | 26808 | `0.1.0` | 16 / 17 / 16 | PASS | `47f92906961a9203fabe3a3e19afd69a5235e0b001a2a2627364164b3a1128fd` |
| [payment-api-v0.2.openapi.yaml:1–1188](<../../../docs/history/versions/payment-api-v0.2.openapi.yaml#L1-L1188>) | 1188 | 44880 | `0.2.0-draft` | 17 / 18 / 25 | PASS | `447f3ec84c779301e8733f2fa7525df3c945f51fe14b7da8463a688b7cfc0a30` |
| [payment-api-v0.3.openapi.yaml:1–1545](<../../../docs/history/versions/payment-api-v0.3.openapi.yaml#L1-L1545>) | 1545 | 66097 | `0.3.0-draft` | 22 / 24 / 29 | PASS | `d7ab92aa919f29dad705afb6cffb50b5fd60a30a0426af49216ceb21937eaeef` |
| [payment-api-v0.4.openapi.yaml:1–1595](<../../../docs/history/versions/payment-api-v0.4.openapi.yaml#L1-L1595>) | 1595 | 70681 | `0.4.0-draft` | 22 / 24 / 31 | PASS | `6e398188399e91d75acecaefb2201e295e3abb385a632c924bd00207b37386f9` |
| [payment-api-v0.5.openapi.yaml:1–1701](<../../../docs/history/versions/payment-api-v0.5.openapi.yaml#L1-L1701>) | 1701 | 76575 | `0.5.0-draft` | 23 / 26 / 33 | PASS | `76c84f63335274bdd5e9dcc8f0bf4a59f83f539e6f7281b11c360cbb6a171866` |
| [payment-api-v0.6.openapi.yaml:1–1708](<../../../docs/history/versions/payment-api-v0.6.openapi.yaml#L1-L1708>) | 1708 | 78183 | `0.6.0-draft` | 23 / 26 / 33 | PASS | `4d6180f669739715b036604fc76a0050daab0075493f30f3633eaa00f69fefc6` |
| [payment-api-v0.7.openapi.yaml:1–1734](<../../../docs/history/versions/payment-api-v0.7.openapi.yaml#L1-L1734>) | 1734 | 81099 | `0.6.0-draft` | 23 / 26 / 33 | FAIL duplicate key | `90cdc757cb6bac5c41ef4b26bc0f5747cb83e6cc7c9b2d5ecf9adafcfb1d70cd` |
| [payment-api-v0.8.openapi.yaml:1–1796](<../../../docs/history/versions/payment-api-v0.8.openapi.yaml#L1-L1796>) | 1796 | 87119 | `0.8.0-draft` | 23 / 26 / 34 | PASS | `7c714e89c3e9926e5b1d18ba37f18ab1d51af5ac2a8564f47a9e1989cb34840f` |
| [payment-api-v0.9.openapi.yaml:1–1873](<../../../docs/history/versions/payment-api-v0.9.openapi.yaml#L1-L1873>) | 1873 | 93204 | `0.9.0-draft` | 23 / 26 / 36 | PASS | `505c4c344b5e5fa3800980bf06f35a42aae1bde6ce1963afd89d2a05b3a3d4d3` |
| [payment-api-v0.10.openapi.yaml:1–1886](<../../../docs/history/versions/payment-api-v0.10.openapi.yaml#L1-L1886>) | 1886 | 94184 | `0.10.0-draft` | 23 / 26 / 37 | PASS | `fe7c79619407c7bef94f06ec3844077ad7d817ce7e81c3291452f09f61b6ec9a` |
| [payment-api-v0.11.openapi.yaml:1–2085](<../../../docs/history/versions/payment-api-v0.11.openapi.yaml#L1-L2085>) | 2085 | 98989 | `0.11.0-draft` | 23 / 26 / 39 | PASS | `f6ddec2e54e934f12f6bb50e77a3caa4a78d2547681bd98b794b15ff2acfb474` |
| [payment-api-v0.12.openapi.yaml:1–2085](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1-L2085>) | 2085 | 99328 | `0.12.0-draft` | 23 / 26 / 39 | PASS | `52a9f1b5c612a8e99ff04f4a64455ffe1b99089dd5159006bca36c5ce603b2d9` |
| [acquirer-connector-contract-tests-v0.1.yaml:1–479](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.1.yaml#L1-L479>) | 479 | 22661 | `0.1-draft` | 52 cases | PASS | `0ac729419e3a07264270393687affa65c3bd384446a462d87099397d21e89513` |
| [acquirer-connector-contract-tests-v0.2.yaml:1–713](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.2.yaml#L1-L713>) | 713 | 35994 | `0.2-draft` | 77 cases | PASS | `9c51dbf3b867ac86ce98f587862a7aa5c80705e1bdb7eda6823a6090fcf100aa` |
| [acquirer-connector-contract-tests-v0.3.yaml:1–899](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.3.yaml#L1-L899>) | 899 | 48535 | `0.3-draft` | 97 cases | PASS | `a2ef0ff1f09b7fe33742dcf57d5efc944ad4e0fe629aff78b7c01c6a984f41fd` |
| [acquirer-connector-contract-tests-v0.4.yaml:1–1079](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.4.yaml#L1-L1079>) | 1079 | 57769 | `0.4-draft` | 117 cases | PASS | `068b67e9b8c93cbf258782e87351c497c4dfba659807d6a1ff3c460f3d6a4af4` |
| [acquirer-connector-contract-tests-v0.5.yaml:1–1218](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.5.yaml#L1-L1218>) | 1218 | 65538 | `0.5-draft` | 131 cases | PASS | `f2a3d17f4094e93b9f25928240f7a397e2f874339e07f21fdc0ec8c74266b559` |
| [acquirer-connector-contract-tests-v0.6.yaml:1–1377](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.6.yaml#L1-L1377>) | 1377 | 73958 | `0.6-draft` | 147 cases | PASS | `240605340c43ed8b9bc3ec5a6da865d6f4e5121eb2e54a7fa4af675fa0acef3a` |
| [acquirer-connector-contract-tests-v0.7.yaml:1–1617](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.7.yaml#L1-L1617>) | 1617 | 86848 | `0.7-draft` | 171 cases | PASS | `1ccf663f0697d82df66095b20101162921ac4e670e6fda3e74e538f7af7ea258` |
| [acquirer-connector-contract-tests-v0.8.yaml:1–1857](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.8.yaml#L1-L1857>) | 1857 | 99961 | `0.8-draft` | 195 cases | PASS | `23e6c4a5b3b5060a6a4f742e9fbce07428f397cdce209e7aee0f7ab29cbb81e3` |
| [acquirer-connector-contract-tests-v0.9.yaml:1–2057](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1-L2057>) | 2057 | 108838 | `0.9-draft` | 215 cases | PASS | `5e72e279876e59ebf2cfb6084309fa58cc69a7d058e8d8d8a18a1652845095cb` |

### 2.1. Сценарии: версии не являются независимыми доказательствами

- Исторические suites содержат **987 case-records**, но только **195 уникальных IDs CT-01…CT-195**. Current содержит **215 уникальных IDs CT-01…CT-215**. Суммирование всей цепочки даёт **1202 записи**, не 1202 теста/эксперимента.
- Каждая следующая suite сохраняет все прежние IDs, **удалений 0**, добавляет 25/20/20/14/16/24/24/20. На восьми переходах есть **36 редакций существующих cases**, затронувших **32 уникальных ID**. Это не доказанные результаты прогонов.
- Во всех 9 suites `run_status=NOT_EXECUTED`; все 1202 записи имеют `result=not_run`. Не найдено PASS/FAIL банковского исполнения.
- Current: **197 simulator_first +18 static_only**; **117 generic +7 tkb +91 core_only**. `simulator_first` — указание предполагаемого способа запуска, не факт запуска; `core_only` не требует обращения к банку.

| Suite / источники | Cases | Новые IDs | Изменены прежние cases | Execute_on | Bank_scope |
|---|---:|---|---|---|---|
| [acquirer-connector-contract-tests-v0.1.yaml:1–12](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.1.yaml#L1-L12>) | 52 | CT-01…CT-52 (+52) | 0 | simulator_first=52 | generic=48; tkb=4 |
| [acquirer-connector-contract-tests-v0.2.yaml:1–12](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.2.yaml#L1-L12>) | 77 | CT-53…CT-77 (+25) | CT-04, CT-09, CT-12, CT-13, CT-19, CT-42 | simulator_first=77 | generic=73; tkb=4 |
| [acquirer-connector-contract-tests-v0.3.yaml:1–12](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.3.yaml#L1-L12>) | 97 | CT-78…CT-97 (+20) | CT-04, CT-55, CT-73 | simulator_first=97 | generic=93; tkb=4 |
| [acquirer-connector-contract-tests-v0.4.yaml:1–12](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.4.yaml#L1-L12>) | 117 | CT-98…CT-117 (+20) | 0 | simulator_first=117 | generic=93; tkb=4; core_only=20 |
| [acquirer-connector-contract-tests-v0.5.yaml:1–12](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.5.yaml#L1-L12>) | 131 | CT-118…CT-131 (+14) | CT-77 | simulator_first=131 | generic=93; tkb=5; core_only=33 |
| [acquirer-connector-contract-tests-v0.6.yaml:1–12](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.6.yaml#L1-L12>) | 147 | CT-132…CT-147 (+16) | CT-45, CT-53, CT-61, CT-62, CT-63, CT-66, CT-77, CT-92, CT-118, CT-119, CT-121, CT-128, CT-131 | simulator_first=144; static_only=3 | generic=93; tkb=5; core_only=49 |
| [acquirer-connector-contract-tests-v0.7.yaml:1–12](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.7.yaml#L1-L12>) | 171 | CT-148…CT-171 (+24) | 0 | simulator_first=167; static_only=4 | generic=107; tkb=6; core_only=58 |
| [acquirer-connector-contract-tests-v0.8.yaml:1–12](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.8.yaml#L1-L12>) | 195 | CT-172…CT-195 (+24) | 0 | simulator_first=190; static_only=5 | generic=116; tkb=7; core_only=72 |
| [acquirer-connector-contract-tests-v0.9.yaml:1–12](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1-L12>) | 215 | CT-196…CT-215 (+20) | CT-67, CT-77, CT-131, CT-132, CT-134, CT-135, CT-136, CT-139, CT-140, CT-141, CT-142, CT-144, CT-147 | simulator_first=197; static_only=18 | generic=117; tkb=7; core_only=91 |

## 3. Хронология контракта API и сценариев

| Редакция API | Существенная семантика | Suite и развитие сценариев |
|---|---|---|
| [payment-api-v0.1.openapi.yaml:28–680](<../../../docs/history/versions/payment-api-v0.1.openapi.yaml#L28-L680>) | База: **16 paths / 17 операций / 16 schemas**. Money={value,currency}; плоские суммы Payment, общие capabilities-флаги. Refund пока без reversed. | [acquirer-connector-contract-tests-v0.1.yaml:12–479](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.1.yaml#L12-L479>): 52 базовых cases — lifecycle, unknown, idempotency, деньги, безопасность, TKB. |
| [payment-api-v0.2.openapi.yaml:971–1148](<../../../docs/history/versions/payment-api-v0.2.openapi.yaml#L971-L1148>) | Скалярные суммы + RUB, safe-integer limits; PaymentAmounts и резервы; debit; RefundStatus/PublicOperationStatus с reversed; GET одной операции; capabilities по методам. Повтор внутри Payment после отказа ещё допускается черновиком. | Денежный формат здесь **предложен**, но BR-06 ещё не согласовано. Не задним числом считать это бизнес-утверждением. |
| [payment-api-v0.3.openapi.yaml:43–233](<../../../docs/history/versions/payment-api-v0.3.openapi.yaml#L43-L233>) | BR-01: опциональный Intent; 5 новых paths / 6 операций; отдельные последовательные дочерние Payment. Payment.failed финален; повтор — только новый Payment по действию покупателя. | [acquirer-connector-contract-tests-v0.2.yaml:484–713](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.2.yaml#L484-L713>): CT-53…77 (+25); исправлены CT-04/09/12/13/19/42. |
| [payment-api-v0.4.openapi.yaml:1357–1549](<../../../docs/history/versions/payment-api-v0.4.openapi.yaml#L1357-L1549>) | BR-02: expires_at, attempts, can_confirm, closure_reason. Нет финального failed/expired/canceled при unknown или активном холде. Числовые нормы ещё открыты. | [acquirer-connector-contract-tests-v0.3.yaml:717–899](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.3.yaml#L717-L899>): CT-78…97 (+20); уточнены CT-04/55/73. |
| [payment-api-v0.5.openapi.yaml:33–72](<../../../docs/history/versions/payment-api-v0.5.openapi.yaml#L33-L72>) | BR-02.1: default 1800s и диапазон 300–86400s; default 5 попыток, диапазон 1–10. Снимок/revision, разделение раскрытия риска; проект settings GET/PATCH. | [acquirer-connector-contract-tests-v0.4.yaml:900–1079](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.4.yaml#L900-L1079>): CT-98…117 (+20). **CT-73 при этом не синхронизирован.** |
| [payment-api-v0.6.openapi.yaml:1311–1323](<../../../docs/history/versions/payment-api-v0.6.openapi.yaml#L1311-L1323>) | BR-03.1: один успешный окончательный capture; final_capture ещё enum[true]. Остаток не объявляется освобождённым по арифметике. | [acquirer-connector-contract-tests-v0.5.yaml:1079–1218](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.5.yaml#L1079-L1218>): CT-118…131 (+14); CT-77 уточняет ещё открытую BR-03.2. |
| [payment-api-v0.7.openapi.yaml:1323–1337](<../../../docs/history/versions/payment-api-v0.7.openapi.yaml#L1323-L1337>) | BR-03.2 + NAME-01: reduce, amount_final, intent_id/method_id/method_type/save/last_payment/paid_payment/multi_capture; final_capture удалён. Есть исторические defects version/duplicate description. | [acquirer-connector-contract-tests-v0.6.yaml:1219–1377](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.6.yaml#L1219-L1377>): CT-132…147 (+16); 13 прежних cases синхронизированы. |
| [payment-api-v0.8.openapi.yaml:1362–1407](<../../../docs/history/versions/payment-api-v0.8.openapi.yaml#L1362-L1407>) | BR-04: доказательство исполнения Refund; completed_at/reversed_at; RefundEvent; исправлены оба дефекта API v0.7. | [acquirer-connector-contract-tests-v0.7.yaml:1379–1617](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.7.yaml#L1379-L1617>): CT-148…171 (+24), включая частичное обратное движение как точную коррекцию/инцидент, не ложный полный reversed. |
| [payment-api-v0.9.openapi.yaml:1376–1428](<../../../docs/history/versions/payment-api-v0.9.openapi.yaml#L1376-L1428>) | BR-05: CancelInfo/CancelEvent; поздний успех до доказанного canceled = succeeded + cancel.failed; противоречие после canceled = сверка. Автоматического Refund нет. | [acquirer-connector-contract-tests-v0.8.yaml:1619–1857](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.8.yaml#L1619-L1857>): CT-172…195 (+24). based_on bank profile регрессирует v0.3→v0.1. |
| [payment-api-v0.10.openapi.yaml:1662–1803](<../../../docs/history/versions/payment-api-v0.10.openapi.yaml#L1662-L1803>) | BR-06: ответ Intent amount/amount_final/amount_paid → amounts.requested/final/paid; входной amount остаётся. Денежная семантика BR-03.2 не меняется. | [acquirer-connector-contract-tests-v0.9.yaml:1859–2057](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1859-L2057>): CT-196…215 (+20); 13 прежних cases синхронизированы. |
| [payment-api-v0.11.openapi.yaml:2005–2037](<../../../docs/history/versions/payment-api-v0.11.openapi.yaml#L2005-L2037>) | Checkout draft: CheckoutInfo/FormCapability. PAN/CVV не в Merchant API. 23 paths /26 операций /39 schemas. | Acquirer-suite не получает BR-07 блока. Отдельный Checkout-suite не входил в этот аудит. |
| [payment-api-v0.12.openapi.yaml:2005–2037](<../../../docs/current/payment-api-v0.12.openapi.yaml#L2005-L2037>) | Current: структура не меняется. 5 AST-fragments title/version/description/Checkout.url/platform уточняют BR-07: URL/redirect не равны собственному вводу карты. | Current acquirer-suite остаётся v0.9 и ссылается на API v0.10. |

## 4. Исчезнувшие противоречия и ложноположительные «старые поля»

| Проверка | Раннее свидетельство | Исправление / нынешняя трактовка | Вывод |
|---|---|---|---|
| Возобновление прежнего Payment после отказа | [payment-api-v0.2.openapi.yaml:1045–1046](<../../../docs/history/versions/payment-api-v0.2.openapi.yaml#L1045-L1046>); [acquirer-connector-contract-tests-v0.1.yaml:39–47](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.1.yaml#L39-L47>) | [payment-api-v0.3.openapi.yaml:369–373](<../../../docs/history/versions/payment-api-v0.3.openapi.yaml#L369-L373>); [acquirer-connector-contract-tests-v0.2.yaml:41–49](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.2.yaml#L41-L49>), затем [acquirer-connector-contract-tests-v0.3.yaml:42–51](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.3.yaml#L42-L51>). | PASS: старое поведение не переносить в current. |
| Refund schema ещё без reversed, хотя ранний case ожидает обращение | [payment-api-v0.1.openapi.yaml:562](<../../../docs/history/versions/payment-api-v0.1.openapi.yaml#L562>); [acquirer-connector-contract-tests-v0.1.yaml:345–353](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.1.yaml#L345-L353>) | [payment-api-v0.2.openapi.yaml:1070–1076](<../../../docs/history/versions/payment-api-v0.2.openapi.yaml#L1070-L1076>); финальность уточняет [payment-api-v0.8.openapi.yaml:1403–1407](<../../../docs/history/versions/payment-api-v0.8.openapi.yaml#L1403-L1407>). | PASS эволюции схемы; эти источники не отчёты о прогоне. |
| Сроки/числа попыток ещё не согласованы | [payment-api-v0.4.openapi.yaml:1390–1393](<../../../docs/history/versions/payment-api-v0.4.openapi.yaml#L1390-L1393>); [acquirer-connector-contract-tests-v0.3.yaml:668–678](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.3.yaml#L668-L678>) | [payment-api-v0.5.openapi.yaml:1401–1429](<../../../docs/history/versions/payment-api-v0.5.openapi.yaml#L1401-L1429>); [payment-processing-decisions-v1.1.md:67–89](<../../../docs/current/payment-processing-decisions-v1.1.md#L67-L89>). | PASS API, но старый CT-73 остался: H-YAML-01. |
| Публичный final_capture сначала допускает будущее false, потом только true | [payment-api-v0.2.openapi.yaml:1057–1068](<../../../docs/history/versions/payment-api-v0.2.openapi.yaml#L1057-L1068>); [payment-api-v0.6.openapi.yaml:1309–1323](<../../../docs/history/versions/payment-api-v0.6.openapi.yaml#L1309-L1323>) | Удалён [payment-api-v0.7.openapi.yaml:1319–1337](<../../../docs/history/versions/payment-api-v0.7.openapi.yaml#L1319-L1337>); current [payment-api-v0.12.openapi.yaml:420–428](<../../../docs/current/payment-api-v0.12.openapi.yaml#L420-L428>). Позитивное true убрано из CT-118/119 в tests v0.6. | PASS. Current CT-45/121/128 с false — **негативные** проверки, не поддержка multicapture. |
| Частичный Intent capture без согласия / неясной final-суммы | [acquirer-connector-contract-tests-v0.2.yaml:703–713](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.2.yaml#L703-L713>); [acquirer-connector-contract-tests-v0.5.yaml:704–713](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.5.yaml#L704-L713>) | [payment-api-v0.7.openapi.yaml:1327–1337](<../../../docs/history/versions/payment-api-v0.7.openapi.yaml#L1327-L1337>); [acquirer-connector-contract-tests-v0.6.yaml:1239–1247](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.6.yaml#L1239-L1247>); current [acquirer-connector-contract-tests-v0.9.yaml:1209–1217](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1209-L1217>). | PASS документирования reduce; исполнение банком не проверено. |
| Длинные публичные имена | [payment-api-v0.6.openapi.yaml:968–973](<../../../docs/history/versions/payment-api-v0.6.openapi.yaml#L968-L973>); [payment-api-v0.6.openapi.yaml:873–875](<../../../docs/history/versions/payment-api-v0.6.openapi.yaml#L873-L875>) | Migration v0.7. Старые payment_intent_id/saved_payment_method_id/payment_method_type/save_for_future_use/latest_payment_id/successful_payment_id/multiple_partial_captures больше не properties current API. | PASS по этой матрице имён. |
| Старые верхнеуровневые денежные поля ответа Intent | [payment-api-v0.9.openapi.yaml:1710–1718](<../../../docs/history/versions/payment-api-v0.9.openapi.yaml#L1710-L1718>) | [payment-api-v0.10.openapi.yaml:1780–1803](<../../../docs/history/versions/payment-api-v0.10.openapi.yaml#L1780-L1803>); current CT-131/132/134/139/142/147 обновлены. | PASS. amount в create/Refund/Operation законен; amount_final в физической БД CT-146 законен по [payment-processing-decisions-v1.1.md:193](<../../../docs/current/payment-processing-decisions-v1.1.md#L193>). |
| Поздний paid после cancel | До BR-05 политика ещё открыта: [payment-api-v0.8.openapi.yaml:202–203](<../../../docs/history/versions/payment-api-v0.8.openapi.yaml#L202-L203>). Это **не** разрешение авто-Refund. | [payment-api-v0.9.openapi.yaml:202–203](<../../../docs/history/versions/payment-api-v0.9.openapi.yaml#L202-L203>); [acquirer-connector-contract-tests-v0.8.yaml:1649–1657](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.8.yaml#L1649-L1657>)/[acquirer-connector-contract-tests-v0.8.yaml:1789–1797](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.8.yaml#L1789-L1797>). | PASS: два разных временных сценария явно разделены. |
| Duplicate key / неверный version API v0.7 | [payment-api-v0.7.openapi.yaml:5](<../../../docs/history/versions/payment-api-v0.7.openapi.yaml#L5>); [payment-api-v0.7.openapi.yaml:872–879](<../../../docs/history/versions/payment-api-v0.7.openapi.yaml#L872-L879>) | [payment-api-v0.8.openapi.yaml:5](<../../../docs/history/versions/payment-api-v0.8.openapi.yaml#L5>); [payment-api-v0.8.openapi.yaml:879–883](<../../../docs/history/versions/payment-api-v0.8.openapi.yaml#L879-L883>). | Исторический FAIL, current не повторяет. |
| capabilities_version / provider_parameters выглядят «старыми» | [acquirer-connector-contract-tests-v0.9.yaml:123–131](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L123-L131>); [acquirer-connector-contract-tests-v0.9.yaml:403–411](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L403-L411>) | Они существуют в SPI: [acquirer-connector-v0.6.ts:62–71](<../../../docs/current/acquirer-connector-v0.6.ts#L62-L71>), [acquirer-connector-v0.6.ts:121–142](<../../../docs/current/acquirer-connector-v0.6.ts#L121-L142>). | **Не дефект по именам.** CT-44 version=99 — shorthand; executable fixture связывать с schema_version. |

## 5. Остаточные проблемы и вопросы для review

### H-YAML-01 — CT-73 всё ещё отрицает согласованный BR-02.1 (FAIL)

[acquirer-connector-contract-tests-v0.9.yaml:666–676](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L666-L676>) по-прежнему утверждает «в промышленной политике числовые значения ещё не согласованы» и требует отсутствия «якобы согласованного числового предела». Текст введён [acquirer-connector-contract-tests-v0.3.yaml:668–678](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.3.yaml#L668-L678>) и не изменён в следующих шести suites. Между тем [payment-processing-decisions-v1.1.md:69–89](<../../../docs/current/payment-processing-decisions-v1.1.md#L69-L89>) и [acquirer-connector-contract-tests-v0.4.yaml:900–908](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.4.yaml#L900-L908>) явно фиксируют 30 минут /5 попыток и диапазоны. Это **сохранившееся** содержательное противоречие. Предложение для отдельного issue/review: проверять допустимость тестового профиля, не отрицая BR-02.1. Источники здесь не исправлялись.

### H-YAML-02 — CT-123 сохранил merchant_connection_id (FAIL именования)

[acquirer-connector-contract-tests-v0.9.yaml:1129–1137](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1129-L1137>) содержит `merchant_connection_id=unknown`, унаследованное из [acquirer-connector-contract-tests-v0.5.yaml:1129–1137](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.5.yaml#L1129-L1137>). Migration tests v0.6 этот case пропустила. Норма — [payment-naming-conventions-v1.1.md:29–32](<../../../docs/current/payment-naming-conventions-v1.1.md#L29-L32>); current SPI использует `connection_id` в [acquirer-connector-v0.6.ts:53–68](<../../../docs/current/acquirer-connector-v0.6.ts#L53-L68>). Это наш нормализованный ID, не wire-поле банка: исключение для ExtId не применимо. Смысл безопасного gate верен; требуется синхронизация имени.

### H-YAML-03 — based_on неявно регрессирует (FAIL traceability, не бизнес-правило)

[acquirer-connector-contract-tests-v0.7.yaml:7–11](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.7.yaml#L7-L11>) использует bank profile v0.3; [acquirer-connector-contract-tests-v0.8.yaml:7–11](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.8.yaml#L7-L11>) переключается на v0.1; [acquirer-connector-contract-tests-v0.9.yaml:7–11](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L7-L11>) сохраняет v0.1. В текущем дереве v0.1 находится в истории: [tkb-connector-profile-v0.1.yaml](<../../../docs/history/versions/tkb-connector-profile-v0.1.yaml>); текущий профиль — [tkb-connector-profile-v0.2.yaml](<../../../docs/current/tkb-connector-profile-v0.2.yaml>). Объяснения перехода в suites нет. Нельзя приписать им evidence актуального профиля. Current ссылки на API/lifecycle v0.10 и decisions v0.9 также показывают scope BR-01…06, а не BR-07. Предложение: явная матрица версионных оснований, без автоматической замены ссылок на latest без review.

### H-YAML-04 — CT-25 неявно задаёт доказательство освобождения остатка (INCONCLUSIVE)

[acquirer-connector-contract-tests-v0.9.yaml:232–240](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L232-L240>) после договорного single_partial_capture ожидает released=40/succeeded «после подтверждения». Не сказано явно, что доказан и исход остатка. Более поздние [acquirer-connector-contract-tests-v0.9.yaml:1169–1177](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1169-L1177>) и [acquirer-connector-contract-tests-v0.9.yaml:1329–1337](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1329-L1337>) запрещают арифметическое освобождение/преждевременную финальность. CT-25 непротиворечив при доказанном полном финальном исходе, но это нужно сделать явным в fixture/precondition. Исполнимого теста для проверки не было; это не FAIL банка.

### H-YAML-05 — Контекстный reduce gate — текст/логика Core, не простая JSON Schema (INCONCLUSIVE)

[payment-api-v0.12.openapi.yaml:1456–1475](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1456-L1475>) описывает запрет reduce=true для прямого Payment /полного capture; [acquirer-connector-contract-tests-v0.9.yaml:1279–1287](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1279-L1287>)/[acquirer-connector-contract-tests-v0.9.yaml:1299–1307](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L1299-L1307>) ожидают его. Схема сама содержит boolean/defaultfalse и не располагает контекстом Intent/суммой авторизации. Нужна runtime-проверка до dispatch; parse не доказывает её реализацию. Техническое ограничение не приписывать как новое бизнес-решение: [payment-processing-decisions-v1.1.md:115–125](<../../../docs/current/payment-processing-decisions-v1.1.md#L115-L125>) требует явного согласия при уменьшении суммы управляемой покупки.

### H-YAML-06 — Исторические метаданные / parse-defect (FAIL history-only)

Title API v0.7 объявляет v0.7, но [payment-api-v0.7.openapi.yaml:5](<../../../docs/history/versions/payment-api-v0.7.openapi.yaml#L5>) =0.6.0-draft. На [payment-api-v0.7.openapi.yaml:875–879](<../../../docs/history/versions/payment-api-v0.7.openapi.yaml#L875-L879>) строгий parser отвергает duplicate description. Last-key-wins скрывает первый текст про on/off-session; эта проекция **не является валидным контрактом**. В API v0.4 header [payment-api-v0.4.openapi.yaml:1](<../../../docs/history/versions/payment-api-v0.4.openapi.yaml#L1>) ещё перечисляет только BR-01 вопреки info BR-02; исправлено [payment-api-v0.5.openapi.yaml:1](<../../../docs/history/versions/payment-api-v0.5.openapi.yaml#L1>). Это не current defects.

## 6. Итог проверок и незапущенных экспериментов

| Проверка | Статус | Значение |
|---|---|---|
| Полнота 19 history +2 current, края и длинные строки | PASS | Проверены непрерывность, полные байты и SHA. |
| Strict YAML history | FAIL агрегатно |18/19 PASS; только API v0.7 duplicate key. Current 2/2 PASS. |
| Эволюция BR-01…06 прослеживается | PASS с остатками | Исправленные противоречия отделены от H-YAML-01…06. |
| Все старые имена/сценарии синхронизированы | FAIL | CT-73, CT-123 и provenance ссылки остались. |
| Core /симулятор /bank contract cases | NOT_RUN |1202 сохранённых записей not_run, без execution evidence. |
| TKB финальность /идемпотентность /partial capture /WOF /3DS | NOT_RUN | Локальный контракт не банковское доказательство. |
| PCI /право /100 RPS /production | NOT_RUN | Эти испытания не проводились. |

Перед переносом старых YAML в fixtures нужен version-aware review H-YAML-01…03 и уточнение H-YAML-04…05. Прямой send_message к агенту e220b4d5-b939-4bb7-954a-7d90a913f562 отклонён (другая родительская сессия); родителю отправлена просьба переслать краткие результаты.

## 7. Полные семантические доказательства — только локально

Исправленное полное evidence сохранено **вне Git-репозитория**, на уровне рабочего workspace: [history-yaml-semantic-evidence.md:1–8221](<../../../../.audit-local/history-yaml-semantic-evidence.md#L1-L8221>). Эта папка не попадает в Git проекта; существующая ignore policy не изменялась.

- **344 API AST-fragments** на11 последовательных переходах.
- **215 первых появлений уникальных caseIDs**, включая базовые52.
- **36 редакций существующих cases**, затрагивающих32 уникальных ID.
- Полные изменения suite metadata (title/version/notice/based_on).
- Все изменённые YAML-комментарии; отдельно первое shadowed описание APIv0.7.
- Все точные ссылки на физические строки исходников и полный inventory с SHA-256.
- Размер локального evidence: **545576 байт /8221 строк**.
- SHA-256 evidence: `3720a20aa30d949582328e33460ab0d8aa114f4ad747165c5487669c13b85689`.

Это локальный append-only материал обзора, не набор банковских HTTP-тел, карточных данных или экспериментальных результатов. В Git-report намеренно не включены тысячи строк повторного каталога/диффа.

### 7.1. Индекс API-дельт

Счётчики ниже — AST-granularity, не число требований. Базовая структура v0.1 полностью включена в coverage; для соседних версий разбирались все изменения.

| Переход | Изменённых AST-fragments | Физические опорные источники |
|---|---:|---|
| v0.1 → v0.2 | 142 | [payment-api-v0.1.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.1.openapi.yaml#L1-L20>) → [payment-api-v0.2.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.2.openapi.yaml#L1-L20>) |
| v0.2 → v0.3 | 36 | [payment-api-v0.2.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.2.openapi.yaml#L1-L20>) → [payment-api-v0.3.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.3.openapi.yaml#L1-L20>) |
| v0.3 → v0.4 | 24 | [payment-api-v0.3.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.3.openapi.yaml#L1-L20>) → [payment-api-v0.4.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.4.openapi.yaml#L1-L20>) |
| v0.4 → v0.5 | 33 | [payment-api-v0.4.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.4.openapi.yaml#L1-L20>) → [payment-api-v0.5.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.5.openapi.yaml#L1-L20>) |
| v0.5 → v0.6 | 9 | [payment-api-v0.5.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.5.openapi.yaml#L1-L20>) → [payment-api-v0.6.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.6.openapi.yaml#L1-L20>) |
| v0.6 → v0.7 | 39 | [payment-api-v0.6.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.6.openapi.yaml#L1-L20>) → [payment-api-v0.7.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.7.openapi.yaml#L1-L20>) |
| v0.7 → v0.8 | 15 | [payment-api-v0.7.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.7.openapi.yaml#L1-L20>) → [payment-api-v0.8.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.8.openapi.yaml#L1-L20>) |
| v0.8 → v0.9 | 13 | [payment-api-v0.8.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.8.openapi.yaml#L1-L20>) → [payment-api-v0.9.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.9.openapi.yaml#L1-L20>) |
| v0.9 → v0.10 | 18 | [payment-api-v0.9.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.9.openapi.yaml#L1-L20>) → [payment-api-v0.10.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.10.openapi.yaml#L1-L20>) |
| v0.10 → v0.11 | 10 | [payment-api-v0.10.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.10.openapi.yaml#L1-L20>) → [payment-api-v0.11.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.11.openapi.yaml#L1-L20>) |
| v0.11 → v0.12 | 5 | [payment-api-v0.11.openapi.yaml:1–20](<../../../docs/history/versions/payment-api-v0.11.openapi.yaml#L1-L20>) → [payment-api-v0.12.openapi.yaml:1–20](<../../../docs/current/payment-api-v0.12.openapi.yaml#L1-L20>) |

Полный diff не теряет описания/required/enum/examples/response refs и различает отсутствующее поле от null. Для duplicate-key версии диагностика сохраняет обе исходные description-строки, а last-key-wins проекция не признаётся валидной схемой.

### 7.2. Полный ledger based_on

Каждая строка представляет объявленное авторами suite основание, **не проверенное банковское capability evidence**. Bare versioned names ниже показаны как значения конфигурации, а физический источник каждого массива дан ссылкой.

| Suite / physical source | Lifecycle | API | Connector contract | Decisions | Bank material |
|---|---|---|---|---|---|
| [acquirer-connector-contract-tests-v0.1.yaml:8–10](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.1.yaml#L8-L10>) | `payment-lifecycle-spec-v0.2.md` | `—` | `acquirer-connector-contract-v0.1.md` | `—` | `TKBPAY-v11042025.postman_collection.json` |
| [acquirer-connector-contract-tests-v0.2.yaml:8–12](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.2.yaml#L8-L12>) | `payment-lifecycle-spec-v0.3.md` | `payment-api-v0.3.openapi.yaml` | `acquirer-connector-contract-v0.2.md` | `payment-processing-decisions-v0.2.md` | `TKBPAY-v11042025.postman_collection.json` |
| [acquirer-connector-contract-tests-v0.3.yaml:9–13](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.3.yaml#L9-L13>) | `payment-lifecycle-spec-v0.4.md` | `payment-api-v0.4.openapi.yaml` | `acquirer-connector-contract-v0.3.md` | `payment-processing-decisions-v0.3.md` | `tkb-connector-profile-v0.2.yaml` |
| [acquirer-connector-contract-tests-v0.4.yaml:8–12](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.4.yaml#L8-L12>) | `payment-lifecycle-spec-v0.5.md` | `payment-api-v0.5.openapi.yaml` | `acquirer-connector-contract-v0.4.md` | `payment-processing-decisions-v0.4.md` | `tkb-connector-profile-v0.2.yaml` |
| [acquirer-connector-contract-tests-v0.5.yaml:7–11](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.5.yaml#L7-L11>) | `payment-lifecycle-spec-v0.6.md` | `payment-api-v0.6.openapi.yaml` | `acquirer-connector-contract-v0.5.md` | `payment-processing-decisions-v0.5.md` | `tkb-connector-profile-v0.3.yaml` |
| [acquirer-connector-contract-tests-v0.6.yaml:7–11](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.6.yaml#L7-L11>) | `payment-lifecycle-spec-v0.7.md` | `payment-api-v0.7.openapi.yaml` | `acquirer-connector-contract-v0.6.md` | `payment-processing-decisions-v0.6.md` | `tkb-connector-profile-v0.3.yaml` |
| [acquirer-connector-contract-tests-v0.7.yaml:7–11](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.7.yaml#L7-L11>) | `payment-lifecycle-spec-v0.8.md` | `payment-api-v0.8.openapi.yaml` | `acquirer-connector-contract-v0.7.md` | `payment-processing-decisions-v0.7.md` | `tkb-connector-profile-v0.3.yaml` |
| [acquirer-connector-contract-tests-v0.8.yaml:7–11](<../../../docs/history/versions/acquirer-connector-contract-tests-v0.8.yaml#L7-L11>) | `payment-lifecycle-spec-v0.9.md` | `payment-api-v0.9.openapi.yaml` | `acquirer-connector-contract-v0.8.md` | `payment-processing-decisions-v0.8.md` | `tkb-connector-profile-v0.1.yaml` |
| [acquirer-connector-contract-tests-v0.9.yaml:7–11](<../../../docs/current/acquirer-connector-contract-tests-v0.9.yaml#L7-L11>) | `payment-lifecycle-spec-v0.10.md` | `payment-api-v0.10.openapi.yaml` | `acquirer-connector-contract-v0.9.md` | `payment-processing-decisions-v0.9.md` | `tkb-connector-profile-v0.1.yaml` |

**Regression:** bank-profile0.3 →0.1 впервые в tests0.8. Наличие исторического v0.1 подтверждено путевым inventory, но его банковская семантика не была предметом данного YAML-аудита. Текущий профиль v0.2 не делает автоматическое переписывание based_on безопасным без обоснования.

### 7.3. Все изменения существующих caseIDs по переходам

| Переход suite | Изменённые прежние cases | Revision count |
|---|---|---:|
| v0.1 →v0.2 | CT-04, CT-09, CT-12, CT-13, CT-19, CT-42 | 6 |
| v0.2 →v0.3 | CT-04, CT-55, CT-73 | 3 |
| v0.3 →v0.4 | нет | 0 |
| v0.4 →v0.5 | CT-77 | 1 |
| v0.5 →v0.6 | CT-45, CT-53, CT-61, CT-62, CT-63, CT-66, CT-77, CT-92, CT-118, CT-119, CT-121, CT-128, CT-131 | 13 |
| v0.6 →v0.7 | нет | 0 |
| v0.7 →v0.8 | нет | 0 |
| v0.8 →v0.9 | CT-67, CT-77, CT-131, CT-132, CT-134, CT-135, CT-136, CT-139, CT-140, CT-141, CT-142, CT-144, CT-147 | 13 |

Изменения показаны по IDs, поэтому переформатирование, переносы строк и добавление новых cases не ошибочно объявляются изменением всех старых сценариев. Ни на одном переходе caseID не удалён.

## 8. Практический handoff: что делать дальше

1. Открыть review/issue на **CT-73**: согласованные числовые нормы не должны отрицаться тестовой формулировкой.
2. Синхронизировать **CT-123** с NAME-01/currentSPI: connection_id вместо merchant_connection_id.
3. Объяснить версионную регрессию bank profile в **based_on**, явно разделить воспроизводимое историческое основание и актуальные материалы.
4. Уточнить preconditions **CT-25**: доказан итог capture и освобождение остатка, не одна арифметика.
5. Реализовать/проверить контекстный **reduce** gate в Core; простого schema parse недостаточно.
6. При переносе сценариев в executable fixtures не принимать их result=not_run за прогон и не запускать банк без отдельных разрешений.
7. Не исправлять согласованные BR под старые тексты. Все предложения выше — review, а не новые продуктовые решения.

## 9. Финальный контроль

- Полнота: **19/19 history +2/2 current**, **31 172/31 172 физических строк**, включая два длинных line10 tails.
- Provenance: **987 historical records /195 historical IDs**; **215 current IDs**, а не1202 независимых теста.
- Источники: **21/21 SHA-256 неизменны** между полным чтением и завершением обзора.
- Links/anchors: проверены существование всех целей и bounds всех известных файлов; генерируемый LineCounter одноразовый. Для APIv0.7 duplicate leaf указывает line879, не shadowed875–878.
- Source changes/add/commit/push/financial calls: **нет**. Сопутствующие отчёты других агентов — параллельная работа, не изменения этого аудитора.
- Банковские возможности, PCI, юридическая готовность, 100RPS/production: **NOT_RUN**, без новых утверждений о подтверждении.
