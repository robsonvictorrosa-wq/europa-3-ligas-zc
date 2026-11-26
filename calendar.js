// Calendário do clube: jogos da temporada a partir dos dados (sem cache manual).
// Antes da temporada: prévia das ligas, fase de liga europeia e preliminar das copas.
// Depois: partidas do banco, inclusive o mata-mata criado quando o time avança de fase.
const C=require('./comps');
const E=require('./europa');

function mdOf(m,plan=C.PLAN){
  const kind=m.comp_kind,stage=m.stage||'league',leg=m.leg||0,round=m.round;
  if(kind==='league')return plan.find(s=>s.kind==='league'&&s.round===round)?.matchday;
  if(kind==='cup')return plan.find(s=>s.kind==='cup'&&s.stage===stage&&(s.leg||0)===leg)?.matchday;
  if(kind==='ucl'||kind==='el'){
    if(stage==='league'||stage==='lp')return plan.find(s=>s.kind==='europe_lp'&&s.round===round)?.matchday;
    return plan.find(s=>s.kind==='europe_ko'&&s.stage===stage&&(s.leg||0)===leg)?.matchday;
  }
}

function pushPair(out,clubId,home,away,extra){
  if(home!==clubId&&away!==clubId)return;
  out.push({home,away,...extra,venue:home===clubId?'H':'A'});
}

function fromFixtures(fx,clubId){
  const out=[];if(!fx)return out;
  for(const lg of E.LEAGUES){
    (fx.leagues?.[lg.key]||[]).forEach((g,i)=>(g||[]).forEach(([h,a])=>pushPair(out,clubId,h,a,{comp_kind:'league',comp:lg.name,comp_key:lg.key,round:i+1,stage:'league',leg:0,played:false})));
    const seeds=fx.cupSeeds?.[lg.key];
    if(seeds){
      const prelim=C.twoLegs(C.cupPairsPrelim(seeds),0,true);
      for(const g of prelim.ida)pushPair(out,clubId,g.home,g.away,{comp_kind:'cup',comp:lg.cup,comp_key:'cup-'+lg.key,round:1,stage:'prelim',leg:1,tie:g.tie,played:false});
      for(const g of prelim.volta)pushPair(out,clubId,g.home,g.away,{comp_kind:'cup',comp:lg.cup,comp_key:'cup-'+lg.key,round:2,stage:'prelim',leg:2,tie:g.tie,played:false});
    }
  }
  if(fx.ucl?.length===27)C.europeLeaguePhase(fx.ucl).forEach((g,i)=>g.forEach(([h,a])=>pushPair(out,clubId,h,a,{comp_kind:'ucl',comp:'Champions League',comp_key:'ucl',round:i+1,stage:'league',leg:0,played:false})));
  if(fx.el?.length===27)C.europeLeaguePhase(fx.el).forEach((g,i)=>g.forEach(([h,a])=>pushPair(out,clubId,h,a,{comp_kind:'el',comp:'Europa League',comp_key:'el',round:i+1,stage:'league',leg:0,played:false})));
  return out;
}

function fromMatches(matches,clubId){
  return (matches||[]).filter(m=>m.home===clubId||m.away===clubId).map(m=>({
    id:m.id,home:m.home,away:m.away,hg:m.hg,ag:m.ag,played:!!m.played,pens:m.pens||null,
    stage:m.stage||'league',leg:m.leg||0,tie:m.tie,round:m.round,winner:m.winner||null,
    comp_kind:m.comp_kind,comp:m.comp,comp_key:m.comp_key||null,
    venue:m.home===clubId?'H':'A'
  }));
}

function attachDates(games,slotAt,plan=C.PLAN){
  return games.map(g=>{const matchday=mdOf(g,plan)||null,at=(matchday&&slotAt)?slotAt(matchday):null;return {...g,matchday,at};})
    .sort((a,b)=>(a.matchday||99)-(b.matchday||99)||(a.leg||0)-(b.leg||0)||String(a.comp).localeCompare(String(b.comp)));
}

function windowsOf(agenda){
  if(!agenda)return [];
  const out=[];
  if(agenda.auction_start)out.push({stage:'pre',label:'Pré-temporada: leilão + mercado',auction_start:agenda.auction_start,auction_close:agenda.auction_close,market_open:agenda.market_open,market_close:agenda.market_close});
  const W=agenda.windows||{};
  if(W.mid?.auction_start)out.push({stage:'mid',label:'Janela do meio: leilão + mercado',auction_start:W.mid.auction_start,auction_close:W.mid.auction_close,market_open:W.mid.market_open,market_close:W.mid.market_close});
  if(W.end?.auction_start)out.push({stage:'end',label:'Janela do fim: leilão + mercado',auction_start:W.end.auction_start,auction_close:W.end.auction_close,market_open:W.end.market_open,market_close:W.end.market_close});
  return out;
}

function buildClubCalendar({clubId,fixtures,matches=[],plan=C.PLAN,slotAt=null,agenda=null}){
  const raw=(matches&&matches.length)?fromMatches(matches,clubId):fromFixtures(fixtures,clubId);
  return {club_id:clubId,games:attachDates(raw,slotAt,plan),windows:windowsOf(agenda)};
}

const COMPS=[
  {key:'pl',kind:'league',league_key:'pl',name:'Premier League',mode:'table'},
  {key:'ll',kind:'league',league_key:'ll',name:'La Liga',mode:'table'},
  {key:'sa',kind:'league',league_key:'sa',name:'Serie A',mode:'table'},
  {key:'ucl',kind:'ucl',name:'Champions League',mode:'table+bracket'},
  {key:'el',kind:'el',name:'Europa League',mode:'table+bracket'},
  {key:'cup-pl',kind:'cup',league_key:'pl',name:'FA Cup',mode:'bracket'},
  {key:'cup-ll',kind:'cup',league_key:'ll',name:'Copa del Rey',mode:'bracket'},
  {key:'cup-sa',kind:'cup',league_key:'sa',name:'Coppa Italia',mode:'bracket'}
];

module.exports={mdOf,fromFixtures,fromMatches,attachDates,windowsOf,buildClubCalendar,COMPS};
