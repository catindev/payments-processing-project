# RFC-002 — безопасный sandbox raw reconciliation

**Статус:** IMPLEMENTED ON `fix/sandbox-diagnostics` — policy and bounded CLI are implemented; PR review and public-Git content review remain required.

## Проблема

Запрет публикации известных секретов и raw HTTP-тел в public Git необходим, но blanket-запрет чтения sandbox response мешает расследованию неизвестного WOF исхода. Нужны отдельные правила для local diagnostics, LLM context и public Git.

## Решение

В ранее разрешённом sandbox scope:

- полный фактический response можно локально читать, анализировать и сохранять вне Git без дополнительного запроса разрешения на каждое чтение/сохранение;
- обычный режим — plain response JSON с owner-only permissions (каталог `0700`, файл `0600`); AES-GCM, `--access-log` и TTL — независимые opt-in параметры protected mode; `--ttl-hours N` задаёт TTL только при явном включении, 24 часа — опция, не обязательная норма;
- для LLM передаётся полная структурированная sanitized response после удаления известных auth secrets, configured login/secret, приватных ключей, CVV/PAN и session/access tokens, включая их в URL, заголовках и error messages; неизвестные поля и error messages сами по себе не секрет;
- local response и LLM context не экспортируются автоматически в public Git или отчёты. Public Git требует отдельного content/permission review; raw artifacts, ключи и local access log остаются вне репозитория;
- `diagnose --raw` требует local TTY и показывает raw только владельцу, не общим tool logs; это не blanket-запрет raw, а граница конкретного канала вывода;
- production и реальные финансовые операции не покрываются этим режимом.

Если диагностика не ограничена реальным `protocol / tool / project / environment / security risk`, неизвестное поле не является причиной `BLOCKED`; сначала читается фактический response. Ограничения и свидетельства должны называться явно; выдуманный higher-policy запрет raw chat не допускается.

### Planned CLI contract

- `node tests/tkb/wof.mjs diagnose [--file NAME|--list]` — offline, no network;
- `--diagnostic` на сетевом вызове — sanitized full structured response;
- `diagnose --raw` — local TTY only;
- `--encrypted --ttl-hours N --access-log` — explicit protected mode options; `--no-raw` сохраняет только sanitized projection.

Команды реализованы в `tests/tkb/wof.mjs`; syntax/offline checks подтверждают их локальный режим. Сетевой режим повторно не запускался.

## Reconciliation

Исторический budget первоначального status lookup не сбрасывается. Команда reconcile создаёт отдельную durable последовательность read-only status запросов для уже существующего ExtId:

- максимум 10 последовательных запросов;
- минимум 60 секунд от завершения предыдущего transport;
- обязательные durable start/completion markers;
- незавершённый marker блокирует следующий запрос без auto-expire;
- UNKNOWN, HTTP 500 и not_found не разрешают debit/replay/fallback;
- reconciliation не вызывает WOF, finish, refund, reverse, void или новый Payment.

## Безопасность

Endpoint и origin проверяются exact hash/allowlist; TLS strict включён по умолчанию, а явный scoped `--test-tls` допускается только для разрешённого test-only исключения. Нет искусственного whitelist/категорий или truncation, подменяющих полную структурированную диагностику; transport/tool limits указываются как источник ограничения, если они фактически сработали. Redirects и automatic retries запрещены, если не предусмотрены exact protocol/safety evidence. Raw не печатается в общие tool logs; `diagnose --raw` показывает его владельцу только через local TTY. TTL cleanup (только если opt-in) удаляет ожидаемые файлы private raw directory.

Financial gates: exact sandbox, unique ref/correlation, один durable debit marker до исходящей debit-команды, `UNKNOWN` блокирует retry; нет automatic finish/refund/new payment. Read-only status lookup — не чаще одного раза в минуту от завершения предыдущего transport.

## Acceptance

1. Default commands выполняются без сети.
2. Syntax/offline fixtures проходят.
3. Приватное raw-хранилище отсутствует в Git.
4. Полная sanitized structured projection не содержит известных auth secrets, configured login/secret, приватных ключей, PAN/CVV или session/access tokens; неизвестные поля и error messages сохраняются для LLM анализа, а public Git получает данные только после отдельного review.
5. Current BR/NAME и банковские wire-контракты не изменяются.
6. Режим не объявляет HTTP 200, errorCode=0, ACS или status text финансовым успехом.

Текущий bounded harness: WOF-01 и tests/tkb/wof.mjs. Acceptance/evidence review: reports/results/tkb/2026-10-09-sandbox-diagnostics-review.md.
