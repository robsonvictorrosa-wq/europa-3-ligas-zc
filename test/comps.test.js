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

assert.strictEqual(C.TOTAL_MD,65);
assert.strictEqual(C.MID_MD,29);
assert.strictEqual(C.PLAN.filter(s=>s.kind==='league').length,38);
assert.strictEqual(C.PLAN.filter(s=>s.kind==='europe_lp').length,8);
assert.strictEqual(C.PLAN.filter(s=>s.kind==='europe_ko'&&s.stage==='playoff').length,2);
assert.strictEqual(C.PLAN.filter(s=>s.kind==='europe_ko'&&s.stage==='r16').length,2);
assert.strictEqual(C.PLAN.filter(s=>s.kind==='europe_ko'&&s.stage==='qf').length,2);
assert.strictEqual(C.PLAN.filter(s=>s.kind==='europe_ko'&&s.stage==='sf').length,2);
assert.strictEqual(C.PLAN.filter(s=>s.kind==='europe_ko'&&s.stage==='final').length,1);
const ranked=[...Array(30)].map((_,i)=>1000+i); // 0=1º
const po=C.europePlayoffPairs(ranked);
assert.deepStrictEqual(po[0],[1008,1023]); // 9º×24º
assert.deepStrictEqual(po[7],[1015,1016]); // 16º×17º
const r16e=C.europeR16Pairs(ranked.slice(0,8),[201,202,203,204,205,206,207,208]);
assert.deepStrictEqual(r16e[0],[1000,208]); // 1º × W16/17
assert.deepStrictEqual(r16e[7],[1007,201]); // 8º × W9/24
const qfe=C.europeQfPairs([11,12,13,14,15,16,17,18]);
assert.deepStrictEqual(qfe,[[11,18],[14,15],[12,17],[13,16]]);

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
const rma=CF.clubs.find(c=>c.name==='Real Madrid');
assert.strictEqual(rma.rank,1);assert.strictEqual(rma.budget,0);
assert.strictEqual(CF.clubs.find(c=>c.name==='Arsenal').budget,25e6);
assert.strictEqual(CF.clubs.find(c=>c.name==='FC Barcelona').budget,25e6);
assert.strictEqual(CF.clubs.find(c=>c.name==='Manchester City').budget,25e6);
assert.strictEqual(CF.clubs.find(c=>c.name==='Liverpool').budget,75e6);
assert.strictEqual(CF.clubs.find(c=>c.name==='Atlético de Madrid').budget,100e6);
assert.strictEqual(CF.clubs.find(c=>c.name==='Inter').budget,100e6);
assert.strictEqual(CF.clubs.find(c=>c.name==='Chelsea').budget,150e6);
assert.strictEqual(CF.clubs.find(c=>c.name==='Milan').budget,200e6);
assert.strictEqual(CF.clubs.find(c=>c.name==='Valencia CF').budget,325e6);
assert.strictEqual(CF.clubs.find(c=>c.name==='Hull City').budget,400e6);
const fro=CF.clubs.find(c=>c.name==='Frosinone Calcio');
assert.strictEqual(fro.rank,58);assert.strictEqual(fro.budget,500e6);
assert.strictEqual(CF.clubs.find(c=>c.name==='Málaga CF').budget,500e6);
assert.strictEqual(CF.clubs.find(c=>c.name==='US Lecce').rank,60);
assert.strictEqual(CF.clubs.find(c=>c.name==='US Lecce').budget,500e6);
assert.strictEqual(CF.clubs.reduce((s,c)=>s+c.budget,0),17500e6);
assert.ok(CF.season1_europe.ucl.includes('Inter'));
assert.ok(CF.season1_europe.ucl.includes('Crystal Palace'));
assert.ok(CF.season1_europe.el.includes('Sunderland'));
assert.ok(!CF.season1_europe.ucl.includes('Sunderland'));

function tableOf(ids){return ids.map((club_id,i)=>({club_id,pos:i+1}));}
function leagueIds(prefix){return [...Array(20)].map((_,i)=>prefix*100+(i+1));} // 1=melhor

// Caso base: campeões já no top 10, nada muda
{
 const pl=leagueIds(1),ll=leagueIds(2),sa=leagueIds(3);
 const tables={pl:tableOf(pl),ll:tableOf(ll),sa:tableOf(sa)};
 const q=E.qualifyEurope({season:2,tables,champions:{ucl:pl[0],cups:{pl:pl[2],ll:ll[0],sa:sa[4]}}});
 assert.deepStrictEqual(q.ucl,pl.slice(0,10).concat(ll.slice(0,10),sa.slice(0,10)));
 assert.deepStrictEqual(q.el,pl.slice(10).concat(ll.slice(10),sa.slice(10)));
}

// Campeão da copa fora do top 10 toma a vaga do 10º; o 10º vai à Europa League
{
 const pl=leagueIds(1),ll=leagueIds(2),sa=leagueIds(3);
 const tables={pl:tableOf(pl),ll:tableOf(ll),sa:tableOf(sa)};
 const q=E.qualifyEurope({season:2,tables,champions:{ucl:ll[0],cups:{pl:pl[14],ll:ll[1],sa:sa[3]}}}); // PL 15º
 assert.ok(q.ucl.includes(pl[14]),'campeão da copa (15º) na Champions');
 assert.ok(!q.ucl.includes(pl[9]),'10º da liga sai da Champions');
 assert.ok(q.el.includes(pl[9]),'10º vai à Europa League');
 assert.ok(!q.el.includes(pl[14]));
 assert.strictEqual(q.ucl.filter(id=>pl.includes(id)).length,10);
 assert.strictEqual(q.el.filter(id=>pl.includes(id)).length,10);
 assert.strictEqual(q.ucl.length,30);assert.strictEqual(q.el.length,30);
}

// Dois campeões fora do top 10 na mesma liga: saem o 10º e o 9º
{
 const pl=leagueIds(1),ll=leagueIds(2),sa=leagueIds(3);
 const tables={pl:tableOf(pl),ll:tableOf(ll),sa:tableOf(sa)};
 const q=E.qualifyEurope({season:2,tables,champions:{ucl:pl[11],cups:{pl:pl[14],ll:ll[0],sa:sa[0]}}}); // 12º e 15º
 assert.ok(q.ucl.includes(pl[11])&&q.ucl.includes(pl[14]));
 assert.ok(!q.ucl.includes(pl[8])&&!q.ucl.includes(pl[9]),'9º e 10º saem');
 assert.ok(q.el.includes(pl[8])&&q.el.includes(pl[9]));
 assert.strictEqual(q.ucl.filter(id=>pl.includes(id)).length,10);
}

// Mesmo time ganha Champions e copa fora do top 10: conta uma vaga só (sai só o 10º)
{
 const pl=leagueIds(1),ll=leagueIds(2),sa=leagueIds(3);
 const tables={pl:tableOf(pl),ll:tableOf(ll),sa:tableOf(sa)};
 const q=E.qualifyEurope({season:2,tables,champions:{ucl:pl[12],cups:{pl:pl[12],ll:ll[0],sa:sa[0]}}});
 assert.ok(q.ucl.includes(pl[12]));
 assert.ok(!q.ucl.includes(pl[9]));
 assert.ok(q.ucl.includes(pl[8]),'9º permanece (só uma vaga extra)');
 assert.strictEqual(q.ucl.filter(id=>id===pl[12]).length,1);
 assert.strictEqual(q.ucl.filter(id=>pl.includes(id)).length,10);
}

// Campeão da Champions já é o 10º e a copa é de um 15º: o 10º (campeão) fica, sai o 9º
{
 const pl=leagueIds(1),ll=leagueIds(2),sa=leagueIds(3);
 const tables={pl:tableOf(pl),ll:tableOf(ll),sa:tableOf(sa)};
 const q=E.qualifyEurope({season:2,tables,champions:{ucl:pl[9],cups:{pl:pl[14],ll:ll[0],sa:sa[0]}}});
 assert.ok(q.ucl.includes(pl[9]),'10º campeão da Champions permanece');
 assert.ok(q.ucl.includes(pl[14]));
 assert.ok(!q.ucl.includes(pl[8]),'9º cede a vaga');
}

console.log('comps.test.js OK');
