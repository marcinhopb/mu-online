/** MU Legacy Arena local backend. Node >=20, zero external dependencies.
 *  IMPORTANT: this is a starter single-instance service, not a payments server or GameServer.
 */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const DB=process.env.MU_DATA_FILE||path.join(ROOT,'.data','store.json');
const LIMIT=1024*16;
const sessions=new Map();const rate=new Map();
let store={users:[],chats:[],articles:[]};
try{store=JSON.parse(await readFile(DB,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const uid=()=>randomBytes(16).toString('hex');
const hash=(password,salt)=>scryptSync(password,salt,64).toString('hex');
const addUser=(email,username,password,role='player')=>{const salt=uid();const u={id:uid(),email:String(email).toLowerCase(),username,role,salt,hash:hash(password,salt),created_at:new Date().toISOString()};store.users.push(u);return u};
const publicUser=u=>u?{id:u.id,username:u.username,role:u.role}:null;
const save=async()=>{await mkdir(path.dirname(DB),{recursive:true});const tmp=DB+'.tmp';await writeFile(tmp,JSON.stringify(store,null,2),{mode:0o600});await rename(tmp,DB)};
let queue=Promise.resolve();function transact(fn){const job=queue.then(async()=>{const ret=await fn();await save();return ret});queue=job.catch(()=>{});return job;}
const adminEmail=process.env.MU_ADMIN_EMAIL?.toLowerCase(),adminPass=process.env.MU_ADMIN_PASSWORD;
if(adminEmail && adminPass?.length>=12 && !store.users.some(u=>u.role==='admin')){addUser(adminEmail,process.env.MU_ADMIN_NICK||'Administrador',adminPass,'admin');await save();console.log('Conta administrativa inicial configurada por ambiente.');}
const json=(res,status,data,extra={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra});res.end(JSON.stringify(data))};
const fail=(res,status,error)=>json(res,status,{error});
const cookie=req=>Object.fromEntries((req.headers.cookie||'').split(';').map(v=>v.trim().split('=').map(decodeURIComponent)).filter(x=>x.length===2));
const auth=req=>{const tok=cookie(req).mu_session;if(!tok)return null;const ses=sessions.get(tok);if(!ses)return null;if(ses.expires<Date.now()){sessions.delete(tok);return null}return store.users.find(u=>u.id===ses.userId)||null};
const sessionCookie=(token,req)=>`mu_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${process.env.MU_HTTPS==='true'?' ; Secure':''}`;
async function body(req){return await new Promise((resolve,reject)=>{let data='',size=0;req.on('data',chunk=>{size+=chunk.length;if(size>LIMIT){reject(Object.assign(new Error('Mensagem muito grande.'),{status:413}));req.destroy();return;}data+=chunk});req.on('end',()=>{try{resolve(JSON.parse(data||'{}'))}catch{reject(Object.assign(new Error('JSON inválido.'),{status:400}))}});req.on('error',reject)})}
function limit(req,action,max=40){const ip=req.socket.remoteAddress||'unknown';const k=ip+':'+action;let v=rate.get(k),now=Date.now();if(!v||now-v.since>60000)v={count:0,since:now};v.count++;rate.set(k,v);return v.count<=max}
const validEmail=v=>typeof v==='string'&&v.length<=160&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const validNick=v=>typeof v==='string'&&v.length>=3&&v.length<=25&&/^[a-zA-ZÀ-ÿ0-9_-]+$/.test(v);
const validMessage=v=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=1500;
async function route(req,res,url){const u=auth(req);const m=req.method;const p=url.pathname;
 if(m==='GET'&&p==='/api/health')return json(res,200,{ok:true,service:'mu-legacy-portal',gameServer:'not_connected'});
 if(m==='GET'&&p==='/api/news')return json(res,200,{articles:store.articles.slice().reverse().slice(0,20)});
 if(m==='GET'&&p==='/api/auth/me')return json(res,200,{user:publicUser(u)});
 if(m==='POST'&&p==='/api/auth/register'){
  if(!limit(req,'register',3))return fail(res,429,'Muitas tentativas.');const x=await body(req);
  if(!validEmail(x.email)||!validNick(x.username)||typeof x.password!=='string'||x.password.length<10||x.password.length>256)return fail(res,400,'Dados inválidos. Use senha de no mínimo 10 caracteres.');
  if(store.users.some(v=>v.email===x.email.toLowerCase()||v.username.toLowerCase()===x.username.toLowerCase()))return fail(res,409,'E-mail ou nome de usuário indisponível.');
  const account=await transact(()=>addUser(x.email,x.username,x.password));const token=uid();sessions.set(token,{userId:account.id,expires:Date.now()+604800000});return json(res,201,{user:publicUser(account)},{'Set-Cookie':sessionCookie(token,req)});
 }
 if(m==='POST'&&p==='/api/auth/login'){
  if(!limit(req,'login',9))return fail(res,429,'Muitas tentativas.');const x=await body(req);const candidate=typeof x.email==='string'?store.users.find(v=>v.email===x.email.toLowerCase()):null;
  let ok=false;if(candidate && typeof x.password==='string' && x.password.length<=256){try{ok=timingSafeEqual(Buffer.from(hash(x.password,candidate.salt),'hex'),Buffer.from(candidate.hash,'hex'))}catch{}}
  if(!ok)return fail(res,401,'Credenciais incorretas.');const token=uid();sessions.set(token,{userId:candidate.id,expires:Date.now()+604800000});return json(res,200,{user:publicUser(candidate)},{'Set-Cookie':sessionCookie(token,req)});
 }
 if(m==='POST'&&p==='/api/auth/logout'){const tok=cookie(req).mu_session;if(tok)sessions.delete(tok);return json(res,200,{ok:true},{'Set-Cookie':'mu_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'});}
 if(m==='POST'&&p==='/api/chat/start'){
  if(!limit(req,'chatstart',4))return fail(res,429,'Muitas tentativas.');const x=await body(req);if(!validMessage(x.message)||!validNick(x.name))return fail(res,400,'Informe seu nome (3–25 caracteres, sem espaços) e uma mensagem.');
  const chat={id:uid(),token:uid(),visitor_id:u?.id||null,name:x.name,status:'open',created_at:new Date().toISOString(),messages:[{sender:'user',body:x.message.trim(),created_at:new Date().toISOString()}]};
  await transact(()=>{store.chats.push(chat);return chat});return json(res,201,{chat_id:chat.id,token:chat.token});
 }
 const getChat=/^\/api\/chat\/([a-f0-9]{32})$/.exec(p);
 if(m==='GET'&&getChat){const c=store.chats.find(t=>t.id===getChat[1]);if(!c||!(u?.role==='admin'||c.token===url.searchParams.get('token')))return fail(res,404,'Conversa não encontrada.');return json(res,200,{chat:{id:c.id,status:c.status,name:c.name},messages:c.messages});}
 if(m==='POST'&&p==='/api/chat/message'){
  if(!limit(req,'chatmsg',30))return fail(res,429,'Mensagens demais.');const x=await body(req);const c=store.chats.find(t=>t.id===x.chat_id);if(!c||c.token!==x.token)return fail(res,404,'Conversa não encontrada.');if(c.status!=='open')return fail(res,409,'Conversa encerrada.');if(!validMessage(x.message))return fail(res,400,'Mensagem inválida.');
  await transact(()=>{c.messages.push({sender:'user',body:x.message.trim(),created_at:new Date().toISOString()});return null});return json(res,200,{ok:true});
 }
 if(p.startsWith('/api/admin/')){
  if(!u||u.role!=='admin')return fail(res,403,'Acesso restrito à equipe.');
  if(m==='GET'&&p==='/api/admin/chats')return json(res,200,{chats:store.chats.map(c=>({id:c.id,name:c.name,status:c.status,count:c.messages.length,last_message_at:c.messages.at(-1)?.created_at})).reverse()});
  if(m==='GET'&&p==='/api/admin/stats')return json(res,200,{accounts:store.users.length,openChats:store.chats.filter(c=>c.status==='open').length,news:store.articles.length});
  if(m==='POST'&&p==='/api/admin/reply'){
   const x=await body(req);const c=store.chats.find(t=>t.id===x.chat_id);if(!c)return fail(res,404,'Conversa não encontrada.');if(!validMessage(x.message))return fail(res,400,'Mensagem inválida.');
   await transact(()=>{c.status='open';c.messages.push({sender:'moderator',by:u.username,body:x.message.trim(),created_at:new Date().toISOString()});return null});return json(res,200,{ok:true});
  }
  if(m==='POST'&&p==='/api/admin/close-chat'){
    const x=await body(req);const c=store.chats.find(t=>t.id===x.chat_id);if(!c)return fail(res,404,'Conversa não encontrada.');await transact(()=>{c.status='closed';return null});return json(res,200,{ok:true});
  }
  if(m==='POST'&&p==='/api/admin/news'){
    const x=await body(req);if(typeof x.title!=='string'||x.title.length<4||x.title.length>100||typeof x.body!=='string'||x.body.length<10||x.body.length>2500)return fail(res,400,'Título (4–100) e texto (10–2500) obrigatórios.');
    const a={id:uid(),title:x.title.trim(),body:x.body.trim(),kind:'NOTÍCIA',date:new Date().toISOString().slice(0,10),by:u.username};await transact(()=>{store.articles.push(a);return a});return json(res,201,{article:a});
  }
  if(m==='POST'&&p==='/api/admin/remove-news'){
    const x=await body(req);await transact(()=>{store.articles=store.articles.filter(a=>a.id!==x.id);return null});return json(res,200,{ok:true});
  }
 }
 return fail(res,404,'Rota não encontrada.');
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const httpServer=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
 if(req.method!=='GET'&&req.method!=='HEAD'&&req.headers.origin){const origin=new URL(req.headers.origin);const host=req.headers.host;if(origin.host!==host)return fail(res,403,'Origem não autorizada.');}
 if(url.pathname.startsWith('/api/'))return await route(req,res,url);
 if(req.method!=='GET'&&req.method!=='HEAD')return fail(res,405,'Método não aceito.');
 let loc=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
 if(loc.includes('..')||loc.includes('\\')||loc.startsWith('/.')){res.writeHead(403);return res.end();}
 const target=path.resolve(ROOT,'.'+loc);
 if(!target.startsWith(ROOT+path.sep)){res.writeHead(403);return res.end();}
 const extension=path.extname(target);if(!mime[extension]){res.writeHead(404);return res.end();}
 let bytes;try{bytes=await readFile(target)}catch{res.writeHead(404);return res.end();}
 res.writeHead(200,{'Content-Type':mime[extension],'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Content-Security-Policy':"frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:bytes);
}catch(e){console.error(e);if(!res.headersSent)fail(res,e.status||500,e.status?e.message:'Erro interno.');}});
httpServer.listen(PORT,()=>console.log(`MU Legacy Arena disponível em http://localhost:${PORT}. Chat/admin ativos somente neste servidor Node.`));