// Temporada: 3 ligas (38 rodadas), 3 copas nacionais e 2 europeias, avançadas por jornada global.
const S=require('./sim'),E=require('./europa'),C=require('./comps'),{resenha}=require('./resenha');
module.exports=({app,uni,q,pool,auth,wrap,fail,member,bump,R,M})=>{
 E.loadClubs(uni);
 const LIB=new Set(E.CLUBS);
 const club=id=>uni.prepare('SELECT c.id,c.name,c.overall,c.league_id,l.name league FROM clubs c JOIN leagues l ON l.id=c.league_id WHERE c.id=?').get(id);
 const libRow=id=>uni.prepare('SELECT * FROM lib_clubs WHERE club_id=?').get(id);
 const clubsByLeague=()=>{const m={};for(const lg of E.LEAGUES)m[lg.key]=uni.prepare('SELECT club_id FROM lib_clubs WHERE league_key=? ORDER BY ord').all(lg.key).map(x=>x.club_id);return m;};
 const vname=id=>id<0?{name:'Provisório',primary_position:'—'}:null;
 const squad=(db,roomId,clubId)=>R.squad(db,roomId,clubId);
 const XIMEMO=new Map();
 async function xiFor(db,roomId,clubId){let sq=await squad(db,roomId,clubId);if(sq.length<11)sq=[...sq,...E.virtualSquad(clubId)];const [l]=(await db.query('SELECT * FROM lineups WHERE room_id=$1 AND club_id=$2',[roomId,clubId])).rows;
  const TT=require('./tactics');if(!l){
   const key=clubId+'|'+sq.map(p=>p.id+'.'+p.overall+'.'+p.primary_position+'.'+(p.morale??'')+'.'+(p.wants_out?1:0)).join(',');let hit=XIMEMO.get(key);
   if(!hit){const ai=TT.aiPlan(sq,clubId);const xi0=TT.autoXI(sq,ai.formation);hit={ids:xi0.map(p=>p?p.id:null),formation:ai.formation,tactics:ai.tactics};XIMEMO.set(key,hit);if(XIMEMO.size>400)XIMEMO.delete(XIMEMO.keys().next().value);}
   const m=new Map(sq.map(p=>[p.id,p]));const xi=hit.ids.map(id=>id==null?null:(m.get(id)??null));return {xi,bench:sq.filter(p=>!xi.includes(p)),formation:hit.formation,tactics:hit.tactics,takers:null,slotted:true,custom:false,ai:true};}
  const f=S.FORMATIONS[l.formation]?l.formation:'4-3-3',tac=TT.norm(l.tactics);
  if(l.starters?.length===11){const mm=new Map(sq.map(p=>[p.id,p]));const xi=l.starters.map(id=>mm.get(id)).filter(Boolean);if(xi.length===11)return {xi,bench:sq.filter(p=>!xi.includes(p)),formation:f,tactics:tac,takers:l.takers,slotted:l.slotted,custom:true};}
  const xi=TT.autoXI(sq,f);return {xi,bench:sq.filter(p=>!xi.includes(p)),formation:f,tactics:tac,takers:l.takers,slotted:true,custom:false};}
 app.locals.xiFor=(...a)=>xiFor(...a);
 const form=async(db,compId,clubId)=>{const r=(await db.query('SELECT home,hg,ag FROM matches WHERE comp_id=$1 AND played AND (home=$2 OR away=$2) ORDER BY round DESC LIMIT 5',[compId,clubId])).rows;
  if(!r.length)return null;return r.reduce((a,m)=>{const [f,g]=m.home===clubId?[m.hg,m.ag]:[m.ag,m.hg];return a+(f>g?3:f===g?1:0)},0)*5/r.length;};
 const penMap=async(db,roomId)=>new Map((await db.query('SELECT club_id,penalty_pts FROM room_clubs WHERE room_id=$1 AND penalty_pts<>0',[roomId])).rows.map(x=>[x.club_id,x.penalty_pts]));
 const ownerOnly=(room,r)=>{if(room.owner_id!==r.user.id&&!r.user.admin)throw fail('Só o dono da sala',403);};
 const AGZ=require('./agenda');

 async function ovr18Map(db,roomId){
  const avg=new Map();
  for(const cid of E.CLUBS){const sq=(await R.squad(db,roomId,cid,false)).map(p=>+p.overall||0).sort((a,b)=>b-a).slice(0,18);avg.set(cid,sq.reduce((x,y)=>x+y,0)/(sq.length||1));}
  return avg;
 }

 async function prevLeagueTables(db,room,prevSeason){
  const out={};
  for(const lg of E.LEAGUES){
   const [comp]=(await db.query("SELECT id FROM competitions WHERE room_id=$1 AND season=$2 AND kind='league' AND league_key=$3",[room.id,prevSeason,lg.key])).rows;
   if(!comp)return null;
   const ms=(await db.query("SELECT * FROM matches WHERE comp_id=$1 AND played AND stage='league'",[comp.id])).rows;
   const ids=clubsByLeague()[lg.key];
   out[lg.key]=E.standings(ms,ids,id=>club(id).name,await penMap(db,room.id));
  }
  return out;
 }

 async function prevChampions(db,room,prevSeason){
  const [ucl]=(await db.query("SELECT champion FROM competitions WHERE room_id=$1 AND season=$2 AND kind='ucl'",[room.id,prevSeason])).rows;
  const cups={};
  for(const lg of E.LEAGUES){
   const [c]=(await db.query("SELECT champion FROM competitions WHERE room_id=$1 AND season=$2 AND kind='cup' AND league_key=$3",[room.id,prevSeason,lg.key])).rows;
   cups[lg.key]=c?.champion||null;
  }
  return {ucl:ucl?.champion||null,cups};
 }

 async function seedEurope(db,room){
  const tables=room.season>2026?await prevLeagueTables(db,room,room.season-1):null;
  // season default 2026 is first; also treat first snapshot season as 1st
  const first=!(tables);
  const champs=first?null:await prevChampions(db,room,room.season-1);
  const q=E.qualifyEurope({season:first?1:2,tables,uni,champions:champs});
  return q;
 }

 function cupSeedIds(leagueKey,tables,uniOvr){
  if(tables&&tables[leagueKey])return tables[leagueKey].slice().sort((a,b)=>a.pos-b.pos).map(x=>x.club_id);
  return uni.prepare('SELECT club_id FROM lib_clubs WHERE league_key=? ORDER BY ovr11 DESC, name').all(leagueKey).map(x=>x.club_id);
 }

 // ---------- iniciar temporada ----------
 app.post('/api/rooms/:code/season/start',auth,wrap(async(r,s)=>{const room=await member(r);ownerOnly(room,r);if(!r.body?.confirm&&room.status==='lobby'){const ms=await q('SELECT club_id FROM room_managers WHERE room_id=$1 AND club_id IS NOT NULL',[room.id]);if(ms.length&&!ms.some(m=>!LIB.has(m.club_id))&&app.locals.canStart)await app.locals.canStart(room);throw fail('Confirme o início da temporada (punições da pré-temporada serão aplicadas)');}s.json(await startSeason(room));}));

 async function startSeason(room){if(room.status!=='lobby')throw fail('Temporada já iniciada');
  const ms=await q('SELECT club_id FROM room_managers WHERE room_id=$1 AND club_id IS NOT NULL',[room.id]);if(!ms.length)throw fail('Atribua pelo menos um clube a um técnico');
  if(ms.some(m=>!LIB.has(m.club_id)))throw fail('Todos os técnicos precisam escolher um dos '+E.CLUBS.length+' clubes do Europa 3 Ligas ZC');
  if(app.locals.canStart)await app.locals.canStart(room);
  const c=await pool.connect();let pen=[],ai=0;
  try{await c.query('BEGIN');await c.query('SELECT id FROM rooms WHERE id=$1 FOR UPDATE',[room.id]);
   if(M){ai=await M.preseasonAI(c,room);if(!AGZ.AG.penalty_at_market_close)pen=await M.applyPenalties(c,room);}
   const avg=await ovr18Map(c,room.id);
   const byL=clubsByLeague();
   const nat=C.nationalSchedules(byL,avg,20261026+((+room.season||2026)-2026));
   const prevT=await prevLeagueTables(c,room,room.season-1);
   const champs=prevT?await prevChampions(c,room,room.season-1):null;
   const eu=E.qualifyEurope({season:prevT?2:1,tables:prevT,uni,champions:champs});
   const uclSched=C.europeLeaguePhase(eu.ucl);
   const elSched=C.europeLeaguePhase(eu.el);
   const cupSeeds={};for(const lg of E.LEAGUES)cupSeeds[lg.key]=cupSeedIds(lg.key,prevT);
   async function mkComp(kind,name,rounds,league_key){
    const {rows:[comp]}=await c.query('INSERT INTO competitions(room_id,season,league_id,name,rounds_total,kind,league_key) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[room.id,room.season,null,name,rounds,kind,league_key||null]);
    return comp;
   }
   const comps={};
   for(const lg of E.LEAGUES){
    comps['league_'+lg.key]=await mkComp('league',lg.name,38,lg.key);
    const rounds=nat[lg.key];
    const vals=[];rounds.forEach((g,i)=>g.forEach(([h,a])=>vals.push([comps['league_'+lg.key].id,i+1,h,a,'league',0,null,false])));
    await insertMatches(c,vals);
    comps['cup_'+lg.key]=await mkComp('cup',lg.cup,10,lg.key);
    const prelim=C.twoLegs(C.cupPairsPrelim(cupSeeds[lg.key]),0,true);
    await insertMatches(c,prelim.ida.map(g=>[comps['cup_'+lg.key].id,1,g.home,g.away,'prelim',1,g.tie,false]));
    await insertMatches(c,prelim.volta.map(g=>[comps['cup_'+lg.key].id,2,g.home,g.away,'prelim',2,g.tie,false]));
   }
   comps.ucl=await mkComp('ucl','Champions League',13,null);
   comps.el=await mkComp('el','Europa League',13,null);
   const pack=(compId,sched)=>sched.flatMap((g,i)=>g.map(([h,a])=>[compId,i+1,h,a,'league',0,null,false]));
   await insertMatches(c,pack(comps.ucl.id,uclSched));
   await insertMatches(c,pack(comps.el.id,elSched));
   const fx={leagues:nat,ucl:eu.ucl,el:eu.el,cupSeeds};
   await c.query("UPDATE rooms SET status='season',current_matchday=0,fixtures=$2,version=version+1 WHERE id=$1",[room.id,JSON.stringify(fx)]);
   await c.query('UPDATE room_managers SET ready=false WHERE room_id=$1',[room.id]);
   if(M)await M.onStart(c,{...room,status:'season'});
   await c.query('COMMIT');
  }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
  await bump(room.id,`Temporada ${room.season}/${room.season+1} iniciada! Clubes travados.`);
  return {ok:1,ai_signings:ai,penalties:pen,matchdays:C.TOTAL_MD};
 }

 async function insertMatches(c,vals){
  if(!vals.length)return;
  await c.query('INSERT INTO matches(comp_id,round,home,away,stage,leg,tie,neutral) SELECT * FROM unnest($1::int[],$2::int[],$3::int[],$4::int[],$5::text[],$6::int[],$7::int[],$8::boolean[])',
   [vals.map(v=>v[0]),vals.map(v=>v[1]),vals.map(v=>v[2]),vals.map(v=>v[3]),vals.map(v=>v[4]),vals.map(v=>v[5]),vals.map(v=>v[6]),vals.map(v=>v[7])]);
 }

 // ---------- calendário ----------
 async function fixturesPreview(room){
  if(room.fixtures)return room.fixtures;
  const avg=await ovr18Map(pool,room.id);
  const byL=clubsByLeague();
  const nat=C.nationalSchedules(byL,avg,20261026+((+room.season||2026)-2026));
  const prevT=await prevLeagueTables(pool,room,room.season-1);
  const champs=prevT?await prevChampions(pool,room,room.season-1):null;
  const eu=E.qualifyEurope({season:prevT?2:1,tables:prevT,uni,champions:champs});
  const fx={leagues:nat,ucl:eu.ucl,el:eu.el,cupSeeds:{}};
  for(const lg of E.LEAGUES)fx.cupSeeds[lg.key]=cupSeedIds(lg.key,prevT);
  await q('UPDATE rooms SET fixtures=$2,version=version+1 WHERE id=$1 AND fixtures IS NULL',[room.id,JSON.stringify(fx)]);
  return (await q('SELECT fixtures FROM rooms WHERE id=$1',[room.id]))[0].fixtures||fx;
 }

 app.get('/api/rooms/:code/zc/fixtures',auth,wrap(async(r,s)=>{
  const room=await member(r);
  const fx=room.status==='lobby'?await fixturesPreview(room):(room.fixtures||{});
  const byId=Object.fromEntries(E.CLUBS.map(id=>[id,club(id)?.name]));
  const gamesFor=step=>{
   const out=[];
   const push=(home,away,extra={})=>out.push({home,away,home_name:byId[home]||club(home)?.name,away_name:byId[away]||club(away)?.name,...extra});
   if(step.kind==='league'){for(const lg of E.LEAGUES){const rnd=(fx.leagues||{})[lg.key];const g=rnd&&rnd[step.round-1];if(g)for(const [h,a] of g)push(h,a,{comp:lg.name,league_key:lg.key});}}
   return out;
  };
  s.json({status:room.status,current_matchday:room.current_matchday||0,total:C.TOTAL_MD,mid:C.MID_MD,
   rounds:C.PLAN.map(st=>({round:st.matchday,kind:st.kind,stage:st.stage||(st.kind==='league'||st.kind==='europe_lp'?'league':st.stage),leg:st.leg||0,label:st.label,at:AGZ.slotAt(st.matchday),win:st.mid_after?{stage:'mid',...((AGZ.AG.windows||{}).mid||{})}:st.matchday===C.TOTAL_MD?{stage:'end',...((AGZ.AG.windows||{}).end||{})}:null,games:gamesFor(st)}))});
 }));

 // Agenda automática
 let agBusy=false;
 async function agendaJogos(){if(agBusy||AGZ.AG.paused)return;
  agBusy=true;try{const [room]=await q('SELECT * FROM rooms WHERE code=$1',[AGZ.AG.room||'LIGA']);if(!room)return;const now=Date.now();
  if(room.status==='lobby'){if(!room.fixtures)await fixturesPreview(room);const t=AGZ.slotAt(1);if(t&&now>=Date.parse(t)-10*60e3){try{await startSeason(room);console.log('agenda: temporada iniciada');}catch(e){console.error('agenda start',e.message);}}return;}
  if(room.status!=='season')return;
  const next=(room.current_matchday||0)+1;const t=AGZ.slotAt(next);
  if(next<=C.TOTAL_MD&&t&&now>=Date.parse(t)){try{await advance(room.id,'Agenda automática');console.log('agenda: jornada',next);}catch(e){console.error('agenda jornada',e.message);}}
 }catch(e){console.error('agendaJogos',e.message)}finally{agBusy=false}}
 setInterval(agendaJogos,20000);setTimeout(agendaJogos,8000);

 app.get('/api/rooms/:code/season',auth,wrap(async(r,s)=>{const room=await member(r);const comps=await q('SELECT * FROM competitions WHERE room_id=$1 AND season=$2 ORDER BY id',[room.id,room.season]);
  const mans=await q('SELECT m.user_id,u.nick,m.club_id,m.ready FROM room_managers m JOIN users u ON u.id=m.user_id WHERE room_id=$1',[room.id]);const me=mans.find(m=>m.user_id===r.user.id);
  s.json({status:room.status,season:room.season,current_matchday:room.current_matchday||0,total_matchdays:C.TOTAL_MD,owner:room.owner_id===r.user.id||!!r.user.admin,competitions:comps,my_comp:comps.find(x=>x.kind==='league'&&libRow(me?.club_id)?.league_key===x.league_key)?.id||comps[0]?.id||null,my_club:me?.club_id??null,managers:mans.map(m=>({...m,club:m.club_id&&club(m.club_id).name}))});}));

 app.get('/api/rooms/:code/player/:pid/notas',auth,wrap(async(r,s)=>{const room=await member(r);const pid=String(+r.params.pid);const comps=await q('SELECT id FROM competitions WHERE room_id=$1 AND season=$2',[room.id,room.season]);
  const ids=comps.map(x=>x.id);if(!ids.length)return s.json({apps:0,avg:null,last:[]});
  const ps=await q(`SELECT coalesce(sum(apps),0) apps,coalesce(sum(goals),0) goals,coalesce(sum(assists),0) assists,coalesce(sum(rating_sum),0) rating_sum FROM player_stats WHERE player_id=$1 AND comp_id=ANY($2::int[])`,[+pid,ids]);
  const last=(await q(`SELECT m.id,m.round,m.home,m.away,m.hg,m.ag,(m.details->'ratings'->>$2)::real nota,(m.details->>'motm')=$2 motm,c.name comp FROM matches m JOIN competitions c ON c.id=m.comp_id WHERE c.room_id=$3 AND c.season=$4 AND m.played AND m.details->'ratings' ? $2 ORDER BY m.round DESC,m.id DESC LIMIT 5`,[null,pid,room.id,room.season])).map(x=>({...x,home_name:club(x.home)?.name,away_name:club(x.away)?.name}));
  const [ev]=await q('SELECT overall,ovr_start FROM room_players WHERE room_id=$1 AND player_id=$2',[room.id,+pid]);
  const row=ps[0]||{};s.json({apps:+row.apps||0,goals:+row.goals||0,assists:+row.assists||0,avg:row.apps?+(row.rating_sum/row.apps).toFixed(2):null,last,evo:ev&&ev.ovr_start!=null?{start:ev.ovr_start,now:ev.overall}:null});}));

 app.use('/api/rooms/:code/comp/:id',(r,s,n)=>/^\d+$/.test(r.params.id)?n():s.status(404).json({error:'Competição não encontrada'}));

 app.get('/api/rooms/:code/comp/:id/table',auth,wrap(async(r,s)=>{const room=await member(r);const [comp]=await q('SELECT * FROM competitions WHERE id=$1 AND room_id=$2',[r.params.id,room.id]);if(!comp)throw fail('Competição não encontrada',404);
  const view=r.query.view;const t1=19,lr=comp.kind==='league'?38:(comp.kind==='ucl'||comp.kind==='el'?8:0);
  const opts={};if(view==='home')opts.side='home';if(view==='away')opts.side='away';if(view==='turno1'){opts.roundFrom=1;opts.roundTo=t1;}if(view==='turno2'){opts.roundFrom=t1+1;opts.roundTo=lr;}
  if(comp.kind==='league')opts.zones=true,opts.zoneFn=E.leagueZone;
  const ids=comp.league_key?clubsByLeague()[comp.league_key]:(await q("SELECT DISTINCT home id FROM matches WHERE comp_id=$1 AND stage='league' UNION SELECT DISTINCT away FROM matches WHERE comp_id=$1 AND stage='league'",[comp.id])).map(x=>x.id);
  const ms=await q("SELECT * FROM matches WHERE comp_id=$1 AND stage='league'",[comp.id]);
  const rows=E.standings(ms,ids,id=>club(id).name,await penMap(pool,room.id),opts);
  s.json({comp,rows,view:['home','away','turno1','turno2'].includes(view)?view:'geral',meta:{league_rounds:lr,turno1_end:t1,turno1:`1–${t1}`,turno2:`${t1+1}–${lr}`}});}));

 app.get('/api/rooms/:code/comp/:id/fixtures',auth,wrap(async(r,s)=>{const room=await member(r);const [comp]=await q('SELECT * FROM competitions WHERE id=$1 AND room_id=$2',[r.params.id,room.id]);if(!comp)throw fail('Competição não encontrada',404);
  const round=+r.query.round||Math.max(1,comp.current_round||1);
  const ms=await q('SELECT id,round,home,away,hg,ag,played,stage,leg,tie,winner,pens,neutral FROM matches WHERE comp_id=$1 AND round=$2 ORDER BY tie NULLS LAST,id',[comp.id,round]);
  const hum=new Map((await q('SELECT m.club_id,u.nick FROM room_managers m JOIN users u ON u.id=m.user_id WHERE room_id=$1',[room.id])).map(x=>[x.club_id,x.nick]));
  s.json({comp,round,plan:C.PLAN,stages:E.STAGE_NAMES,matches:ms.map(m=>({...m,home_name:club(m.home).name,away_name:club(m.away).name,home_mgr:hum.get(m.home)||null,away_mgr:hum.get(m.away)||null}))});}));

 app.get('/api/rooms/:code/comp/:id/scorers',auth,wrap(async(r,s)=>{const room=await member(r);const [comp]=await q('SELECT id FROM competitions WHERE id=$1 AND room_id=$2',[r.params.id,room.id]);if(!comp)throw fail('Competição não encontrada',404);
  const name=id=>vname(id)||uni.prepare('SELECT name,primary_position FROM players WHERE id=?').get(id)||{};
  const CUR=new Map((await q('SELECT player_id,club_id FROM room_players WHERE room_id=$1 AND club_id IS NOT NULL',[room.id])).map(y=>[+y.player_id,+y.club_id]));const curClub=id=>CUR.get(+id)??uni.prepare('SELECT club_id FROM players WHERE id=?').get(+id)?.club_id;
  const fmt=x=>({...x,...name(x.player_id),club:club(curClub(x.player_id)??x.club_id)?.name,rating:x.apps?+(x.rating_sum/x.apps).toFixed(2):null});
  s.json({goals:(await q('SELECT * FROM player_stats WHERE comp_id=$1 AND goals>0 ORDER BY goals DESC,assists DESC LIMIT 30',[comp.id])).map(fmt),
   assists:(await q('SELECT * FROM player_stats WHERE comp_id=$1 AND assists>0 ORDER BY assists DESC,goals DESC LIMIT 30',[comp.id])).map(fmt),
   ratings:(await q('SELECT * FROM player_stats WHERE comp_id=$1 AND apps>=GREATEST(1,(SELECT max(apps) FROM player_stats WHERE comp_id=$1)/2) ORDER BY rating_sum/apps DESC LIMIT 30',[comp.id])).map(fmt)});}));

 app.get('/api/rooms/:code/match/:id',auth,wrap(async(r,s)=>{const room=await member(r);const [m]=await q('SELECT m.* FROM matches m JOIN competitions c ON c.id=m.comp_id WHERE m.id=$1 AND c.room_id=$2',[r.params.id,room.id]);if(!m)throw fail('Jogo não encontrado',404);
  const out={...m,home_name:club(m.home).name,away_name:club(m.away).name,stage_name:E.STAGE_NAMES[m.stage]};
  if(!m.played){const side=async cid=>S.teamStrength(await xiFor(pool,room.id,cid));
   out.strength={home:await side(m.home),away:await side(m.away)};out.strength_live=true;}
  s.json(out);}));

 app.get('/api/rooms/:code/comp/:id/bracket',auth,wrap(async(r,s)=>{const room=await member(r);const [comp]=await q('SELECT * FROM competitions WHERE id=$1 AND room_id=$2',[r.params.id,room.id]);if(!comp)throw fail('Competição não encontrada',404);
  const ms=await q("SELECT id,round,home,away,hg,ag,played,stage,leg,tie,winner,pens,neutral FROM matches WHERE comp_id=$1 AND stage<>'league' ORDER BY round,tie",[comp.id]);
  const st={};for(const m of ms){const k=m.stage;(st[k]??={name:E.STAGE_NAMES[k],ties:{}});const t=st[k].ties[m.tie]??={tie:m.tie,legs:[]};t.legs.push({...m,home_name:club(m.home).name,away_name:club(m.away).name});if(m.winner){t.winner=m.winner;t.winner_name=club(m.winner).name;t.pens=m.pens;}}
  s.json({comp,cfg:E.CFG,champion:comp.champion?club(comp.champion).name:null,stages:Object.entries(st).map(([k,v])=>({key:k,name:v.name,ties:Object.values(v.ties)}))});}));

 const KIT=require('./kit');
 app.get('/api/rooms/:code/lineup',auth,wrap(async(r,s)=>{const room=await member(r);const [me]=await q('SELECT club_id FROM room_managers WHERE room_id=$1 AND user_id=$2',[room.id,r.user.id]);if(!me.club_id)throw fail('Escolha um clube');
  const sq=await squad(pool,room.id,me.club_id);const x=await xiFor(pool,room.id,me.club_id);
  const TT=require('./tactics');const lu=TT.lineup(x.xi,x.formation,x.slotted);
  const clubName=(typeof club==='function'&&club(me.club_id)?.name)||null;
  const kitd=await KIT.enrich(q,room.id,me.club_id,clubName,sq);
  let evo={};try{const ev=await q('SELECT player_id,ovr_start,overall FROM room_players WHERE room_id=$1 AND player_id=ANY($2::int[])',[room.id,sq.map(p=>p.id)]);
   for(const row of ev){if(row.ovr_start!=null&&+row.overall>+row.ovr_start)evo[row.player_id]={dir:1,from:+row.ovr_start,overall:+row.overall};}}catch(e){}
  s.json({formations:Object.keys(S.FORMATIONS),slots:TT.FORMS,tac_catalog:TT.TAC,formation:x.formation,custom:x.custom,tactics:x.tactics||TT.DEF_TAC,takers:TT.takers(x.xi,x.takers||{}),starters:lu.map(z=>z.p.id),placed:lu.map(z=>({id:z.p.id,slot:z.slot,x:z.x,y:z.y,fit:+z.fit.toFixed(2)})),sector_fit:TT.sectorFit(lu),strength:S.teamStrength(x),
   kit:kitd.kit,
   squad:sq.map(p=>({id:p.id,name:p.name,primary_position:p.primary_position,positions:p.positions||[],overall:p.overall,potential:p.potential,age:p.age,market_value:p.market_value,sector:S.sec(p),shielded:!!p.shielded,listed:!!p.listed,virtual:!!p.virtual,number:kitd.numbers[p.id]||null,evo:evo[p.id]||null})).sort((a,b)=>b.overall-a.overall)});}));
 app.post('/api/rooms/:code/lineup',auth,wrap(async(r,s)=>{const room=await member(r);app.locals.zcOvCacheClear?.(room.id);const [me]=await q('SELECT club_id FROM room_managers WHERE room_id=$1 AND user_id=$2',[room.id,r.user.id]);if(!me.club_id)throw fail('Escolha um clube');
  const f=r.body?.formation;if(!S.FORMATIONS[f])throw fail('Formação inválida');let st=null;
  if(!r.body.auto){st=[...new Set((r.body.starters||[]).map(Number))];if(st.length!==11)throw fail('Escolha exatamente 11 titulares');const ids=new Set((await squad(pool,room.id,me.club_id)).map(p=>p.id));if(st.some(i=>!ids.has(i)))throw fail('Jogador fora do elenco');}
  const TT=require('./tactics');const tac=TT.norm(r.body?.tactics);const tk={};for(const k of ['fk','ck','pk','cap'])if(r.body?.takers?.[k])tk[k]=+r.body.takers[k];
  await q('INSERT INTO lineups(room_id,club_id,formation,starters,tactics,takers,slotted) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(room_id,club_id) DO UPDATE SET formation=$3,starters=$4,tactics=$5,takers=$6,slotted=$7',[room.id,me.club_id,f,st,tac,tk,!!r.body?.slotted&&!r.body.auto]);s.json({ok:1});}));

 app.post('/api/rooms/:code/ready',auth,wrap(async(r,s)=>{const room=await member(r);await q('UPDATE room_managers SET ready=NOT ready WHERE room_id=$1 AND user_id=$2',[room.id,r.user.id]);
  const mans=await q('SELECT ready FROM room_managers WHERE room_id=$1 AND club_id IS NOT NULL',[room.id]);await q('UPDATE rooms SET version=version+1 WHERE id=$1',[room.id]);
  if(room.status==='season'&&mans.length&&mans.every(m=>m.ready))return s.json(await advance(room.id,'Todos prontos'));s.json({ok:1});}));
 app.post('/api/rooms/:code/advance',auth,wrap(async(r,s)=>{const room=await member(r);ownerOnly(room,r);s.json(await advance(room.id,'Dono da sala'));}));

 async function ensureKo(c,room,step,comps){
  if(step.kind==='cup'&&step.stage!=='prelim'){
   for(const lg of E.LEAGUES){
    const comp=comps.find(x=>x.kind==='cup'&&x.league_key===lg.key);if(!comp)continue;
    const [ex]=(await c.query("SELECT 1 FROM matches WHERE comp_id=$1 AND stage=$2 LIMIT 1",[comp.id,step.stage])).rows;
    if(ex)continue;
    const seeds=(room.fixtures?.cupSeeds||{})[lg.key]||cupSeedIds(lg.key,null);
    let pairs;
    if(step.stage==='r16'){
     const prev=(await c.query("SELECT * FROM matches WHERE comp_id=$1 AND stage='prelim' AND played",[comp.id])).rows;
     const w=[];for(let tie=0;tie<4;tie++){const legs=prev.filter(m=>m.tie===tie);const won=legs.find(m=>m.winner);if(!won)return;w[tie]=won.winner;}
     pairs=C.cupPairsR16(seeds,w);
    }else{
     const from=step.stage==='qf'?'r16':step.stage==='sf'?'qf':'sf';
     const prev=(await c.query("SELECT * FROM matches WHERE comp_id=$1 AND stage=$2 AND winner IS NOT NULL",[comp.id,from])).rows;
     const w=prev.filter(m=>m.leg===2||from==='final').sort((a,b)=>a.tie-b.tie).map(m=>m.winner);
     if(step.stage==='final'&&w.length===2)pairs=[[w[0],w[1]]];
     else if(w.length>=2&&w.length%2===0){pairs=[];for(let i=0;i<w.length;i+=2)pairs.push([w[i],w[i+1]]);}
     else return;
    }
    const legs=C.twoLegs(pairs,0,true);
    const r1=({r16:3,qf:5,sf:7,final:9})[step.stage];
    const cupFinalTwo=step.stage==='final'&&E.CFG.CUP_FINAL_TWO_LEGS;
    if(step.stage==='final'&&!cupFinalTwo){
     await insertMatches(c,[{...legs.ida[0],home:pairs[0][0],away:pairs[0][1]}].map(g=>[comp.id,r1,pairs[0][0],pairs[0][1],'final',1,0,true]));
    }else{
     await insertMatches(c,legs.ida.map(g=>[comp.id,r1,g.home,g.away,step.stage,1,g.tie,false]));
     await insertMatches(c,legs.volta.map(g=>[comp.id,r1+1,g.home,g.away,step.stage,2,g.tie,false]));
    }
   }
  }
  if(step.kind==='europe_ko'){
   for(const kind of ['ucl','el']){
    const comp=comps.find(x=>x.kind===kind);if(!comp)continue;
    const [ex]=(await c.query("SELECT 1 FROM matches WHERE comp_id=$1 AND stage=$2 LIMIT 1",[comp.id,step.stage])).rows;
    if(ex)continue;
    const rnd={playoff:[9,10],r16:[11,12],qf:[13,14],sf:[15,16],final:[17,17]};
    const [r1,r2]=rnd[step.stage]||[0,0];
    if(step.stage==='playoff'){
     const ms=(await c.query("SELECT * FROM matches WHERE comp_id=$1 AND played AND stage='league'",[comp.id])).rows;
     const ids=[...new Set(ms.flatMap(m=>[m.home,m.away]))];
     const tb=E.standings(ms,ids,id=>club(id).name);
     if(tb.length<24)return;
     const pairs=C.europePlayoffPairs(tb.map(t=>t.club_id));
     const legs=C.twoLegs(pairs,0,true);
     await insertMatches(c,legs.ida.map(g=>[comp.id,r1,g.home,g.away,'playoff',1,g.tie,false]));
     await insertMatches(c,legs.volta.map(g=>[comp.id,r2,g.home,g.away,'playoff',2,g.tie,false]));
    }else if(step.stage==='r16'){
     const ms=(await c.query("SELECT * FROM matches WHERE comp_id=$1 AND played AND stage='league'",[comp.id])).rows;
     const ids=[...new Set(ms.flatMap(m=>[m.home,m.away]))];
     const top=E.standings(ms,ids,id=>club(id).name).slice(0,8).map(t=>t.club_id);
     const prev=(await c.query("SELECT * FROM matches WHERE comp_id=$1 AND stage='playoff' AND winner IS NOT NULL",[comp.id])).rows;
     const w=prev.filter(m=>m.leg===2).sort((a,b)=>a.tie-b.tie).map(m=>m.winner);
     if(top.length<8||w.length<8)return;
     const pairs=C.europeR16Pairs(top,w);
     const legs=C.twoLegs(pairs,0,true);
     await insertMatches(c,legs.ida.map(g=>[comp.id,r1,g.home,g.away,'r16',1,g.tie,false]));
     await insertMatches(c,legs.volta.map(g=>[comp.id,r2,g.home,g.away,'r16',2,g.tie,false]));
    }else if(step.stage==='qf'){
     const prev=(await c.query("SELECT * FROM matches WHERE comp_id=$1 AND stage='r16' AND winner IS NOT NULL",[comp.id])).rows;
     const w=prev.filter(m=>m.leg===2).sort((a,b)=>a.tie-b.tie).map(m=>m.winner);
     if(w.length<8)return;
     const pairs=C.europeQfPairs(w);
     const legs=C.twoLegs(pairs,0,true);
     await insertMatches(c,legs.ida.map(g=>[comp.id,r1,g.home,g.away,'qf',1,g.tie,false]));
     await insertMatches(c,legs.volta.map(g=>[comp.id,r2,g.home,g.away,'qf',2,g.tie,false]));
    }else if(step.stage==='sf'){
     const prev=(await c.query("SELECT * FROM matches WHERE comp_id=$1 AND stage='qf' AND winner IS NOT NULL",[comp.id])).rows;
     const w=prev.filter(m=>m.leg===2).sort((a,b)=>a.tie-b.tie).map(m=>m.winner);
     if(w.length!==4)return;
     const pairs=[[w[0],w[1]],[w[2],w[3]]];
     const legs=C.twoLegs(pairs,0,true);
     await insertMatches(c,legs.ida.map(g=>[comp.id,r1,g.home,g.away,'sf',1,g.tie,false]));
     await insertMatches(c,legs.volta.map(g=>[comp.id,r2,g.home,g.away,'sf',2,g.tie,false]));
    }else if(step.stage==='final'){
     const prev=(await c.query("SELECT * FROM matches WHERE comp_id=$1 AND stage='sf' AND winner IS NOT NULL",[comp.id])).rows;
     const w=prev.filter(m=>m.leg===2).sort((a,b)=>a.tie-b.tie).map(m=>m.winner);
     if(w.length===2)await insertMatches(c,[[comp.id,r1,w[0],w[1],'final',1,0,true]]);
    }
   }
  }
 }

 async function advance(roomId,why){const c=await pool.connect();const out=[];let md=0;
  try{await c.query('BEGIN');const {rows:[room]}=await c.query('SELECT * FROM rooms WHERE id=$1 FOR UPDATE',[roomId]);if(room.status!=='season')throw fail('A temporada não está em andamento');
   md=(room.current_matchday||0)+1;const step=C.PLAN[md-1];if(!step)throw fail('Temporada encerrada');
   const comps=(await c.query('SELECT * FROM competitions WHERE room_id=$1 AND season=$2 ORDER BY id',[roomId,room.season])).rows;
   for(const h of (app.locals.beforeRound||[]))await h(c,room);
   if(M&&!(room.mkt_state==='market'&&app.locals.zcMarketOkDuring?.(room))){try{await c.query('SAVEPOINT mb');await M.before(c,room);await c.query('RELEASE SAVEPOINT mb');}catch(e){await c.query('ROLLBACK TO SAVEPOINT mb');console.error('agenda: mercado antes da jornada falhou, jornada segue:',e.message);}}
   const hum=new Map((await c.query('SELECT m.club_id,u.nick FROM room_managers m JOIN users u ON u.id=m.user_id WHERE room_id=$1',[roomId])).rows.map(x=>[x.club_id,x.nick]));
   if(room.fixtures&&typeof room.fixtures==='string')try{room.fixtures=JSON.parse(room.fixtures);}catch(e){}
   await ensureKo(c,room,step,comps);
   const targets=[];
   if(step.kind==='league'){for(const lg of E.LEAGUES){const comp=comps.find(x=>x.kind==='league'&&x.league_key===lg.key);if(comp)targets.push({comp,round:step.round,stage:'league',leg:0});}}
   if(step.kind==='europe_lp'){for(const kind of ['ucl','el']){const comp=comps.find(x=>x.kind===kind);if(comp)targets.push({comp,round:step.round,stage:'league',leg:0});}}
   if(step.kind==='cup'){for(const lg of E.LEAGUES){const comp=comps.find(x=>x.kind==='cup'&&x.league_key===lg.key);if(comp)targets.push({comp,round:null,stage:step.stage,leg:step.leg});}}
   if(step.kind==='europe_ko'){for(const kind of ['ucl','el']){const comp=comps.find(x=>x.kind===kind);if(comp)targets.push({comp,round:null,stage:step.stage,leg:step.leg});}}

   for(const t of targets){
    const ms=t.round!=null?(await c.query('SELECT * FROM matches WHERE comp_id=$1 AND round=$2',[t.comp.id,t.round])).rows
     :(await c.query('SELECT * FROM matches WHERE comp_id=$1 AND stage=$2 AND leg=$3',[t.comp.id,t.stage,t.leg])).rows;
    const prev=(await c.query("SELECT * FROM matches WHERE comp_id=$1 AND played AND stage='league' ORDER BY round,id",[t.comp.id])).rows;
    const ids=[...new Set(prev.flatMap(m=>[m.home,m.away]))];
    const table=ids.length?E.standings(prev,ids,id=>club(id).name,await penMap(c,roomId)):[];
    const rank=new Map(table.map(x=>[x.club_id,x.pos]));
    for(const m of ms){
     if(m.played)continue;
     const H={club_id:m.home,...await xiFor(c,roomId,m.home),form:await form(c,t.comp.id,m.home)},A={club_id:m.away,...await xiFor(c,roomId,m.away),form:await form(c,t.comp.id,m.away)};H.alt=0;A.alt=0;H.bench=[];A.bench=[];H.neutral=!!m.neutral;
     const res=S.playMatch(H,A);let tie=null;
     if(m.stage!=='league'){
      const two=m.stage==='final'?(t.comp.kind==='cup'?E.CFG.CUP_FINAL_TWO_LEGS:!E.CFG.FINAL_SINGLE):true;
      const decisive=!two||m.leg===2;
      if(decisive){const legs=(await c.query('SELECT * FROM matches WHERE comp_id=$1 AND stage=$2 AND tie=$3 AND played',[t.comp.id,m.stage,m.tie])).rows;tie=E.decideTie([...legs,{...m,hg:res.hg,ag:res.ag}],{...m,hg:res.hg,ag:res.ag});if(legs.length===0)tie.agg=null;}
     }
     const rz=resenha(m,res,{hn:club(m.home).name,an:club(m.away).name,stage:(E.STAGE_NAMES[m.stage]||m.stage)+(m.leg?` (${m.leg===1?'ida':m.leg===2?'volta':'jogo único'})`:` – rodada ${m.round}`),agg:tie?.agg,pens:tie?.pens,rankH:m.stage==='league'&&prev.length?rank.get(m.home):null,rankA:m.stage==='league'&&prev.length?rank.get(m.away):null});
     if(tie){await c.query('UPDATE matches SET winner=$2,pens=$3 WHERE id=$1',[m.id,tie.winner,tie.pens]);if(m.stage==='final'){await c.query('UPDATE competitions SET champion=$2 WHERE id=$1',[t.comp.id,tie.winner]);out.push({info:`🏆 ${club(tie.winner).name} é campeão da ${t.comp.name}!`});}}
     const MI=require('./matchinfo').matchInfo(m,res,club(m.home).name,club(m.away).name);const details={rv:2,resenha:rz,team_stats:MI.stats,lances:MI.lances,xg:res.xg,strength:res.strength,events:res.events,ratings:res.ratings,pstats:res.pstats,motm:res.motm,subs:res.subs,lineups:res.lineups,formation:{home:H.formation,away:A.formation},tac:res.tac,fx:res.fx,form:{home:H.form,away:A.form}};
     await c.query('UPDATE matches SET hg=$2,ag=$3,played=true,details=$4 WHERE id=$1',[m.id,res.hg,res.ag,details]);
     const pl=res.appeared||[...H.xi.map(p=>[p,m.home]),...A.xi.map(p=>[p,m.away])];
     await c.query(`INSERT INTO player_stats(comp_id,player_id,club_id,apps,goals,assists,rating_sum) SELECT $1,* FROM unnest($2::int[],$3::int[],$4::int[],$5::int[],$6::int[],$7::real[]) ON CONFLICT(comp_id,player_id) DO UPDATE SET apps=player_stats.apps+1,goals=player_stats.goals+EXCLUDED.goals,assists=player_stats.assists+EXCLUDED.assists,rating_sum=player_stats.rating_sum+EXCLUDED.rating_sum,club_id=EXCLUDED.club_id`,
      [t.comp.id,pl.map(x=>x[0].id),pl.map(x=>x[1]),pl.map(()=>1),pl.map(x=>res.goalsBy[x[0].id].g),pl.map(x=>res.goalsBy[x[0].id].a),pl.map(x=>res.ratings[x[0].id])]);
     if(hum.has(m.home)||hum.has(m.away))out.push({id:m.id,comp:t.comp.name,round:md,home:club(m.home).name,away:club(m.away).name,hg:res.hg,ag:res.ag,pens:tie?.pens||null});
    }
    const newRound=t.round||(step.kind==='cup'?({prelim:step.leg,r16:2+step.leg,qf:4+step.leg,sf:6+step.leg,final:8+step.leg})[step.stage]:t.comp.current_round+1);
    await c.query('UPDATE competitions SET current_round=GREATEST(current_round,$2) WHERE id=$1',[t.comp.id,newRound]);
   }
   // hook global uma vez (premiação, empréstimos, janelas)
   for(const h of (app.locals.afterRound||[]))out.push(...((await h(c,room,{id:null,current_round:md,name:step.label},step))||[]));
   if(M)await M.after(c,room);
   await c.query('UPDATE room_managers SET ready=false WHERE room_id=$1',[roomId]);
   await c.query('UPDATE rooms SET current_matchday=$2,version=version+1 WHERE id=$1',[roomId,md]);
   if(md>=C.TOTAL_MD)await c.query("UPDATE rooms SET status='finished' WHERE id=$1",[roomId]);
   await c.query('INSERT INTO room_events(room_id,text) VALUES($1,$2)',[roomId,`Jornada ${md}/${C.TOTAL_MD} simulada (${why}): `+(out.map(o=>o.info||`${o.home} ${o.hg}x${o.ag} ${o.away}${o.pens?` (pên. ${o.pens})`:''}`).join(' · ')||step.label)]);
   await c.query('COMMIT');}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
  return {ok:1,results:out,matchday:md,total:C.TOTAL_MD};
 }
};
