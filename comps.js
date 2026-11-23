// Calendário global, chaveamento das copas (20 times) e fase de liga europeia (30 times, 8 jogos).
const E=require('./europa');
const {leagueSchedule}=require('./leaguesched');

// Sequência de 61 jornadas (ver DECISOES.md). mid após a 29ª (liga nacional R19).
function buildPlan(){
 const p=[];
 const L=(r)=>p.push({kind:'league',round:r,label:`Liga nacional – rodada ${r}`});
 const U=(n)=>p.push({kind:'europe_lp',round:n,label:`Fase de liga europeia – jornada ${n}`});
 const EK=(st,leg)=>p.push({kind:'europe_ko',stage:st,leg,label:`${E.STAGE_NAMES[st]} europeia`+(st==='final'?'':(leg===1?' (ida)':' (volta)'))});
 const C=(st,leg)=>p.push({kind:'cup',stage:st,leg,label:`Copa nacional – ${E.STAGE_NAMES[st]}`+(leg===1?' (ida)':' (volta)')});
 for(let i=0;i<8;i++){L(2*i+1);L(2*i+2);U(i+1);}
 C('prelim',1);L(17);C('prelim',2);L(18);L(19);
 const midAfter=p.length; // 29
 C('r16',1);L(20);C('r16',2);L(21);
 EK('qf',1);L(22);EK('qf',2);L(23);
 C('qf',1);L(24);C('qf',2);L(25);
 EK('sf',1);L(26);EK('sf',2);L(27);
 C('sf',1);L(28);C('sf',2);
 for(let r=29;r<=38;r++)L(r);
 EK('final',1);C('final',1);C('final',2);
 return p.map((x,i)=>({...x,matchday:i+1,mid_after:i+1===midAfter}));
}
const PLAN=buildPlan();
const TOTAL_MD=PLAN.length;
const MID_MD=PLAN.find(s=>s.mid_after).matchday;
const LEAGUE_ROUNDS=38;

// Fase de liga europeia: grafo circulante com diferenças 1,3,5,7 (ciclos pares) em 30 times.
// Cada time joga 8 (4 em casa, 4 fora), sem repetir adversário. 8 jornadas × 15 jogos.
function europeLeaguePhase(clubs){
 if(clubs.length!==30)throw new Error('europe League phase: 30 clubes');
 const n=30,diffs=[1,3,5,7],mds=[];
 for(const d of diffs){
  const seen=new Set();const edges=[];
  for(let i=0;i<n;i++){
   const j=(i+d)%n;const a=Math.min(i,j),b=Math.max(i,j);const k=a+','+b;
   if(seen.has(k))continue;seen.add(k);edges.push([i,j]); // 30 arestas por diferença? cycle has n edges
  }
  // Reconstrói os ciclos e fatia em 2 emparelhamentos perfeitos (arestas pares/ímpares de cada ciclo).
  const adj=new Map();for(const [a,b] of edges){(adj.get(a)??adj.set(a,[]).get(a)).push(b);(adj.get(b)??adj.set(b,[]).get(b)).push(a);}
  const vis=new Set(),cycles=[];
  for(let s=0;s<n;s++){
   if(vis.has(s))continue;const cyc=[s];vis.add(s);let prev=-1,cur=s;
   for(;;){const nxt=adj.get(cur).find(x=>x!==prev);if(nxt==null||nxt===s)break;cyc.push(nxt);vis.add(nxt);prev=cur;cur=nxt;}
   cycles.push(cyc);
  }
  const ev=[],od=[];
  for(const cyc of cycles){
   for(let i=0;i<cyc.length;i++){
    const a=cyc[i],b=cyc[(i+1)%cyc.length];
    // mando: o time de índice menor+d é mandante (i joga i+d fora)
    const home=(a+d)%n===b?clubs[b]:clubs[a],away=home===clubs[b]?clubs[a]:clubs[b];
    (i%2?od:ev).push([home,away]);
   }
  }
  if(ev.length!==15||od.length!==15)throw new Error('fatoração europeia d='+d+' ev='+ev.length+' od='+od.length);
  mds.push(ev,od);
 }
 if(mds.length!==8)throw new Error('esperadas 8 jornadas');
 return mds;
}

// Copa de 20 times: preliminar entre os 8 piores (13×20, 14×19, 15×18, 16×17), depois 16 (12 melhores + 4 vencedores).
// Todas as fases ida e volta; o melhor joga a volta em casa.
function cupPairsPrelim(seeded){ // seeded[0]=melhor
 const p=[];for(let i=0;i<4;i++)p.push([seeded[12+i],seeded[19-i]]); // 13v20 ... 16v17 (ida na casa do pior)
 return p;
}
function cupPairsR16(seeded,prelimWinners){ // prelimWinners: winner of 13v20, 14v19, 15v18, 16v17
 const w=prelimWinners; // [W13-20, W14-19, W15-18, W16-17]
 return [
  [seeded[0],w[3]], // 1 vs W16/17
  [seeded[1],w[2]], // 2 vs W15/18
  [seeded[2],w[1]], // 3 vs W14/19
  [seeded[3],w[0]], // 4 vs W13/20
  [seeded[4],seeded[11]],
  [seeded[5],seeded[10]],
  [seeded[6],seeded[9]],
  [seeded[7],seeded[8]]
 ];
}
// Gera os 2 jogos (ida casa do pior/seed pior, volta casa do melhor) a partir de pares [better, worse] ou [a,b] com betterFirst=true
function twoLegs(pairs,tie0=0,betterFirst=true){
 const ida=[],volta=[];
 pairs.forEach((pr,i)=>{
  const [b,w]=betterFirst?pr:[pr[0],pr[1]];
  // se betterFirst, pr é [melhor, pior]; ida na casa do pior
  ida.push({home:w,away:b,leg:1,tie:tie0+i});
  volta.push({home:b,away:w,leg:2,tie:tie0+i});
 });
 return {ida,volta};
}

function nationalSchedules(clubsByLeague,strength,seed=1){
 const out={};
 for(const [k,ids] of Object.entries(clubsByLeague)){
  out[k]=leagueSchedule(ids,strength,seed+k.charCodeAt(0)+k.charCodeAt(1),{double:true});
 }
 return out;
}

module.exports={PLAN,TOTAL_MD,MID_MD,LEAGUE_ROUNDS,buildPlan,europeLeaguePhase,cupPairsPrelim,cupPairsR16,twoLegs,nationalSchedules};
