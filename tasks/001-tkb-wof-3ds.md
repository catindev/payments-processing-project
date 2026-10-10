# TASK-001 — TKB WOF / 3DS2: проверка реализуемости

**Цель:** доказать или опровергнуть гипотезы о direct-card оплате через TKB PAY WOF с нашей формой. **Это исследование в разрешённом тестовом контуре**, не реализация production PCI.

## Прежде чем выполнять запросы

1. Прочитать `AGENTS.md`, `docs/current/tkb-connector-profile-v0.2.yaml`, `docs/current/payment-checkout-design-v0.2.md`, контракт соединителя и OpenAPI.
2. Использовать уже зафиксированный owner scope: полный фактический sandbox response можно локально читать, анализировать и сохранять вне Git без отдельного запроса на каждое чтение/сохранение. Обычный capture — owner-only plain response JSON; `--encrypted`, `--ttl-hours N`, `--access-log` включаются только opt-in.
3. Для WOF, 3DS2, сохранённых карт, холда и финансовых команд проверить права конкретного test merchant/terminal и условия теста до сетевого вызова; при отсутствии именно этого допуска зафиксировать `BLOCKED` с источником (`protocol` / `tool` / `project` / `environment` / `security risk`) и свидетельством, а не запрещать local diagnostics. Предъявить перечень вопросов `handoff/TKB_OPEN_QUESTIONS.md`.
4. Оригиналы Postman и банковских документов получать **отдельным защищённым каналом, вне Git**; не переносить `console.log(secret,...)` в клиент и общий tool log. Из response для LLM удалять только известные auth secrets, configured login/secret, приватные ключи, CVV/PAN и session/access tokens; неизвестные поля и error messages сами по себе не секрет.
5. Проверить, что сетевое окружение является exact SANDBOX, TLS strict включён (явный scoped `--test-tls` допускается только для разрешённого test-only исключения), а unique ref/correlation и один debit marker созданы до отправки. Не выполнять production/неразрешённые финансовые операции; реальные PAN/CVV не использовать.
6. Если не согласован PCI-контур, экспериментировать с карточной последовательностью только через безопасные mock/предоставленный банком test-only harness; local response диагностика не подменяет PCI-допуск.

Сначала прочитать фактический response, включая неизвестные поля и полную структуру, затем интерпретировать его. Не объявлять `BLOCKED` лишь из-за неизвестной схемы; недостаточное доказательство — `INCONCLUSIVE`, а неизвестный финансовый эффект — `UNKNOWN` и запрет retry.

## Гипотезы и необходимые шаги

- TKB разрешает `/api/v1/card/unregistered/debit/wof` на данном тестовом терминале (наличие endpoint != право вызова).
- Точная последовательность 3DS 2.0: BIN check → authenticate → challenge/frictionless → validate/finish → проверка финального статуса; восстановить **из оригинального протокола**, не додумывать запросы.
- Уточнить семантику ответов: `requires_action`, `accepted`, `succeeded`, `declined`, `unknown` по правилам адаптера, используя полную sanitized structured diagnostic, а не whitelist или только категории.
- Повтор с прежним внешним ID безопасен или опасен? Выяснить договорно/на стенде с безопасной процедурой — не тестировать случайным двойным списанием. `UNKNOWN` блокирует retry и не запускает automatic finish/refund/new payment.
- Чей интерфейс отображает ввод карты, а чей ACS делает challenge; проверить CORS/origin/redirect/return URL только безопасными запросами и ревью документации.
- Отдельно проверить поддержку bank-hosted формы как fallback **до** отправки финансовой команды, не создавать двойную оплату.
- Найти пути способа получения состояния операции и его ограничения, не спамить запросами статуса.

## Артефакты

- `reports/results/tkb/wof-matrix.md` — методы/доступ/входы/ответы/семантика, везде проставить источник/тест ID.
- `reports/results/tkb/3ds-flow.md` — подтверждённая диаграмма и развилки.
- `reports/results/tkb/<date>-<id>.md` — отдельные эксперименты по шаблону.
- `tests/tkb/` — минимальный **безопасный** тестовый клиент, без жёстко заданных credential/card data.
- `reports/results/tkb/summary.md` — PASS / FAIL / BLOCKED / INCONCLUSIVE и предложение правок к коннектору.
- Local raw/complete response — вне Git в owner-only storage; в LLM context — полная sanitized structure; в public Git — только после отдельного content/permission review, без auto-export.
- CLI contract: `node tests/tkb/wof.mjs diagnose [--file NAME|--list]` (offline/no network); `--diagnostic` для сетевого вызова; `diagnose --raw` только local TTY владельца, не общие tool logs; `--encrypted --ttl-hours N --access-log` — opt-in protected mode, `--no-raw` — только projection.

**DoD:** результаты можно воспроизвести; ни один endpoint не объявлен поддерживаемым без точного свидетельства. Для проблем доступа — явный `BLOCKED`, не выдуманный успех; неизвестные поля сами по себе не проблема доступа. Сохраняются gates: exact sandbox, strict TLS/явный scoped `--test-tls`, unique ref/correlation, debit marker до send, `UNKNOWN` блокирует retry, нет automatic finish/refund/new payment, read-only status не чаще раза в минуту. Создан PR, исходные продуктовые решения и исторические authorized tests/`UNKNOWN` не подменены.
