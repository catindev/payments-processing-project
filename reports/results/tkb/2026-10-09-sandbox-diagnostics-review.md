# Sandbox diagnostics review

- Branch: fix/sandbox-diagnostics
- Scope: ранее разрешённый TKB sandbox; production и новые финансовые calls в этой ревизии не выполнялись.
- Status: PASS для offline diagnostics implementation; NOT_RUN для нового bank request.
- Historical result: WOF-01 и UNKNOWN/INCONCLUSIVE financial outcome не переоценивались.

## Что мешало исследованию

Старая policy смешивала local storage, LLM context и public Git. В tests/tkb/wof.mjs summary() оставляла только whitelist/count, заменяла исходный error message категорией и не сохраняла invalid/non-JSON response. RFC-002 требовал AES-GCM, key, access log и TTL как обязательные предпосылки обычной диагностики. Это превращало неизвестное поле или сообщение банка в повод потерять evidence либо объявить ограничение проекта банковским BLOCKED.

## Что изменено

- Local diagnostics может сохранять полный test-only response вне Git в owner-only plain JSON по умолчанию; --encrypted, --ttl-hours N и --access-log — opt-in. --no-raw оставляет только sanitized projection.
- diagnose, diagnose --list, diagnose --file NAME работают offline и показывают структурированную projection без ручной расшифровки. diagnose --raw требует local TTY.
- --diagnostic выводит полную структурированную sanitized projection вместе с отдельной financial interpretation.
- Неизвестные root/nested fields, массивы, обычные строки и банковские error messages сохраняются. error_code_raw, error_message и status_raw добавляются отдельно от категорий.
- Redaction адресный: configured login/secret, PAN/card aliases, CVV/CVC, private/auth/session/access-token fields и их вхождения в строки. Поля вроде TokenCount, ThreeDSVersion, company и opaque unknown values не редактируются только из-за неизвестности.
- Non-JSON/empty responses сохраняются как text diagnostics с json_valid=false; response hash, HTTP code, stage и capture mode сохраняются отдельно.
- Добавлены collision-resistant artifact names, owner/mode/no-follow checks для local reads, artifact hash/version/expiry validation и общий status lock.

## Сохранённые объективные ограничения

- exact sandbox origin/path, HTTPS, hostname verification, TLS >=1.2; strict certificate verification по умолчанию; --test-tls — явное scoped исключение.
- durable debit marker до отправки, unique/correlated ExtId, immutable amount/currency и no automatic retry.
- shared read-only status interval не менее 60 секунд от любого предыдущего завершённого lookup/reconciliation transport и cross-command lock.
- gapped, extra, malformed или tampered markers fail closed; UNKNOWN не разрешает debit/replay/finish/refund/void/reverse/new Payment.
- Local/LLM diagnostics не равны финансовому успеху: HTTP 200, errorCode=0, ACS, status text или authentication data не доказывают captured/paid.
- Public Git и reports получают только отдельно reviewed projection; local raw artifacts, keys, access log и external bank materials не добавляются автоматически.

## Проверки

    node --check tests/tkb/wof.mjs                         PASS
    node tests/tkb/wof.mjs --self-test                    PASS, network_calls=0, financial_calls=0
    node tests/tkb/wof.mjs --self-test --diagnostic       PASS, nested/unknown/error/redaction fixture
    node tests/tkb/wof.mjs diagnose --list               PASS, network_calls=0
    node tests/tkb/wof.mjs diagnose                      PASS, local viewer, no network
    node tests/tkb/wof.mjs purge-raw                     PASS
    node tests/tkb/wof.mjs reconcile                     BLOCKED by missing --run, no network

 git diff --check PASS. Existing external-docs/ remains untracked and is not part of the PR. No new bank request was run while changing the harness.
