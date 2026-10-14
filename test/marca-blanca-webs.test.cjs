// La marca sobre el chrome de cada web (encargo #5979): una hoja puente por web, todas sus reglas bajo su
// [data-mb-web], y anclas de logo y «Volver a Admira» para las cinco webs de la suite.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('../marca-blanca.js');
const ROOT=path.join(__dirname,'..');

// Comas de primer nivel: las de :is(a, b) o :where(…) no separan selectores.
function partir(lista){
 const out=[];let prof=0,ini=0;
 for(let i=0;i<lista.length;i++){const c=lista[i];if(c==='(')prof++;else if(c===')')prof--;else if(c===','&&!prof){out.push(lista.slice(ini,i));ini=i+1;}}
 out.push(lista.slice(ini));return out;
}
// Selectores de cada regla de estilo (fuera de @keyframes / @font-face; dentro de @media y @supports sí).
function selectores(css){
 css=css.replace(/\/\*[\s\S]*?\*\//g,'');
 const out=[];let i=0;
 function bloque(saltar){
  while(i<css.length){
   const abre=css.indexOf('{',i),cierra=css.indexOf('}',i);
   if(cierra!==-1&&(abre===-1||cierra<abre)){i=cierra+1;return;}
   if(abre===-1)return;
   const cabeza=css.slice(i,abre).trim();i=abre+1;
   if(cabeza.startsWith('@')){bloque(/^@(keyframes|font-face|-webkit-keyframes)/.test(cabeza)||saltar);continue;}
   if(!saltar&&cabeza)partir(cabeza).forEach(s=>out.push(s.trim()));
   let prof=1;while(i<css.length&&prof){if(css[i]==='{')prof++;else if(css[i]==='}')prof--;i++;}
  }
 }
 bloque(false);return out;
}

test('las cinco webs tienen su hoja puente, su variante del catálogo y anclas', ()=>{
 assert.deepEqual(Object.keys(M.WEBS).sort(),['app','biz','store','studio','tv']);
 for(const [web,c] of Object.entries(M.WEBS)){
  assert.ok(fs.existsSync(path.join(ROOT,c.css)),web+': falta '+c.css);
  assert.ok(Array.isArray(c.logo)&&c.logo.length,web+': sin ancla de logo');
  assert.ok(c.catalogo&&c.powered,web);
 }
});

test('cada web pinta la variante del catálogo que ya usaba', ()=>{
 const v=Object.fromEntries(Object.entries(M.WEBS).map(([w,c])=>[w,c.catalogo]));
 assert.deepEqual(v,{studio:'studio',store:'store',tv:'store',app:'yokup',biz:'app'});
});

test('ninguna regla de una hoja puente se sale de su web', ()=>{
 for(const [web,c] of Object.entries(M.WEBS)){
  const css=fs.readFileSync(path.join(ROOT,c.css),'utf8');
  const sel=selectores(css);
  assert.ok(sel.length>10,web+': hoja vacía');
  // Todas bajo :root (o html) con marca activa (cualquiera o una concreta) y esta web.
  const dentro=new RegExp(`^(:root|html)\\[data-mb-marca(="[a-z0-9-]+")?\\]\\[data-mb-web="${web}"\\]`);
  const fuera=sel.filter(s=>!dentro.test(s));
  assert.deepEqual(fuera,[],web+': reglas sin :root[data-mb-marca][data-mb-web="'+web+'"]');
 }
});

test('una página puede cambiar las anclas y la variante desde el <script>', ()=>{
 const c=M.chromeDe('tv',{anclaLogo:'#miLogo, .otra',anclaTras:'#opts',anclaVolver:'#rail',catalogo:'studio'});
 assert.deepEqual(c.logo,['#miLogo','.otra']);
 assert.equal(c.tras,'#opts');
 assert.equal(c.volver,'#rail');
 assert.equal(c.catalogo,'studio');
 assert.equal(c.css,'marca-blanca-tv.css');
 assert.equal(M.chromeDe('desconocida').css,'marca-blanca.css','una web desconocida se viste como studio');
});

test('en Node (sin navegador) la web por defecto es studio', ()=>{
 assert.equal(M.WEB,'studio');
 assert.equal(M.CATALOGO,'studio');
});
