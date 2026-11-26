// Gera config/europa.json a partir do fc27.json.gz (somente leitura da base).
const fs=require('fs'),zlib=require('zlib'),path=require('path');
const ROOT=path.join(__dirname,'..');
const src=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ROOT,'data/fc27.json.gz'))).toString('utf8'));
const DISPLAY={'Lombardia FC':'Inter','Milano FC':'Milan','Bergamo Calcio':'Atalanta'};
const ABR={
 'Arsenal':'ARS','Manchester City':'MCI','Liverpool':'LIV','Man Utd':'MUN','Chelsea':'CHE','Spurs':'TOT',
 'Aston Villa':'AVL','Newcastle Utd':'NEW',"Nott'm Forest":'NFO','Sunderland':'SUN','Crystal Palace':'CRY',
 'Brentford':'BRE','Everton':'EVE','AFC Bournemouth':'BOU','Brighton':'BHA','Leeds United':'LEE','Fulham':'FUL',
 'Ipswich Town':'IPS','Hull City':'HUL','Coventry City':'COV',
 'FC Barcelona':'BAR','Real Madrid':'RMA','Atlético de Madrid':'ATM','Athletic Bilbao':'ATH','Villarreal CF':'VIL',
 'Real Betis':'BET','Real Sociedad':'RSO','Rayo Vallecano':'RAY','Celta':'CEL','CA Osasuna':'OSA','Valencia CF':'VAL',
 'Sevilla FC':'SEV','RC Deportivo':'DEP','RCD Espanyol':'ESP','Getafe CF':'GET','D. Alavés':'ALA','Levante UD':'LEV',
 'R. Racing Club':'RAC','Elche CF':'ELC','Málaga CF':'MAL',
 'Lombardia FC':'INT','AS Roma':'ROM','SSC Napoli':'NAP','Milano FC':'MIL','Juventus FC':'JUV','Bergamo Calcio':'ATA',
 'Como 1907':'COM','SS Lazio':'LAZ','ACF Fiorentina':'FIO','Bologna FC':'BOL','Torino FC':'TOR','Sassuolo':'SAS',
 'Udinese Calcio':'UDI','Genoa CFC':'GEN','Venezia FC':'VEN','Parma Calcio':'PAR','Cagliari Calcio':'CAG',
 'AC Monza':'MON','US Lecce':'LEC','Frosinone Calcio':'FRO'
};
const LEAGUES=[
 {key:'pl',name:'Premier League',country:'Inglaterra',fc27:'Premier League',cup:'FA Cup'},
 {key:'ll',name:'La Liga',country:'Espanha',fc27:'LALIGA EA SPORTS',cup:'Copa del Rey'},
 {key:'sa',name:'Serie A',country:'Itália',fc27:'Serie A Enilive',cup:'Coppa Italia'}
];
// Verba (Robson 23/11/2026): over = média dos 18 maiores do elenco inicial (desempate: média dos 11).
// Melhor clube (Real Madrid) = €0; €37,5 mi por ponto abaixo; arredonda a múltiplo de €25 mi; teto €500 mi.
const RATE=37.5e6, STEP=25e6, CAP=500e6;
function avg(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0;}
function r2(x){return Math.round(x*100)/100;}
function budgetOf(ovr18,top){return Math.min(CAP, Math.round(((top-ovr18)*RATE)/STEP)*STEP);}

const clubs=[];
for(const lg of LEAGUES){
  const by={};
  for(const p of src.players){
    if(p.league!==lg.fc27||!p.club)continue;
    (by[p.club]||=[]).push(p);
  }
  const names=Object.keys(by);
  if(names.length!==20)throw new Error(lg.fc27+' tem '+names.length+' clubes');
  for(const dbName of names){
    const ps=by[dbName];
    const ovrs=ps.map(p=>p.overall).filter(x=>x!=null).sort((a,b)=>b-a);
    clubs.push({
      db:dbName, name:DISPLAY[dbName]||dbName, abbr:ABR[dbName]||dbName.slice(0,3).toUpperCase(),
      league:lg.key, country:lg.country, squad:'db',
      n_players:ps.length, ovr11:r2(avg(ovrs.slice(0,11))), ovr18:r2(avg(ovrs.slice(0,18))),
      ovr11_raw:avg(ovrs.slice(0,11)), ovr18_raw:avg(ovrs.slice(0,18))
    });
  }
}

// Remove os 2 de menor over de cada liga (Robson 26/11/2026). Jogadores seguem no FC27 para o leilão.
const removed=[];
const kept=[];
for(const lg of LEAGUES){
  const list=clubs.filter(c=>c.league===lg.key).sort((a,b)=>b.ovr18_raw-a.ovr18_raw||b.ovr11_raw-a.ovr11_raw||a.name.localeCompare(b.name,'pt'));
  if(list.length!==20)throw new Error(lg.key+' deveria ter 20 antes do corte');
  kept.push(...list.slice(0,18));
  for(const c of list.slice(18))removed.push({db:c.db,name:c.name,league:lg.key,ovr18:r2(c.ovr18_raw),ovr11:r2(c.ovr11_raw)});
}
clubs.length=0;clubs.push(...kept);
clubs.sort((a,b)=>b.ovr18_raw-a.ovr18_raw||b.ovr11_raw-a.ovr11_raw||a.name.localeCompare(b.name,'pt'));
const top=clubs[0].ovr18_raw;
clubs.forEach((c,i)=>{c.rank=i+1;c.ovr11=r2(c.ovr11_raw);c.ovr18=r2(c.ovr18_raw);c.budget=budgetOf(c.ovr18_raw,top);delete c.ovr11_raw;delete c.ovr18_raw;});

// Qualificação s1: 9 melhores de cada liga pelo over (média dos 18, desempate dos 11) na Champions, 9 piores na EL
const europe={ucl:[],el:[]};
for(const lg of LEAGUES){
  const byOvr=clubs.filter(c=>c.league===lg.key).slice().sort((a,b)=>a.rank-b.rank);
  if(byOvr.length!==18)throw new Error(lg.key+' deveria ficar com 18');
  europe.ucl.push(...byOvr.slice(0,9).map(c=>c.name));
  europe.el.push(...byOvr.slice(9).map(c=>c.name));
}

const out={
  _doc:'Configuração do Europa 3 Ligas ZC. Elencos do FC27 limpo (data/fc27.json.gz). Nomes de exibição: Inter, Milan e Atalanta no lugar dos nomes licenciados da EA. 54 clubes ativos (18 por liga; os 2 de menor over de cada liga saíram). Verba: €37,5 mi por ponto de over (média dos 18 maiores do elenco inicial; desempate pela média dos 11) abaixo do melhor (Real Madrid), arredondada a múltiplo de €25 mi, teto €500 mi.',
  name:'Europa 3 Ligas ZC',
  default_budget:20e6,
  default_wage_budget:400000,
  placeholder_ovr:68,
  meta_onze:6,
  auction:{min_bid_pct:0.5},
  mid_matchday:28, // após a 17ª rodada das ligas e a 9ª jornada da fase de liga europeia (ver comps.js)
  display_names:DISPLAY,
  leagues:LEAGUES,
  prizes:[
    {from:1,to:1,amount:100e6},{from:2,to:2,amount:50e6},{from:3,to:3,amount:30e6},
    {from:4,to:8,amount:20e6},{from:9,to:10,amount:10e6},{from:11,to:18,amount:0}
  ],
  _doc_prizes:'Premiação por posição em cada liga nacional (provisória, no molde do ZC 50). Copas e europeias ainda sem prêmio de título nesta etapa.',
  _doc_budget:'Verba inicial (Robson 23/11/2026): over = média dos 18 maiores overs do elenco inicial (desempate: média dos 11). Real Madrid (85,17) recebe €0. Cada ponto abaixo vale €37,5 mi, arredondado a múltiplo de €25 mi, teto €500 mi. Total da liga €17.500 mi.',
  season1_europe:europe,
  removed_clubs:removed,
  clubs
};
fs.writeFileSync(path.join(ROOT,'config/europa.json'), JSON.stringify(out,null,2));
console.log('clubs',clubs.length,'removed',removed.map(c=>c.name).join(', '));
console.log('UCL',europe.ucl.join(', '));
console.log('EL',europe.el.join(', '));
for(const c of clubs){
  console.log(c.rank+'.', c.name, 'ovr18='+c.ovr18, '€'+(c.budget/1e6)+'mi');
}
console.log('total €'+(clubs.reduce((s,c)=>s+c.budget,0)/1e6)+'mi');
