// Europa 3 Ligas ZC – 60 clubes (Premier League, La Liga, Serie A), copas nacionais e duas europeias.
const CF=JSON.parse(require('fs').readFileSync(__dirname+'/config/europa.json','utf8'));
const CFG={
 NAME:CF.name,
 LEAGUE_ROUNDS:38,
 TURNO1_END:19,
 EUROPE_LP:8,          // fase de liga: 8 jogos
 EUROPE_KO_FROM:8,     // top 8 nas quartas (8 times; ver DECISOES.md)
 KO_TWO_LEGS:true,
 FINAL_SINGLE:true,    // finais europeias em jogo único; copas nacionais: ida e volta inclusive a final
 CUP_FINAL_TWO_LEGS:true,
 DIRECT:8
};
let CLUBS=[];
const loadClubs=uni=>{CLUBS=uni.prepare('SELECT club_id FROM lib_clubs ORDER BY ord').all().map(x=>x.club_id);return CLUBS;};
const VPOS=['GOL','LD','ZAG','ZAG','LE','VOL','MC','MEI','PD','PE','ATA','GOL','ZAG','MC','ATA','LE'];
const virtualSquad=clubId=>VPOS.map((pos,i)=>({id:-(clubId*100+i+1),name:'Provisório '+pos+(i>=11?' (res.)':''),primary_position:pos,positions:[pos],overall:CF.placeholder_ovr,age:25,stats:{},virtual:true}));
const STAGE_NAMES={
 league:'Fase de liga',lp:'Fase de liga',prelim:'Preliminar',r16:'Oitavas de final',
 qf:'Quartas de final',sf:'Semifinal',final:'Final'
};
const N_CLUBS=CF.clubs.length;
const LEAGUES=CF.leagues;
function clubsOf(key){return CF.clubs.filter(c=>c.league===key);}
function standings(matches,clubIds,nameOf=id=>String(id),pen,opts){
 const side=opts?.side||null,r0=opts?.roundFrom||0,r1=opts?.roundTo||1e9,useZones=opts?.zones===true,zones=opts?.zoneFn;
 const T={};clubIds.forEach(id=>T[id]={club_id:id,name:nameOf(id),j:0,v:0,e:0,d:0,gp:0,gc:0,pts:-(pen?.get(id)||0),penalty:pen?.get(id)||0,form:[]});
 for(const m of [...matches].filter(m=>m.played&&(m.stage||'league')==='league'&&(+m.round||0)>=r0&&(+m.round||0)<=r1).sort((a,b)=>a.round-b.round)){
  const sides=side==='home'?[[m.home,m.hg,m.ag]]:side==='away'?[[m.away,m.ag,m.hg]]:[[m.home,m.hg,m.ag],[m.away,m.ag,m.hg]];
  for(const [id,f,g] of sides){const t=T[id];if(!t)continue;t.j++;t.gp+=f;t.gc+=g;if(f>g){t.v++;t.pts+=3;t.form.push('V')}else if(f===g){t.e++;t.pts++;t.form.push('E')}else{t.d++;t.form.push('D')}}}
 return Object.values(T).map(t=>({...t,sg:t.gp-t.gc,form:t.form.slice(-5)})).sort((a,b)=>b.pts-a.pts||b.v-a.v||b.sg-a.sg||b.gp-a.gp||a.name.localeCompare(b.name,'pt')).map((t,i)=>({...t,pos:i+1,zone:useZones&&zones?zones(i+1):null}));
}
function penalties(r=Math.random){let a=0,b=0;for(let i=0;i<5;i++){if(r()<.75)a++;if(a>b+(5-i))break;if(r()<.75)b++;if(b>a+(4-i)||a>b+(4-i))break;}
 while(a===b){const x=r()<.75,y=r()<.75;a+=x;b+=y;}return [a,b];}
function winners(prev,stage){return prev.filter(m=>m.stage===stage&&m.winner).map(m=>({club:m.winner,tie:m.tie}));}
function decideTie(ms,last,r=Math.random){const a=last.home,b=last.away;let ga=0,gb=0;for(const m of ms){if(m.home===a){ga+=m.hg;gb+=m.ag}else{ga+=m.ag;gb+=m.hg}}
 if(ga!==gb)return {winner:ga>gb?a:b,agg:[ga,gb],pens:null};const p=penalties(r);return {winner:p[0]>p[1]?a:b,agg:[ga,gb],pens:p.join('-')};}
// Qualificação europeia. season=1 (ou seeds ausentes): 10 melhores de cada liga pelo over dos 11. Depois: top 10 da tabela da temporada anterior.
function qualifyEurope(opts={}){
 const {season=1,tables=null,uni=null}=opts; // tables: {pl:[{club_id,pos}],...}
 const ucl=[],el=[];
 for(const lg of LEAGUES){
  let ordered;
  if(season>1&&tables&&tables[lg.key]&&tables[lg.key].length>=20){
   ordered=tables[lg.key].slice().sort((a,b)=>a.pos-b.pos).map(x=>x.club_id);
  }else{
   const rows=(uni?uni.prepare('SELECT club_id,ovr11 FROM lib_clubs WHERE league_key=? ORDER BY ovr11 DESC, name').all(lg.key):clubsOf(lg.key).sort((a,b)=>b.ovr11-a.ovr11).map(c=>({club_id:c.id,ovr11:c.ovr11})));
   ordered=rows.map(r=>r.club_id??r.id);
  }
  ucl.push(...ordered.slice(0,10));
  el.push(...ordered.slice(10,20));
 }
 return {ucl,el};
}
const leagueZone=pos=>pos<=10?'ucl':'el';
module.exports={CFG,CF,N_CLUBS,get CLUBS(){return CLUBS},loadClubs,virtualSquad,STAGE_NAMES,LEAGUES,
 LEAGUE_ROUNDS:()=>CFG.LEAGUE_ROUNDS,TURNO1_END:()=>CFG.TURNO1_END,clubsOf,standings,penalties,winners,decideTie,qualifyEurope,leagueZone};
