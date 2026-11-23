// Importa data/fc27.json.gz -> data/game.db (universo limpo) e aplica os 60 clubes do Europa 3 Ligas ZC.
const fs=require('fs'),D=require('better-sqlite3'),path=require('path');
const src=JSON.parse(require('zlib').gunzipSync(fs.readFileSync(__dirname+'/data/fc27.json.gz')).toString('utf8'));
if(fs.existsSync(__dirname+'/data/game.db'))fs.unlinkSync(__dirname+'/data/game.db');
const db=new D(__dirname+'/data/game.db');
db.exec(fs.readFileSync(__dirname+'/schema.sql','utf8'));
const money=s=>{if(!s)return null;s=String(s).replace(/[\s\u00a0€]/g,'').replace(',','.');s=s.replace(/mil/i,'K');const m=s.match(/^([\d.]+)([KMB]?)/i);if(!m)return null;return Math.round(parseFloat(m[1])*({K:1e3,M:1e6,B:1e9}[m[2].toUpperCase()]||1));};
const P=src.players;for(const p of P)if(p.name)p.name=p.name.replace(/\s*\*+\s*$/,"").replace(/\*/g,"");
const CONMEBOL=new Set(['CONMEBOL Libertadores','CONMEBOL Sudamericana']);
const LEAGUE_META={'LALIGA EA SPORTS':['Espanha',1],'LALIGA HYPERMOTION':['Espanha',2],'Premier League':['Inglaterra',1],'EFL Championship':['Inglaterra',2],'EFL League One':['Inglaterra',3],'EFL League Two':['Inglaterra',4],'Bundesliga':['Alemanha',1],'Bundesliga 2':['Alemanha',2],'3. Liga':['Alemanha',3],'Serie A Enilive':['Itália',1],'Serie BKT':['Itália',2],"Ligue 1 McDonald's":['França',1],'Ligue 2 BKT':['França',2],'Liga Portugal':['Portugal',1],'Eredivisie':['Holanda',1],'1A Pro League':['Bélgica',1],'Trendyol Süper Lig':['Turquia',1],'Scottish Premiership':['Escócia',1],'ROSHN Saudi League':['Arábia Saudita',1],'Major League Soccer':['EUA',1],'Liga BBVA MX':['México',1],'Liga Profesional de Fútbol':['Argentina',1],'Eliteserien':['Noruega',1],'Allsvenskan':['Suécia',1],'3F Superliga':['Dinamarca',1],'SUPERLIGA':['Romênia',1],'Brack Super League':['Suíça',1],'Österreichische Fußball-Bundesliga':['Áustria',1],'PKO Bank Polski Ekstraklasa':['Polônia',1],'K League 1':['Coreia do Sul',1],'Chinese Football Association Super League':['China',1],'Isuzu UTE A-League':['Austrália',1],'Indian Super League':['Índia',1],"SSE Airtricity Men's Premier Division":['Irlanda',1]};
const WOMEN=new Set(["National Women's Soccer League",'Google Pixel Frauen-Bundesliga','Arkema Première Ligue','Barclays Women’s Super League','Liga F Moeve','Resto do mundo feminina']);
const ck=p=>p.club+'|'+(p.gender==='Mulher'?'F':'M');const byClub={};for(const p of P){if(!p.club)continue;(byClub[ck(p)]??={name:p.club,n:{},league:p.league,g:p.gender,players:[]}).players.push(p);const o=byClub[ck(p)];o.n[p.nationality]=(o.n[p.nationality]||0)+1;}
const leagueOf=c=>{const o=byClub[c];if(!o.league)return 'Sem clube (Livres)';if(!CONMEBOL.has(o.league))return o.league;const top=Object.entries(o.n).sort((a,b)=>b[1]-a[1])[0][0];return top==='Brasil'?'Brasileirão (CONMEBOL)':'CONMEBOL – '+top;};
const leagues={};const insL=db.prepare('INSERT INTO leagues(name,country,tier,gender,kind,original_name) VALUES(?,?,?,?,?,?)');
const getL=(name,orig,g)=>{if(leagues[name])return leagues[name];let country='Internacional',tier=1,kind='league';
 if(LEAGUE_META[name])[country,tier]=LEAGUE_META[name];else if(name.startsWith('Brasileirão')){country='Brasil';kind='conmebol';}else if(name.startsWith('CONMEBOL – ')){country=name.slice(11);kind='conmebol';}else if(name.startsWith('Resto do mundo'))kind='rest';else if(name==='Sem clube (Livres)')kind='free';else if(name.includes('Master'))kind='special';
 return leagues[name]=insL.run(name,country,tier,WOMEN.has(name)?'F':g==='Mulher'?'F':'M',kind,orig).lastInsertRowid;};
const insC=db.prepare('INSERT INTO clubs(name,league_id) VALUES(?,?)');
const insP=db.prepare(`INSERT INTO players(id,name,nationality,club_id,base_club_id,positions,primary_position,overall,potential,age,height_cm,weight_kg,preferred_foot,weak_foot,skill_moves,gender,market_value,wage,release_clause,contract_end,stats) VALUES(@id,@name,@nationality,@club_id,@club_id,@positions,@primary_position,@overall,@potential,@age,@height_cm,@weight_kg,@preferred_foot,@weak_foot,@skill_moves,@gender,@mv,@wg,@rc,@contract_end,@stats)`);
db.transaction(()=>{const clubId={};
 for(const c of Object.keys(byClub)){const o=byClub[c];clubId[c]=insC.run(o.name,getL(leagueOf(c),o.league,o.g)).lastInsertRowid;}
 for(const p of P){const cid=p.club?clubId[ck(p)]:null;
  if((+p.age||0)>33||p.potential==null||p.potential<p.overall)p.potential=p.overall;insP.run({...p,club_id:cid,positions:JSON.stringify(p.positions||[]),mv:require('./value')(p),wg:money(p.wage_display),rc:money(p.release_clause_display),stats:JSON.stringify(p.stats||{})});}
})();
db.exec(`UPDATE clubs SET n_players=(SELECT count(*) FROM players WHERE club_id=clubs.id),
 squad_value=(SELECT coalesce(sum(market_value),0) FROM players WHERE club_id=clubs.id),
 wage_bill=(SELECT coalesce(sum(wage),0) FROM players WHERE club_id=clubs.id),
 overall=(SELECT round(avg(overall),1) FROM (SELECT overall FROM players WHERE club_id=clubs.id AND overall IS NOT NULL ORDER BY overall DESC LIMIT 11)),
 budget=(SELECT coalesce(sum(market_value),0)/8 FROM players WHERE club_id=clubs.id)`);
console.log(db.prepare('select count(*) n from players').get(),db.prepare('select count(*) n from clubs').get(),db.prepare('select count(*) n from leagues').get());

// ===== Europa 3 Ligas ZC: 60 clubes do FC27 limpo (sem migrações do ZC 50) =====
const CF=JSON.parse(fs.readFileSync(__dirname+'/config/europa.json','utf8'));
db.exec(`CREATE TABLE lib_clubs(
  ord INT, club_id INT, name TEXT, fc27_name TEXT, country TEXT, league_key TEXT,
  squad TEXT, abbr TEXT, ovr11 REAL, ovr18 REAL, rank INT, budget BIGINT
)`);
const findClub=db.prepare(`SELECT c.id,c.name,c.overall,l.original_name,l.name league
  FROM clubs c JOIN leagues l ON l.id=c.league_id
  WHERE c.name=? AND l.original_name=? AND l.kind='league'`);
const upd=db.prepare('UPDATE clubs SET name=?,budget=? WHERE id=?');
const insLib=db.prepare('INSERT INTO lib_clubs(ord,club_id,name,fc27_name,country,league_key,squad,abbr,ovr11,ovr18,rank,budget) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)');
const miss=[];
db.transaction(()=>{
 CF.clubs.forEach((c,i)=>{
  const lg=CF.leagues.find(l=>l.key===c.league);
  const row=findClub.get(c.db,lg.fc27);
  if(!row){miss.push(c.db);return;}
  upd.run(c.name,c.budget,row.id);
  insLib.run(i,row.id,c.name,c.db,c.country,c.league,c.squad,c.abbr,c.ovr11,c.ovr18,c.rank,c.budget);
 });
})();
if(miss.length){console.error('Clubes não encontrados no FC27:',miss.join(', '));process.exit(1);}
// Clube técnico do leilão (vazio)
const aucLg=db.prepare("INSERT INTO leagues(name,country,tier,gender,kind) VALUES('Europa 3 Ligas ZC – leilão','Vários',1,'M','special')").run().lastInsertRowid;
db.prepare("INSERT INTO clubs(name,league_id,n_players,overall,squad_value,wage_bill,budget) VALUES('Leilão ZC',?,0,NULL,0,0,0)").run(aucLg);

require('./gen-attrs')(db);
require('./recalc-values').runSqlite(db);
console.log('Europa 3 Ligas ZC:',CF.clubs.length,'clubes; verbas e nomes aplicados (Inter/Milan/Atalanta).');
const check=db.prepare("SELECT name,fc27_name,league_key,ovr11,rank,budget FROM lib_clubs WHERE name IN ('Inter','Milan','Atalanta')").all();
console.log('nomes licenciados:',check);

try{require('child_process').execFileSync('python3',[require('path').join(__dirname,'scripts/gen-crests.py')],{stdio:'inherit'});}catch(e){console.warn('crests:',e.message);}
