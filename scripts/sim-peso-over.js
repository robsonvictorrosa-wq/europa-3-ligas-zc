// Mede o peso do over: times sintéticos (attrs = overall), +2/+5/+10, casa e neutro.
// Uso: node scripts/sim-peso-over.js [div] [n]
//   div = OVR.div (padrão: o do sim.js). n = jogos por célula (padrão: 20000).
const S=require('../sim'), TT=require('../tactics');
if(process.argv[2])S.OVR.div=+process.argv[2];
const N=+(process.argv[3]||20000);
const HOME=S.HOME_ADV||1.12;
function mk(idBase,ovr){
  const st={defense:ovr,physical:ovr,pace:ovr,shooting:ovr,passing:ovr,dribbling:ovr,
            gk_diving:ovr,gk_handling:ovr,gk_reflexes:ovr,gk_positioning:ovr};
  const pos=['GOL','LE','ZAG','ZAG','LD','VOL','MC','MC','PE','ATA','PD'];
  return pos.map((pos,i)=>({id:idBase+i,name:pos+(idBase+i),primary_position:pos,positions:[pos],overall:ovr,base_overall:ovr,stats:{...st}}));
}
function team(id,ovr){return {club_id:id,xi:mk(id*100,ovr),formation:'4-3-3',tactics:TT.DEF_TAC,form:null,alt:0,bench:[]};}
const poisson=(l,r)=>{let L=Math.exp(-l),k=0,p=1;do{k++;p*=r();}while(p>L);return Math.min(k-1,9);};
function mulberry(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function run(xs,xw,n,rng){let w=0,d=0,l=0,gs=0,gw=0;for(let i=0;i<n;i++){const a=poisson(xs,rng),b=poisson(xw,rng);gs+=a;gw+=b;if(a>b)w++;else if(a===b)d++;else l++;}return {w:100*w/n,d:100*d/n,l:100*l/n,gs:gs/n,gw:gw/n};}
const fmt=o=>`V ${o.w.toFixed(1)}%  E ${o.d.toFixed(1)}%  D ${o.l.toFixed(1)}%  gols ${o.gs.toFixed(2)}-${o.gw.toFixed(2)}`;
console.log('div',S.OVR.div,'n',N);
for(const d of [2,5,10]){
  const H=team(1,75+d),A=team(2,75);
  const sH=S.teamStrength(H),sA=S.teamStrength(A);
  for(const [venue,adv] of [['casa',HOME],['neutro',1]]){
    const [xs,xw]=S.expected(sH,sA,null,null,adv);
    const o=run(xs,xw,N,mulberry(10000+d*100+Math.round(adv*100)));
    console.log(`+${d} ${venue.padEnd(6)}  xG ${xs.toFixed(2)}-${xw.toFixed(2)}  ${fmt(o)}`);
  }
}
