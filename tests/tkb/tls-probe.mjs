import {readFile} from 'node:fs/promises';
import {connect, checkServerIdentity, getCACertificates} from 'node:tls';
import {createHash} from 'node:crypto';
const hash = x => createHash('sha256').update(x).digest('hex');
if (!process.argv.includes('--run')) {
  console.log(JSON.stringify({status:'NOT_RUN',check:'strict_tls',http_calls:0,tls_attempts:0}));
  process.exit(0);
}
const env = JSON.parse(await readFile(new URL('../../external-docs/tkb-postman/104178.postman_environment.json', import.meta.url), 'utf8'));
const entry = (env.values ?? []).find(x => String(x.key).trim() === 'url' && x.enabled !== false);
const url = new URL(entry?.value);
const result = {checked_at: new Date().toISOString(), check: 'strict_tls', http_calls: 0, credentials_sent: false, system_roots: getCACertificates('system').length};
if (url.protocol !== 'https:' || !/(^|[.-])(paytest|sandbox|test|uat)([.-]|$)/i.test(url.hostname) || url.username || url.password || url.search || url.hash) {
  console.log(JSON.stringify({...result,status:'BLOCKED',gate:'target'})); process.exit(0);
}
result.target_hash = hash(url.origin);
if (result.target_hash !== '0e2449c281d8bae1e311408ebc95595b6fa1f2ab67db1ccd6a8a0b95a1e3a721') {
  console.log(JSON.stringify({...result,status:'BLOCKED',gate:'scope'})); process.exit(0);
}
const socket = connect({host:url.hostname,port:Number(url.port || 443),servername:url.hostname,rejectUnauthorized:true,minVersion:'TLSv1.2'});
let finished = false;
const finish = fields => { if (finished) return; finished=true; console.log(JSON.stringify({...result,...fields})); socket.destroy(); };
socket.setTimeout(10000, () => finish({status:'INCONCLUSIVE',code:'TIMEOUT'}));
socket.on('secureConnect', () => {
  const cert = socket.getPeerCertificate();
  finish({status:socket.authorized && !checkServerIdentity(url.hostname,cert) ? 'PASS':'INCONCLUSIVE',trusted:socket.authorized,host_match:!checkServerIdentity(url.hostname,cert),tls_version:socket.getProtocol(),issuer_hash:hash(JSON.stringify(cert.issuer ?? {}))});
});
socket.on('error',error => finish({status:'INCONCLUSIVE',code:/^[A-Z_0-9]+$/.test(error.code ?? '') ? error.code : 'TLS_ERROR'}));
