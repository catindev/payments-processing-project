# Эксперимент: [техническое название]

- **Сценарии:** CT-... / CF-...
- **Дата и часовой пояс:**
- **Commit SHA:**
- **Исполнитель:**
- **Банк/тестовый терминал (маскировано):**
- **Окружение:** sandbox / simulator / none
- **Разрешение на вызовы:** кем и когда, ссылка на разрешение (без секрета)
- **Источник ограничения (если BLOCKED):** `protocol` / `tool` / `project` / `environment` / `security risk` + конкретное свидетельство
- **Статус:** NOT_RUN / BLOCKED / PASS / FAIL / INCONCLUSIVE

## Гипотеза

Точно сформулированное проверяемое утверждение, не предположение.

## Предусловия и безопасность

Какие ограничения проверены: exact sandbox, TLS strict (или явный scoped `--test-tls` для test-only исключения), test-only карты/операции и запрет production. Полный local response хранится вне Git в owner-only plain JSON; AES-GCM, TTL и access log отмечаются только если явно включены.

Каналы: `local` / `llm` / `public-git-review` (не смешивать). Для LLM передаётся полная структурированная диагностика после удаления известных auth secrets, configured login/secret, приватных ключей, CVV/PAN и session/access tokens. Неизвестные поля/error messages сами по себе не секрет.

Financial gates: exact sandbox; TLS strict по умолчанию (явный scoped `--test-tls` только для разрешённого test-only исключения); unique ref/correlation; один debit marker до send; `UNKNOWN` блокирует retry; нет automatic finish/refund/new payment; read-only status не чаще одного раза в минуту.

## Шаги и воспроизведение

Перечень запросов/команд. Не включать в Git известные auth secrets, configured login/secret, приватные ключи, PAN/CVV или session/access tokens; сохранить полную структуру для LLM анализа после их адресного удаления. Зафиксировать unique ref/correlation и Idempotency-Key только в безопасной маскированной форме. Для диагностики сначала прочитать фактический response; raw вывод допустим владельцу только через local TTY и не через общие tool logs.

## Ожидаемый результат


## Фактическое наблюдение

Что именно ответил банк или симулятор: код, полная структурированная форма, неизвестные поля и error messages, датированное подтверждение. Отдельно укажи, какие известные auth secrets/configured login/secret/private keys/CVV/PAN/session/access tokens удалены для LLM. Не объявляй `BLOCKED` только из-за неизвестных полей.

## Доказательства

Local artifact: безопасный owner-only путь вне Git (без тела в отчёте). LLM projection: полная sanitized-структура. Public Git: отдельный review статуса и права публикации; в репозиторий попадает только reviewed projection. Не экспортировать local/raw автоматически.

## Интерпретация и ограничения

Явно отделить банковскую запись о приёме от доказательства финального денежного эффекта. Не обобщать результат одного терминала на все банки.

## Предлагаемые изменения

Issue/PR со ссылкой на согласованное BR; при противоречии бизнес-правил требуется решение владельца.
