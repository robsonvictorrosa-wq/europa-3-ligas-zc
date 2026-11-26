// Agenda (calendário) da sala LIGA. Temporada 1 e seguintes: gerada por build() a partir da data
// escolhida pelo admin (sem data fixa no config). paused=true até o admin ligar.
const AG=require('./config/agenda.json');
const BASE=JSON.parse(JSON.stringify(AG));
const C=require('./comps');
function apply(a){const src=JSON.parse(JSON.stringify(a||BASE));for(const k of Object.keys(AG))delete AG[k];Object.assign(AG,src);return AG;}
const addDays=(ymd,n)=>{const d=new Date(ymd+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const at=(ymd,hm)=>`${ymd}T${hm}:00-03:00`;
const validYmd=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||''))&&!isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
// start = 1º dia da pré-temporada (AAAA-MM-DD, Brasília). Padrão:
//  dia 0: leilão de pré 12:00–20:00, mercado 21:40 até o dia 4 às 23:59; jornada 1 no dia 5 às 12:00;
//  2 jornadas por dia (12:00 e 19:00); janela do meio depois da jornada MID_MD (liga R17 + 9ª europeia);
//  janela do fim depois da última jornada (sem jogos depois).
function build(start,{paused=false,prev=BASE}={}){if(!validYmd(start))throw new Error('Data inválida (use AAAA-MM-DD)');
 const slots=(prev.slots&&prev.slots.length?prev.slots:['12:00','19:00']).slice(),n=slots.length;
 const midAfter=C.MID_MD,total=C.TOTAL_MD;
 const m0=addDays(start,5);
 const midDay=addDays(m0,Math.floor((midAfter-1)/n));
 const midResume=addDays(midDay,4);
 const rest=total-midAfter;
 const lastDay=addDays(midResume,Math.floor((Math.max(rest,1)-1)/n));
 const endAuction=addDays(lastDay,1);
 const endClose=addDays(lastDay,2);
 return {_doc_season:`Agenda gerada pelo painel: pré-temporada em ${start}, jornada 1 em ${m0}, ${total} jornadas (2 por dia), janela do meio após a jornada ${midAfter}, última jornada em ${lastDay}.`,
  paused:!!paused,room:prev.room||'LIGA',
  auction_start:at(start,'12:00'),auction_close:at(start,'20:00'),market_close:at(addDays(start,4),'23:59'),
  pre_market_during_rounds:prev.pre_market_during_rounds!==undefined?!!prev.pre_market_during_rounds:true,
  penalty_at_market_close:prev.penalty_at_market_close!==undefined?!!prev.penalty_at_market_close:true,
  market_open:at(start,'21:40'),matches_start:m0,start_slot:0,slots,
  windows:{mid:{after_round:midAfter,market_open:at(midDay,'21:00'),auction_start:at(addDays(midDay,1),'12:00'),auction_close:at(addDays(midDay,1),'20:00'),market_close:at(addDays(midDay,3),'20:00'),resume:midResume,resume_slot:0},
   end:{after_round:total,auction_start:at(endAuction,'12:00'),auction_close:at(endAuction,'21:00'),market_close:at(endClose,'21:00'),resume:addDays(lastDay,3)}},
  final_at:at(lastDay,slots[(total-midAfter-1)%n]||slots[n-1]),
  total_matchdays:total,mid_matchday:midAfter};
}
const startOf=a=>String((a||AG).auction_start||'').slice(0,10)||null;
function slotAt(k,ag=AG){
 if(!ag.matches_start||!ag.slots?.length)return null;
 const W=ag.windows||{};let base=ag.matches_start,i=k-1+(+ag.start_slot||0);
 for(const w of [W.mid,W.end])if(w&&w.resume&&k>w.after_round){base=w.resume;i=k-w.after_round-1+(+w.resume_slot||0);}
 if(ag.final_at&&k===C.TOTAL_MD)return new Date(ag.final_at).toISOString();
 const n=ag.slots.length,[d,h]=[Math.floor(i/n),ag.slots[i%n]];
 return new Date(Date.parse(base+'T'+h+':00-03:00')+d*864e5).toISOString();
}
module.exports={AG,BASE,apply,build,addDays,validYmd,startOf,slotAt};
