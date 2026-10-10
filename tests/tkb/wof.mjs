import {open, readFile, mkdir, stat, lstat, readdir, unlink} from 'node:fs/promises';
import {constants} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join, dirname} from 'node:path';
import {createHash, createHmac, createDecipheriv, createCipheriv, randomBytes, randomUUID} from 'node:crypto';
import {request, Agent} from 'node:https';
import {checkServerIdentity} from 'node:tls';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PRIVATE=fileURLToPath(new URL('../../../.audit-local/tkb-wof/',import.meta.url));
const ORIGIN='0e2449c281d8bae1e311408ebc95595b6fa1f2ab67db1ccd6a8a0b95a1e3a721';
const CARD='f8a71b25eabe711318981c7bded7c2eba31a6a103bbf8ad5f0b3236bc68963d1';
const AMOUNT=100;
const PATHS=Object.freeze({init:'/api/v1/card/unregistered/debit/wof',lookup:'/api/v1/order/state'});
const RAW=join(PRIVATE,'raw');
const RAW_DIAGNOSTIC=join(PRIVATE,'diagnostic');
const RAW_KEY=join(PRIVATE,'raw.key');
const ACCESS=join(PRIVATE,'access.log');
const STATUS_LOCK=join(PRIVATE,'status-dispatch.lock.json');
const RECON_MAX=10;
const hash=x=>createHash('sha256').update(x).digest('hex');
const utc=()=>new Date().toISOString();
const gate=(condition,name)=>{if(!condition)throw new Error('GATE_'+name);};
const own=(obj,key)=>obj&&typeof obj==='object'&&Object.hasOwn(obj,key)?obj[key]:undefined;
const pick=(obj,names)=>names.map(k=>own(obj,k)).find(v=>v!==undefined);
const knownRoots=['errorInfo','ErrorInfo','OrderId','orderId','ExtId','ExtID','extId','Amount','amount','Currency','currency','Status','status','State','state','OrderState','orderState','OperationState','operationState','AcsUrl','ACSUrl','acsUrl','PaReq','paReq','Md','MD','md','FormUrl','formUrl','CardRefId','CardRefID','cardRefId','AuthenticationData','authenticationData','ThreeDSServerTransID','ThreeDSServerTransId','threeDSServerTransID','ThreeDSMethodUrl','threeDSMethodUrl','ThreeDSMethodData','threeDSMethodData','OrderAdditionalInfo','orderAdditionalInfo','OrderInfo','orderInfo','Order','order','Is3ds','Is3DS','is3ds','ThreeDSVersion','threeDSVersion','Data','data'];
const statusWords=new Set(['created','registered','pending','processing','accepted','authorized','paid','captured','succeeded','success','failed','declined','canceled','cancelled','expired','completed','requires_action','requires_3ds','wait_3ds','waiting_3ds','unknown']);
const normalizeKey=key=>String(key).replace(/[^A-Za-z0-9]/g,'').toLowerCase();
const secretFieldNames=new Set(['login','secret','password','passwd','pwd','clientsecret','apisecret','apikey','privatekey','signingkey','secretkey','tcbheaderlogin','tcbheadersign','authorization','proxyauthorization','cookie','setcookie','signature','accesstoken','refreshtoken','idtoken','authtoken','bearertoken','token','sessiontoken','sessionid','sessioncredentials','sessionkey','cvv','cvc','cvv2','cvc2','securitycode','cardverificationvalue','pan','cardnumber','primaryaccountnumber','pareq','pares','md','creq','cres','authenticationvalue','cavv','aav','threedsmethoddata']);
const secretKey=key=>secretFieldNames.has(normalizeKey(key));
const secretValues=sensitive=>new Set((sensitive??[]).filter(v=>v!==undefined&&v!==null&&String(v).length>0).map(v=>String(v)));
function redactConfigured(value,sensitive=[]){
  if(typeof value!=='string')return value;
  let text=value;for(const secret of secretValues(sensitive))text=text.split(secret).join('[REDACTED_CONFIGURED_SECRET]');return text;
}
function redactedValue(value,reason){
  if(value===null)return {redacted:true,reason,type:'null'};
  if(Array.isArray(value))return {redacted:true,reason,type:'array',length:value.length};
  if(typeof value==='object')return {redacted:true,reason,type:'object',keys:Object.keys(value)};
  return {redacted:true,reason,type:typeof value,length:typeof value==='string'?value.length:undefined};
}
function diagnosticValue(value,sensitive=[],key=''){
  if(secretKey(key))return redactedValue(value,'secret_field');
  if(typeof value==='string'){const redacted=redactConfigured(value,sensitive);return redacted===value?value:redacted;}
  if(typeof value==='number'&&secretValues(sensitive).has(String(value)))return redactedValue(value,'configured_secret');
  if(Array.isArray(value))return value.map(item=>diagnosticValue(item,sensitive,key));
  if(value!==null&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([child,value])=>{const safeChild=redactConfigured(child,sensitive);return [safeChild,diagnosticValue(value,sensitive,child)];}));
  return value;
}
function diagnosticEnvelope(body,http,sensitive=[],meta={}){
  const roots=body&&typeof body==='object'&&!Array.isArray(body)?Object.keys(body):[];
  return {version:2,checked_at:utc(),http_status:http,format:meta.json_valid===false?'text':'json',json_valid:meta.json_valid!==false,root_keys:roots.map(key=>redactConfigured(key,sensitive)),body:diagnosticValue(body,sensitive),...meta};
}
function safeCode(value,sensitive=[]){
  if(secretValues(sensitive).has(String(value)))return undefined;
  if(Number.isSafeInteger(value)&&value>=-99999&&value<=99999)return value;
  if(typeof value==='string'&&/^-?[0-9]{1,5}$/.test(value))return value;
  return undefined;
}
function safeStatus(value,sensitive=[]){
  if(secretValues(sensitive).has(String(value)))return undefined;
  if(Number.isSafeInteger(value)&&value>=-1&&value<=999)return value;
  if(typeof value==='string'&&statusWords.has(value.toLowerCase()))return value.toLowerCase();
  return undefined;
}
const objectValue=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function scopes(body){const list=[body];for(const obj of [pick(body,['OrderInfo','orderInfo','Data','data','Order','order'])])if(objectValue(obj)&&!list.includes(obj))list.push(obj);return list;}
function scoped(body,names){for(const obj of scopes(body)){const v=pick(obj,names);if(v!==undefined)return v;}return undefined;}
function summary(body,ledger,http,sensitive=[]){
  const roots=body&&typeof body==='object'&&!Array.isArray(body)?Object.keys(body):[];
  const err=scoped(body,['errorInfo','ErrorInfo']);
  const errorCodeRaw=pick(err,['errorCode','ErrorCode']);
  const messageRaw=pick(err,['errorMessage','ErrorMessage']);
  const reason=typeof messageRaw!=='string'?'absent':/успех|success/i.test(messageRaw)?'success_word':/прав|access|permission|разреш|запрещ/i.test(messageRaw)?'access':/подпис|signature|login|логин/i.test(messageRaw)?'authentication':/параметр|parameter|год|year|month|месяц|cvv|cvc|срок|неверн/i.test(messageRaw)?'validation':'other';
  const bankRef=scoped(body,['ExtId','ExtID','extId']);
  const amount=scoped(body,['Amount','amount']);
  const currency=scoped(body,['Currency','currency']);
  const statusRaw=scoped(body,['Status','status','State','state','OrderState','orderState','OperationState','operationState']);
  const status=safeStatus(statusRaw,sensitive);
  const acs=scoped(body,['AcsUrl','ACSUrl','acsUrl']);
  const pareq=scoped(body,['PaReq','paReq']);
  const md=scoped(body,['Md','MD','md']);
  const ref_match=bankRef===undefined?null:typeof bankRef==='string'&&bankRef===ledger.ref;
  const amount_match=amount===undefined?null:(typeof amount==='number'||typeof amount==='string')&&String(amount)===String(AMOUNT);
  const currency_match=currency===undefined?null:typeof currency==='string'&&currency==='RUB';
  const result={scenario:'WOF-01',stage:ledger.stage,checked_at:utc(),http_status:http,ref_hash:hash(ledger.ref),amount:AMOUNT,currency:'RUB',root_keys:roots.map(k=>secretValues(sensitive).has(k)?'[REDACTED_CONFIGURED_SECRET_FIELD]':secretKey(k)?'[REDACTED_SECRET_FIELD]':k),unknown_keys:roots.filter(k=>!knownRoots.includes(k)).length,error_code:safeCode(errorCodeRaw,sensitive),error_code_raw:redactConfigured(errorCodeRaw,sensitive),error_message:redactConfigured(messageRaw,sensitive),error_reason:reason,status_value:status,status_raw:redactConfigured(statusRaw,sensitive),ref_match,amount_match,currency_match,order_present:!!pick(body,['OrderId','orderId']),acs_present:typeof acs==='string'&&acs.length>0,pareq_present:typeof pareq==='string'&&pareq.length>0,md_present:typeof md==='string'&&md.length>0,auth_present:!!pick(body,['AuthenticationData','authenticationData']),method_present:!!pick(body,['ThreeDSMethodUrl','threeDSMethodUrl']),financial:'unproven'};
  result.reply_kind=result.acs_present&&result.pareq_present&&result.md_present?'requires_action':http>=200&&http<300&&Number(result.error_code)===0?'bank_reply':'nonfinal_error';
  result.order_fields=objectValue(pick(body,['OrderInfo','orderInfo']))?Object.keys(pick(body,['OrderInfo','orderInfo'])):[];
  if(result.ref_match===false||result.amount_match===false||result.currency_match===false)result.reply_kind='correlation_conflict';
  // This is interpretation only: no HTTP/code/status value proves financial success.
  return result;
}
async function privateDir(dir,name='PRIVATE_DIRECTORY'){await mkdir(dir,{recursive:true,mode:0o700});const info=await lstat(dir);gate(info.isDirectory()&&!info.isSymbolicLink()&&(info.mode&0o077)===0&&(!process.getuid||info.uid===process.getuid()),name);}
async function accessLog(event,details={}){
  await privateDir(PRIVATE);
  const handle=await open(ACCESS,constants.O_WRONLY|constants.O_CREAT|constants.O_APPEND|constants.O_NOFOLLOW,0o600);
  try{const info=await stat(ACCESS);gate((info.mode&0o077)===0,'ACCESS_LOG_MODE');await handle.writeFile(JSON.stringify({at:utc(),event,...details})+'\n','utf8');await handle.sync();}finally{await handle.close();}
}
const captureMode=()=>process.argv.includes('--no-raw')?'none':process.argv.includes('--encrypted')?'encrypted':'plain';
const accessLogEnabled=()=>process.argv.includes('--access-log');
function ttlHours(){const at=process.argv.find(value=>value.startsWith('--ttl-hours='));const index=process.argv.indexOf('--ttl-hours');const present=Boolean(at)||index>=0;if(!present)return undefined;const raw=at?at.slice('--ttl-hours='.length):process.argv[index+1];gate(typeof raw==='string'&&raw.length>0,'TTL');const hours=Number(raw);gate(Number.isFinite(hours)&&hours>0&&hours<=168,'TTL');return hours;}
async function rawKey(){
  await privateDir(PRIVATE);
  try{const handle=await open(RAW_KEY,constants.O_RDONLY|constants.O_NOFOLLOW);try{const info=await handle.stat();gate(info.isFile()&&(info.mode&0o077)===0&&(!process.getuid||info.uid===process.getuid()),'RAW_KEY_MODE');const key=await handle.readFile();gate(key.length===32,'RAW_KEY');return key;}finally{await handle.close();}}catch(error){if(error.code!=='ENOENT')throw error;}
  const key=randomBytes(32);const handle=await open(RAW_KEY,'wx',0o600);try{await handle.writeFile(key);await handle.sync();}finally{await handle.close();}return key;
}
async function purgeRaw(){
  await privateDir(RAW,'RAW_DIRECTORY');await privateDir(RAW_DIAGNOSTIC,'DIAGNOSTIC_DIRECTORY');
  const locations=[{dir:RAW,pattern:/^(init|lookup|reconcile)-[0-9]+(?:-[0-9a-f-]+)?\.(enc|raw)\.json$/},{dir:RAW_DIAGNOSTIC,pattern:/^(init|lookup|reconcile)-[0-9]+(?:-[0-9a-f-]+)?\.json$/}];let purged=0;
  for(const location of locations){let entries;try{entries=await readdir(location.dir,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')continue;throw error;}for(const entry of entries){if(!entry.isFile()||!location.pattern.test(entry.name))continue;const file=join(location.dir,entry.name);let item;try{item=JSON.parse(await readFile(file,'utf8'));}catch{continue;}if(typeof item.raw_expires_at==='string'&&Date.parse(item.raw_expires_at)<Date.now()||typeof item.expires_at==='string'&&Date.parse(item.expires_at)<Date.now()){await unlink(file);purged++;}}}
  if(accessLogEnabled())await accessLog('raw_purge',{purged});return {purged};
}
async function captureResponse(stage,http,raw,body,sensitive=[],jsonValid=true){
  const mode=captureMode();const checked=utc();const hours=ttlHours();const expires=hours===undefined?undefined:new Date(Date.now()+hours*60*60*1000).toISOString();const bodyHash=hash(raw);const stamp=Date.now();const id=randomUUID();
  await privateDir(RAW_DIAGNOSTIC,'DIAGNOSTIC_DIRECTORY');
  const diagnosticFile=stage+'-'+stamp+'-'+id+'.json';
  const diagnostic=diagnosticEnvelope(body,http,sensitive,{stage,body_hash:bodyHash,raw_capture:mode,raw_expires_at:expires,json_valid:jsonValid});
  await writeExclusive(join(RAW_DIAGNOSTIC,diagnosticFile),diagnostic);
  let rawFile;
  if(mode==='encrypted'){
    await privateDir(RAW,'RAW_DIRECTORY');
    const key=await rawKey();const nonce=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,nonce);const plain=Buffer.from(raw,'utf8');const data=Buffer.concat([cipher.update(plain),cipher.final()]);plain.fill(0);key.fill(0);
    rawFile=stage+'-'+stamp+'-'+id+'.enc.json';await writeExclusive(join(RAW,rawFile),{version:1,stage,http,checked_at:checked,body_hash:bodyHash,nonce:nonce.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64'),expires_at:expires});data.fill(0);
  }else if(mode==='plain'){
    await privateDir(RAW,'RAW_DIRECTORY');rawFile=stage+'-'+stamp+'-'+id+'.raw.json';await writeExclusive(join(RAW,rawFile),{version:1,stage,http,checked_at:checked,body_hash:bodyHash,body:raw,expires_at:expires});
  }
  if(accessLogEnabled())await accessLog('raw_store',{stage,http,body_hash:bodyHash,mode,expires_at:expires});
  return {capture_mode:mode,raw_local:mode!=='none',raw_body_hash:bodyHash,raw_expires_at:expires,raw_file:rawFile??null,diagnostic_file:join('diagnostic',diagnosticFile),diagnostic};
}
async function privateText(file){const handle=await open(file,constants.O_RDONLY|constants.O_NOFOLLOW);try{const info=await handle.stat();gate(info.isFile()&&(info.mode&0o077)===0&&(!process.getuid||info.uid===process.getuid()),'PRIVATE_FILE');return handle.readFile('utf8');}finally{await handle.close();}}
async function readCaptured(file){
  const record=JSON.parse(await privateText(file));gate(record.version===1||record.version===2,'ARTIFACT_VERSION');if(record.expires_at)gate(Number.isFinite(Date.parse(record.expires_at))&&Date.parse(record.expires_at)>Date.now(),'ARTIFACT_EXPIRED');
  if(file.endsWith('.raw.json')){gate(typeof record.body==='string','RAW_BODY');gate(hash(record.body)===record.body_hash,'ARTIFACT_HASH');return {record,raw:record.body};}
  gate(file.endsWith('.enc.json')&&typeof record.nonce==='string'&&typeof record.tag==='string'&&typeof record.data==='string','RAW_FORMAT');const key=await rawKey();const dec=createDecipheriv('aes-256-gcm',key,Buffer.from(record.nonce,'base64'));dec.setAuthTag(Buffer.from(record.tag,'base64'));const plain=Buffer.concat([dec.update(Buffer.from(record.data,'base64')),dec.final()]);key.fill(0);const raw=plain.toString('utf8');plain.fill(0);gate(hash(raw)===record.body_hash,'ARTIFACT_HASH');return {record,raw};
}
async function diagnoseLocal(){
  await privateDir(RAW_DIAGNOSTIC,'DIAGNOSTIC_DIRECTORY');await privateDir(RAW,'RAW_DIRECTORY');
  let entries=[];try{entries=await readdir(RAW_DIAGNOSTIC,{withFileTypes:true});}catch(error){if(error.code!=='ENOENT')throw error;}
  const diagnostics=entries.filter(entry=>entry.isFile()&&/^(init|lookup|reconcile)-[0-9]+(?:-[0-9a-f-]+)?\.json$/.test(entry.name)).map(entry=>entry.name);
  let rawEntries=[];try{rawEntries=await readdir(RAW,{withFileTypes:true});}catch(error){if(error.code!=='ENOENT')throw error;}
  const raws=rawEntries.filter(entry=>entry.isFile()&&/^(init|lookup|reconcile)-[0-9]+(?:-[0-9a-f-]+)?\.(enc|raw)\.json$/.test(entry.name)).map(entry=>entry.name);
  if(process.argv.includes('--list')){console.log(JSON.stringify({status:'PASS',network_calls:0,diagnostic_files:diagnostics,raw_files:raws},null,2));return;}
  const requestedIndex=process.argv.indexOf('--file');const requested=requestedIndex>=0?process.argv[requestedIndex+1]:undefined;gate(requestedIndex<0||typeof requested==='string','DIAGNOSTIC_FILE');
  const chosen=requested??diagnostics.sort((a,b)=>Number(b.match(/-([0-9]+)(?:-[0-9a-f-]+)?\.json$/)[1])-Number(a.match(/-([0-9]+)(?:-[0-9a-f-]+)?\.json$/)[1]))[0];
  if(chosen&&diagnostics.includes(chosen)){
    const value=JSON.parse(await privateText(join(RAW_DIAGNOSTIC,chosen)));gate(value.version===2&&value.stage===chosen.split('-')[0]&&Number.isInteger(value.http_status),'DIAGNOSTIC_SCHEMA');if(value.raw_expires_at)gate(Date.parse(value.raw_expires_at)>Date.now(),'DIAGNOSTIC_EXPIRED');
    console.log(JSON.stringify(value,null,2));return;
  }
  const rawName=chosen??raws.sort((a,b)=>Number(b.match(/-([0-9]+)\./)[1])-Number(a.match(/-([0-9]+)\./)[1]))[0];gate(rawName&&raws.includes(rawName),'NO_DIAGNOSTIC_ARTIFACT');const captured=await readCaptured(join(RAW,rawName));
  if(process.argv.includes('--raw')){gate(process.stdin.isTTY&&process.stdout.isTTY,'RAW_TTY');console.log(captured.raw);return;}
  const cfg=await settings();let diagnosticCard;try{diagnosticCard=await cardInput();}catch{}let body;let json_valid=true;try{body=JSON.parse(captured.raw);}catch{body=captured.raw;json_valid=false;}const sensitive=[cfg.login,cfg.secret,diagnosticCard?.number,diagnosticCard?.code,diagnosticCard?String(Number(diagnosticCard.code)):undefined].filter(Boolean);console.log(JSON.stringify(diagnosticEnvelope(body,captured.record.http,sensitive,{stage:captured.record.stage,body_hash:captured.record.body_hash,source:'raw_fallback',json_valid}),null,2));
}
async function writeExclusive(file,value){
  // Persist private-directory ancestry before any durable dispatch marker.
  for(const dir of [dirname(PRIVATE),dirname(dirname(PRIVATE))]){const fd=await open(dir,'r');try{await fd.sync();}finally{await fd.close();}}
  const handle=await open(file,'wx',0o600);
  try{await handle.writeFile(JSON.stringify(value,null,2)+'\n','utf8');await handle.sync();}finally{await handle.close();}
  const parent=await open(PRIVATE,'r');try{await parent.sync();}finally{await parent.close();}
}
async function settings(){
  const doc=JSON.parse(await readFile(join(ROOT,'external-docs/tkb-postman/104178.postman_environment.json'),'utf8'));
  const values=new Map();
  for(const entry of doc.values??[]){if(entry.enabled===false)continue;const key=String(entry.key??'').trim();if(!['url','login','secret'].includes(key))continue;gate(!values.has(key),'ENV_DUPLICATE');values.set(key,String(entry.value??''));}
  const base=new URL(values.get('url'));
  gate(base.protocol==='https:'&&hash(base.origin)===ORIGIN&&base.pathname==='/'&&!base.search&&!base.hash&&!base.username&&!base.password,'ORIGIN');
  gate(!!values.get('login')&&!!values.get('secret'),'CREDENTIALS');
  return {base,login:values.get('login'),secret:values.get('secret')};
}
async function cardInput(){
  const keyFile=join(PRIVATE,'card.key'), dataFile=join(PRIVATE,'card.enc.json');
  for(const file of [keyFile,dataFile])gate(((await stat(file)).mode&0o077)===0,'PRIVATE_MODE');
  const key=await readFile(keyFile);const obj=JSON.parse(await readFile(dataFile,'utf8'));
  gate(key.length===32&&obj.version===1,'CARD_CIPHER');
  const dec=createDecipheriv('aes-256-gcm',key,Buffer.from(obj.nonce,'base64'));dec.setAuthTag(Buffer.from(obj.tag,'base64'));
  const plain=Buffer.concat([dec.update(Buffer.from(obj.data,'base64')),dec.final()]);
  key.fill(0);const card=JSON.parse(plain.toString('utf8'));plain.fill(0);
  gate(card.scope==='test_only'&&typeof card.number==='string'&&hash(card.number)===CARD,'TEST_CARD');
  gate(card.month===4&&card.year===2029&&/^[0-9]{3}$/.test(card.code)&&card.owner==='TEST CARD','CARD_FIELDS');
  return card;
}
async function readLedger(){
  const ledger=JSON.parse(await readFile(join(PRIVATE,'ledger.json'),'utf8'));
  const fields=['version','scenario','target_hash','ref','amount','currency','created_at','stage','wire','year_format','initial_limit'];
  gate(ledger!==null&&typeof ledger==='object'&&!Array.isArray(ledger)&&Object.getPrototypeOf(ledger)===Object.prototype,'LEDGER_ROOT');
  gate(Object.keys(ledger).length===fields.length&&fields.every(k=>Object.hasOwn(ledger,k)),'LEDGER_FIELDS');
  gate(ledger.version===1&&ledger.scenario==='WOF-01'&&ledger.target_hash===ORIGIN&&ledger.amount===AMOUNT&&ledger.currency==='RUB'&&typeof ledger.ref==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(ledger.ref),'LEDGER');
  gate(typeof ledger.created_at==='string'&&Number.isFinite(Date.parse(ledger.created_at))&&ledger.stage==='reserved'&&ledger.wire==='postman_sample_pascal_v1'&&ledger.year_format==='YYYY_candidate'&&ledger.initial_limit===1,'LEDGER_SNAPSHOT');
  return ledger;
}
async function statusMarkers(prefix,max,ledger){
  const names=await readdir(PRIVATE);const pattern=new RegExp('^'+prefix+'-([0-9]+)\\.json$');const indices=names.map(name=>{const match=name.match(pattern);return match?Number(match[1]):null;}).filter(index=>index!==null);const highest=indices.length?Math.max(...indices):0;gate(highest<=max,prefix.toUpperCase()+'_BUDGET');const series=[];
  for(let i=1;i<=highest;i++){const marker=JSON.parse(await privateText(join(PRIVATE,prefix+'-'+i+'.json')));gate(marker!==null&&typeof marker==='object'&&!Array.isArray(marker)&&Object.getPrototypeOf(marker)===Object.prototype,'MARKER_ROOT');gate(marker.version===undefined||marker.version===1,'MARKER_VERSION');gate(marker.stage===prefix&&marker.state==='dispatch_started'&&marker.ref===ledger.ref&&marker.target_hash===ORIGIN&&typeof marker.created_at==='string'&&Number.isFinite(Date.parse(marker.created_at))&&/^[0-9]+$/.test(marker.tick??''),'MARKER_FIELDS');if(prefix==='reconcile')gate(marker.index===i,'MARKER_INDEX');let completion;try{completion=JSON.parse(await privateText(join(PRIVATE,prefix+'-complete-'+i+'.json')));}catch{throw new Error('GATE_'+prefix.toUpperCase()+'_INFLIGHT');}gate(completion!==null&&typeof completion==='object'&&!Array.isArray(completion)&&Object.getPrototypeOf(completion)===Object.prototype,'COMPLETE_ROOT');gate(completion.state==='transport_closed'&&completion.ref===ledger.ref&&completion.target_hash===ORIGIN&&completion.index===i&&typeof completion.closed_at==='string'&&Number.isFinite(Date.parse(completion.closed_at))&&/^[0-9]+$/.test(completion.tick??''),'COMPLETE_FIELDS');series.push({marker,completion});}
  return series;
}
async function statusCompletions(ledger){
  const completed=[];for(const prefix of ['lookup','reconcile'])for(const item of await statusMarkers(prefix,prefix==='lookup'?3:RECON_MAX,ledger))completed.push(item.completion);return completed;
}
async function assertStatusInterval(ledger){
  const completed=await statusCompletions(ledger);if(completed.length){const latest=completed.sort((x,y)=>Date.parse(y.closed_at)-Date.parse(x.closed_at))[0];gate(Number.isFinite(Date.parse(latest.closed_at))&&Date.now()-Date.parse(latest.closed_at)>=60000,'GLOBAL_RECON_INTERVAL');}
}
async function acquireStatusLock(ref,stage,index){
  const token=randomUUID();try{await writeExclusive(STATUS_LOCK,{version:1,ref,target_hash:ORIGIN,stage,index,token,created_at:utc()});}catch(error){if(error.code==='EEXIST')throw new Error('GATE_STATUS_INFLIGHT');throw error;}return token;
}
async function releaseStatusLock(ref,token){
  const lock=JSON.parse(await readFile(STATUS_LOCK,'utf8'));gate(lock.ref===ref&&lock.token===token,'STATUS_LOCK_OWNER');await unlink(STATUS_LOCK);
}
async function bankPost(cfg,stage,body){
  gate(Object.hasOwn(PATHS,stage),'PATH');
  const target=new URL(PATHS[stage],cfg.base);
  gate(hash(target.origin)===ORIGIN&&target.pathname===PATHS[stage]&&!target.search,'TARGET');
  const bytes=Buffer.from(JSON.stringify(body),'utf8');
  const headers={'Content-Type':'application/json; charset=utf-8','TCB-Header-Login':cfg.login,'TCB-Header-Sign':createHmac('sha1',cfg.secret).update(bytes).digest('base64')};
  const agent=new Agent({rejectUnauthorized:!process.argv.includes('--test-tls'),minVersion:'TLSv1.2',keepAlive:false});
  try{return await new Promise((resolve,reject)=>{
    const req=request(target,{method:'POST',headers,agent,signal:AbortSignal.timeout(15000)},res=>{
      const pieces=[];let size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>65536){res.destroy();reject(new Error('GATE_RESPONSE_SIZE'));}else pieces.push(chunk);});
      res.on('end',()=>{const raw=Buffer.concat(pieces);const text=raw.toString('utf8');let value,json_valid=true;try{value=JSON.parse(text);}catch{value=text;json_valid=false;}raw.fill(0);resolve({http:res.statusCode,body:value,raw:text,json_valid});});
      res.on('error',reject);
    });
    req.on('socket',socket=>socket.once('secureConnect',()=>{const mismatch=checkServerIdentity(target.hostname,socket.getPeerCertificate());if(mismatch)req.destroy(mismatch);else req.end(bytes);}));
    req.on('error',reject);
  });}finally{agent.destroy();bytes.fill(0);}
}
async function localTests(){
  const fake={ref:'00000000-0000-0000-0000-000000000000',stage:'init'};
  const sensitive=['SYNTHETIC-SECRET','123'];
  const body={errorInfo:{errorCode:422,errorMessage:'Банк: неверный срок действия'},UnknownField:'opaque-value',UnknownMessage:'prefix SYNTHETIC-SECRET suffix',TokenCount:3,ThreeDSVersion:'2.2.0',company:'kept',nested:{items:[{name:'kept',value:7}]},CardNumber:'SYNTHETIC-SECRET',card_number:'SYNTHETIC-SECRET',P_A_N:'SYNTHETIC-SECRET',CVV:123,PaReq:'opaque-auth-value'};
  const noLeak=summary({...body,'SYNTHETIC-SECRET':'hidden'},fake,422,sensitive);
  assert.equal(JSON.stringify(noLeak).includes('SYNTHETIC-SECRET'),false);assert.equal(noLeak.financial,'unproven');assert.equal(noLeak.error_code,422);assert.equal(noLeak.error_message,'Банк: неверный срок действия');assert.equal(noLeak.root_keys.includes('UnknownField'),true);assert.equal(noLeak.unknown_keys>=1,true);
  const diagnostic=diagnosticEnvelope(body,422,sensitive);
  assert.equal(diagnostic.body.UnknownField,'opaque-value');assert.equal(diagnostic.body.UnknownMessage,'prefix [REDACTED_CONFIGURED_SECRET] suffix');assert.equal(diagnostic.body.TokenCount,3);assert.equal(diagnostic.body.ThreeDSVersion,'2.2.0');assert.equal(diagnostic.body.company,'kept');assert.equal(diagnostic.body.nested.items[0].value,7);assert.equal(diagnostic.body.errorInfo.errorMessage,'Банк: неверный срок действия');assert.equal(diagnostic.body.CardNumber.redacted,true);assert.equal(diagnostic.body.card_number.redacted,true);assert.equal(diagnostic.body.P_A_N.redacted,true);assert.equal(diagnostic.body.CVV.redacted,true);assert.equal(diagnostic.body.PaReq.redacted,true);assert.equal(JSON.stringify(diagnostic).includes('SYNTHETIC-SECRET'),false);assert.equal(JSON.stringify(diagnostic).includes('opaque-value'),true);assert.equal(diagnosticEnvelope('plain bank error',500,sensitive,{json_valid:false}).format,'text');
  assert.equal(summary({errorInfo:{errorCode:0},ExtId:'other',Amount:101,Currency:'USD'},fake,200).reply_kind,'correlation_conflict');assert.equal(summary({ExtId:7},fake,200).ref_match,false);assert.equal(summary({Amount:{value:100}},fake,200).amount_match,false);assert.equal(summary({Currency:null},fake,200).currency_match,false);assert.equal(summary({ExtId:7},fake,200).reply_kind,'correlation_conflict');
  assert.equal(safeStatus('SYNTHETIC-SECRET'),undefined);
  assert.equal(safeCode(7,['007',String(Number('007'))]),undefined);
  assert.equal(safeStatus(7,['007',String(Number('007'))]),undefined);
  assert.equal(AMOUNT,100);assert.equal(PATHS.init.includes('no3ds'),false);assert.equal(Object.keys(PATHS).length,2);assert.equal(captureMode(),process.argv.includes('--no-raw')?'none':process.argv.includes('--encrypted')?'encrypted':'plain');
  assert.equal(createHmac('sha1','key').update('The quick brown fox jumps over the lazy dog').digest('hex'),'de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9');
  if(process.argv.includes('--diagnostic'))console.log(JSON.stringify({diagnostic,interpretation:noLeak},null,2));else console.log(JSON.stringify({status:'PASS',check:'offline_wof_diagnostics',network_calls:0,financial_calls:0,unknown_fields:'preserved',error_text:'preserved',secret_fields:'explicitly_redacted'}));
}
const command=process.argv[2]??'local';
let dispatched=false,ledger,action,lookupIndex,statusLockToken,phase='start';
try{
  if(command==='local'||command==='--self-test'){await localTests();}
  else if(command==='purge-raw'){console.log(JSON.stringify({status:'PASS',check:'purge_raw',network_calls:0,...await purgeRaw()}));}
  else if(command==='diagnose'){await diagnoseLocal();}
  else if(command==='prepare'){
    await mkdir(PRIVATE,{recursive:true,mode:0o700});
    gate(((await stat(PRIVATE)).mode&0o077)===0,'PRIVATE_DIRECTORY');
    const parent=await open(dirname(PRIVATE),'r');try{await parent.sync();}finally{await parent.close();}
    const cfg=await settings();const card=await cardInput();card.code='';card.number='';
    ledger={version:1,scenario:'WOF-01',target_hash:hash(cfg.base.origin),ref:randomUUID(),amount:AMOUNT,currency:'RUB',created_at:utc(),stage:'reserved',wire:'postman_sample_pascal_v1',year_format:'YYYY_candidate',initial_limit:1};
    await writeExclusive(join(PRIVATE,'ledger.json'),ledger);
    console.log(JSON.stringify({status:'PREPARED',scenario:'WOF-01',ref_hash:hash(ledger.ref),amount:AMOUNT,currency:'RUB',network_calls:0}));
  }else if(command==='inspect'){
    ledger=await readLedger();let sent=false;try{await stat(join(PRIVATE,'dispatch-init.json'));sent=true;}catch(error){if(error.code!=='ENOENT')throw error;}
    console.log(JSON.stringify({status:'LOCAL',scenario:ledger.scenario,ref_hash:hash(ledger.ref),amount:ledger.amount,currency:ledger.currency,initial_consumed:sent,financial:'unproven',network_calls:0}));
  }else if(command==='reconcile'){
    phase='reconcile_gate';
    phase='reconcile_setup';
    gate(process.argv.includes('--run'),'EXPLICIT_RUN');
    ledger=await readLedger();const cfg=await settings();
    const initial=await readFile(join(PRIVATE,'dispatch-init.json'),'utf8').then(JSON.parse);
    gate(initial.stage==='init'&&initial.state==='dispatch_started'&&initial.ref===ledger.ref&&initial.target_hash===ORIGIN&&initial.amount===100&&initial.currency==='RUB','INITIAL_STATE');
    const series=await statusMarkers('reconcile',RECON_MAX,ledger);const attempts=series.map(item=>item.marker);gate(attempts.length<RECON_MAX,'RECON_BUDGET');
    phase='reconcile_scan';
    await assertStatusInterval(ledger);
    for(let i=0;i<series.length;i++){const complete=series[i].completion;gate(process.hrtime.bigint()-BigInt(complete.tick)>=60_000_000_000n&&Date.now()-Date.parse(complete.closed_at)>=60000,'RECON_INTERVAL');}
    phase='reconcile_marker';
    lookupIndex=attempts.length+1;statusLockToken=await acquireStatusLock(ledger.ref,'reconcile',lookupIndex);action={stage:'reconcile',state:'dispatch_started',ref:ledger.ref,target_hash:ORIGIN,created_at:utc(),tick:process.hrtime.bigint().toString(),index:lookupIndex};await writeExclusive(join(PRIVATE,'reconcile-'+lookupIndex+'.json'),action);dispatched=true;const response=await bankPost(cfg,'lookup',{ExtID:ledger.ref});await writeExclusive(join(PRIVATE,'reconcile-complete-'+lookupIndex+'.json'),{state:'transport_closed',ref:ledger.ref,target_hash:ORIGIN,index:lookupIndex,closed_at:utc(),tick:process.hrtime.bigint().toString()});let diagnosticCard;try{diagnosticCard=await cardInput();}catch{}const sensitive=[cfg.login,cfg.secret,diagnosticCard?.number,diagnosticCard?.code,diagnosticCard?String(Number(diagnosticCard.code)):undefined].filter(Boolean);const rawArtifact=await captureResponse('reconcile',response.http,response.raw,response.body,sensitive,response.json_valid);const safe=summary(response.body,ledger,response.http,sensitive);safe.status='INCONCLUSIVE';safe.dispatch_state='consumed';safe.response_format=response.json_valid?'json':'text';safe.reconcile_index=lookupIndex;safe.capture_mode=rawArtifact.capture_mode;safe.raw_local=rawArtifact.raw_local;safe.raw_body_hash=rawArtifact.raw_body_hash;safe.raw_expires_at=rawArtifact.raw_expires_at;safe.diagnostic_file=rawArtifact.diagnostic_file;safe.commit=execFileSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();safe.source_hash=hash(await readFile(fileURLToPath(import.meta.url)));await writeExclusive(join(PRIVATE,'result-reconcile-'+Date.now()+'.json'),safe);await releaseStatusLock(ledger.ref,statusLockToken);statusLockToken=undefined;response.raw='';response.body=undefined;if(process.argv.includes('--diagnostic'))console.log(JSON.stringify({diagnostic:rawArtifact.diagnostic,interpretation:safe},null,2));else console.log(JSON.stringify(safe));
  }else if(command==='init'||command==='lookup'){
    gate(process.argv.includes('--run'),'EXPLICIT_RUN');
    ledger=await readLedger();const cfg=await settings();let body,card;
    if(command==='init'){
      card=await cardInput();body={ExtId:ledger.ref,Amount:AMOUNT,Description:'Authorized sandbox WOF feasibility',CardInfo:{CardNumber:card.number,CardHolder:card.owner,ExpirationYear:card.year,ExpirationMonth:card.month,CVV:Number(card.code)}};
      gate(Number.isSafeInteger(body.Amount)&&body.Amount===100,'AMOUNT');
      action={stage:'init',state:'dispatch_started',ref:ledger.ref,target_hash:ORIGIN,amount:100,currency:'RUB',created_at:utc(),commit:execFileSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),source_hash:hash(await readFile(fileURLToPath(import.meta.url)))};
      await writeExclusive(join(PRIVATE,'dispatch-init.json'),action);
    }else{
      const initial=await readFile(join(PRIVATE,'dispatch-init.json'),'utf8').then(JSON.parse);
      gate(initial.stage==='init'&&initial.state==='dispatch_started'&&initial.ref===ledger.ref&&initial.target_hash===ORIGIN&&initial.amount===100&&initial.currency==='RUB','INITIAL_STATE');
      const series=await statusMarkers('lookup',3,ledger);const attempts=series.map(item=>item.marker);gate(attempts.length<3,'LOOKUP_BUDGET');
      for(let i=0;i<series.length;i++){const complete=series[i].completion;const elapsed=process.hrtime.bigint()-BigInt(complete.tick);gate(elapsed>=60_000_000_000n&&Date.now()-Date.parse(complete.closed_at)>=60000,'LOOKUP_INTERVAL');}
      await assertStatusInterval(ledger);
      lookupIndex=attempts.length+1;statusLockToken=await acquireStatusLock(ledger.ref,'lookup',lookupIndex);
      // Re-open the authorised test fixture only for secret suppression, never in lookup wire.
      card=await cardInput();
      body={ExtID:ledger.ref};action={stage:'lookup',state:'dispatch_started',ref:ledger.ref,target_hash:ORIGIN,created_at:utc(),tick:process.hrtime.bigint().toString()};
      await writeExclusive(join(PRIVATE,'lookup-'+lookupIndex+'.json'),action);
    }
    // A durable consumed marker exists before possible TLS/HTTP send. Never remove it.
    dispatched=true;ledger.stage=command;
    const response=await bankPost(cfg,command,body);
    if(command==='lookup')await writeExclusive(join(PRIVATE,'lookup-complete-'+lookupIndex+'.json'),{state:'transport_closed',ref:ledger.ref,target_hash:ORIGIN,index:lookupIndex,closed_at:utc(),tick:process.hrtime.bigint().toString()});
    const sensitive=[cfg.login,cfg.secret,card?.number,card?.code,card?String(Number(card.code)):undefined].filter(Boolean);
    const rawArtifact=await captureResponse(command,response.http,response.raw,response.body,sensitive,response.json_valid);
    const safe=summary(response.body,ledger,response.http,sensitive);
    safe.status='INCONCLUSIVE';safe.dispatch_state='consumed';safe.response_format=response.json_valid?'json':'text';safe.capture_mode=rawArtifact.capture_mode;safe.raw_local=rawArtifact.raw_local;safe.raw_body_hash=rawArtifact.raw_body_hash;safe.raw_expires_at=rawArtifact.raw_expires_at;safe.diagnostic_file=rawArtifact.diagnostic_file;safe.commit=action.commit??execFileSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();safe.source_hash=hash(await readFile(fileURLToPath(import.meta.url)));
    await writeExclusive(join(PRIVATE,'result-'+command+'-'+Date.now()+'.json'),safe);
    if(command==='lookup'){await releaseStatusLock(ledger.ref,statusLockToken);statusLockToken=undefined;}
    if(card){card.number='';card.code='';}body=undefined;response.raw='';response.body=undefined;
    if(process.argv.includes('--diagnostic'))console.log(JSON.stringify({diagnostic:rawArtifact.diagnostic,interpretation:safe},null,2));else console.log(JSON.stringify(safe));
  }else throw new Error('GATE_COMMAND');
}catch(error){
  let prior=false;try{await stat(join(PRIVATE,'dispatch-init.json'));prior=true;}catch{}
  const safe={scenario:'WOF-01',checked_at:utc(),status:dispatched?'INCONCLUSIVE':'BLOCKED',financial:dispatched?'unknown':prior?'unproven':'not_sent',dispatch_state:dispatched?'consumed':prior?'previously_consumed':'blocked',current_send:dispatched};
  if(ledger?.ref)safe.ref_hash=hash(ledger.ref);
  if(typeof error.message==='string'&&/^GATE_[A-Z_]+$/.test(error.message))safe.reason=error.message;
  else if(['EEXIST','ENOENT','EACCES'].includes(error.code))safe.reason=error.code;
  else safe.reason='local_or_transport_error';
  if(error?.name&&/^[A-Za-z0-9_]+$/.test(error.name))safe.error_kind=error.name;
  if(error?.code&&/^[A-Z_0-9]+$/.test(error.code))safe.error_code=error.code;
  safe.phase=phase;
  console.log(JSON.stringify(safe));
}
