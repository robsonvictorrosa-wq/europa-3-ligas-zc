const assert=require('assert');
const fs=require('fs'),zlib=require('zlib'),path=require('path');
const ROOT=path.join(__dirname,'..');
const CF=JSON.parse(fs.readFileSync(path.join(ROOT,'config/europa.json'),'utf8'));
const src=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT,'data/fc27.json.gz'))).toString('utf8'));
const RATE=37.5e6, STEP=25e6, CAP=500e6;
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const budgetOf=(ovr18,top)=>Math.min(CAP, Math.round(((top-ovr18)*RATE)/STEP)*STEP);
const LEAGUES=new Set(CF.leagues.map(l=>l.fc27));
const by={};
for(const p of src.players){
  if(!p.club||p.overall==null||!LEAGUES.has(p.league))continue;
  (by[p.club]||=[]).push(p.overall);
}
const raw=[];
for(const c of CF.clubs){
  const ovrs=(by[c.db]||[]).sort((a,b)=>b-a);
  assert.ok(ovrs.length>=18, c.db+' sem elenco');
  raw.push({name:c.name,db:c.db,ovr18:avg(ovrs.slice(0,18)),ovr11:avg(ovrs.slice(0,11))});
}
raw.sort((a,b)=>b.ovr18-a.ovr18||b.ovr11-a.ovr11||a.name.localeCompare(b.name,'pt'));
const top=raw[0].ovr18;
assert.strictEqual(raw[0].name,'Real Madrid');
assert.ok(Math.abs(top-85.1666666667)<1e-6);
const computed=Object.fromEntries(raw.map(c=>[c.name,budgetOf(c.ovr18,top)]));
for(const c of CF.clubs){
  assert.strictEqual(c.budget,computed[c.name], c.name+' verba divergente do elenco');
}
assert.strictEqual(computed['Arsenal'],25e6);
assert.strictEqual(computed['FC Barcelona'],25e6);
assert.strictEqual(computed['Manchester City'],25e6);
assert.strictEqual(computed['Liverpool'],75e6);
assert.strictEqual(computed['Atlético de Madrid'],100e6);
assert.strictEqual(computed['Inter'],100e6);
assert.strictEqual(computed['Chelsea'],150e6);
assert.strictEqual(computed['Milan'],200e6);
assert.strictEqual(computed['Valencia CF'],325e6);
assert.strictEqual(computed['Frosinone Calcio'],500e6);
assert.strictEqual(computed['Parma Calcio'],475e6);
assert.strictEqual(CF.clubs.length,54);
assert.strictEqual(Object.values(computed).reduce((s,v)=>s+v,0),14750e6);
for(const n of ['Hull City','Coventry City','R. Racing Club','Málaga CF','US Lecce','AC Monza']){
  assert.ok(!computed[n], n+' não entra na verba dos 54');
}
console.log('budget.test.js ok', CF.clubs.length,'clubes, total €'+(14750)+' mi');
