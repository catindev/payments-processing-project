# RFC-002 — безопасный sandbox raw reconciliation

**Статус:** PROPOSED / implemented in research/tkb-wof for review.

## Проблема

Запреты на публикацию секретов и raw HTTP-тел необходимы, но отсутствие локального защищённого raw capture и отдельного read-only reconciliation budget сделало неизвестный WOF исход операционно трудно расследуемым.

## Решение

В разрешённом sandbox:

- raw response может временно сохраняться **только локально вне Git**;
- файл шифруется AES-GCM, ключ находится локально с owner-only permissions;
- raw artifact имеет TTL 24 часа и очищается командой purge-raw;
- чат, Git и отчёты получают только sanitized projection, hashes, types, lengths, allowlisted fields и classifications;
- PAN/CVV, реальные secrets, login/signature, access tokens и raw body в LLM-сообщения не передаются;
- production и реальные финансовые операции не покрываются этим режимом.

## Reconciliation

Исторический budget первоначального status lookup не сбрасывается. Команда reconcile создаёт отдельную durable последовательность read-only status запросов для уже существующего ExtId:

- максимум 10 последовательных запросов;
- минимум 60 секунд от завершения предыдущего transport;
- обязательные durable start/completion markers;
- незавершённый marker блокирует следующий запрос без auto-expire;
- UNKNOWN, HTTP 500 и not_found не разрешают debit/replay/fallback;
- reconciliation не вызывает WOF, finish, refund, reverse, void или новый Payment.

## Безопасность

Endpoint и origin проверяются exact hash/allowlist. Redirects и retries запрещены. Response ограничен 64 KiB. Raw response не печатается. TTL cleanup удаляет только файлы с ожидаемым именем в private raw directory.

## Acceptance

1. Default commands выполняются без сети.
2. Syntax/offline fixtures проходят.
3. Приватное raw-хранилище отсутствует в Git.
4. Sanitized projection не содержит configured credentials, PAN/CVV или opaque tokens.
5. Current BR/NAME и банковские wire-контракты не изменяются.
6. Режим не объявляет HTTP 200, errorCode=0, ACS или status text финансовым успехом.

Текущий bounded harness: WOF-01 и tests/tkb/wof.mjs.
