# RFC-001 — устранение расхождений первичного аудита

**Дата:** 2026-10-09. **Статус:** PROPOSED / ОЖИДАЕТ REVIEW. **Ветка:** `research/initial-audit`. **База:** `97784b9`.

## 1. Основание и полномочия

[AGENTS:13](<../../AGENTS.md#L13>) требует оформлять противоречия, а не молча менять бизнес-правила. Основание RFC — [initial audit](<../../reports/initial-audit.md>), [контрактный отчёт](<../../reports/results/audit/contracts-review.md>), [история](<../../reports/results/audit/history-review.md>) и [банк/reference review](<../../reports/results/audit/bank-reference-review.md>).

**Не предлагается:** отменять/расширять BR-01—BR-07, NAME-01; включать multicapture/auto-refund; считать redirect-only выполненным BR-07; давать новый banking/financial допуск. Current в этой ветке не редактировался.

## 2. Пакет A: исправления в пределах уже согласованного смысла

| Изменение | Предложение | Проверка при принятии |
|---|---|---|
| Operation-specific declined mapping | Debit/authorize без эффекта завершает исходную оплату по доказанному итогу; capture/void отказ завершает Operation, а живой hold сохраняется; refund отказ меняет Refund, не исторический Payment success | Regressions CT-29/31/126/160; одно typed решение core на evidence; отказ при active hold не превращается в failed |
| Stale cases/ссылки | CT-73 согласованные defaults/ranges, CT-123 connection_id, CF-01 PaymentIntent; четыре broken targets на текущие файлы; старые вопросы BR-07 убрать как открытые, не менять обязательность формы | Current link/ref checks, semantic suite review; негативные final_capture cases и физический amount_final оставить |
| Capability v1 schema | MethodCapability.multi_capture const false при сохранении documentary bank capability отдельно; явный mapping public/SPI/profile | CE04 больше не проходит, CT-128 сохраняется как negative; supported только verified terminal |
| Tagged events | Связать RefundEvent.type/data.status; CancelEvent.type/resource/cancel.status/reason; общий envelope и delivery rules отдельно | CE01—03 отвергаются; хорошие examples проходят; signed delivery/replay/reordering исполняется в simulator |
| URL/metadata hardening | HTTPS schema для return/redirect + runtime canonical allowlist; reserved-key rejection и content/log sanitation для metadata/свободных строк | CE05—07 negative; synthetic canaries не проходят в sinks; regex не объявлять полной защитой |
| Guidance/provenance | NAME guide отличает API amounts от физических колонок; текущие lint/SPI/профиль ссылки; snapshot identity по revision/hash | Semantic/versioned source-index; сохраняется история изменений и collision provenance |

Это отдельные технические PR после review. Исправление описания в рамках существующего BR не объявляется новым бизнес-согласованием.

## 3. Пакет B: технические альтернативы, требующие проекта

### B1. Финансовое свидетельство и остаток холда

**Вариант рекомендуемый для анализа:** typed observed currency и отдельное hold-closure/remainder evidence, коррелированное operation/ref/rule_version. Core может проверить amount/currency/остаток не читая произвольный provider_data.

**Альтернатива:** оставить нормализованный result минимальным, но обязательным контрактом адаптера проверять исходную currency/сумму и отдавать versioned rule доказательства закрытия остатка. Тогда runtime contract tests должны доказывать эту точку контроля; implicit контекст RUB не заменяет проверку банковского свидетельства.

**Критерий выбора:** достаточность bank evidence, ясная custody/correlation и проверяемость; pending/unknown сохраняют резерв команды; доказанный failed без финансового эффекта освобождает её локальный резерв, но сам по себе не доказывает банковское освобождение остатка холда. Это не решение заказчика об освобождении чужих банковских средств. [OD-01/02](<../../reports/results/audit/contracts-review.md#L123-L124>).

### B2. Private card/3DS continuation

Спроектировать action/continue вместо повторного merchant confirm/debit. Он связан с Payment/Operation/route и доверенной сессией, имеет nonce/TTL/replay защиты, проверяет evidence и только разрешённое состояние банковского шага. PAN/CVV доступны лишь PCI gateway; sdk_action merchant-проекция — opaque безопасная ссылка/ограниченный instruction, не raw bank payload.

Альтернатива реализации — вся цепочка внутри PCI gateway с узким result/action интерфейсом к core; её можно выбирать после получения протокола банка. Отдельный 3DS frontend deploy не обязателен, отдельная логическая функция обязательна. [OD-03/04](<../../reports/results/audit/contracts-review.md#L125-L126>), [кандидатный flow](<../../reports/results/audit/bank-reference-review.md#L81-L101>).

### B3. Capabilities/events/runtime invariants

Выделить explicit mapping documentary feature → terminal permission → product enablement → mode/route availability; комбинации функций должны поддерживаться **одним** маршрутом. Общие events подписываются, имеют стабильный ID/version и at-least-once delivery с дедупликацией; ни webhook 2xx, ни browser return не меняют денежный итог. SQL locks/резервы/dispatch/outbox проектируются вместе с crash/race tests, не по одной JSON Schema.

## 4. Пакет C: безопасность источников и тестов

Предложить explicit ignore/exclude приватных [external-docs](<../../external-docs/>) либо защищённое хранение вне Git-root. Bank originals не редактировать/не коммитить. Не запускать raw Postman scripts/reference apps; clean-room harness с allowlisted host/fields, secrets/card input вне Git/LLM, synthetic tests до допуска. Если signing key ранее логировался, решение ротации/incident handling принимает уполномоченный владелец, а не агент стирает/заменяет чужие файлы.

Collection 2025 и docs changelog 2026 сравниваются method-by-method с банком; никаких массовых wire renames. Технический доступ ≠ permission. Финансовые replay tests только по письменным method-level гарантиям. [Находки банка](<../../reports/results/audit/bank-reference-review.md#L141-L158>), [gates](<../../tasks/next-steps.md>).

## 5. Что отдельно утверждает заказчик

[Q-01—Q-07](<../../reports/open-questions.md>): правовая/расчётная модель, promises onboarding, optional order uniqueness, смысл primary closure reason, ограниченный пилот/полный BR-07, support responsibility и фискальный scope. Эти вопросы не разрешаются техническим PR. Возможности/финальность банка подтверждает банк; стек/БД/частная схема continuation — аналитик/инженеры с evidence.

## 6. Acceptance и внедрение

1. Зафиксировано review решение по каждому пакету/альтернативе; BR остались прежними или отдельное изменение записано владельцем в журнал.
2. Создана новая синхронная черновая версия lifecycle/API/SPI/cases, сохранены предыдущие версии/provenance; нет blanket regex замены исторических цитат.
3. Supplied статическая проверка, TS compile и новые semantic negative fixtures исполнены; покрытие/limitations описаны. CT/CF функциональные статусы не меняются по статическому PASS.
4. Узкий simulator проверяет high-risk outcomes/races/recovery, затем отдельный gated bank harness. Production rollout и PCI ready не входят в acceptance этого RFC.

**Решения review пока отсутствуют.** Ни один пакет в current не применён. Порядок дальнейших действий — [next steps](<../../tasks/next-steps.md>).
