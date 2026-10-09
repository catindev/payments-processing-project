#!/usr/bin/env python3
"""Static contracts only, not network, browser, or bank execution."""
from pathlib import Path
from ruamel.yaml import YAML
import jsonschema
import re
import warnings
root=Path(__file__).resolve().parent
x=YAML(typ='safe').load((root/'payment-api-v0.12.openapi.yaml').read_text())
p=YAML(typ='safe').load((root/'tkb-connector-profile-v0.2.yaml').read_text())
c=YAML(typ='safe').load((root/'checkout-contract-cases-v0.2.yaml').read_text())
assert x['openapi']=='3.1.0'
ids=[]
for path,methods in x['paths'].items():
 for method,schema in methods.items():
  if method in {'post','get','put','patch','delete'}: ids.append(schema['operationId'])
assert len(ids)==len(set(ids))
refs=0
def crawl(v):
 global refs
 if isinstance(v,dict):
  for k,w in v.items():
   if k=='$ref':
    assert w.startswith('#/'),w
    cur=x
    for part in w[2:].split('/'):cur=cur[part.replace('~1','/').replace('~0','~')]
    assert isinstance(cur,dict),w
    refs+=1
   else:crawl(w)
 if isinstance(v,list):
  for w in v:crawl(w)
crawl(x)
s=x['components']['schemas']
assert 'checkout' in s['Payment']['properties']
assert 'checkout' in s['PaymentIntent']['properties']
assert 'forms' in s['MethodCapability']['properties']
assert 'platform' in s['FormCapability']['properties']
assert 'provider' in s['FormCapability']['properties']
for bad in ['CardInfo','CVV','CardNumber','cvv','pan']:
 assert bad not in s['PaymentMethodRequest']['properties'] if 'properties' in s['PaymentMethodRequest'] else True
pms=s['PaymentMethodRequest']
with warnings.catch_warnings():
 warnings.filterwarnings('ignore',category=DeprecationWarning)
 resolver=jsonschema.RefResolver.from_schema(x)
 def valid(schema,value):return jsonschema.Draft202012Validator(schema,resolver=resolver).is_valid(value)
assert valid(s['CheckoutInfo'],{'url':'https://example.invalid/c/abc'})
assert not valid(s['CheckoutInfo'],{'url':'https://example.invalid/c/abc','cvv':'123'})
assert valid(s['FormCapability'],{'platform':True,'provider':True})
assert not valid(s['FormCapability'],{'direct':'yes'})
assert not valid(pms,{'type':'card','pan':'1111','cvv':'123'})
assert valid(pms,{'type':'card'})
assert len(c['cases'])==len({z['id'] for z in c['cases']})==30
assert c['status']=='scenarios_only_not_run'
assert all(p['capabilities'][s]['status']=='unknown' for s in ('form_provider','form_direct','form_fields'))
assert p['operations']['debit_card_wof']['documented']
print('CHECKOUT_STATIC: PASS')
print('openapi_version:',x['info']['version'],'operations:',len(ids),'schemas:',len(s),'resolved_refs:',refs)
print('security: Merchant API PaymentMethodRequest rejects PAN/CVV, checkout info restricted')
print('tkb: documented WOF/3DS2 with terminal permission unknown')
print('scenarios: 30 drafted, 0 executed')
