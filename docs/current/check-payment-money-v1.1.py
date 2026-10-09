#!/usr/bin/env python3
"""BR-06 static OpenAPI/JSONSchema check; NOT a bank/core end-to-end test.

Usage: python check-payment-money-v1.1.py
Reads the draft OpenAPI next to this file and validates example payloads,
field layout, local references, integer bounds and supported currency.
The product runtime must separately enforce money/accounting invariants,
foreign-key currency equality, bank-confirmed results and safe dispatch.
"""
from __future__ import annotations
import copy
from pathlib import Path
import sys
import warnings

import jsonschema
from ruamel.yaml import YAML

HERE = Path(__file__).resolve().parent
SPEC = HERE / 'payment-api-v0.12.openapi.yaml'

def fail(why: str) -> None:
    raise AssertionError(why)

def main() -> int:
    doc = YAML(typ='safe').load(SPEC.read_text(encoding='utf-8'))  # duplicate keys rejected
    assert doc['openapi']=='3.1.0'
    schemas = doc['components']['schemas']
    operations=[]
    for path, methods in doc['paths'].items():
        for method, payload in methods.items():
            if method.lower() in {'get','post','put','patch','delete','options','head','trace'}:
                operations.append((method,path,payload['operationId']))
    assert len({t[2] for t in operations})==len(operations), 'duplicate operationId'

    def refs(item):
        if isinstance(item,dict):
            for k,v in item.items():
                if k=='$ref':
                    assert v.startswith('#/'), f'nonlocal ref {v}'
                    cur=doc
                    for part in v[2:].split('/'):
                        cur=cur[part.replace('~1','/').replace('~0','~')]
                    assert isinstance(cur,dict)
                else:refs(v)
        elif isinstance(item,list):
            for v in item:refs(v)
    refs(doc)

    assert schemas['Currency']['enum']==['RUB']
    for n,minimum in [('PositiveAmount',1),('NonNegativeAmount',0)]:
        sch=schemas[n]
        assert sch['type']=='integer' and sch['minimum']==minimum
        assert sch['maximum']==9007199254740991
    for n in ['CreatePaymentRequest','CreatePaymentIntentRequest']:
        ps=schemas[n]['properties']
        assert ps['amount']['$ref']=='#/components/schemas/PositiveAmount'
        assert ps['currency']['$ref']=='#/components/schemas/Currency'
    payment=schemas['Payment']; intent=schemas['PaymentIntent']
    for n,sc in [('Payment',payment),('PaymentIntent',intent)]:
        props=sc['properties']
        assert 'currency' in sc['required']
        assert 'amounts' in sc['required']
        assert all(k not in props for k in ('amount','amount_final','amount_paid'))
        assert props['amounts']['$ref']==f'#/components/schemas/{n}Amounts'
    assert schemas['PaymentIntentAmounts']['required']==['requested','final','paid']
    assert 'currency' not in schemas['PaymentIntentAmounts']['properties']
    assert 'currency' not in schemas['PaymentAmounts']['properties']
    for n in ['Refund','PaymentOperation']:
        sc=schemas[n]
        assert 'amount' in sc['required'] and 'currency' in sc['required']
        assert 'amounts' not in sc['properties']
        assert sc['properties']['amount']['$ref']=='#/components/schemas/PositiveAmount'

    # Dereference against the OpenAPI root, including nested schema refs.
    with warnings.catch_warnings():
        warnings.simplefilter('ignore',DeprecationWarning)
        resolver=jsonschema.RefResolver.from_schema(doc)
    checked=0
    def validate(n, obj, passes=True):
        nonlocal checked
        with warnings.catch_warnings():
            warnings.simplefilter('ignore',DeprecationWarning)
            errors=list(jsonschema.Draft202012Validator(schemas[n], resolver=resolver).iter_errors(obj))
        if (len(errors)==0)!=passes:
            message=str(errors[0])[:300] if errors else 'unexpected valid payload'
            fail(f'{n}: expected passes={passes} for {obj!r}: {message}')
        checked+=1

    for n in ['Payment','PaymentIntent','Refund']:
        validate(n,copy.deepcopy(schemas[n]['example']))
    validate('RefundEvent',copy.deepcopy(schemas['RefundEvent']['example']))
    valid_request={'order_id':'order_123','amount':125000,'currency':'RUB'}
    validate('CreatePaymentRequest',valid_request)
    validate('CreatePaymentIntentRequest',valid_request)
    for bad in [0,-1,1250.25,'125000',None,{'value':125000,'currency':'RUB'},9007199254740992,True]:
        invalid=dict(valid_request,amount=bad)
        validate('CreatePaymentRequest',invalid,passes=False)
        validate('CreatePaymentIntentRequest',invalid,passes=False)
    for n in ['CreatePaymentRequest','CreatePaymentIntentRequest']:
        validate(n,dict(valid_request,currency='USD'),passes=False)
        validate(n,dict(valid_request,amount=1),passes=True)

    # Intent lifecycle example after BR-03.2: 1000 RUB request, final 600 RUB capture.
    success=copy.deepcopy(schemas['PaymentIntent']['example'])
    success['status']='succeeded'
    success['amounts']={'requested':100000,'final':60000,'paid':60000}
    success['paid_payment']='pay_123'
    success['can_confirm']=False
    validate('PaymentIntent',success)
    bad=copy.deepcopy(success);bad['amounts']={'requested':100000,'final':{'value':60000},'paid':60000}
    validate('PaymentIntent',bad,passes=False)
    bad=copy.deepcopy(success);bad['amounts']['currency']='RUB'
    validate('PaymentIntent',bad,passes=False)
    bad=copy.deepcopy(success);bad['amount_final']=60000
    validate('PaymentIntent',bad,passes=False)
    bad=copy.deepcopy(success);bad['amounts']['paid']=60000.2
    validate('PaymentIntent',bad,passes=False)
    bad=copy.deepcopy(schemas['Payment']['example']);bad['amounts']['paid']={'value':60000,'currency':'RUB'}
    validate('Payment',bad,passes=False)
    bad=copy.deepcopy(schemas['Refund']['example']);bad['amount']='20000'
    validate('Refund',bad,passes=False)

    # No automatic cross-field accounting assertions are claimed here: those
    # require implementation tests on actual core + banking adapter, not schema.
    print(f'BR-06 STATIC PASS: {len(operations)} API operations; {len(schemas)} schemas; '
          f'{checked} valid/invalid schema checks; all local references resolved; duplicate keys absent')
    print('NOT EXECUTED: core financial scenarios, bank sandbox, merchant settlement, currency mismatch across resources')
    return 0

if __name__=='__main__':
    try:raise SystemExit(main())
    except (AssertionError,KeyError,ValueError) as e:
        print('BR-06 STATIC FAIL:',str(e),file=sys.stderr)
        raise SystemExit(1)
