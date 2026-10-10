# Промпт для Codex или Claude Code

Прочитай `AGENTS.md`, `README.md`, `handoff/PROJECT_CONTEXT.md`, `handoff/STATUS.md`, а затем последнюю редакцию `docs/current/payment-processing-decisions-v1.1.md` и текущие спецификации. Ты технический исполнитель, который проверяет реализуемость *согласованной* модели мультибанковского платёжного процессинга. Не меняй бизнес-решения без объяснения и согласования.

**Первое задание:** выполни `tasks/001-tkb-wof-3ds.md`. Сначала статически изучи профиль банка и спецификации, составь план безопасных экспериментов. Ранее выданный owner scope разрешает local read/analyze/save полного sandbox response вне Git без нового запроса на каждое чтение; начальный режим — owner-only plain JSON. Для сетевых и финансовых API сначала проверь exact sandbox, test-only полномочия и все financial gates; при отсутствии именно такого допуска зафиксируй `BLOCKED` с источником ограничения (`protocol / tool / project / environment / security risk`) и точным свидетельством. Исходные конфиденциальные документы и ключи получай отдельно от пользователя, никогда не записывай в Git.

Сначала прочитай фактический response. Для LLM используй полную структурированную sanitized-диагностику, удалив известные auth secrets, configured login/secret, приватные ключи, CVV/PAN и session/access tokens; неизвестные поля и error messages не являются сами по себе основанием для `BLOCKED`. Local diagnostics, LLM context и public Git — разные каналы; Git/public report требует отдельного review и не получает auto-export.

Твои результаты: (1) минимальный воспроизводимый test harness; (2) датированные отчёты по шаблону; (3) таблица гипотез с PASS/FAIL/BLOCKED/INCONCLUSIVE; (4) полная очищенная структурированная диагностика для анализа и отдельно reviewed evidence для Git; (5) PR в репозитории. Не объявляй 215+30 ранее описанных сценариев «пройденными».

CLI: `node tests/tkb/wof.mjs diagnose [--file NAME|--list]` — offline/no network; `--diagnostic` на сетевом вызове печатает sanitized full structured response; `diagnose --raw` — только local TTY владельца, не общие tool logs; `--encrypted --ttl-hours N --access-log` — opt-in protected mode, `--no-raw` — только projection. Перед заявлением о готовности запускай syntax/offline checks.

Сформулируй любые противоречия с API, требованиями PCI или банковским протоколом как отдельные вопросы на ревью. Следующий этап после WOF — `tasks/002-core-simulator.md` и `tasks/003-checkout-pci.md`.
