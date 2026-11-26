// Calendário global, chaveamento das copas (18 times) e fase de liga europeia (27 times, 8 jogos em 9 jornadas).
const E=require('./europa');
const {leagueSchedule}=require('./leaguesched');

// Sequência de 62 jornadas (ver DECISOES.md). mid após a 28ª (liga nacional R17 + 9ª jornada europeia).
function buildPlan(){
 const p=[];
 const L=(r)=>p.push({kind:'league',round:r,label:`Liga nacional – rodada ${r}`});
 const U=(n)=>p.push({kind:'europe_lp',round:n,label:`Fase de liga europeia – jornada ${n}`});
 const EK=(st,leg)=>p.push({kind:'europe_ko',stage:st,leg,label:`${E.STAGE_NAMES[st]} europeia`+(st==='final'?'':(leg===1?' (ida)':' (volta)'))});
 const C=(st,leg)=>p.push({kind:'cup',stage:st,leg,label:`Copa nacional – ${E.STAGE_NAMES[st]}`+(leg===1?' (ida)':' (volta)')});
 for(let i=0;i<8;i++){L(2*i+1);L(2*i+2);U(i+1);}
 C('prelim',1);L(17);C('prelim',2);U(9);
 const midAfter=p.length; // 28
 EK('playoff',1);L(18);EK('playoff',2);L(19);
 EK('r16',1);L(20);EK('r16',2);L(21);
 C('r16',1);L(22);C('r16',2);L(23);
 EK('qf',1);L(24);EK('qf',2);L(25);
 C('qf',1);L(26);C('qf',2);
 EK('sf',1);L(27);EK('sf',2);L(28);
 C('sf',1);L(29);C('sf',2);
 for(let r=30;r<=34;r++)L(r);
 EK('final',1);C('final',1);C('final',2);
 return p.map((x,i)=>({...x,matchday:i+1,mid_after:i+1===midAfter}));
}
const PLAN=buildPlan();
const TOTAL_MD=PLAN.length;
const MID_MD=PLAN.find(s=>s.mid_after).matchday;
const LEAGUE_ROUNDS=34;

// Fase de liga europeia com 27 times, 8 jogos cada (4 casa, 4 fora), 9 jornadas × 12 jogos.
// Construção: times = resíduo (0..8) + 9×camada (0..2). Na jornada r folgam r, r+9 e r+18
// (cada time folga 1 vez). Os 8 resíduos restantes são emparelhados pela fatoração quase
// perfeita de K_9 ({r+k, r−k} para k=1..4); entre dois resíduos joga-se camada com camada.
// Mando: o time do resíduo i joga em casa contra j se (j−i mod 9) ∈ {1,2,3,4}.
const EUROPE_N=27,EUROPE_LP_ROUNDS=9,EUROPE_GAMES=8;
function europeLeaguePhase(clubs){
 if(clubs.length!==EUROPE_N)throw new Error('europe League phase: 27 clubes');
 const mds=[];
 for(let r=0;r<9;r++){
  const games=[];
  for(let k=1;k<=4;k++){
   const i=(r+k)%9,j=(r-k+9)%9;
   const d=(j-i+9)%9,homeFirst=d>=1&&d<=4;
   for(let a=0;a<3;a++){
    const ti=i+9*a,tj=j+9*a;
    games.push(homeFirst?[clubs[ti],clubs[tj]]:[clubs[tj],clubs[ti]]);
   }
  }
  if(games.length!==12)throw new Error('jornada europeia r='+r+' jogos='+games.length);
  mds.push(games);
 }
 return mds;
}

// Copa de 18 times: preliminar entre os 4 piores (15×18, 16×17), depois 16 (top 14 + 2 vencedores).
// Todas as fases ida e volta; o melhor joga a volta em casa.
function cupPairsPrelim(seeded){ // seeded[0]=melhor
 return [[seeded[14],seeded[17]],[seeded[15],seeded[16]]]; // 15v18, 16v17 (ida na casa do pior)
}
function cupPairsR16(seeded,prelimWinners){ // prelimWinners: [W15/18, W16/17]
 const w=prelimWinners;
 return [
  [seeded[0],w[1]], // 1 vs W16/17
  [seeded[1],w[0]], // 2 vs W15/18
  [seeded[2],seeded[13]],
  [seeded[3],seeded[12]],
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


// Mata-mata europeu: 9º×24º … 16º×17º na repescagem (ida na casa do pior);
// top 8 direto nas oitavas contra os vencedores (1×W16/17 … 8×W9/24).
function europePlayoffPairs(ranked){ // ranked[0]=1º da fase de liga
 const p=[];for(let i=0;i<8;i++)p.push([ranked[8+i],ranked[23-i]]);
 return p;
}
function europeR16Pairs(top8,playoffWinners){ // winners[0]=W9/24 … [7]=W16/17
 return top8.map((id,i)=>[id,playoffWinners[7-i]]);
}
function europeQfPairs(r16Winners){ // ordem das oitavas: caminho do 1º, do 2º, … do 8º
 const w=r16Winners;
 return [[w[0],w[7]],[w[3],w[4]],[w[1],w[6]],[w[2],w[5]]];
}

module.exports={PLAN,TOTAL_MD,MID_MD,LEAGUE_ROUNDS,EUROPE_N,EUROPE_LP_ROUNDS,EUROPE_GAMES,buildPlan,europeLeaguePhase,cupPairsPrelim,cupPairsR16,europePlayoffPairs,europeR16Pairs,europeQfPairs,twoLegs,nationalSchedules};
