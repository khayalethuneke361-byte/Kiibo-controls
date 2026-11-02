/* Kiibo Control: talks to the same Supabase project as Kiibo Studios. No secret key lives in this app. */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ymd=x=>x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
const todayS=()=>ymd(new Date());
const days=d=>Math.round((new Date(d+'T00:00:00')-new Date(todayS()+'T00:00:00'))/864e5);
const addDays=(d,n)=>{const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+n);return ymd(x)};
const fmt=t=>t?new Date(t).toLocaleString([],{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Never';
const init=n=>String(n).split(/\s+|@/).filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
/* ----- sign in ----- */
let SES=null;try{SES=JSON.parse(localStorage.getItem('kc_ses')||'null')}catch(e){}
async function auth(path,body){const r=await fetch(CLOUD.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:CLOUD.key,'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw new Error(j.msg||j.error_description||j.message||'Sign in failed');return j}
function keep(j){SES={at:j.access_token,rt:j.refresh_token,exp:Date.now()+j.expires_in*1000-60000};try{localStorage.setItem('kc_ses',JSON.stringify(SES))}catch(e){}}
async function tok(){if(!SES)throw new Error('Signed out');if(Date.now()>SES.exp)keep(await auth('token?grant_type=refresh_token',{refresh_token:SES.rt}));return SES.at}
async function rpc(fn,args={}){const r=await fetch(CLOUD.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:CLOUD.key,Authorization:'Bearer '+await tok(),'Content-Type':'application/json'},body:JSON.stringify(args)});const t=await r.text();let j;try{j=JSON.parse(t)}catch(e){j=t}if(!r.ok)throw new Error(j.message||j.msg||t);return j}
/* ----- state ----- */
let tab='home',q='',fl='all',sel=null,D=null,busy=false,loginErr='';
const TABS=[['home','Overview'],['acc','Accounts'],['clubs','Clubs'],['dev','Phones'],['log','Activity']];
const icons={home:'<path d="M3 11l9-8 9 8v10H3z"/>',acc:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-5 15-5 16 0"/>',clubs:'<path d="M4 20V8l8-5 8 5v12zM9 20v-6h6v6"/>',dev:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',log:'<path d="M5 4h14M5 10h14M5 16h9"/>'};
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2600)}
async function login(){const e=$('#em').value.trim(),p=$('#pw').value;loginErr='';try{keep(await auth('token?grant_type=password',{email:e,password:p}));if((await rpc('is_platform_admin'))!==true)return out('This account is not a platform owner.');load()}catch(x){loginErr=x.message;render()}}
function out(msg){SES=null;D=null;sel=null;try{localStorage.removeItem('kc_ses')}catch(e){}loginErr=msg||'';render()}
async function load(){busy=true;render();try{
const[u,c,l]=await Promise.all([rpc('admin_users'),rpc('admin_clubs'),rpc('admin_activity')]);
const C=c.map(x=>({id:x.id,name:x.name,plan:x.plan,active:x.active,until:x.paid_until,grace:x.grace_days,members:x.members,live:x.live,owner:x.owner_email}));
const A=u.map(x=>({id:x.user_id,email:x.email||'(no email)',name:x.full_name||x.email||'Unnamed',club:x.club_id,clubName:x.club_name||'No club',role:x.role||'none',seen:x.last_seen,devs:x.devices||[],st:x.banned?'banned':!x.club_id?'noclub':x.status=='removed'?'removed':x.status=='pending'?'pending':'active'}));
D={C,A,L:l}}catch(e){if(/Signed out|refresh|JWT|invalid/i.test(e.message)){busy=false;return out('Please sign in again.')}toast(e.message)}busy=false;render()}
async function act(fn,args,msg){try{await rpc(fn,args);toast(msg);await load()}catch(e){toast(e.message)}}
/* ----- helpers ----- */
const devMap=()=>{const m={};D.A.forEach(a=>a.devs.forEach(d=>(m[d]=m[d]||[]).push(a)));return m};
const sharedWith=a=>{const m=devMap(),s=new Map();a.devs.forEach(d=>m[d].forEach(x=>{if(x.id!=a.id)s.set(x.id,x)}));return[...s.values()]};
const flagged=a=>sharedWith(a).length>0;
const stTag=a=>({banned:'<span class="tag bad">Banned</span>',removed:'<span class="tag warn">Removed</span>',pending:'<span class="tag warn">Waiting</span>',noclub:'<span class="tag">No club</span>'}[a.st]||'<span class="tag ok">Active</span>');
const seenToday=a=>a.seen&&new Date(a.seen).toDateString()==new Date().toDateString();
const logRow=l=>`<div class="log"><i>${fmt(l.created_at)}</i><span><b>${esc(l.action)}</b> ${esc(l.detail||'')}<br><span class="sub">${esc(l.email||'System')}${l.club_name?', '+esc(l.club_name):''}</span></span></div>`;
/* ----- screens ----- */
function view(){
if(!SES)return `<div class="login"><h1>Kiibo Control</h1><p class="sub">Sign in with your platform owner account.</p><input type="email" id="em" placeholder="Email" autocomplete="email"><input type="password" id="pw" placeholder="Password" autocomplete="current-password"><button class="btn p" data-a="login">Sign in</button><p class="err">${esc(loginErr)}</p></div>`;
if(!D)return `<h1>Kiibo Control</h1><p class="empty">${busy?'Loading everything…':'Nothing loaded yet.'}</p>`;
const{A,C,L}=D;
if(tab=='home'){const f=Object.values(devMap()).filter(g=>g.length>1);
return `<div class="top"><div><h1>Kiibo Control</h1><p class="sub">${busy?'Updating…':'Live from your Supabase project'}</p></div><div style="display:flex;gap:6px"><button class="btn" data-a="refresh">Refresh</button><button class="btn" data-a="signout">Sign out</button></div></div>
<div class="grid" style="margin-top:14px"><div class="st"><b>${A.length}</b><span>Accounts</span></div><div class="st"><b>${C.filter(c=>c.active&&c.live).length}/${C.length}</b><span>Clubs open</span></div>
<div class="st"><b>${A.filter(seenToday).length}</b><span>Seen today</span></div><div class="st flag"><b>${f.length}</b><span>Phones with 2+ accounts</span></div></div>
<h2>Needs a look</h2>
${C.filter(c=>c.active&&c.until&&days(c.until)<=7).map(c=>`<div class="card"><h3>${esc(c.name)}</h3><span class="sub">${days(c.until)<0?'Past its end date':'Closes in '+days(c.until)+' days'}</span></div>`).join('')}
${A.filter(a=>a.st=='pending').map(a=>`<div class="card"><h3>Waiting to join</h3><span class="sub">${esc(a.email)} wants to join ${esc(a.clubName)}</span></div>`).join('')}
${f.map(g=>`<div class="card"><h3>One phone, ${g.length} accounts</h3><span class="sub">${g.map(a=>esc(a.email)).join(' and ')}</span></div>`).join('')}
<h2>Latest activity</h2>${L.slice(0,5).map(logRow).join('')||'<p class="empty">No activity yet.</p>'}`}
if(tab=='acc'){const R=A.filter(a=>(fl=='all'||(fl=='same'&&flagged(a))||(fl=='bad'&&(a.st=='banned'||a.st=='removed'))||(fl=='wait'&&a.st=='pending'))&&(a.email+a.name).toLowerCase().includes(q.toLowerCase()));
return `<h1>Accounts</h1><input type="search" id="q" placeholder="Search email or name" value="${esc(q)}">
<div class="chips">${[['all','Everyone'],['same','Same phone'],['wait','Waiting'],['bad','Banned or removed']].map(x=>`<button class="chip ${fl==x[0]?'on':''}" data-a="fl" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>
${R.map(a=>`<button class="row" data-a="open" data-v="${a.id}"><div class="av">${esc(init(a.name))}</div><div class="m"><b>${esc(a.email)}</b><span>${esc(a.name)}, ${esc(a.clubName)}</span></div>${flagged(a)?'<span class="tag warn">Shared phone</span>':''}${stTag(a)}</button>`).join('')||'<p class="empty">No accounts match.</p>'}`}
if(tab=='clubs')return `<h1>Clubs</h1><p class="sub">Close a club or choose how long it stays open.</p><div style="height:12px"></div>`+(C.map(c=>{const d=c.until?days(c.until):null;return `<div class="card"><div class="top"><h3>${esc(c.name)}</h3><span class="tag ${c.active&&c.live?'ok':'bad'}">${c.active?(c.live?'Open':'Ended'):'Closed'}</span></div>
<p class="sub">${esc(c.plan)} plan, ${c.members} members${c.owner?', owner '+esc(c.owner):''}. ${c.until?(d>=0?`Open until ${c.until} (${d} days left)`:`Ended ${-d} days ago`):'No end date'}</p>
<div class="btns"><button class="btn" data-a="add" data-v="${c.id}:7">Add 7 days</button><button class="btn" data-a="add" data-v="${c.id}:30">Add 30 days</button>
<button class="btn ${c.active?'d':'p'}" data-a="tog" data-v="${c.id}">${c.active?'Close club':'Reopen club'}</button></div></div>`}).join('')||'<p class="empty">No clubs yet.</p>');
if(tab=='dev'){const g=Object.entries(devMap()).sort((a,b)=>b[1].length-a[1].length);
return `<h1>Phones</h1><p class="sub">Each phone gets a private ID. Accounts that share one are linked here.</p><div style="height:12px"></div>`+(g.map(([d,l])=>`<div class="card dev ${l.length>1?'f':''}"><div class="top"><h3>${esc(d)}</h3><span class="tag ${l.length>1?'warn':''}">${l.length} account${l.length>1?'s':''}</span></div>${l.map(a=>`<button class="row" style="margin:8px 0 0" data-a="open" data-v="${a.id}"><div class="m"><b>${esc(a.email)}</b><span>${esc(a.clubName)}</span></div>${stTag(a)}</button>`).join('')}</div>`).join('')||'<p class="empty">No phones recorded yet. They appear once people open the updated Kiibo Studios app.</p>')}
return `<h1>Activity</h1><p class="sub">The latest 100 things that happened, newest first.</p><div style="height:8px"></div>`+(L.map(logRow).join('')||'<p class="empty">No activity yet.</p>')}
function sheet(){const s=$('#sh'),a=D&&sel&&D.A.find(x=>x.id==sel);if(!a){s.classList.remove('on');return}
const sh=sharedWith(a);
$('#shc').innerHTML=`<h2 style="margin-top:0">${esc(a.name)}</h2>
<div class="kv"><span>Email</span><span>${esc(a.email)}</span></div><div class="kv"><span>Club</span><span>${esc(a.clubName)}</span></div>
<div class="kv"><span>Role</span><span>${esc(a.role)}</span></div><div class="kv"><span>Last seen</span><span>${fmt(a.seen)}</span></div>
<div class="kv"><span>Phones</span><span>${a.devs.length?esc(a.devs.join(', ')):'None recorded'}</span></div><div class="kv"><span>Status</span><span>${a.st}</span></div>
${sh.length?`<p class="sub" style="margin-top:12px">Same phone as: ${sh.map(x=>esc(x.email)).join(', ')}</p>`:''}
<div class="btns"><button class="btn d" data-a="ban" data-v="${a.id}">${a.st=='banned'?'Unban account':'Ban account'}</button>${a.club?`<button class="btn" data-a="rem" data-v="${a.id}">Remove from club</button>`:''}</div>
<div class="btns"><button class="btn" data-a="pw" data-v="${a.id}">Set new password</button><button class="btn d" data-a="del" data-v="${a.id}">Delete account</button></div>
<div class="btns"><button class="btn" data-a="close">Done</button></div>`;s.classList.add('on')}
function render(){$('#app').innerHTML=view();$('#nav').innerHTML=SES&&D?TABS.map(t=>`<button class="${tab==t[0]?'on':''}" data-a="tab" data-v="${t[0]}"><svg viewBox="0 0 24 24">${icons[t[0]]}</svg>${t[1]}</button>`).join(''):'';sheet();
const i=$('#q');if(i)i.oninput=e=>{q=e.target.value;const p=e.target.selectionStart;render();const n=$('#q');n.focus();n.setSelectionRange(p,p)}}
document.addEventListener('click',e=>{
if(e.target.id=='sh'){sel=null;return render()}
const b=e.target.closest('[data-a]');if(!b)return;const v=b.dataset.v,a=b.dataset.a;
if(a=='login')return login();
if(a=='tab'){tab=v;window.scrollTo(0,0)}
else if(a=='fl')fl=v;
else if(a=='open')sel=v;
else if(a=='close')sel=null;
else if(a=='refresh')return load();
else if(a=='signout')return out();
else if(a=='ban'){const x=D.A.find(y=>y.id==v),on=x.st!='banned';if(!confirm((on?'Ban ':'Unban ')+x.email+'?'+(on?' They will be signed out of every phone.':'')))return;return act('admin_set_ban',{p_user:v,p_ban:on},on?'Account banned':'Account unbanned')}
else if(a=='rem'){const x=D.A.find(y=>y.id==v);if(!confirm('Remove '+x.email+' from '+x.clubName+'?'))return;sel=null;return act('admin_remove_member',{p_user:v,p_club:x.club},'Removed from club')}
else if(a=='pw'){const x=D.A.find(y=>y.id==v),p=prompt('New password for '+x.email+' (at least 6 characters). They will be signed out everywhere.');if(!p)return;if(p.length<6)return toast('Use at least 6 characters');return act('admin_set_password',{p_user:v,p_password:p},'Password changed')}
else if(a=='del'){const x=D.A.find(y=>y.id==v);if(prompt('This deletes '+x.email+' for good'+(x.role=='owner'?'. They own '+x.clubName+', which will be left without an owner':'')+'. Type DELETE to confirm.')!=='DELETE')return;sel=null;return act('admin_delete_user',{p_user:v},'Account deleted')}
else if(a=='tog'){const c=D.C.find(y=>y.id==v);if(c.active&&!confirm('Close '+c.name+'? Everyone in the club loses access.'))return;return act('admin_set_club',{p_club:v,p_active:!c.active,p_plan:c.plan,p_paid_until:c.until,p_grace:c.grace},c.active?'Club closed':'Club reopened')}
else if(a=='add'){const[id,n]=v.split(':'),c=D.C.find(y=>y.id==id),base=c.until&&days(c.until)>0?c.until:todayS(),to=addDays(base,+n);return act('admin_set_club',{p_club:id,p_active:c.active,p_plan:c.plan,p_paid_until:to,p_grace:c.grace},'Open until '+to)}
render()});
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&!SES&&e.target.id=='pw')login()});
render();if(SES)load();
