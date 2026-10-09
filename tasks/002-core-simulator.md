# TASK-002 — Минимальное ядро и исполняемый симулятор банка

**Цель:** реализовать строго необходимый фрагмент ядра `Payment`, `PaymentIntent`, `PaymentOperation`, `Refund` и mock acquirer, чтобы превратить декларативные проверки в исполняемые тесты.

1. Прочитать согласованный журнал и жизненный цикл. Не вводить новую доменную семантику без RFC.
2. Сымитировать `accepted`, `succeeded`, `declined`, `unknown`, `not_dispatched`, delayed callback, duplicate callback, conflicting callback, reversible refund, post-cancel success.
3. Атомарно защитить от двух дочерних платежей одного Intent; отдельно проверить прямой Payment и восстановление после падения.
4. Реализовать идемпотентность нашего публичного API, отдельно от идемпотентности банковских операций.
5. Привязать тесты к ID из `docs/current/acquirer-connector-contract-tests-v0.9.yaml` (215 описаний). **Не помечать кейс PASS, пока он реально не выполнен**.
6. Начать с узкого вертикального сценария и набора рисковых гонок; не пытаться мгновенно выдать все 215 тестов за готовые.

Отчёт `reports/results/simulator/summary.md`: покрытие `passed/failed/blocked/not_run` по ID, команды запуска, результаты, ограничения и ссылки на код.
