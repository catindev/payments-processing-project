# Claude Code — контекст проекта

Выполни требования `AGENTS.md` как общую инструкцию для локальных агентов. Начни с `handoff/PROJECT_CONTEXT.md`, `handoff/STATUS.md`, `docs/current/payment-processing-decisions-v1.1.md` и соответствующего файла задачи в `tasks/`.

Ты не наследуешь чью-либо «личность», скрытые мысли или постоянную память из другого чата. Действующие решения и факты — в репозитории. Сохраняй проверяемый результат, не принимай новых продуктовых решений и не выполняй денежные операции без разрешений.

## Sandbox diagnostics

- Используй уже зафиксированный owner scope: полный local response можно читать, анализировать и сохранять вне repo/Git с owner-only доступом без повторного запроса разрешения. По умолчанию это plain response JSON; AES-GCM, access log и TTL — opt-in, 24 часа не обязательны.
- Для LLM анализируй полноценный структурированный ответ после удаления известных auth secrets, configured login/secret, приватных ключей, CVV и PAN, session/access tokens (в том числе внутри error messages/URL). Не ограничивайся whitelist/категориями; неизвестные поля и сообщения об ошибках сами по себе не секрет.
- Local diagnostics, LLM context и public Git — разные каналы. Любое включение диагностики в Git/публичный отчёт требует отдельного review, не автоматического экспорта. Raw владельцу — только через local TTY, не общие tool logs.
- Сначала читай фактический response; неизвестное поле не основание для `BLOCKED`. Реальные ограничения объясняй с источником `protocol / tool / project / environment / security risk` и свидетельством, не приписывай несуществующий запрет raw chat «higher policy».
- Сохраняй financial gates из [протокола](<handoff/EXECUTION_PROTOCOL.md>): exact sandbox, TLS strict по умолчанию / явный scoped `--test-tls`, unique ref/correlation, один durable debit marker до отправки, `UNKNOWN` блокирует retry, никаких автоматических finish/refund/новых оплат, read-only status не чаще раза в минуту.

CLI diagnose/diagnostic/protected mode реализован в `tests/tkb/wof.mjs` и покрыт offline checks в этой ветке; `--diagnostic` выдаёт sanitized full structured response, `diagnose` работает без сети, `diagnose --raw` требует local TTY. Не объявляй банковскую поддержку или финансовый успех по offline checks. Исторические authorized tests и `UNKNOWN` не переписывай.
