# Эксперимент: безопасные локальные статические проверки текущих контрактов

- **Сценарии:** отдельные static probes SC-01—SC-08 и CE01—CE08; это **не запуск** CT/CF, даже когда проверяется похожее требование.
- **Дата и timezone:** 2026-10-09 UTC; окружение зафиксировано 19:53:20Z, финальный Git контроль 20:07:35Z.
- **Commit SHA:** `97784b9d69e5f7ce347f84429f69bacc5872cbf0`.
- **Ветка:** `research/initial-audit`; не менялась.
- **Исполнитель:** независимый делегированный технический агент.
- **Банк/терминал:** none; банковские ответы не получались.
- **Окружение:** macOS, локальный проект; не simulator и не bank sandbox.
- **Разрешение:** прямое задание пользователя — только безопасные локальные статические проверки, без сети/банков/финансовых операций/Postman; родитель предоставил isolated Python environments вне репозитория. Этот агент пакеты не устанавливал.
- **Статус:** supplied available static checks **PASS**; semantic counterexamples выявили **FAIL** контрактных инвариантов; первоначальный bundled environment **BLOCKED**; tsc **NOT_RUN**.
- **Семантический отчёт:** [contracts-review.md](<contracts-review.md>).

## Гипотеза

Текущие документы согласованы с BR-01—07/NAME-01; их YAML, локальные ссылки, примеры JSON Schema и собственные поля корректны. Отдельно проверить, не принимает ли schema значения, прямо запрещённые описанием. Положительная schema проверка не доказывает корректность банковского исхода или работающего ядра.

## Предусловия и безопасность

До запуска прочитаны [validate_current.py](<../../../scripts/validate_current.py>) и все три вызываемые программы: [checkout checker](<../../../docs/current/check-payment-checkout-v1.1.py>), [money checker](<../../../docs/current/check-payment-money-v1.1.py>), [name checker](<../../../docs/current/check-payment-names-v1.4.py>). Они читают локальные нормативные файлы; runner может вызвать только их и уже установленный tsc с noEmit. Никаких Postman/HTTP clients, запуска приложения, банковских credentials или карточных данных. Все $ref текущей схемы разрешаются внутри документа; новых внешних refs не использовалось. Синтетические строки не являются настоящими секретами.

Исходные current/docs/scripts не изменялись. Python syntax проверялась `compile(text,path,'exec')` без исполнения и без pycache. Симулятор/нагрузка/браузер не запускались. Результаты не требуют отката денежных операций — ни одной операции не было.

## Реально исполненные проверки

Все команды выполнялись из корня Git-репозитория:

`/Users/vladimir/Projects/thepayments/payment-processing-project`

| ID | Фактическое действие | Exit code / наблюдение | Статус |
|---|---|---|---|
| SC-01 | pwd; git status/rev-parse; date UTC; поиск установленных инструментов | 0; правильная ветка и SHA, Python PATH=/usr/bin/python3, tsc не найден | PASS |
| SC-02 | supplied runner в предоставленном bundled-Python venv | **1**; первый checkout checker не дошёл до проверки: jsonschema import → rpds native library → macOS library validation: разные Team IDs | BLOCKED (окружение, не дефект репозитория) |
| SC-03 | name checker --self-test в bundled venv | **0**; SELF_TEST PASS, 220 OpenAPI fields, 76 TS regex properties, SQL 0, violations 0 | PASS с ограничением regex |
| SC-04 | безопасный локальный ruamel parse всех 4 current YAML, уникальность IDs, refs, operationIds | **0**; YAML parse PASS; 215 CT уникальны и все result=not_run; 30 CF уникальны, статус descriptions-only; 212 local refs; 26 ops; 39 schemas | PASS static |
| SC-05 | supplied runner в venv установленного /usr/bin/python3 | **0**; Checkout PASS; money 33 valid/invalid schema checks PASS; NAME-01 PASS; ID counts PASS; tsc unavailable | PASS available checks; TS compile NOT_RUN |
| SC-06 | 8 синтетических контрпримеров JSON Schema, с FormatChecker | **0**; все 8 принимаются схемой, т.е. наблюдение воспроизведено. CE01—07 доказывают описанные gaps, CE08 — capability-dependent runtime ограничение | FAIL инвариантов CE01—07; CE08 INCONCLUSIVE относительно runtime |
| SC-07 | безопасный локальный скан Markdown links, парсинг остатка длинного info.description, все bank capability statuses | **0**; 4 отсутствующих локальных link targets; все 17 TKB capabilities unknown | FAIL local links; PASS сохранение unknown |
| SC-08 | Draft202012 check_schema для 39 схем, встроенные schema/request examples, path param consistency, Python syntax для 4 scripts; Git diff защищённых источников | **0**; 39 metaschemas, 9 examples PASS; path params PASS; 4 syntax PASS; docs/current/scripts diff пустой | PASS structural; не cross-field accounting |

### Окружение: фактические версии

1. Первая попытка: Python **3.12.14**, ruamel.yaml **0.19.1**, jsonschema **4.26.0**, PyYAML **6.0.3**; путь interpreter:

`/Users/vladimir/Projects/thepayments/.audit-local/validation-env/bin/python`

В этом venv чистые Python YAML/name проверки работают; импорт jsonschema через rpds блокируется. Ошибка macOS классифицирована и сообщена родителю; library validation не обходилась.

2. Рабочая попытка: Python **3.9.6**, ruamel.yaml **0.19.1**, jsonschema **4.25.1**, PyYAML **6.0.3**; путь:

`/Users/vladimir/Projects/thepayments/.audit-local/validation-system/bin/python`

Версии получены у реально импортированных modules; не приняты из установки по предположению.

## Шаги и воспроизведение

### A. Supplied runner и отдельный NAME-01 self-test

Первая команда реально завершилась exit=1 из-за environment import failure, последующие команды реально выполнялись отдельно.

```bash
# Из корня репозитория. Никаких установок/сетевых операций.
/Users/vladimir/Projects/thepayments/.audit-local/validation-env/bin/python scripts/validate_current.py
/Users/vladimir/Projects/thepayments/.audit-local/validation-env/bin/python docs/current/check-payment-names-v1.4.py --self-test
/Users/vladimir/Projects/thepayments/.audit-local/validation-system/bin/python scripts/validate_current.py
```

Очищённый существенный вывод рабочей попытки:

```text
CHECKOUT_STATIC: PASS
openapi_version: 0.12.0-draft operations: 26 schemas: 39 resolved_refs: 212
scenarios: 30 drafted, 0 executed
BR-06 STATIC PASS: 26 API operations; 39 schemas; 33 valid/invalid schema checks;
all local references resolved; duplicate keys absent
NOT EXECUTED: core financial scenarios, bank sandbox, merchant settlement,
currency mismatch across resources
OpenAPI fields: 220; TS properties: 76; SQL columns sampled: 0; violations: 0
NAME-01: PASS
SCENARIO_DESCRIPTIONS: acquirer-connector-contract-tests-v0.9.yaml: 215 unique (not executed)
SCENARIO_DESCRIPTIONS: checkout-contract-cases-v0.2.yaml: 30 unique (not executed)
TYPESCRIPT_COMPILE: NOT_RUN (tsc unavailable)
ALL_AVAILABLE_STATIC_CHECKS: PASS; real bank/core end-to-end not executed
```

Неочищенные банковские тела/секреты не нужны для воспроизведения SC-02. Диагностическая сигнатура: `ImportError` → `rpds.cpython-312-darwin.so` → `mapping process and mapped file (non-platform) have different Team IDs`. Это не ошибка OpenAPI. Системный venv устранил environment блокировку без модификации shared runtime.

### B. Синтетические schema контрпримеры — реально исполнено

```bash
/Users/vladimir/Projects/thepayments/.audit-local/validation-system/bin/python - <<'PY'
from pathlib import Path
import copy, warnings, platform, jsonschema, yaml, ruamel.yaml
from ruamel.yaml import YAML
warnings.simplefilter('ignore', DeprecationWarning)
x = YAML(typ='safe').load(Path('docs/current/payment-api-v0.12.openapi.yaml').read_text())
s = x['components']['schemas']
r = jsonschema.RefResolver.from_schema(x)
def probe(name, schema, obj):
    v = jsonschema.Draft202012Validator(s[schema], resolver=r,
                                       format_checker=jsonschema.FormatChecker())
    errors = list(v.iter_errors(obj))
    print(name, 'SCHEMA_ACCEPTS' if not errors else 'SCHEMA_REJECTS', schema)
    assert not errors
f = copy.deepcopy(s['RefundEvent']['example'])
f['data']['status'] = 'pending'
f['data'].pop('completed_at', None)
probe('CE01_REFUND_EVENT_SUCCESS_WITH_PENDING', 'RefundEvent', f)
i = copy.deepcopy(s['PaymentIntent']['example'])
probe('CE02_CANCEL_WRONG_RESOURCE_AND_RESULT', 'CancelEvent', {
    'id':'evt_test', 'type':'payment.cancel_failed', 'data':i,
    'created_at':'2026-10-09T07:10:00Z'})
p = copy.deepcopy(s['Payment']['example'])
probe('CE03_CANCEL_NO_CANCEL_RECORD', 'CancelEvent', {
    'id':'evt_test', 'type':'payment.cancel_failed', 'data':p,
    'created_at':'2026-10-09T07:10:00Z'})
m = {'type':'card', 'available':True, 'currency':'RUB',
     'capture_modes':['automatic','manual'], 'partial_capture':True,
     'multi_capture':True, 'partial_refunds':True, 'multiple_refunds':True,
     'saved_methods':False, 'off_session':False}
probe('CE04_V1_MULTICAPTURE_TRUE', 'MethodCapability', m)
q = {'order_id':'order_test', 'amount':1, 'currency':'RUB',
     'metadata':{'pan':'SYNTHETIC-NOT-A-SECRET', 'cvv':'SYNTHETIC-NOT-A-SECRET'}}
probe('CE05_RESERVED_CARD_KEYS_IN_METADATA', 'CreatePaymentRequest', q)
q.pop('metadata')
q['return_url'] = 'http://shop.example.invalid/result'
probe('CE06_NON_HTTPS_RETURN', 'CreatePaymentRequest', q)
probe('CE07_NON_HTTPS_BANK_REDIRECT', 'NextAction', {
    'type':'redirect', 'url':'http://bank.example.invalid/form'})
q['return_url'] = 'https://shop.example.invalid/result'
q['capture_method'] = 'manual'
q['payment_method'] = {'type':'sbp'}
probe('CE08_MANUAL_SBP_STRUCTURALLY_ACCEPTED', 'CreatePaymentRequest', q)
print('ENVIRONMENT', platform.python_version(), 'ruamel.yaml', ruamel.yaml.__version__,
      'jsonschema', jsonschema.__version__, 'PyYAML', yaml.__version__)
print('No network, bank, core or CT/CF execution; only JSON Schema counterexamples.')
PY
```

**Ожидаемое наблюдение текущих схем:** все probes печатают SCHEMA_ACCEPTS; **реальный результат:** именно это получено, exit=0. Assert проверяет факт принятия, а не бизнес-правильность. Для CR-02—06 это отрицательный результат проверки согласованности; для CE08 выбор допустимости метода требует конкретного capability profile и исполнения core-теста, поэтому runtime вывод не делается. Источники по каждой находке — [семантический аудит](<contracts-review.md>).

### C. YAML/ref/ID проверки — реально исполнено

Команда ниже воспроизводит SC-04 без импорта jsonschema/rpds:

```bash
/Users/vladimir/Projects/thepayments/.audit-local/validation-env/bin/python - <<'PY'
from pathlib import Path
from ruamel.yaml import YAML
from collections import Counter
from importlib.metadata import version
import platform
root = Path('docs/current')
yaml = YAML(typ='safe')
for p in sorted(root.glob('*.yaml')):
    d = yaml.load(p.read_text())
    print('YAML_PARSE_PASS', p.name)
    if 'cases' in d:
        ids = [c['id'] for c in d['cases']]
        assert len(ids) == len(set(ids))
        print('DESCRIPTIONS_ONLY', len(ids), 'unique',
              Counter(c.get('result','unspecified') for c in d['cases']))
api = yaml.load((root/'payment-api-v0.12.openapi.yaml').read_text())
refs, ops = [], []
def walk(v):
    if isinstance(v, dict):
        for k, w in v.items():
            if k == '$ref':
                assert w.startswith('#/')
                cur = api
                for part in w[2:].split('/'):
                    cur = cur[part.replace('~1','/').replace('~0','~')]
                refs.append(w)
            else: walk(w)
    elif isinstance(v, list):
        for w in v: walk(w)
walk(api)
for p, methods in api['paths'].items():
    for m, o in methods.items():
        if m in ('get','post','put','patch','delete'): ops.append(o['operationId'])
assert len(ops) == len(set(ops))
print('LOCAL_REFS_PASS', len(refs), 'operations', len(ops),
      'schemas', len(api['components']['schemas']))
print('ENVIRONMENT', platform.python_version(),
      *(f'{x}={version(x)}' for x in ['ruamel.yaml','jsonschema','PyYAML']))
PY
```

Вывод: 4 YAML_PARSE_PASS, CT Counter(`not_run:215`), CF Counter(`unspecified:30`) при глобальном `scenarios_only_not_run`, LOCAL_REFS_PASS 212 / 26 operations / 39 schemas. Отсутствие case-level result у CF не объявлено ошибкой: общий статус в [Checkout YAML:3](<../../../docs/current/checkout-contract-cases-v0.2.yaml#L3>) явно not-run.

### D. Local-link проверка и остаток длинной API-строки — реально исполнено

```bash
/Users/vladimir/Projects/thepayments/.audit-local/validation-system/bin/python - <<'PY'
from pathlib import Path
from ruamel.yaml import YAML
import re
root = Path('docs/current')
api = YAML(typ='safe').load((root/'payment-api-v0.12.openapi.yaml').read_text())
print('OPENAPI_LONG_DESCRIPTION_REMAINDER:', api['info']['description'][1900:])
print('MISSING_MARKDOWN_LOCAL_LINKS:')
for f in sorted(root.glob('*.md')):
    for n, line in enumerate(f.read_text().splitlines(), 1):
        for target in re.findall(r'(?<!!)\[[^\]]+\]\(([^)]+)\)', line):
            if '://' not in target and not target.startswith('#'):
                if not (f.parent/target.split('#')[0]).exists():
                    print(f.name, n, target)
print('PROFILE_STATUSES:', {
    k:v['status'] for k,v in YAML(typ='safe').load(
        (root/'tkb-connector-profile-v0.2.yaml').read_text())['capabilities'].items()})
PY
```

Вывод: четыре отсутствующих link targets ([CR-08](<contracts-review.md>)); 17 статусов unknown, ни одного supported. Остаток `info.description` подтверждает согласованный BR-07 и draft/PCI-оговорки. Программа не обращается к URLs, а только работает со строками.

### E. Schema metadata, встроенные примеры, path params, syntax — реально исполнено

```bash
/Users/vladimir/Projects/thepayments/.audit-local/validation-system/bin/python - <<'PY'
from pathlib import Path
from ruamel.yaml import YAML
import jsonschema, warnings, re
warnings.simplefilter('ignore', DeprecationWarning)
d = YAML(typ='safe').load(Path('docs/current/payment-api-v0.12.openapi.yaml').read_text())
ss = d['components']['schemas']
r = jsonschema.RefResolver.from_schema(d)
for n, s in ss.items(): jsonschema.Draft202012Validator.check_schema(s)
examples = 0
for n, s in ss.items():
    if 'example' in s:
        jsonschema.Draft202012Validator(s, resolver=r,
            format_checker=jsonschema.FormatChecker()).validate(s['example'])
        examples += 1
for p, methods in d['paths'].items():
    params = methods.get('parameters', [])
    for m, o in methods.items():
        if m not in ('post','get','put','patch','delete'): continue
        op_params = params + o.get('parameters', [])
        ps = [d['components']['parameters'][v['$ref'].split('/')[-1]]
              if '$ref' in v else v for v in op_params]
        declared = {v['name'] for v in ps if v['in']=='path'}
        required = {v['name'] for v in ps if v['in']=='path' and v.get('required')}
        assert set(re.findall(r'\{([^{}]+)\}',p)) == declared == required, (p,m)
        for c in o.get('requestBody',{}).get('content',{}).values():
            if 'example' in c:
                jsonschema.Draft202012Validator(c['schema'], resolver=r,
                    format_checker=jsonschema.FormatChecker()).validate(c['example'])
                examples += 1
for p in [Path('scripts/validate_current.py'), *Path('docs/current').glob('*.py')]:
    compile(p.read_text(), str(p), 'exec')
print('JSONSCHEMA_META_PASS', len(ss), 'EXAMPLES_PASS', examples,
      'PATH_PARAMS_PASS', 'PYTHON_SYNTAX_PASS', 4)
PY
```

Вывод: `JSONSCHEMA_META_PASS 39 EXAMPLES_PASS 9 PATH_PARAMS_PASS PYTHON_SYNTAX_PASS 4`; exit=0. Это не полная валидация документа по официальной metaschema OpenAPI и не TypeScript compile; так результат не обозначается.

### F. Контроль ветки и защищённых исходников — реально исполнено

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
git status --short --branch
git diff --exit-code -- docs/current scripts
git rev-parse HEAD
```

Exit=0; `docs/current` и `scripts` не содержат diff; branch/SHA неизменны. В shared workspace параллельно появились другие untracked отчёты/контекст родителя — они не создавались и не редактировались этим агентом. Его собственные deliverables: [contracts-review.md](<contracts-review.md>) и этот журнал. Ничего не staging/commit/push.

## Интерпретация и ограничения

- **PASS:** локальные YAML/layout/naming/references/примеры/метасхемы; не функциональные гарантии банка или core.
- **FAIL:** воспроизводимые расхождения в [CR-01—09](<contracts-review.md>); часть — ошибки проза↔схема, часть — документационные остатки. Вопросы OD отдельно и не объявлены согласованными решениями.
- **BLOCKED:** первая environment попытка; полноценные bank/PCI проверки не разрешены и не имеют необходимых прав/scope. Рабочий local validation environment уже доступен, поэтому весь аудит не blocked.
- **NOT_RUN:** tsc (нет установленного компилятора); все 215 CT и 30 CF как целостные сценарии; simulator/core/races, bank sandbox, browser/3DS, webhooks delivery, 100 RPS и financial reconciliation.
- **INCONCLUSIVE:** факт schema-valid manual+sbp не устанавливает runtime-допустимость; положительное поле формы/evidence в проекте не устанавливает фактическую поддержку.

[Money checker:124–128](<../../../docs/current/check-payment-money-v1.1.py#L124-L128>) прямо не заявляет accounting assertions; их отсутствие не выдано здесь за дефект JSON Schema. [Name checker:22,70–75](<../../../docs/current/check-payment-names-v1.4.py#L70-L75>) использует regex, не AST, и SQL count=0. Выполнение имеющихся checker — не подтверждение реализации PCI/DLP/банковской финальности.

## Предлагаемые изменения

Только отдельные review issues/PR по [contracts-review.md](<contracts-review.md>). Нормативные источники и существующий код не изменены. Не закрывать CT/CF в [STATUS](<../../../handoff/STATUS.md#L12-L18>) по этому статическому прогону; сохранять отдельный execution status и evidence для будущего симулятора/банка.
