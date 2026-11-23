const assert=require('assert');
const S=require('../sim');
const TT=require('../tactics');

assert.strictEqual(S.OVR.div,11,'divisor do over deve ser 11');
assert.match(require('fs').readFileSync(require('path').join(__dirname,'../sim.js'),'utf8'),
  /Math\.exp\(\(atk\(sH\)-dfn\(sA\)\)\/OVR\.div\)/);

function mk(idBase,ovr){
  const st={defense:ovr,physical:ovr,pace:ovr,shooting:ovr,passing:ovr,dribbling:ovr,
            gk_diving:ovr,gk_handling:ovr,gk_reflexes:ovr,gk_positioning:ovr};
  const pos=['GOL','LE','ZAG','ZAG','LD','VOL','MC','MC','PE','ATA','PD'];
  return pos.map((pos,i)=>({id:idBase+i,name:'P'+(idBase+i),primary_position:pos,positions:[pos],overall:ovr,base_overall:ovr,stats:{...st}}));
}
function team(id,ovr){return {club_id:id,xi:mk(id*100,ovr),formation:'4-3-3',tactics:TT.DEF_TAC,form:null,alt:0,bench:[]};}
const poisson=(l,r)=>{let L=Math.exp(-l),k=0,p=1;do{k++;p*=r();}while(p>L);return Math.min(k-1,9);};
function mulberry(seed){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function winPct(div,d,adv,n,seed){
  const prev=S.OVR.div;S.OVR.div=div;
  const [xs,xw]=S.expected(S.teamStrength(team(1,75+d)),S.teamStrength(team(2,75)),null,null,adv);
  S.OVR.div=prev;
  const rng=mulberry(seed);let w=0,l=0,dr=0;
  for(let i=0;i<n;i++){const a=poisson(xs,rng),b=poisson(xw,rng);if(a>b)w++;else if(a===b)dr++;else l++;}
  return {w:100*w/n,d:100*dr/n,l:100*l/n,xs,xw};
}

const N=8000;
const before=winPct(16,5,S.HOME_ADV,N,1);
const after=winPct(11,5,S.HOME_ADV,N,1);
const lift=after.w-before.w;
assert.ok(lift>=7 && lift<=13, 'lift +5 casa deveria ficar entre 8 e 12 pp (foi '+lift.toFixed(1)+')');
assert.ok(after.l>=7, 'zebra ainda possível no +5 casa: '+after.l.toFixed(1)+'%');
assert.ok(after.d>=12, 'empates razoáveis no +5 casa: '+after.d.toFixed(1)+'%');

const neu=winPct(11,5,1,N,2);
const neu0=winPct(16,5,1,N,2);
assert.ok(neu.w-neu0.w>=7 && neu.w-neu0.w<=14, 'lift +5 neutro fora da faixa: '+(neu.w-neu0.w).toFixed(1));
assert.ok(neu.l>=8, 'zebra no neutro: '+neu.l.toFixed(1)+'%');

// times iguais: mando não vira sentença
const eq=S.expected(S.teamStrength(team(1,75)),S.teamStrength(team(2,75)),null,null);
assert.ok(eq[0]<1.7 && eq[1]>1.0, 'xG de iguais ainda perto de 1.45-1.16: '+eq);

console.log('sim-peso.test.js ok  +5 casa',before.w.toFixed(1)+'% → '+after.w.toFixed(1)+'%  (Δ '+(lift).toFixed(1)+' pp)');
