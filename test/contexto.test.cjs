const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createContext}=require('../contexto.js');
function setup({url='https://admira.studio/editor?asset=42',superuser=false,supplied={},unavailable=false}={}) {
 const events=[],calls=[],links=[{href:'https://www.admira.tv/parrilla?screen=abc#day',getAttribute(){return this.href;},setAttribute(_,v){this.href=v;}},{href:'https://external.test/path',getAttribute(){return this.href;},setAttribute(_,v){this.href=v;}}];
 let server={marca:null,proyecto:null,...supplied};let win;
 const doc={documentElement:{dataset:{mode:'expert'}},body:{classList:{contains:()=>false}},querySelectorAll:()=>links,dispatchEvent:e=>events.push(e),addEventListener(){}};
 win={document:doc,location:new URL(url),history:{replaceState(_,__,url){win.location=new URL(url);}},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;}},fetch:async()=>{}};
 const context=createContext({window:win,tokenProvider:async()=>unavailable?null:{ok:true,token:'fixture',exp:Date.now()/1000+300},fetch:async(url,init)=>{
  calls.push({url,init});
  if(url.endsWith('/ctx')){
   if(init.method==='POST') {const patch=JSON.parse(init.body);if('proyecto' in patch&&!superuser)return Response.json({error:'superuser-required'},{status:403});server={...server,...patch};}
   return Response.json({ok:true,...server,superusuario:superuser});
  }return Response.json({ok:true});
 }});
 return {context,win,events,calls,links,getServer:()=>server,setSuperuser:v=>{superuser=v;}};
}
test('URL brand and project sync independently; every cross-platform link preserves its route',async()=>{
 const x=setup({url:'https://admira.studio/editor?asset=42&marca=lumbre&proyecto=starbucks',superuser:true});
 assert.equal(x.win.location.searchParams.has('proyecto'),false);
 await x.context.ready;assert.equal(x.context.actual().proyecto,'starbucks');
 await x.context.comando('/marca brumelle');assert.equal(x.context.actual().proyecto,'starbucks');
 await x.context.comando('/proyecto off');assert.equal(x.context.actual().marca,'brumelle');
 const u=new URL(x.links[0].href);assert.equal(u.searchParams.get('screen'),'abc');assert.equal(u.hash,'#day');assert.equal(u.searchParams.get('marca'),'brumelle');assert.equal(u.searchParams.has('proyecto'),false);
 assert.equal(x.links[1].href,'https://external.test/path');
 assert.equal(x.win.location.searchParams.get('asset'),'42');
});
test('normal user ignores local admin shortcuts, cannot set/reset project and blocks an unauthorized URL view',async()=>{
 const x=setup({url:'https://admira.studio/?proyecto=starbucks',superuser:false});x.win.localStorage={getItem:()=> '1'};
 await x.context.ready;assert.equal(x.context.actual().proyecto,null);assert.equal(new URL(x.links[0].href).searchParams.has('proyecto'),false);
 await assert.rejects(x.context.comando('/proyecto starbucks'),/superuser-required/);
 await assert.rejects(x.context.comando('/proyecto off'),/superuser-required/);
 await assert.rejects(x.context.request('/stock'),/project-not-authorized/);
 await x.context.comando('/marca lumbre');assert.equal(x.context.actual().marca,'lumbre');
});
test('saved server context restores without URL and only sends token to trusted API',async()=>{
 const x=setup({superuser:true,supplied:{marca:'lumbre',proyecto:'starbucks'}});await x.context.ready;
 await x.context.request('/signage/screens');const c=x.calls.at(-1);assert.equal(new URL(c.url).searchParams.get('proyecto'),'starbucks');assert.equal(c.init.headers.get('Authorization'),'Bearer fixture');
 await assert.rejects(x.context.request('https://evil.test/stock'),/untrusted-api-origin/);
 assert.equal(x.context.enlace('https://admira.biz/?order=1').includes('proyecto=starbucks'),true);
 assert.equal(x.context.enlace('https://admira.studio/auth/login'),'https://admira.studio/auth/login');
});
test('offline brand remains a presentation preference; offline project never activates',async()=>{
 const x=setup({unavailable:true});await x.context.ready;
 await x.context.comando('/marca lumbre');assert.equal(x.context.actual().marca,'lumbre');assert.equal(x.context.actual().synced,false);
 await assert.rejects(x.context.comando('/proyecto starbucks'),/session-required/);
 assert.equal(x.context.actual().proyecto,null);
});
test('queued commands preserve both fields; role revocation is checked at server',async()=>{
 const x=setup({superuser:true});await x.context.ready;
 await Promise.all([x.context.comando('/marca lumbre'),x.context.comando('/proyecto starbucks')]);assert.deepEqual(x.getServer(),{marca:'lumbre',proyecto:'starbucks'});
 x.setSuperuser(false);await assert.rejects(x.context.comando('/proyecto xtanco'),/superuser-required/);assert.equal(x.context.actual().proyecto,'starbucks');
 x.win.document.documentElement.dataset.mode='normal';await assert.rejects(x.context.comando('/marca off'),/expert-mode-required/);
});
test('invalid brand never replaces active context; existing URL analyzer stays available',async()=>{
 const x=setup({superuser:true,supplied:{marca:'lumbre',proyecto:'starbucks'}});
 x.win.AdmiraMarca={activar:async marca=>({ok:marca!=='unknown',reason:'unknown'}),desactivar:()=>({ok:true}),parseArg:value=>value==='example.com'?{kind:'web',url:'https://example.com/'}:{kind:'id',id:value},analizar:url=>({ok:true,url})};
 await x.context.ready;await assert.rejects(x.context.comando('/marca unknown'),/brand-unknown/);assert.equal(x.context.actual().marca,'lumbre');assert.equal(x.getServer().marca,'lumbre');
 const r=await x.context.comando('/marca example.com');assert.equal(r.url,'https://example.com/');assert.equal(x.context.actual().proyecto,'starbucks');
});
