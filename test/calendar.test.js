const assert=require('assert');
const Cal=require('../calendar');
const C=require('../comps');
const AG=require('../agenda');
const E=require('../europa');

const pl=[...Array(20)].map((_,i)=>100+i);
const ll=[...Array(20)].map((_,i)=>200+i);
const sa=[...Array(20)].map((_,i)=>300+i);
const strength=new Map([...pl,...ll,...sa].map((id,i)=>[id,80-i]));
const fx={
  leagues:C.nationalSchedules({pl,ll,sa},strength,1),
  ucl:[...pl.slice(0,10),...ll.slice(0,10),...sa.slice(0,10)],
  el:[...pl.slice(10),...ll.slice(10),...sa.slice(10)],
  cupSeeds:{pl,ll,sa}
};

const slot=AG.slotAt.bind(null);
const ag=AG.build('2027-07-01');
AG.apply(ag);

// clube top da Premier: 38 jogos de liga + 8 da Champions, sem preliminar da copa
{
  const {games,windows}=Cal.buildClubCalendar({clubId:pl[0],fixtures:fx,slotAt:k=>AG.slotAt(k,ag),agenda:ag});
  const liga=games.filter(g=>g.comp_kind==='league');
  const ucl=games.filter(g=>g.comp_kind==='ucl');
  const cup=games.filter(g=>g.comp_kind==='cup');
  const el=games.filter(g=>g.comp_kind==='el');
  assert.strictEqual(liga.length,38,'liga 38');
  assert.strictEqual(ucl.length,8,'ucl 8');
  assert.strictEqual(el.length,0,'sem el');
  assert.strictEqual(cup.length,0,'top 12 não joga preliminar');
  assert.ok(liga.every(g=>g.at),'datas da liga');
  assert.strictEqual(windows.length,3);
  assert.deepStrictEqual(windows.map(w=>w.stage),['pre','mid','end']);
  const r19=liga.find(g=>g.round===19);
  assert.strictEqual(r19.matchday,C.MID_MD);
}

// clube da parte de baixo: Europa League + preliminar da copa (ida e volta)
{
  const {games}=Cal.buildClubCalendar({clubId:pl[19],fixtures:fx,slotAt:k=>AG.slotAt(k,ag),agenda:ag});
  assert.strictEqual(games.filter(g=>g.comp_kind==='league').length,38);
  assert.strictEqual(games.filter(g=>g.comp_kind==='el').length,8);
  assert.strictEqual(games.filter(g=>g.comp_kind==='ucl').length,0);
  const cup=games.filter(g=>g.comp_kind==='cup');
  assert.strictEqual(cup.length,2);
  assert.deepStrictEqual(cup.map(g=>g.leg).sort(),[1,2]);
  assert.ok(cup.every(g=>g.stage==='prelim'));
}

// mata-mata só aparece quando o jogo existe nos dados (time avançou)
{
  const r16={id:99,comp_kind:'ucl',comp:'Champions League',stage:'r16',leg:1,round:11,home:pl[0],away:ll[8],played:false};
  const qf={id:100,comp_kind:'ucl',comp:'Champions League',stage:'qf',leg:1,round:13,home:pl[0],away:sa[0],played:false};
  const a=Cal.buildClubCalendar({clubId:pl[0],matches:[{id:1,comp_kind:'ucl',comp:'Champions League',stage:'league',round:1,leg:0,home:pl[0],away:ll[0],played:true,hg:2,ag:1},r16]});
  assert.ok(a.games.some(g=>g.stage==='r16'&&g.id===99));
  assert.ok(!a.games.some(g=>g.stage==='qf'));
  const b=Cal.buildClubCalendar({clubId:pl[0],matches:[r16,qf]});
  assert.ok(b.games.some(g=>g.stage==='qf'));
  const c=Cal.buildClubCalendar({clubId:pl[19],matches:[r16,qf]});
  assert.strictEqual(c.games.length,0,'eliminado não herda o jogo');
}

assert.strictEqual(Cal.mdOf({comp_kind:'ucl',stage:'final',leg:1}),C.PLAN.find(s=>s.kind==='europe_ko'&&s.stage==='final').matchday);
assert.strictEqual(Cal.COMPS.length,8);
assert.deepStrictEqual(Cal.COMPS.map(x=>x.key),['pl','ll','sa','ucl','el','cup-pl','cup-ll','cup-sa']);
console.log('calendar.test.js OK');
