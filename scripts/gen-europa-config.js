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
// Faixas ZC 50 (5/5/10/5/5/5/5 em 40 clubes) escaladas para 60 (×1,5): 8/7/15/8/7/8/7
// rank 1 = maior over. 7 melhores 0 · 8 seguintes 50 · 7 seguintes 100 · 8 seguintes 200 · 15 seguintes 300 · 7 seguintes 400 · 8 piores 500.
const BANDS=[
 {from:1,to:7,amount:0},
 {from:8,to:15,amount:50e6},
 {from:16,to:22,amount:100e6},
 {from:23,to:30,amount:200e6},
 {from:31,to:45,amount:300e6},
 {from:46,to:52,amount:400e6},
 {from:53,to:60,amount:500e6}
];
function avg(a){return a.length?a.reduce((x,y)=>x+y,0)/a.length:0;}
function r1(x){return Math.round(x*10)/10;}
function budgetOf(rank){const b=BANDS.find(x=>rank>=x.from&&rank<=x.to);if(!b)throw new Error('rank '+rank);return b.amount;}

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
      n_players:ps.length, ovr11:r1(avg(ovrs.slice(0,11))), ovr18:r1(avg(ovrs.slice(0,18))),
      ovr11_raw:avg(ovrs.slice(0,11)), ovr18_raw:avg(ovrs.slice(0,18))
    });
  }
}
clubs.sort((a,b)=>b.ovr11_raw-a.ovr11_raw||b.ovr18_raw-a.ovr18_raw||a.name.localeCompare(b.name,'pt'));
clubs.forEach((c,i)=>{c.rank=i+1;c.budget=budgetOf(c.rank);delete c.ovr11_raw;delete c.ovr18_raw;});

// Qualificação s1: 10 melhores de cada liga (por ovr11) na Champions, 10 piores na EL
const europe={ucl:[],el:[]};
for(const lg of LEAGUES){
  const list=clubs.filter(c=>c.league===lg.key).sort((a,b)=>a.rank-b.rank); // already global rank, but need league order by ovr
  list.sort((a,b)=>clubs.indexOf(a)-clubs.indexOf(b));
  const byOvr=clubs.filter(c=>c.league===lg.key).slice().sort((a,b)=>a.rank-b.rank);
  europe.ucl.push(...byOvr.slice(0,10).map(c=>c.name));
  europe.el.push(...byOvr.slice(10).map(c=>c.name));
}

const out={
  _doc:'Configuração do Europa 3 Ligas ZC. Elencos do FC27 limpo (data/fc27.json.gz). Nomes de exibição: Inter, Milan e Atalanta no lugar dos nomes licenciados da EA. Verbas pelas faixas do ZC 50 escaladas a 60 clubes, ranking global de over (média dos 11 maiores).',
  name:'Europa 3 Ligas ZC',
  default_budget:20e6,
  default_wage_budget:400000,
  placeholder_ovr:68,
  meta_onze:6,
  auction:{min_bid_pct:0.5},
  mid_matchday:29, // após a 19ª rodada das ligas nacionais (ver comps.js)
  display_names:DISPLAY,
  leagues:LEAGUES,
  budget_bands:BANDS,
  prizes:[
    {from:1,to:1,amount:100e6},{from:2,to:2,amount:50e6},{from:3,to:3,amount:30e6},
    {from:4,to:8,amount:20e6},{from:9,to:10,amount:10e6},{from:11,to:20,amount:0}
  ],
  _doc_prizes:'Premiação por posição em cada liga nacional (provisória, no molde do ZC 50). Copas e europeias ainda sem prêmio de título nesta etapa.',
  _doc_budget:'Rank 1–7 (maior over): € 0 · 8–15: 50 mi · 16–22: 100 mi · 23–30: 200 mi · 31–45: 300 mi · 46–52: 400 mi · 53–60 (menor over): 500 mi. Escala 1,5× das faixas de 40 clubes do ZC 50 (5/5/10/5/5/5/5 → 8/7/15/8/7/8/7, com 7+8 nas pontas para somar 60).',
  season1_europe:europe,
  clubs
};
fs.writeFileSync(path.join(ROOT,'config/europa.json'), JSON.stringify(out,null,2));
console.log('clubs',clubs.length);
console.log('UCL',europe.ucl.join(', '));
console.log('EL',europe.el.join(', '));
for(const b of BANDS){
  const g=clubs.filter(c=>c.rank>=b.from&&c.rank<=b.to);
  console.log('band',b.from+'-'+b.to, (b.amount/1e6)+'mi', g.map(c=>c.rank+'.'+c.name+'('+c.ovr11+')').join(' | '));
}
