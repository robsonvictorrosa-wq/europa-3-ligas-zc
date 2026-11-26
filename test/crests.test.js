const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Database=require('better-sqlite3');
const src=fs.readFileSync(path.join(__dirname,'../public/zc.js'),'utf8');
const m=src.match(/const CREST=(\{[\s\S]*?\});/);
assert.ok(m,'CREST no zc.js');
const CREST=Function('return '+m[1])();
const CF=JSON.parse(fs.readFileSync(path.join(__dirname,'../config/europa.json'),'utf8'));
const db=new Database(path.join(__dirname,'../data/game.db'),{readonly:true});
const clubs=db.prepare('SELECT club_id,name FROM lib_clubs').all();
assert.strictEqual(clubs.length,54);
assert.strictEqual(CF.removed_clubs.length,6);
for(const c of clubs){
  assert.strictEqual(CREST[c.name],c.club_id,'mapa '+c.name);
  const f=path.join(__dirname,'../public/crests',c.club_id+'.png');
  assert.ok(fs.existsSync(f),'arquivo '+c.name);
  assert.ok(fs.statSync(f).size>800,'arquivo pequeno demais '+c.name);
}
const find=db.prepare(`SELECT c.id FROM clubs c JOIN leagues l ON l.id=c.league_id WHERE c.name=? AND l.kind='league'`);
for(const r of CF.removed_clubs){
  const row=find.get(r.db||r.name);
  assert.ok(row,'clube FC27 ainda na base '+r.name);
  const f=path.join(__dirname,'../public/crests',row.id+'.png');
  assert.ok(fs.existsSync(f),'escudo do clube removido '+r.name);
  assert.ok(fs.statSync(f).size>800,'escudo pequeno '+r.name);
  assert.ok(!clubs.some(c=>c.name===r.name),'removido ainda em lib_clubs '+r.name);
}
console.log('crests.test.js OK 54 clubes');
