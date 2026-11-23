const assert=require('assert');
const fs=require('fs');
const path=require('path');
const Database=require('better-sqlite3');
const src=fs.readFileSync(path.join(__dirname,'../public/zc.js'),'utf8');
const m=src.match(/const CREST=(\{[\s\S]*?\});/);
assert.ok(m,'CREST no zc.js');
const CREST=Function('return '+m[1])();
const clubs=new Database(path.join(__dirname,'../data/game.db'),{readonly:true}).prepare('SELECT club_id,name FROM lib_clubs').all();
assert.strictEqual(clubs.length,60);
for(const c of clubs){
  assert.strictEqual(CREST[c.name],c.club_id,'mapa '+c.name);
  const f=path.join(__dirname,'../public/crests',c.club_id+'.png');
  assert.ok(fs.existsSync(f),'arquivo '+c.name);
  assert.ok(fs.statSync(f).size>800,'arquivo pequeno demais '+c.name);
}
console.log('crests.test.js OK');
