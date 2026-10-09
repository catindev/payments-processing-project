#!/usr/bin/env python3
"""Static verification only — no bank calls, no execution of test scenarios."""
from pathlib import Path
import subprocess, sys, shutil
from ruamel.yaml import YAML

ROOT=Path(__file__).resolve().parents[1]
CURRENT=ROOT/'docs/current'
RUNS=[
    'check-payment-checkout-v1.1.py',
    'check-payment-money-v1.1.py',
    'check-payment-names-v1.4.py',
]
for file in RUNS:
    print(f'\n=== static {file} ===', flush=True)
    subprocess.run([sys.executable,str(CURRENT/file)],check=True,cwd=CURRENT)
yaml=YAML(typ='safe')
checks=[('acquirer-connector-contract-tests-v0.9.yaml','CT',215),('checkout-contract-cases-v0.2.yaml','CF',30)]
for fn,prefix,expected in checks:
    obj=yaml.load((CURRENT/fn).read_text(encoding='utf-8'))
    ids=[c['id'] for c in obj['cases']]
    assert len(ids)==len(set(ids))==expected, (fn,len(ids),expected)
    assert all(s.startswith(prefix+'-') for s in ids)
    print(f'SCENARIO_DESCRIPTIONS: {fn}: {len(ids)} unique (not executed)')
tsc=shutil.which('tsc')
if tsc:
    subprocess.run([tsc,'--noEmit','--strict','--target','ES2020',str(CURRENT/'acquirer-connector-v0.6.ts')],check=True,cwd=CURRENT)
    print('TYPESCRIPT_COMPILE: PASS')
else:
    print('TYPESCRIPT_COMPILE: NOT_RUN (tsc unavailable)')
print('ALL_AVAILABLE_STATIC_CHECKS: PASS; real bank/core end-to-end not executed')
