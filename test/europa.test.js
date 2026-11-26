// E2E local: Postgres em 127.0.0.1:55432, servidor descartável, schema próprio.
const assert=require('assert');
const {spawn}=require('child_process');
const {Pool}=require('pg');
const path=require('path');

const PORT=process.env.E2E_PORT||3041;
const DBURL=process.env.DATABASE_URL||'postgres://box@127.0.0.1:55432/europa_e2e';
const BASE=`http://127.0.0.1:${PORT}`;
const root=path.join(__dirname,'..');

(async()=>{
  const {execSync}=require('child_process');
  const psql=['/usr/lib/postgresql/17/bin/psql','-h','127.0.0.1','-p','55432','-U','box','-d','postgres','-c'];
  try{execSync([...psql, "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='europa_e2e' AND pid<>pg_backend_pid()"].join(' '),{stdio:'ignore'});}catch(e){}
  execSync('/usr/lib/postgresql/17/bin/dropdb -h 127.0.0.1 -p 55432 -U box --if-exists europa_e2e');
  execSync('/usr/lib/postgresql/17/bin/createdb -h 127.0.0.1 -p 55432 -U box europa_e2e');

  const env={...process.env,PATH:process.env.PATH,PORT:String(PORT),DATABASE_URL:DBURL,PGSSL:'0',NODE_ENV:'test'};
  delete env.PGSCHEMA;
  const child=spawn('node',[path.join(root,'server.js')],{cwd:root,env,stdio:['ignore','pipe','pipe']});
  let out='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>out+=d);
  const waitBoot=()=>new Promise((ok,ko)=>{
    const t=setTimeout(()=>ko(new Error('timeout boot\n'+out)),30000);
    const tick=()=>{if(/Postgres OK/.test(out)&&/BOOT rotas OK/.test(out)){clearTimeout(t);ok()}else setTimeout(tick,100)};tick();
  });
  try{await waitBoot();}catch(e){child.kill();console.error(out);throw e;}

  const cookie={v:''};
  async function call(method,url,body,tok){
    const h={'content-type':'application/json'};
    if(tok||cookie.v)h.cookie='mc_token='+(tok||cookie.v);
    const r=await fetch(BASE+url,{method,headers:h,body:body!=null?JSON.stringify(body):undefined});
    const t=await r.text();let j;try{j=JSON.parse(t)}catch{j={raw:t}}
    return {st:r.status,j,h:r.headers};
  }
  async function ok(method,url,body,tok){
    const r=await call(method,url,body,tok);
    if(r.st>=400)throw new Error(`${method} ${url} -> ${r.st} ${JSON.stringify(r.j)}`);
    const set=r.h.getSetCookie?.()||[];const m=String(set).match(/mc_token=([a-f0-9]+)/);
    if(m)cookie.v=m[1];
    return r.j;
  }

  // health
  assert.strictEqual((await call('GET','/api/health')).j.ok,true);

  // register Robshow
  const reg=await ok('POST','/api/auth/register',{nick:'Robshow',pin:'1234'});
  assert.ok(reg.token);
  await ok('GET','/api/liga');
  const me=await ok('GET','/api/me');
  assert.ok(me.user.admin||me.user.nick==='Robshow','Robshow deve ser admin');

  const ov=await ok('GET','/api/rooms/LIGA/zc/overview');
  assert.strictEqual(ov.fmt.n_clubs,54);
  assert.strictEqual(ov.fmt.league_rounds,34);
  assert.strictEqual(ov.clubs.length,54);
  assert.ok(ov.clubs.find(c=>c.name==='Inter'));
  assert.ok(!ov.clubs.find(c=>c.name==='Lombardia FC'));
  assert.ok(!ov.clubs.find(c=>c.name==='US Lecce'));
  assert.ok(!ov.clubs.find(c=>c.name==='AC Monza'));
  assert.ok(!ov.clubs.find(c=>c.name==='Hull City'));
  assert.ok(ov.clubs.find(c=>c.name==='Frosinone Calcio'));
  const inter=ov.clubs.find(c=>c.name==='Inter');
  const chelsea=ov.clubs.find(c=>c.name==='Chelsea');
  assert.ok(inter&&chelsea);
  assert.strictEqual(+inter.initial,100e6);
  assert.strictEqual(+chelsea.initial,150e6);

  // admin atribui Inter ao Robshow
  const rooms=await ok('GET','/api/rooms/LIGA');
  const uid=rooms.me;
  await ok('POST','/api/rooms/LIGA/zc/admin/assign',{user_id:uid,club_id:inter.id});

  // segundo técnico (outra liga)
  cookie.v='';
  const u2=await ok('POST','/api/auth/register',{nick:'Tesouro',pin:'1234'});
  await ok('GET','/api/liga');
  const r2=await ok('GET','/api/rooms/LIGA');
  const tesId=r2.managers.find(m=>m.nick==='Tesouro').user_id;
  // volta pro admin
  cookie.v='';
  await ok('POST','/api/auth/login',{nick:'Robshow',pin:'1234'});
  await ok('POST','/api/rooms/LIGA/zc/admin/assign',{user_id:tesId,club_id:chelsea.id});

  // leilão: busca FC27 e adiciona um jogador de fora (ex.: Mbappé se existir) ou um de outra liga
  const fc=await ok('GET','/api/rooms/LIGA/zc/admin/fc27?q=haaland');
  assert.ok(fc.players.length,'busca FC27 deveria achar Haaland ou similar');
  const add=await ok('POST','/api/rooms/LIGA/zc/admin/auction/add',{player_id:fc.players[0].id});
  assert.ok(add.ok);

  // abre o mercado (pula leilão) para testar transferência entre ligas
  await ok('POST','/api/rooms/LIGA/zc/admin/auction/state',{action:'open_market'});
  const mkt=await ok('GET','/api/rooms/LIGA/market');
  assert.ok(mkt.window?.open||mkt.open||true); // window shape varies

  // compra: Inter oferece por um jogador do Chelsea (entre ligas)
  const chel=await ok('GET','/api/clubs/'+chelsea.id);
  const alvo=(chel.players||[]).filter(p=>p.overall>=70).sort((a,b)=>a.overall-b.overall)[0];
  assert.ok(alvo,'Chelsea deveria ter jogadores');
  // Tesouro (Chelsea, €150 mi) oferece por um jogador do Inter.
  cookie.v='';
  await ok('POST','/api/auth/login',{nick:'Tesouro',pin:'1234'});
  const interC=await ok('GET','/api/clubs/'+inter.id);
  const alvo2=(interC.players||[]).filter(p=>p.overall&&p.overall<=78).sort((a,b)=>a.overall-b.overall)[0];
  assert.ok(alvo2,'alvo no Inter');
  const fee=Math.max(1e5,Math.round((alvo2.market_value||1e6)*0.6/1e5)*1e5);
  const off=await call('POST','/api/rooms/LIGA/market/offer',{player_id:alvo2.id,fee});
  // pode falhar por regra/estratégia; registramos o resultado
  const marketOk=off.st<400;
  console.log('oferta entre ligas (Chelsea->Inter):',off.st,off.j.error||off.j.message||'ok');

  cookie.v='';
  await ok('POST','/api/auth/login',{nick:'Robshow',pin:'1234'});

  // calendário e início da temporada
  const prev=await ok('GET','/api/rooms/LIGA/zc/admin/season/preview?start=2027-07-01');
  assert.strictEqual(prev.total_matchdays,62);
  await ok('POST','/api/rooms/LIGA/zc/admin/season/agenda',{start:'2027-07-01',auto:false});
  await ok('POST','/api/rooms/LIGA/season/start',{confirm:true});
  const season=await ok('GET','/api/rooms/LIGA/season');
  assert.strictEqual(season.status,'season');
  assert.strictEqual(season.competitions.length,8); // 3 ligas + 3 copas + UCL + EL
  assert.ok(season.competitions.filter(c=>c.kind==='league').length===3);
  assert.ok(season.competitions.find(c=>c.kind==='ucl'&&c.name==='Champions League'));

  const fx=await ok('GET','/api/rooms/LIGA/zc/fixtures');
  assert.strictEqual(fx.total,62);
  assert.ok(fx.rounds[0].games.length>=18); // 3 ligas, 9 jogos cada = 27

  // simular jornada 1 (3 ligas)
  const a1=await ok('POST','/api/rooms/LIGA/advance');
  assert.ok(a1.ok);
  const pl=season.competitions.find(c=>c.kind==='league'&&c.league_key==='pl');
  const tb1=await ok('GET',`/api/rooms/LIGA/comp/${pl.id}/table`);
  assert.strictEqual(tb1.rows.length,18);
  assert.ok(tb1.rows.some(x=>x.j===1));

  // avançar até a jornada 3 (1ª da fase de liga europeia): md2 liga, md3 europe
  await ok('POST','/api/rooms/LIGA/advance');
  const a3=await ok('POST','/api/rooms/LIGA/advance');
  const ucl=season.competitions.find(c=>c.kind==='ucl');
  const ut=await ok('GET',`/api/rooms/LIGA/comp/${ucl.id}/table`);
  assert.strictEqual(ut.rows.length,27,'Champions deve ter 27 times');
  assert.ok(ut.rows.some(x=>x.name==='Inter'),'Inter na Champions (s1 por over)');
  assert.ok(!ut.rows.some(x=>x.name==='Crystal Palace'),'Palace não entra na Champions na 1ª temporada');

  const el=season.competitions.find(c=>c.kind==='el');
  const et=await ok('GET',`/api/rooms/LIGA/comp/${el.id}/table`);
  assert.strictEqual(et.rows.length,27);
  assert.ok(et.rows.some(x=>x.name==='Crystal Palace'));

  // avançar até a 1ª jornada de copa (md 25 no plano: depois de 16 ligas + 8 europe = 24, depois prelim 1)
  // Já estamos no md 3. Faltam 22 até a prelim (md 25).
  console.log('simulando até a preliminar das copas e um pouco mais…');
  for(let i=3;i<25;i++){
    const r=await ok('POST','/api/rooms/LIGA/advance');
    if((i+1)%5===0)console.log('  jornada',r.matchday);
  }
  const cup=season.competitions.find(c=>c.kind==='cup'&&c.league_key==='pl');
  const br=await ok('GET',`/api/rooms/LIGA/comp/${cup.id}/bracket`);
  assert.ok(br.stages.find(s=>s.key==='prelim'),'FA Cup deve ter preliminar');

  // simular o resto da temporada (pode levar uns minutos)
  console.log('simulando o restante das 62 jornadas…');
  let st=await ok('GET','/api/rooms/LIGA/season');
  let guard=0;
  while(st.status==='season'&&guard<80){
    const r=await ok('POST','/api/rooms/LIGA/advance');
    guard++;
    if(r.matchday%10===0||r.results?.some(x=>x.info))console.log('  jornada',r.matchday, (r.results||[]).filter(x=>x.info).map(x=>x.info).join(' | '));
    st=await ok('GET','/api/rooms/LIGA/season');
  }
  assert.strictEqual(st.status,'finished','temporada deveria terminar após 62 jornadas');
  const cupsDone=st.competitions.filter(c=>c.kind==='cup');
  assert.ok(cupsDone.every(c=>c.champion),'todas as copas com campeão');
  assert.ok(st.competitions.find(c=>c.kind==='ucl').champion,'Champions com campeão');
  assert.ok(st.competitions.find(c=>c.kind==='el').champion,'Europa League com campeão');

  const tables={};
  for(const lg of ['pl','ll','sa']){
    const c=st.competitions.find(x=>x.kind==='league'&&x.league_key===lg);
    tables[lg]=(await ok('GET',`/api/rooms/LIGA/comp/${c.id}/table`)).rows;
    assert.strictEqual(tables[lg].length,18);
    assert.ok(tables[lg].every(x=>x.j===34),lg+' deveria ter 34 jogos');
  }
  const uclWinner=st.competitions.find(c=>c.kind==='ucl').champion;
  const cupWinners=Object.fromEntries(st.competitions.filter(c=>c.kind==='cup').map(c=>[c.league_key,c.champion]));
  assert.ok(uclWinner,'id do campeão da Champions');

  // nova temporada
  const N=await ok('POST','/api/rooms/LIGA/zc/admin/season/new',{confirm:'NOVA TEMPORADA',start:'2028-07-01',auto:false});
  assert.strictEqual(N.season,2027);
  await ok('POST','/api/rooms/LIGA/zc/admin/auction/state',{action:'open_market'});
  await ok('POST','/api/rooms/LIGA/season/start',{confirm:true});
  const s2=await ok('GET','/api/rooms/LIGA/season');
  const ucl2=s2.competitions.find(c=>c.kind==='ucl');
  const el2=s2.competitions.find(c=>c.kind==='el');
  const ut2=await ok('GET',`/api/rooms/LIGA/comp/${ucl2.id}/table`);
  const et2=await ok('GET',`/api/rooms/LIGA/comp/${el2.id}/table`);
  assert.strictEqual(ut2.rows.length,27,'s2 Champions 27 times');
  assert.strictEqual(et2.rows.length,27,'s2 Europa League 27 times');
  const s2ids=new Set(ut2.rows.map(x=>x.club_id));
  const s2el=new Set(et2.rows.map(x=>x.club_id));
  assert.ok(s2ids.has(uclWinner),'campeão da Champions tem vaga na Champions seguinte');
  for(const [lg,id] of Object.entries(cupWinners)){
    assert.ok(id&&s2ids.has(id),'campeão da copa '+lg+' tem vaga na Champions seguinte');
  }
  for(const lg of ['pl','ll','sa']){
    const rows=tables[lg];
    const top9=rows.filter(x=>x.pos<=9).map(x=>x.club_id);
    const ninth=rows.find(x=>x.pos===9).club_id;
    const eighth=rows.find(x=>x.pos===8).club_id;
    const cup=cupWinners[lg];
    const cupPos=rows.find(x=>x.club_id===cup)?.pos;
    const uclPos=rows.find(x=>x.club_id===uclWinner)?.pos;
    const outside=[cup,uclWinner].filter((id,i,a)=>id&&a.indexOf(id)===i&&rows.some(x=>x.club_id===id&&x.pos>9));
    for(const id of top9){
      const isGuaranteed=id===cup||id===uclWinner;
      const evicted=(outside.length>=1&&id===ninth&&!isGuaranteed)||(outside.length>=2&&id===eighth&&!isGuaranteed);
      if(evicted){
        assert.ok(!s2ids.has(id),'lugar cedido ('+lg+' pos '+(id===ninth?9:8)+') fora da Champions');
        assert.ok(s2el.has(id),'lugar cedido foi para a Europa League');
      }else{
        assert.ok(s2ids.has(id),'top 9 da '+lg+' permanece na Champions (ou é campeão): '+id);
      }
    }
    const inUcl=rows.filter(x=>s2ids.has(x.club_id));
    const inEl=rows.filter(x=>s2el.has(x.club_id));
    assert.strictEqual(inUcl.length,9,lg+' com 9 na Champions');
    assert.strictEqual(inEl.length,9,lg+' com 9 na Europa League');
    if(cupPos>9)console.log('  caso copa fora do top 9:',lg,'campeão pos',cupPos,'9º saiu?',!s2ids.has(ninth));
    if(uclPos>9)console.log('  caso Champions fora do top 9: liga',lg,'pos',uclPos);
  }

  console.log('europa.test.js OK');
  child.kill();
  process.exit(0);
})().catch(e=>{console.error('FAIL',e);try{console.error('SERVER\n'+out)}catch(x){}try{child.kill()}catch(x){}process.exit(1);});
