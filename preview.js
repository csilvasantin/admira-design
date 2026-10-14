const PREVIEW_API='https://pixer-ctx-5934-preview.csilvasantin.workers.dev';
const query=new URLSearchParams(location.search);
let role=query.get('role')==='reader'?'reader':'superuser';
window.ADMIRA_CONTEXT_OPTIONS={api:PREVIEW_API,expert:()=>true,tokenProvider:()=>fetch(PREVIEW_API+'/preview/session?role='+role,{cache:'no-store'}).then(r=>r.json())};
window.addEventListener('DOMContentLoaded',()=>{
 const byId=id=>document.getElementById(id);
 byId('role').value=role;
 byId('role').onchange=()=>{const u=new URL(location.href);u.searchParams.set('role',byId('role').value);u.searchParams.delete('marca');u.searchParams.delete('proyecto');location.href=u.href;};
 async function inspect(){
  byId('page-url').textContent=location.href;
  const session=await ADMIRA_CONTEXT_OPTIONS.tokenProvider();
  const headers={Authorization:'Bearer '+session.token};
  const state=AdmiraContexto.actual();
  const endpoints=[['ctx','/ctx'],['screens','/signage/screens'+(state.proyecto?'?proyecto='+encodeURIComponent(state.proyecto):'')]];
  for(const [name,path]of endpoints){const u=PREVIEW_API+path;byId(name+'-url').textContent=u;byId(name+'-url').href=u;const r=await fetch(u,{headers,cache:'no-store'});byId(name+'-result').textContent='HTTP '+r.status+'\n'+JSON.stringify(await r.json(),null,2);}
  const reader=await fetch(PREVIEW_API+'/preview/session?role=reader',{cache:'no-store'}).then(r=>r.json());
  const u=PREVIEW_API+'/ctx';const r=await fetch(u,{method:'POST',headers:{Authorization:'Bearer '+reader.token,'Content-Type':'application/json'},body:JSON.stringify({proyecto:'starbucks'})});
  byId('reject-url').textContent='POST '+u+' · reader@preview.invalid · {"proyecto":"starbucks"}';
  byId('reject-result').textContent='HTTP '+r.status+'\n'+JSON.stringify(await r.json(),null,2);
 }
 byId('command').onsubmit=async e=>{e.preventDefault();try{const d=await AdmiraContexto.comando(byId('cli').value);byId('status').textContent='OK · marca: '+(d.marca||'Admira')+' · proyecto: '+(d.proyecto||'todos');}catch(e){byId('status').textContent='Rechazado / Rejected · '+e.message;}await inspect();};
 byId('refresh').onclick=inspect;
 AdmiraContexto.ready.then(async()=>{byId('status').textContent='Lista / Ready · '+role;await inspect();});
});
