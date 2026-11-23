const assert=require('assert');
const C=require('../comps');
const E=require('../europa');
const {leagueSchedule}=require('../leaguesched');

const ids30=[...Array(30)].map((_,i)=>i+1);
const mds=C.europeLeaguePhase(ids30);
assert.strictEqual(mds.length,8);
const seen=new Set(),homes=new Map(),cnt=new Map();
for(const md of mds){
  assert.strictEqual(md.length,15);
  const play=new Set();
  for(const [h,a] of md){
    assert.notStrictEqual(h,a);
    const k=[h,a].sort().join(',');
    assert.ok(!seen.has(k),'jogo repetido');seen.add(k);
    assert.ok(!play.has(h)&&!play.has(a));play.add(h);play.add(a);
    cnt.set(h,(cnt.get(h)||0)+1);cnt.set(a,(cnt.get(a)||0)+1);
    homes.set(h,(homes.get(h)||0)+1);
  }
}
assert.strictEqual(seen.size,120);
for(const id of ids30){assert.strictEqual(cnt.get(id),8);assert.strictEqual(homes.get(id),4);}

const clubs=[...Array(20)].map((_,i)=>i+1);
const str=new Map(clubs.map((id,i)=>[id,20-i]));
const R=leagueSchedule(clubs,str,7,{double:true});
assert.strictEqual(R.length,38);
const H=new Map();
for(const g of R){assert.strictEqual(g.length,10);for(const [h] of g)H.set(h,(H.get(h)||0)+1);}
for(const id of clubs)assert.strictEqual(H.get(id),19);

assert.strictEqual(C.TOTAL_MD,61);
assert.strictEqual(C.MID_MD,29);
assert.strictEqual(C.PLAN.filter(s=>s.kind==='league').length,38);
assert.strictEqual(C.PLAN.filter(s=>s.kind==='europe_lp').length,8);

const seeded=[...Array(20)].map((_,i)=>100+i); // 0=melhor
const pre=C.cupPairsPrelim(seeded);
assert.deepStrictEqual(pre,[[112,119],[113,118],[114,117],[115,116]]);
const r16=C.cupPairsR16(seeded,[201,202,203,204]);
assert.strictEqual(r16.length,8);
assert.deepStrictEqual(r16[0],[100,204]); // 1 vs W16/17
assert.deepStrictEqual(r16[7],[107,108]);

const CF=E.CF;
assert.strictEqual(CF.clubs.length,60);
assert.ok(CF.clubs.find(c=>c.name==='Inter'&&c.db==='Lombardia FC'));
assert.ok(CF.clubs.find(c=>c.name==='Milan'&&c.db==='Milano FC'));
assert.ok(CF.clubs.find(c=>c.name==='Atalanta'&&c.db==='Bergamo Calcio'));
const bar=CF.clubs.find(c=>c.name==='FC Barcelona');
assert.strictEqual(bar.rank,1);assert.strictEqual(bar.budget,0);
const fro=CF.clubs.find(c=>c.name==='Frosinone Calcio');
assert.strictEqual(fro.rank,60);assert.strictEqual(fro.budget,500e6);
assert.ok(CF.season1_europe.ucl.includes('Inter'));
assert.ok(CF.season1_europe.el.includes('Crystal Palace'));
assert.ok(!CF.season1_europe.ucl.includes('Crystal Palace'));
console.log('comps.test.js OK');
