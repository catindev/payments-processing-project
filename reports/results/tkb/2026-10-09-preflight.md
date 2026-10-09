# TKB preflight — разрешение и план первого вызова

- **Дата:** 2026-10-09, UTC.
- **Ветка:** `research/tkb-preflight`; база `1c84bb3`.
- **Сценарий:** BRV-03 / Hello.
- **Допуск:** заказчик явно разрешил банковский запуск, выбрал sandbox включая финансовые тесты, указал существующий Postman environment и дополнительно разрешил самостоятельное техническое исследование. Значения доступа/карточных реквизитов здесь не сохраняются.
- **Окружение:** test URL из [предоставленного environment](<../../../external-docs/tkb-postman/104178.postman_environment.json>); точный адрес/credentials не публикуются. Локально проверены HTTPS, test-label hostname, root base URL, отсутствие embedded auth/query, включённые login/secret. Название test в host — дополнительная защита, а не доказательство прав на все методы.
- **Гипотеза:** нефинансовый Hello возвращает переданную synthetic строку при корректной HMAC-SHA1/Base64 подписи фактически отправленных UTF-8 JSON bytes.
- **Предусловия:** только документированный `/api/tcbpay/gate/hello`; один POST, без redirects/retry, timeout 15s, стандартная TLS-проверка; оригинальные Postman-скрипты не исполняются. PAN/CVV не используются.
- **Шаги:** локальная crypto self-test; проверить environment; сформировать synthetic inputString и подпись в памяти; один вызов; сохранить только allowlisted HTTP/status/echo-match/тайминг/хэши.
- **Ожидаемое:** HTTP success + совпадение outputString с synthetic inputString. Это не проверка WOF/debit/3DS/capture/refund.
- **Статус до запуска:** NOT_RUN.
- **Первый фактический запуск:** 2026-10-09T20:31:16.717Z, 571 ms, один application-level send attempt; HTTP-ответ отсутствует. Транспорт вернул SELF_SIGNED_CERT_IN_CHAIN. Итог INCONCLUSIVE для связи/подписи, TLS trust prerequisite BLOCKED. Нельзя считать, что Hello прошёл или банковские credentials отвергнуты. Карта/финансовые endpoints не использовались.
- **Локальная crypto проверка:** synthetic HMAC-SHA1 fixture PASS, bank calls 0; это проверяет алгоритм, не банковскую аутентификацию.
- **Последующее разрешение:** заказчик разрешил хранение указанной test-only карты в коде/Git; в текущем preflight это не использовано — реквизиты не сохранялись. Разрешение не распространяется на настоящие карты/секреты.
- **TLS диагностика:** 2026-10-09T20:33:07.416Z, strict TLS handshake с Node --use-system-ca: HTTP calls 0 / credentials sent false; system roots 0, SELF_SIGNED_CERT_IN_CHAIN. Отдельного CA-файла в предоставленном external-docs не обнаружено; verification не отключалась в этих двух проверках.
- **Дополнительный owner-допуск:** заказчик явно разрешил отключить проверку сертификата. Следующий эксперимент ограничен одним Hello POST, точным test origin hash и путём Hello; исключение касается CA chain trust, hostname проверяется до отправки body/auth headers, redirects/retry и финансовые методы запрещены. Это диагностический test-only режим, не production-ready транспорт.
- **Остановка/откат:** при gate failure никаких запросов; при TLS/timeout/HTTP error не повторять автоматически. Денежных эффектов у Hello по документации нет, финансовый rollback не требуется.
- **Источник:** [первичное подключение ТКБ](<../../../external-docs/tkb-docs/Первичное+подключение+к+платежному+шлюзу.doc>), раздел Hello и правила подписи; [план BRV-03](<../audit/bank-reference-review.md#L194>).

## Фактические наблюдения и итог

| Время UTC | Проверка | Наблюдение | Итог |
|---|---|---|---|
| 20:31:16.717 | Hello, standard CA | TLS SELF_SIGNED_CERT_IN_CHAIN, HTTP отсутствует | INCONCLUSIVE; CA trust blocker |
| 20:33:07.416 | Strict TLS + system CA, без HTTP/credentials | system roots 0; SELF_SIGNED_CERT_IN_CHAIN | INCONCLUSIVE; не финансовый вызов |
| 20:34:51.049 | Один Hello с owner-authorised CA exception | host_match=true; HTTP 200; JSON; errorCode=0; exact echo=false; 403 ms | INCONCLUSIVE относительно первоначального exact-echo ожидания |
| 20:35:54.085 | Независимый нефинансовый Hello, safe shape diagnostic | root keys outputString/errorInfo; errorCode=0; errorMessage=Успех; 661 ms | Связь/структура наблюдены; exact echo всё ещё не совпадает |
| 20:36:35.252 | Независимый нефинансовый Hello, safe echo diagnostic | HTTP 200; errorCode=0; hostname match; echo contains unique synthetic probe; очищенный output: Hello. InputString=[PROBE]; 486 ms | PASS для Hello по уточнённому observed echo rule, не financial test |

Всего: один initial application-level attempt, остановленный TLS; один отдельный TLS diagnostic без HTTP; три завершённых HTTP POST исключительно к Hello. Ни одного debit/hold/capture/void/refund/bind/status-order вызова. Реквизиты карты не использовались.

Точная первоначальная гипотеза возврата строки без префикса не подтвердилась; это расхождение документационного примера/ожидания, а не отказ credentials. По наблюдению response outputString = Hello. InputString=<synthetic inputString>. В [Hello-клиент](<../../../tests/tkb/hello.mjs>) добавлен этот ровно наблюдённый вариант и локальные позитивные/негативный echo fixture; итог PASS ограничен данным test origin, credentials и диагностическим TLS режимом. В строгом CA-режиме доступ остаётся BLOCKED. Отрицательная проверка подписи не выполнялась, права всех финансовых методов не следуют из Hello.

Клиент и [TLS diagnostic](<../../../tests/tkb/tls-probe.mjs>) читают local environment, не исполняют Postman scripts, не печатают credentials/signatures/raw bodies, не следуют redirects и не делают автоматических retries. CA-exception активируется только явным CLI флагом, exact origin hash и Hello path; hostname проверяется до отправки. Global TLS policy не изменялась. Финальный hardening: network только с явным --run у обоих клиентов; response cap 64 KiB в обоих Hello transport paths; response root names выводятся только по whitelist, unknown names не логируются; offline response-cap/echo/HMAC fixtures PASS. Независимый static review не исполнял банковские клиенты.

## Безопасное воспроизведение

Команды из корня project; без --run оба клиента не делают network calls:

```bash
node tests/tkb/hello.mjs
node tests/tkb/tls-probe.mjs
# Только strict TLS diagnostic, без HTTP/authentication:
node --use-system-ca tests/tkb/tls-probe.mjs --run
# Только Hello, standard certificate validation:
node tests/tkb/hello.mjs --run
# Только owner-authorised exact sandbox Hello CA exception:
node tests/tkb/hello.mjs --run --test-tls
```

При выполнении использован Node v24.21.0 из bundled runtime. Во время первых запусков клиенты были рабочим новым harness поверх base commit 1c84bb3, не существовали в этой базовой ревизии; банковские ответы оценивались первоначальным exact-echo oracle. Итоговый harness дополнен observed prefix rule и явным --run gate для TLS diagnostic, без дополнительных bank calls после этих изменений. Локальные syntax/HMAC/echo fixtures PASS; 99 local links/line bounds в пяти preflight артефактах проверены, configured login/secret value matches 0. Это не PCI/DLP certification.

## Финальный QA

Независимый read-only review финальных клиентов/отчёта: открытых Critical/High/Medium нет. Проверены exact-origin/path scope, hostname-before-send, no global TLS mutation, explicit --run network gates, no redirects/auto-retry, response cap 64 KiB и root-key whitelist. Syntax checks и offline fixtures PASS; reviewer не выполнял сеть/банк, не читал raw credentials/test-card values. Результат не означает разрешение/поддержку финансовых методов.

## Очищенные указатели evidence

- Test origin SHA-256: `0e2449c281d8bae1e311408ebc95595b6fa1f2ab67db1ccd6a8a0b95a1e3a721` (не публикует точный адрес).
- Последний synthetic probe SHA-256: `d70b4e4bbe500493d0db814afd4e1d343807503325f5c6b7e9adcc0e54fc317d`.
- Последний response SHA-256: `9069cf227cda3f99a0d60bd672c96ef3aab8e208bb52b5ea1cde3b7a67dd0055`. Полное response тело не сохранено.
- Final Hello source SHA-256: `8b703fd6fb5172d234a9d7a69e98909e754be3740978ca57a5a49f4d7aac64d2`.
- Final TLS diagnostic source SHA-256: `60378a3e671a6fa23f1e8a8d4f5828c71055834a2d691dd5090f15fd0bb6f522`. Эти hashes относятся к итоговому hardened harness после наблюдений, не выдают его за неизменную ревизию всех ранних запусков.

## Ограничения последующих финансовых исследований

Широкий owner-допуск зафиксирован. Test-card сведения и ожидаемое автоматическое 3DS поведение — утверждение заказчика, ещё не наблюдённый результат. Заказчик разрешил сохранять именно предоставленную test-only карту в коде/Git; на этом этапе необходимость отсутствует и permission не использован. Это не разрешение сохранять реальные карточные данные или bank login/secret. В отчётах реквизиты не повторяются. Bank-terminal права на WOF/hold/refund/MIT, актуальный wire-контракт, безопасная передача test-only карточных данных и доказательства исхода проверяются отдельно. Не обходить 3DS, не использовать production и не повторять неизвестную денежную отправку.
