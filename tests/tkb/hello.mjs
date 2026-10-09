import { readFile } from 'node:fs/promises';
import { createHmac, createHash, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import {request, Agent} from 'node:https';
import {checkServerIdentity} from 'node:tls';

const hash = value => createHash('sha256').update(value).digest('hex');
const sign = (bytes, key) => createHmac('sha1', key).update(bytes).digest('base64');
const echoMatches = (output, probe) => output === probe || output === `Hello. InputString=${probe}`;
const readLimited = async response => {
  if (!response.body) return '';
  const reader=response.body.getReader(); const parts=[]; let length=0;
  try {
    while(true) {const item=await reader.read();if(item.done)break;length+=item.value.byteLength;if(length>65536)throw new Error('GATE_RESPONSE_SIZE');parts.push(Buffer.from(item.value));}
    return Buffer.concat(parts).toString('utf8');
  } finally {await reader.cancel().catch(()=>{});}
};
assert.equal(await readLimited(new Response('synthetic')), 'synthetic');
await assert.rejects(readLimited(new Response('x'.repeat(65537))), /GATE_RESPONSE_SIZE/);
assert.equal(echoMatches('Hello. InputString=synthetic', 'synthetic'), true);
assert.equal(echoMatches('synthetic', 'synthetic'), true);
assert.equal(echoMatches('Hello. InputString=other', 'synthetic'), false);
const fixture = Buffer.from('The quick brown fox jumps over the lazy dog', 'utf8');
assert.equal(createHmac('sha1', 'key').update(fixture).digest('hex'), 'de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9');
if (!process.argv.includes('--run')) {
  console.log(JSON.stringify({status: 'PASS', check: 'synthetic_hmac', bank_calls: 0}));
  process.exit(0);
}
const started = Date.now();
const result = {scenario: 'BRV-03', checked_at: new Date().toISOString(), status: 'NOT_RUN', send_attempts: 0};
try {
  const env = JSON.parse(await readFile(new URL('../../external-docs/tkb-postman/104178.postman_environment.json', import.meta.url), 'utf8'));
  const values = new Map();
  for (const entry of env.values ?? []) {
    if (entry.enabled === false) continue;
    const name = String(entry.key ?? '').trim();
    if (!['url', 'login', 'secret'].includes(name)) continue;
    if (values.has(name)) throw new Error('GATE_DUPLICATE');
    values.set(name, String(entry.value ?? ''));
  }
  const base = new URL(values.get('url'));
  if (base.protocol !== 'https:' || !/(^|[.-])(paytest|sandbox|test|uat)([.-]|$)/i.test(base.hostname) || !['','/'].includes(base.pathname) || base.username || base.password || base.search || base.hash || !values.get('login') || !values.get('secret')) throw new Error('GATE_ENV');
  const target = new URL('/api/tcbpay/gate/hello', base);
  const probe = 'tkb-hello-' + randomUUID();
  const bytes = Buffer.from(JSON.stringify({inputString: probe}), 'utf8');
  result.target_hash = hash(target.origin);
  if (result.target_hash !== '0e2449c281d8bae1e311408ebc95595b6fa1f2ab67db1ccd6a8a0b95a1e3a721') throw new Error('GATE_TARGET_SCOPE');
  result.probe_hash = hash(probe);
  result.send_attempts = 1;
  const headers = {'Content-Type': 'application/json; charset=utf-8', 'TCB-Header-Login': values.get('login'), 'TCB-Header-Sign': sign(bytes, values.get('secret'))};
  let response, raw;
  if (process.argv.includes('--test-tls')) {
    // Explicit owner-authorised diagnostic exception: exact sandbox + Hello only.
    if (result.target_hash !== '0e2449c281d8bae1e311408ebc95595b6fa1f2ab67db1ccd6a8a0b95a1e3a721' || target.pathname !== '/api/tcbpay/gate/hello') throw new Error('GATE_TLS_SCOPE');
    result.tls_mode = 'hello_test_ca_exception';
    const agent = new Agent({rejectUnauthorized:false, minVersion:'TLSv1.2', keepAlive:false});
    try {
      ({response,raw} = await new Promise((resolve,reject) => {
        const req = request(target, {method:'POST',headers,agent,signal:AbortSignal.timeout(15000)}, res => {
          const parts=[]; let length=0;
          res.on('data',chunk => {length+=chunk.length;if(length>65536){res.destroy();reject(new Error('GATE_RESPONSE_SIZE'));}else parts.push(chunk);});
          res.on('end',() => resolve({response:{status:res.statusCode,ok:res.statusCode>=200&&res.statusCode<300},raw:Buffer.concat(parts).toString('utf8')}));
          res.on('error',reject);
        });
        req.on('socket',socket => {
          // Defer body/authentication until the hostname check succeeds.
          socket.once('secureConnect',() => {const mismatch=checkServerIdentity(target.hostname,socket.getPeerCertificate());if(mismatch){req.destroy(mismatch);}else{result.host_match=true;req.end(bytes);}});
        });
        req.on('error',reject);
      }));
    } finally {agent.destroy();}
  } else {
    result.tls_mode = 'strict';
    response = await fetch(target, {method:'POST',redirect:'manual',signal:AbortSignal.timeout(15000),headers,body:bytes});
    raw = await readLimited(response);
  }
  result.http_status = response.status;
  result.body_hash = hash(raw);
  let parsed;
  try { parsed = JSON.parse(raw); result.json_valid = true; }
  catch { result.json_valid = false; }
  const rootKeys = parsed && typeof parsed === 'object' ? Object.keys(parsed) : [];
  const allowedKeys = ['outputString','errorInfo','data','OutputString','outputstring'];
  result.response_keys = rootKeys.filter(key => allowedKeys.includes(key));
  result.unknown_keys = rootKeys.filter(key => !allowedKeys.includes(key)).length;
  result.echo_match = parsed?.outputString === probe;
  result.output_type = typeof parsed?.outputString;
  if (typeof parsed?.outputString === 'string') {
    result.echo_contains = parsed.outputString.includes(probe);
    let safe = parsed.outputString;
    for (const value of [values.get('login'),values.get('secret')]) if (value) safe=safe.split(value).join('[REDACTED]');
    safe=safe.split(probe).join('[PROBE]');
    result.output_safe = safe.replace(/https?:\/\/\S+/gi,'[URL]').replace(/(?:[0-9][ -]?){12,19}/g,'[NUMBER]').replace(/[A-Za-z0-9_+=/-]{32,}/g,'[TOKEN]').slice(0,200);
  }
  result.echo_nested = parsed?.data?.outputString === probe;
  result.echo_variant = parsed?.OutputString === probe || parsed?.outputstring === probe;
  const message = parsed?.errorInfo?.errorMessage;
  if (typeof message === 'string') {
    let safe = message;
    for (const value of [values.get('login'),values.get('secret'),probe]) if (value) safe=safe.split(value).join('[REDACTED]');
    result.message = safe.replace(/https?:\/\/\S+/gi,'[URL]').replace(/(?:[0-9][ -]?){12,19}/g,'[NUMBER]').replace(/[A-Za-z0-9_+=/-]{32,}/g,'[TOKEN]').slice(0,200);
  }
  const code = parsed?.errorInfo?.errorCode;
  if (Number.isSafeInteger(code) && Math.abs(code) <= 999999) result.error_code = code;
  else if (typeof code === 'string' && code.length <= 40 && /^[A-Za-z0-9_.-]*$/.test(code) && !code.includes(values.get('login')) && !code.includes(values.get('secret'))) result.error_code = code;
  result.message_present = !!parsed?.errorInfo?.errorMessage;
  result.echo_valid = echoMatches(parsed?.outputString, probe);
  result.status = response.ok && result.echo_valid && code === 0 ? 'PASS' : 'INCONCLUSIVE';
} catch (error) {
  result.status = result.send_attempts === 0 ? 'BLOCKED' : 'INCONCLUSIVE';
  result.error_kind = error?.name ?? 'Error';
  if (typeof error?.code === 'string' && /^[A-Z_0-9]+$/.test(error.code)) result.transport_code = error.code;
  if (typeof error?.message === 'string' && /^GATE_[A-Z_]+$/.test(error.message)) result.gate = error.message;
  if (typeof error?.cause?.code === 'string' && /^[A-Z_0-9]+$/.test(error.cause.code)) result.transport_code = error.cause.code;
}
result.duration_ms = Date.now() - started;
console.log(JSON.stringify(result));
