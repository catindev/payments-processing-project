#!/usr/bin/env python3
"""NAME-01: validate own API/schema/TypeScript property names, optionally SQL columns.

Usage:
  python check-payment-names-v1.2.py
  python check-payment-names-v1.2.py --sql migration.sql

External provider payload field names, enum values, route segments and SQL table
names are intentionally not rewritten or rejected by this small linter.
"""
from __future__ import annotations
import argparse
import pathlib
import re
import sys
import yaml

ROOT = pathlib.Path(__file__).resolve().parent
API = ROOT / 'payment-api-v0.9.openapi.yaml'
SPI = ROOT / 'acquirer-connector-v0.5.ts'
PATTERN = re.compile(r'^[a-z][a-z0-9]*(?:_[a-z0-9]+)?$')
TS_PROP = re.compile(r'^\s*(?:readonly\s+)?([a-z][a-z0-9_]*)(?:\?)?\s*:', re.M)
SQL_COLUMN = re.compile(r'^\s*(?:"([a-z][a-z0-9_]*)"|([a-z][a-z0-9_]*))\s+(?:[A-Z][A-Z0-9]*(?:\([^)]*\))?|[a-z][a-z0-9]*(?:\([^)]*\))?)\b',re.M)


def collect_schema_fields(item, path='openapi', fields=None):
    if fields is None: fields=[]
    if isinstance(item, dict):
        props = item.get('properties')
        if isinstance(props, dict):
            for name in props:
                fields.append((f'{path}.properties.{name}',name))
        for key,val in item.items():
            collect_schema_fields(val,f'{path}.{key}',fields)
    elif isinstance(item,list):
        for i,val in enumerate(item): collect_schema_fields(val,f'{path}[{i}]',fields)
    return fields


def check_names(fields):
    return [(where,name) for where,name in fields if not PATTERN.fullmatch(name)]


def check_sql(filenames):
    bad=[];count=0
    for filename in filenames:
        text=filename.read_text(encoding='utf-8')
        # Lightweight convention check for conventional per-line SQL DDL columns.
        # SQL parsers must be used for arbitrarily formatted migrations in product CI.
        for found in SQL_COLUMN.finditer(text):
            name=found.group(1) or found.group(2)
            if name.upper() in {'CREATE','PRIMARY','FOREIGN','UNIQUE','CONSTRAINT','CHECK','REFERENCES','ALTER','INDEX','DROP','COMMENT'}:continue
            count+=1
            if not PATTERN.fullmatch(name):bad.append((str(filename),name))
    return count,bad


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--sql', type=pathlib.Path, action='append', default=[])
    parser.add_argument('--self-test', action='store_true')
    args=parser.parse_args()
    if args.self_test:
        assert not check_names([('ok','reduce'),('ok','amount_final'),('ok','intent_id')])
        assert check_names([('bad','confirm_amount_reduction')])
        print('SELF_TEST: PASS')
    doc=yaml.safe_load(API.read_text(encoding='utf-8'))
    fields=collect_schema_fields(doc)
    bad=check_names(fields)
    spi=SPI.read_text(encoding='utf-8')
    ts_names=TS_PROP.findall(spi)
    bad.extend(check_names([(f'{SPI.name}:{name}',name) for name in ts_names]))
    sql_count,sql_bad=check_sql(args.sql)
    bad.extend(sql_bad)
    print(f'OpenAPI fields: {len(fields)}; TS properties: {len(ts_names)}; SQL columns sampled: {sql_count}; violations: {len(bad)}')
    for where,name in bad:
        print(f'INVALID_FIELD: {where}: {name}')
    if bad:sys.exit(1)
    print('NAME-01: PASS')

if __name__=='__main__':main()
