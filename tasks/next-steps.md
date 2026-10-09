# Next steps — приоритетный план после первичного аудита

**Дата:** 2026-10-09. **Ветка:** `research/initial-audit`. **Исходная ревизия:** `97784b9`.
**Статус:** план предложен, реализация следующих этапов не начата. Он **не даёт банковского допуска** и не меняет BR.

## 1. Порядок и ограничения

Первичная итерация закрывает анализ и документацию. Следующая начинается с review [аудита](<../reports/initial-audit.md>), [вопросов](<../reports/open-questions.md>) и [RFC-001](<../docs/changes/RFC-001-initial-audit.md>). Масштабный платёжный core до review не разрабатывать. Внешние банковские обращения — отдельный допуск; пока доступны только безопасные локальные synthetic mock/статические проверки.

| ID / P | Работа / ответственный | Зависимости | Проверяемый результат / DoD |
|---|---|---|---|
| N-01 / P0 | Review первичного аудита; заказчик + аналитик | Эта итерация | Зафиксированы решения/отложенные вопросы по Q-01—Q-07; технический RFC принят/возвращён. Ни тишина, ни бизнес-review не равны допуску к банку |
| N-02 / P0 | Защитить приватные материалы/секреты; security + владелец | До любого staging/запуска | Explicit ignore/exclude либо protected storage; originals/environment/private derivatives не tracked; dry secret scan; политика доступа/retention/ротации потенциально раскрытых ключей. Не делать массовый git add |
| N-03 / P0 | Зафиксировать актуальный протокол и права ТКБ; аналитик + банк | Вопросы B-01—B-12/G-02 | Versioned wire schemas, terminal/method/mode permissions, test outcomes, status/evidence/retry/correlation matrix. Все unknown сохраняются до доказательства |
| N-04 / P0 | Правовая/расчётная модель и онбординг; владелец + юрист + банк | Q-01/Q-02 | Договорные роли, движение выручки/комиссий, допустимые merchant категории/НПД, дистанционные стадии/исключения. Не принять историческую гипотезу за утверждение |
| N-05 / P0 | PCI/security dataflow и допуск; security/QSA + аналитик | G-01/G-03, текущие источники | Threat/boundary diagram Browser→PCI→Bank отдельно Core; PAN/CVV sinks/lifetime, vault, script inventory, telemetry off, origin/ACS/return/session rules. Mock proof не называется attestation |
| N-06 / P0 | Operation-specific outcomes/evidence/continuation; аналитик | Review RFC, N-03 для bank-specific частей | Таблица debit/authorize/capture/void/refund; currency/remainder evidence; private continuation/actions/card-ref/session; buyer-action proof. Отказ capture не уничтожает живой hold |
| N-07 / P1 | Синхронизировать ссылки/кейсы/schemas; аналитик + инженер | Review RFC/N-06 | Новая черновая версия, changelog, CT-73/CT-123/CF-01 исправлены; multi_capture false; event tagged union; URL/metadata hardening; regression fixtures + current validate/TS compile, BR не изменены |
| N-08 / P1 | Capability/routing и event contract; аналитик | N-06/N-07 | Явные SPI→product/form mapping и совместные route constraints; signed event envelope/version/id/retry/dedup, один источник исполнения заказа; банк/режим freeze после potential send |
| N-09 / P1 | Узкий simulator/core vertical slice; инженер + аналитик | Review аудита, N-06—N-08 | Исполняемые tests с привязкой к CT/CF/LC ID и отчётом actual PASS/FAIL/NOT_RUN. Прямой Payment + управляемый Intent, durable dispatch, резервы, recovery/outbox; без bank/PAN runtime |
| N-10 / P1 | Clean-room offline WOF/3DS harness; инженер/security | N-03 протокол, N-05, N-06 | Подпись фактических байтов на synthetic fixtures, allowlisted transport, one command, sanitized evidence/logs, browser runner security. Raw Postman/reference apps не импортируются |
| N-11 / P1 | Разрешённый TKB sandbox feasibility; аналитик + банк | N-03/N-05/N-10 и явные gates ниже | Реальные WOF/3DS2 тесты только по допуску, ограниченные терминалом/методом/дата/условиями; финальный банк-исход и merchant webhook доказаны независимо browser return |
| N-12 / P2 | Checkout UX/embed и regressions; аналитик + frontend | N-05/N-08, N-09/N-11 по части live | Свой ввод карты + provider fallback, СБП, один accent/контраст/доступность, reload/две вкладки/session isolation. Все 30 CF исполняются поэтапно, не объявляются пройденными пачкой |
| N-13 / P2 | Recovery/сверка/операционная readiness; аналитик + ops | N-03/N-09/N-11, Q-06/Q-07 | Reconciliation/incident runbooks, unknown escalation, late evidence, refund/reversed, no auto-refund, retention/backup/DR; контролируемые компенсирующие действия |
| N-14 / P2 | Нагрузка ≥100 RPS public API; инженер | Исполняемый slice и утверждённые SLO | Workload mix/период/данные/latency/error budget, race/restart/дублей нет. Отдельно нагрузка public API/симулятора и банковский limiter; реальный банк не нагружать 100 RPS без отдельного допуска |

Правовой анализ, банковские ответы и mock/security-проектирование можно вести параллельно; **financial execution не параллелен отсутствующим допускам**. Сроки/оценки трудоёмкости выдаются после N-01/N-03/N-05, не обещаются по числу YAML.

## 2. Минимальный исполняемый simulator набор (после review)

Приоритизировать денежные инварианты, не полный продукт:

1. Direct confirm только первичный; failed финален, следующий Payment новый (CT-04 и прямые кейсы).
2. Intent confirm с одинаковым ключом → исходный child; разные ключи одновременно → один активный child; unknown запрещает новый (CT-55—60, LC-38/39).
3. Снимок TTL/попыток, dispatch boundary, proven-not-sent vs possible-sent; expiry/limit/risk не финальность денег.
4. Capture success с доказанным remainder, child reduce, запрет второго успешного capture; declined capture/void сохраняет живой hold (CT-29/31/126, CT-132—143).
5. Refund accepted/pending/unknown/reserve; отказ/refund evidence/reversed/dedup, две конкурирующие суммы 70% без overrefund.
6. Поздний успех до canceled → Payment/Intent succeeded + cancel failed + outbox, без Refund; после доказанного canceled → incident.
7. Crash до dispatch/после possible send/до apply/outbox, повтор callback/неупорядоченность/неправильная сумма или валюта.
8. Capabilities/form/merchant scope, UI session/buyer action, no PAN/CVV/token in metadata/core/outputs; safe browser return не меняет деньги.

Источники: [215 декларативных cases](<../docs/current/acquirer-connector-contract-tests-v0.9.yaml>), [30 Checkout cases](<../docs/current/checkout-contract-cases-v0.2.yaml>), [LC-приёмка](<../docs/current/payment-lifecycle-spec-v0.12.md#L649-L743>), [TASK-002](<002-core-simulator.md>). У runner должна быть отдельная таблица actual coverage: фикстура/mock PASS не обновляет bank capability в supported.

## 3. Практическая проверка TKB PAY WOF / 3-D Secure 2.0

### 3.1. Проверяемые гипотезы

- H1: разрешённый test terminal принимает актуальный WOF ECOM wire-контракт. Наличие endpoint в collection — не доказательство.
- H2: можно выполнить предусмотренные frictionless и ACS challenge ветки с нашей формой, без PAN/CVV в Merchant API/Core/логах/telemetry.
- H3: аутентификация и financial finish коррелируют с исходным Payment/Operation; итог debit/hold устанавливается независимым достаточным bank evidence.
- H4: possible-send timeout/unknown блокирует второй finish, provider fallback/другой банк и нового ребёнка до выяснения; безопасный replay только по method-specific гарантиям.
- H5: single partial capture подтверждает реальную paid сумму и закрытие remainder; Refund accepted не mistaken for succeeded; individual modification refs достаточны для recovery.

Все H1—H5 **ещё не испытаны**. Основные методы/поля и гипотезы flow — [банковская матрица](<../reports/results/audit/bank-reference-review.md#L53-L119>).

### 3.2. Gates до любого банковского запуска

| Gate | Предусловие | Текущий статус |
|---|---|---|
| G0 | Право анализа/reuse, privacy/retention, raw secrets/originals вне Git, clean logging | Статический доступ дан; reuse/storage policy требует review |
| G1 | Письменный допуск owner+банк: exact sandbox allowlist, terminal в маске, методы/mode, тестовые сценарии/суммы/общий бюджет/окно и контакты | **BLOCKED — допуска нет** |
| G2 | Разрешённый изолированный test-only card perimeter, bank test cards через защищённый канал, no persistence/telemetry, security/PCI условия | **BLOCKED — не согласован** |
| G3 | Актуальные request/response/status/3DS схемы и роли, signature bytes, authenticated callback/lookup/remainder/refund доказательства | **BLOCKED — документация неполна** |
| G4 | Idempotency scope/TTL/body mismatch по каждому финансовому endpoint и утверждённая duplicate procedure | **BLOCKED для replay — гарантии не получены** |
| G5 | Ревью test harness: outbound allowlist, одна активная денежная команда, clean evidence, limiter/status cache, stop/cleanup | **NOT_RUN — harness ещё не реализован** |

Одного ALLOW-флага в конфигурации недостаточно. Не выбирать production host из исходного примера. Нефинансовый Hello тоже требует явно согласованного сетевого контура. Нет G2 — только synthetic mock без настоящих реквизитов; нет G4 — никаких банковских duplicate/replay проверок.

### 3.3. Восстановление 3DS протокола, не догадка о порядке

Кандидатная схема **для сверки с банком**, а не готовая инструкция отправки:

```text
сохранить Payment/Operation + route/reference
  → PCI gateway: Check3ds по актуальному контракту
  → 3DS Method (если назначен банком), ограниченный browser action
  → Authenticate3ds
  → frictionless ИЛИ ACS challenge / bound notification
  → Validate3ds (если обязателен в этой ветке)
  → правильный debit/hold Finish в разрешённом состоянии
  → trusted bank status/callback/reconciliation
  → атомарный финансовый факт + Payment/Intent + outbox/webhook
```

Должны быть установлены версии, кто 3DS Server/ACS и владеет state, обязательность/ответы каждого шага, cReq/cRes/legacy несовместимость, transId/session/card-ref scope, timeout/reload/cancel и доказательство отсутствия/наличия финансового эффекта. **Check3ds в примере содержит CardInfo/PAN/CVV**, несмотря название BIN check; его нельзя считать безопасным Core BIN-запросом. Authentication success, iframe load и return URL не доказывают debit. Методы /no3ds и самодельный OTP не использовать как обход. [Раздел flow](<../reports/results/audit/bank-reference-review.md#L81-L101>).

### 3.4. Поэтапная матрица — все проверки NOT_RUN

Подробные шаги/предусловия/evidence каждой строки — [BRV-01—21](<../reports/results/audit/bank-reference-review.md#L188-L214>). Эта таблица задаёт последовательность, не дублирует результаты.

| Этап / IDs | Где и что делать | Что должно быть доказано | Статус |
|---|---|---|---|
| 0 / BRV-01,02,21 | Offline synthetic canaries, HMAC exact bytes, mock browser actions/return/session/Id-vs-ID | Отсутствие sensitive egress/persistence; правильная подпись фактических байтов, single-use action и ресурсная изоляция | NOT_RUN |
| 1 / BRV-03 | По G1/G3/G5 разрешённый Hello | Только transport/auth contract; не финансовая capability | NOT_RUN |
| 2 / BRV-04,05 | Сначала mock; затем отдельно разрешённые provider register и WOF/Check на разных test resources | Hosted fallback до dispatch; terminal/direct rights; CardInfo остаётся в PCI; baseline response/correlation | NOT_RUN |
| 3 / BRV-06,07 | 3DS Method supplied/absent/timeout, bank frictionless vector | Правильный indicator/bound transId; аутентификация отдельно от financial finish и bank finality | NOT_RUN |
| 4 / BRV-08,09 | ACS challenge success/fail/cancel/timeout, reload/закрытие | Сервер проверяет bound callback/auth data; нет второй оплаты; доказанный decline отличается от unknown | NOT_RUN |
| 5 / BRV-10,11,12,17 | Simulator faults/replay/reordering; банк только строго разрешёнными процедурами | Possible-send → durable unknown/route lock; authenticated event/dedup, lookup finality; replay по G4 | NOT_RUN |
| 6 / BRV-13,14,15,16,18 | Отдельные согласованные test holds/refunds/reverse; сначала simulator | Single final capture/remainder; void/expiry evidence; accepted refund не success; несколько refunds только с различимыми refs; no auto-refund | NOT_RUN |
| 7 / BRV-19,20 | По отдельным правам bind/CIT/MIT/revoke и read-only реестры | Token/consent/terminal scope, MIT не hosted-CVV; связь финансовых фактов и сверочных records | NOT_RUN |
| 8 / vertical slice | Наш Intent/Payment → Checkout → PCI → bank WOF/3DS → trusted result → merchant webhook, плюс hosted-only connection fallback | Собственный card-entry + безопасный итог + original amount/final/paid + no duplicate delivery effect; полный критерий BR-07 на конкретном подключении | NOT_RUN |

Не тестировать partial refunds/capture replay «наугад двойным списанием»; использовать отдельные исходные test ресурсы и заранее разрешённый budget. Статус вызова банка и финансовый смысл ответа фиксируются раздельно. Успех одного терминала не означает все merchants/банки.

### 3.5. Stop, recovery и безопасный rollback

Остановить новые commands при неизвестном/неразрешённом host, подозрении live, недостаточных правах, чувствительных данных в sink, несовпадении суммы/валюты/reference, непонятном status, исчерпанном budget или неизвестном исходе отправки.

- **До доказанной отправки:** можно очистить synthetic UI/state или отменить неподанный dispatch по журналу. Это не банковская отмена.
- **После possible send:** сохранить immutable reference/digest/очищенные факты, блокировать повтор/fallback; проверить исход у того же банка по разрешённому interval и при необходимости сверить реестр/эскалировать.
- Не запускать автоматически refund/void/reverse как «откат теста». Компенсация — новая финансовая операция со своим допуском/предусловиями и доказанным исходом исходной.
- Не стирать свидетельства unknown/финансового факта для очистки стенда. Очищать только разрешённые test-only артефакты по retention; CVV не сохранять вообще.
- UI polling читает внутренний cache; bank GetOrderState — консервативно не чаще **1 раза в минуту на исходный банковский order/reference** до подтверждения банком точного лимита, без polling storm. Предлагаемый limiter key: connection/terminal + метод + исходный ExtID; capture/refund/void одного order не получают независимые polling budgets. Точный scope согласовать с банком. [Профиль:164–171](<../docs/current/tkb-connector-profile-v0.2.yaml#L164-L171>).

### 3.6. Evidence protocol и артефакты

Для каждого запуска — отдельный [эксперимент по шаблону](<../reports/templates/experiment.md>): ID/гипотеза, UTC+timezone, revision/harness version, authorization, masked terminal/method/mode, предусловия, безопасные шаги, expected, **observed**, status и ограничения/cleanup. Допустимые статусы PASS/FAIL/BLOCKED/NOT_RUN/INCONCLUSIVE. В reports/results хранить только allowlisted структуры/коды/времена, маскированные ссылки и версии правил; никаких raw bodies, credential values, PAN/CVV или неочищенных токенов.

Планируемые артефакты следующего этапа (ещё не созданы): bank method/status/evidence matrix, подтверждённая 3DS-flow диаграмма, per-test отчёты, минимальный безопасный harness, simulator coverage и summary capabilities по terminal/method/date. Требования [TASK-001](<001-tkb-wof-3ds.md>), [TASK-003](<003-checkout-pci.md>) и [протокола](<../handoff/EXECUTION_PROTOCOL.md>) сохраняются.

## 4. Критерий завершения следующей итерации

Одобренные RFC отражены синхронно в проектах и regression checks; неизвестные банковские свойства явно закрыты документом/конкретным испытанием либо остаются unknown; есть один воспроизводимый offline вертикальный slice с рисковыми гонками. Bank feasibility выполняется только по gates и не является обязательным «успехом любой ценой». STATUS обновляется actual evidence, BR — только отдельным решением заказчика. Production readiness, PCI certification и ≥100 RPS требуют последующих собственных критериев/испытаний.
