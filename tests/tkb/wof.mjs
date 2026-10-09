import {open, readFile, mkdir, stat, readdir} from 'node:fs/promises';
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
const RAW_KEY=join(PRIVATE,'raw.key');
const RECON_MAX=10;
const hash=x=>createHash('sha256').update(x).digest('hex');
const utc=()=>new Date().toISOString();
const gate=(condition,name)=>{if(!condition)throw new Error('GATE_'+name);};
const own=(obj,key)=>obj&&typeof obj==='object'&&Object.hasOwn(obj,key)?obj[key]:undefined;
const pick=(obj,names)=>names.map(k=>own(obj,k)).find(v=>v!==undefined);
const knownRoots=['errorInfo','ErrorInfo','OrderId','orderId','ExtId','ExtID','extId','Amount','amount','Currency','currency','Status','status','State','state','OrderState','orderState','OperationState','operationState','AcsUrl','ACSUrl','acsUrl','PaReq','paReq','Md','MD','md','FormUrl','formUrl','CardRefId','CardRefID','cardRefId','AuthenticationData','authenticationData','ThreeDSServerTransID','ThreeDSServerTransId','threeDSServerTransID','ThreeDSMethodUrl','threeDSMethodUrl','ThreeDSMethodData','threeDSMethodData','OrderAdditionalInfo','orderAdditionalInfo','OrderInfo','orderInfo','Order','order','Is3ds','Is3DS','is3ds','ThreeDSVersion','threeDSVersion','Data','data'];
const statusWords=new Set(['created','registered','pending','processing','accepted','authorized','paid','captured','succeeded','success','failed','declined','canceled','cancelled','expired','completed','requires_action','requires_3ds','wait_3ds','waiting_3ds','unknown']);
function safeCode(value,sensitive=[]){
  if(sensitive.some(x=>String(x)===String(value)))return undefined;
  if(Number.isSafeInteger(value)&&value>=-99999&&value<=99999)return value;
  if(typeof value==='string'&&/^-?[0-9]{1,5}$/.test(value))return value;
  return undefined;
}
function safeStatus(value,sensitive=[]){
  if(sensitive.some(x=>String(x)===String(value)))return undefined;
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
  const code=safeCode(pick(err,['errorCode','ErrorCode']),sensitive);
  const message=pick(err,['errorMessage','ErrorMessage']);
  const reason=typeof message!=='string'?'absent':/успех|success/i.test(message)?'success_word':/прав|access|permission|разреш|запрещ/i.test(message)?'access':/подпис|signature|login|логин/i.test(message)?'authentication':/параметр|parameter|год|year|month|месяц|cvv|cvc|срок|неверн/i.test(message)?'validation':'other';
  const bankRef=scoped(body,['ExtId','ExtID','extId']);
  const amount=scoped(body,['Amount','amount']);
  const currency=scoped(body,['Currency','currency']);
  const status=safeStatus(scoped(body,['Status','status','State','state','OrderState','orderState','OperationState','operationState']),sensitive);
  const acs=scoped(body,['AcsUrl','ACSUrl','acsUrl']);
  const pareq=scoped(body,['PaReq','paReq']);
  const md=scoped(body,['Md','MD','md']);
  const result={scenario:'WOF-01',stage:ledger.stage,checked_at:utc(),http_status:http,ref_hash:hash(ledger.ref),amount:AMOUNT,currency:'RUB',root_keys:roots.filter(k=>knownRoots.includes(k)),unknown_keys:roots.filter(k=>!knownRoots.includes(k)).length,error_code:code,error_reason:reason,status_value:status,ref_match:typeof bankRef==='string'?bankRef===ledger.ref:null,amount_match:typeof amount==='number'||typeof amount==='string'?String(amount)===String(AMOUNT):null,currency_match:typeof currency==='string'?currency==='RUB':null,order_present:!!pick(body,['OrderId','orderId']),acs_present:typeof acs==='string'&&acs.length>0,pareq_present:typeof pareq==='string'&&pareq.length>0,md_present:typeof md==='string'&&md.length>0,auth_present:!!pick(body,['AuthenticationData','authenticationData']),method_present:!!pick(body,['ThreeDSMethodUrl','threeDSMethodUrl']),financial:'unproven'};
  result.reply_kind=result.acs_present&&result.pareq_present&&result.md_present?'requires_action':http>=200&&http<300&&Number(code)===0?'bank_reply':'nonfinal_error';
  result.order_fields=objectValue(pick(body,['OrderInfo','orderInfo']))?Object.keys(pick(body,['OrderInfo','orderInfo'])).filter(k=>knownRoots.includes(k)):[];
  if(result.ref_match===false||result.amount_match===false||result.currency_match===false)result.reply_kind='correlation_conflict';
  // No bank status dictionary supplied: never map HTTP/code/status text to paid.
  return result;
}
async function rawKey(){
  await mkdir(PRIVATE,{recursive:true,mode:0o700});
  try{const key=await readFile(RAW_KEY);gate(key.length===32,'RAW_KEY');return key;}catch(error){if(error.code!=='ENOENT')throw error;}
  const key=randomBytes(32);const handle=await open(RAW_KEY,'wx',0o600);try{await handle.writeFile(key);await handle.sync();}finally{await handle.close();}return key;
}
async function purgeRaw(){
  try{await stat(RAW);}catch(error){if(error.code==='ENOENT')return {purged:0};throw error;}
  const entries=await (await import('node:fs/promises')).readdir(RAW,{withFileTypes:true});let purged=0;
  for(const entry of entries){if(!entry.isFile()||!/^(reconcile|lookup)-[0-9]+\.enc\.json$/.test(entry.name))continue;const file=join(RAW,entry.name);let item;try{item=JSON.parse(await readFile(file,'utf8'));}catch{continue;}if(typeof item.expires_at==='string'&&Date.parse(item.expires_at)<Date.now()){await (await import('node:fs/promises')).unlink(file);purged++;}}
  return {purged};
}
async function storeRaw(stage,http,raw){
  await mkdir(RAW,{recursive:true,mode:0o700});gate(((await stat(RAW)).mode&0o077)===0,'RAW_DIRECTORY');
  const key=await rawKey();const nonce=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',key,nonce);const plain=Buffer.from(raw,'utf8');const data=Buffer.concat([cipher.update(plain),cipher.final()]);plain.fill(0);key.fill(0);
  const record={version:1,stage,http,checked_at:utc(),body_hash:hash(raw),nonce:nonce.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64'),expires_at:new Date(Date.now()+24*60*60*1000).toISOString()};
  const file=join(RAW,`${stage}-${Date.now()}.enc.json`);await writeExclusive(file,record);data.fill(0);return {file_hash:hash(file),body_hash:record.body_hash,expires_at:record.expires_at};
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
async function bankPost(cfg,stage,body){
  gate(Object.hasOwn(PATHS,stage),'PATH');
  const target=new URL(PATHS[stage],cfg.base);
  gate(hash(target.origin)===ORIGIN&&target.pathname===PATHS[stage]&&!target.search,'TARGET');
  const bytes=Buffer.from(JSON.stringify(body),'utf8');
  const headers={'Content-Type':'application/json; charset=utf-8','TCB-Header-Login':cfg.login,'TCB-Header-Sign':createHmac('sha1',cfg.secret).update(bytes).digest('base64')};
  const agent=new Agent({rejectUnauthorized:false,minVersion:'TLSv1.2',keepAlive:false});
  try{return await new Promise((resolve,reject)=>{
    const req=request(target,{method:'POST',headers,agent,signal:AbortSignal.timeout(15000)},res=>{
      const pieces=[];let size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>65536){res.destroy();reject(new Error('GATE_RESPONSE_SIZE'));}else pieces.push(chunk);});
      res.on('end',()=>{try{const raw=Buffer.concat(pieces);const text=raw.toString('utf8');const value=JSON.parse(text);raw.fill(0);resolve({http:res.statusCode,body:value,raw:text});}catch{reject(new Error('GATE_RESPONSE_JSON'));}});
      res.on('error',reject);
    });
    req.on('socket',socket=>socket.once('secureConnect',()=>{const mismatch=checkServerIdentity(target.hostname,socket.getPeerCertificate());if(mismatch)req.destroy(mismatch);else req.end(bytes);}));
    req.on('error',reject);
  });}finally{agent.destroy();bytes.fill(0);}
}
async function localTests(){
  const fake={ref:'00000000-0000-0000-0000-000000000000',stage:'init'};
  const noLeak=summary({errorInfo:{errorCode:0,errorMessage:'SYNTHETIC-SECRET'},'SYNTHETIC-SECRET':'hidden',CardNumber:'SYNTHETIC-SECRET',CVV:'SYNTHETIC-SECRET',State:'paid',AuthenticationData:{AuthenticationValue:'SYNTHETIC-SECRET'}},fake,200,['SYNTHETIC-SECRET']);
  assert.equal(JSON.stringify(noLeak).includes('SYNTHETIC-SECRET'),false);
  assert.equal(noLeak.financial,'unproven');assert.equal(noLeak.status_value,'paid');assert.equal(noLeak.auth_present,true);
  assert.equal(summary({errorInfo:{errorCode:0},ExtId:'other',Amount:101,Currency:'USD'},fake,200).reply_kind,'correlation_conflict');
  assert.equal(safeStatus('SYNTHETIC-SECRET'),undefined);
  assert.equal(safeCode(7,['007',String(Number('007'))]),undefined);
  assert.equal(safeStatus(7,['007',String(Number('007'))]),undefined);
  assert.equal(AMOUNT,100);assert.equal(PATHS.init.includes('no3ds'),false);assert.equal(Object.keys(PATHS).length,2);
  assert.equal(createHmac('sha1','key').update('The quick brown fox jumps over the lazy dog').digest('hex'),'de7c9b85b8b78aa6bc8a7a36f70a90701c9db4d9');
  console.log(JSON.stringify({status:'PASS',check:'offline_wof',network_calls:0,financial_calls:0}));
}
const command=process.argv[2]??'local';
let dispatched=false,ledger,action,lookupIndex,phase='start';
try{
  if(command==='local'||command==='--self-test'){await localTests();}
  else if(command==='purge-raw'){console.log(JSON.stringify({status:'PASS',check:'purge_raw',network_calls:0,...await purgeRaw()}));}
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
    gate(process.argv.includes('--run')&&process.argv.includes('--test-tls'),'EXPLICIT_TEST_FLAGS');
    ledger=await readLedger();const cfg=await settings();
    const initial=await readFile(join(PRIVATE,'dispatch-init.json'),'utf8').then(JSON.parse);
    gate(initial.stage==='init'&&initial.state==='dispatch_started'&&initial.ref===ledger.ref&&initial.target_hash===ORIGIN&&initial.amount===100&&initial.currency==='RUB','INITIAL_STATE');
    const attempts=[];for(let i=1;i<=RECON_MAX;i++){try{attempts.push(JSON.parse(await readFile(join(PRIVATE,'reconcile-'+i+'.json'),'utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}}
    gate(attempts.length<RECON_MAX,'RECON_BUDGET');
    phase='reconcile_scan';
    const names=await readdir(PRIVATE);const completed=[];
    for(const prefix of ['lookup','reconcile']){for(const name of names.filter(n=>new RegExp('^'+prefix+'-[0-9]+\\.json$').test(n))){const marker=JSON.parse(await readFile(join(PRIVATE,name),'utf8'));const match=name.match(/-([0-9]+)\.json$/);gate(match!==null,'GLOBAL_MARKER_NAME');const idx=match[1];const done=join(PRIVATE,prefix==='lookup'?'lookup-complete-'+idx+'.json':'reconcile-complete-'+idx+'.json');try{const completion=JSON.parse(await readFile(done,'utf8'));gate(completion.state==='transport_closed'&&completion.ref===ledger.ref&&completion.target_hash===ORIGIN,'GLOBAL_COMPLETE');completed.push(completion);}catch{throw new Error('GATE_GLOBAL_INFLIGHT');}}}
    if(completed.length){const latest=completed.sort((x,y)=>Date.parse(y.closed_at)-Date.parse(x.closed_at))[0];gate(Date.now()-Date.parse(latest.closed_at)>=60000,'GLOBAL_RECON_INTERVAL');}
    for(let i=0;i<attempts.length;i++){const prior=attempts[i];gate(prior.state==='dispatch_started'&&prior.ref===ledger.ref&&prior.target_hash===ORIGIN,'RECON_STATE');let complete;try{complete=JSON.parse(await readFile(join(PRIVATE,'reconcile-complete-'+(i+1)+'.json'),'utf8'));}catch{throw new Error('GATE_RECON_INFLIGHT');}gate(complete.state==='transport_closed'&&complete.ref===ledger.ref&&complete.target_hash===ORIGIN&&complete.index===i+1&&/^[0-9]+$/.test(complete.tick??''),'RECON_COMPLETE');gate(process.hrtime.bigint()-BigInt(complete.tick)>=60_000_000_000n&&Date.now()-Date.parse(complete.closed_at)>=60000,'RECON_INTERVAL');}
    phase='reconcile_marker';
    lookupIndex=attempts.length+1;action={stage:'reconcile',state:'dispatch_started',ref:ledger.ref,target_hash:ORIGIN,created_at:utc(),tick:process.hrtime.bigint().toString(),index:lookupIndex};await writeExclusive(join(PRIVATE,'reconcile-'+lookupIndex+'.json'),action);dispatched=true;const response=await bankPost(cfg,'lookup',{ExtID:ledger.ref});await writeExclusive(join(PRIVATE,'reconcile-complete-'+lookupIndex+'.json'),{state:'transport_closed',ref:ledger.ref,target_hash:ORIGIN,index:lookupIndex,closed_at:utc(),tick:process.hrtime.bigint().toString()});const rawArtifact=await storeRaw('reconcile',response.http,response.raw);const safe=summary(response.body,ledger,response.http,[cfg.login,cfg.secret]);safe.status='INCONCLUSIVE';safe.dispatch_state='consumed';safe.reconcile_index=lookupIndex;safe.raw_local=true;safe.raw_body_hash=rawArtifact.body_hash;safe.raw_expires_at=rawArtifact.expires_at;safe.commit=execFileSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();safe.source_hash=hash(await readFile(fileURLToPath(import.meta.url)));await writeExclusive(join(PRIVATE,'result-reconcile-'+Date.now()+'.json'),safe);console.log(JSON.stringify(safe));
  }else if(command==='init'||command==='lookup'){
    gate(process.argv.includes('--run')&&process.argv.includes('--test-tls'),'EXPLICIT_TEST_FLAGS');
    ledger=await readLedger();const cfg=await settings();let body,card;
    if(command==='init'){
      card=await cardInput();body={ExtId:ledger.ref,Amount:AMOUNT,Description:'Authorized sandbox WOF feasibility',CardInfo:{CardNumber:card.number,CardHolder:card.owner,ExpirationYear:card.year,ExpirationMonth:card.month,CVV:Number(card.code)}};
      gate(Number.isSafeInteger(body.Amount)&&body.Amount===100,'AMOUNT');
      action={stage:'init',state:'dispatch_started',ref:ledger.ref,target_hash:ORIGIN,amount:100,currency:'RUB',created_at:utc(),commit:execFileSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),source_hash:hash(await readFile(fileURLToPath(import.meta.url)))};
      await writeExclusive(join(PRIVATE,'dispatch-init.json'),action);
    }else{
      const initial=await readFile(join(PRIVATE,'dispatch-init.json'),'utf8').then(JSON.parse);
      gate(initial.stage==='init'&&initial.state==='dispatch_started'&&initial.ref===ledger.ref&&initial.target_hash===ORIGIN&&initial.amount===100&&initial.currency==='RUB','INITIAL_STATE');
      const attempts=[];for(let i=1;i<=3;i++){try{attempts.push(JSON.parse(await readFile(join(PRIVATE,'lookup-'+i+'.json'),'utf8')));}catch(error){if(error.code!=='ENOENT')throw error;}}
      gate(attempts.length<3,'LOOKUP_BUDGET');
      for(let i=0;i<attempts.length;i++){
        const prior=attempts[i];
        gate(prior.stage==='lookup'&&prior.state==='dispatch_started'&&prior.ref===ledger.ref&&prior.target_hash===ORIGIN&&Number.isFinite(Date.parse(prior.created_at)),'LOOKUP_STATE');
        let complete;try{complete=JSON.parse(await readFile(join(PRIVATE,'lookup-complete-'+(i+1)+'.json'),'utf8'));}catch{throw new Error('GATE_LOOKUP_INFLIGHT');}
        gate(complete.state==='transport_closed'&&complete.ref===ledger.ref&&complete.target_hash===ORIGIN&&complete.index===i+1&&typeof complete.closed_at==='string'&&Number.isFinite(Date.parse(complete.closed_at))&&/^[0-9]+$/.test(complete.tick??''),'LOOKUP_COMPLETE');
        const elapsed=process.hrtime.bigint()-BigInt(complete.tick);
        gate(elapsed>=60_000_000_000n&&Date.now()-Date.parse(complete.closed_at)>=60000,'LOOKUP_INTERVAL');
      }
      lookupIndex=attempts.length+1;
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
    const safe=summary(response.body,ledger,response.http,sensitive);
    safe.status='INCONCLUSIVE';safe.dispatch_state='consumed';safe.commit=action.commit??execFileSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();safe.source_hash=hash(await readFile(fileURLToPath(import.meta.url)));
    await writeExclusive(join(PRIVATE,'result-'+command+'-'+Date.now()+'.json'),safe);
    if(card){card.number='';card.code='';}body=undefined;response.body=undefined;
    console.log(JSON.stringify(safe));
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
