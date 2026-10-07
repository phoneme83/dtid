/* ═══════════════════════════════════════════════════════════════════
   시안 G — 법인카드 판정 모듈 (site-d/t50-corp.js 포팅, 저장 키 dtidG_cardBins)
   정산 증빙으로 제출된 카드 결제가 법인카드인지 판정한다(운영기준 P4 '법인·타인 명의 결제 불인정').

   판정 순서
     ① 영수증 카드종류 표기 — 판독 원문에 '카드종류: ○○카드법인' 등이 인쇄되어 있으면 그것으로 확정하고
                              BIN 판정표에 학습시킨다(이후 같은 대역은 번호만으로 판정).
     ② 카드번호(BIN) 예측   — 앞 8자리 → 6자리 순으로 판정표 조회. 승인 이력 3건 이상이면 '확인', 아니면 '추정'.
     ③ 담당자 확정          — ①②로 정해지지 않은 건(관리자 화면에서 gCorpDecide).
   결과: {result:'corp'|'personal'|'unknown', label, basis:'receipt'|'bin'|'manual'|'none', detail, needsReview}

   BIN 시드는 비워 둔다 — 실측 카드 대역은 특정 소지자를 가리키는 원본 데이터라 저장소에 남기지 않는다.
   g.js 의 gGet/gSet 을 쓰므로 g.js 다음에 불러온다.
   ═══════════════════════════════════════════════════════════════════ */

const G_CORP_WORDS=['법인'];
const G_PERSONAL_WORDS=['개인'];
const G_NONCORP_WORDS=['체크','선불','기프트'];   /* 체크·선불은 법인카드가 아니다(법인체크는 '법인'이 함께 붙는다) */
const G_BIN_SEED=[];
const G_CORP_NOTE=' — 업무 목적 지출로 환급 대상이 아닙니다';

/* '1234-56**-****-9012' → {tok:'123456******9012', lead:'123456', bin8:null, bin6:'123456', last4:'9012'} */
function gCardParts(cardNo){
  const raw=String(cardNo||'').replace(/[\s\-]/g,'');
  const tok=raw.replace(/[^0-9]/g,'*');
  const lead=(tok.match(/^\d+/)||[''])[0];
  const m=tok.match(/(\d{4})$/);
  return {tok,lead,bin8:lead.length>=8?lead.slice(0,8):null,bin6:lead.length>=6?lead.slice(0,6):null,last4:m?m[1]:null};
}
/* 표시·저장용 마스킹: 앞 6자리와 뒤 4자리만 남긴다 */
function gCardMask(cardNo){
  const p=gCardParts(cardNo);
  if(!p.bin6) return p.last4?'****-****-****-'+p.last4:'';
  return p.bin6.slice(0,4)+'-'+p.bin6.slice(4,6)+'**-****-'+(p.last4||'****');
}

/* ── BIN 판정표 ── */
function gBins(){ const s=gGet('cardBins',null); return Array.isArray(s)?s:G_BIN_SEED.map(x=>Object.assign({},x)); }
function gSaveBins(list){ gSet('cardBins',list||[]); }
function gResetBins(){ try{ localStorage.removeItem(G_P+'cardBins'); }catch(e){} }
function gAddBin(prefix,kind,issuer,memo){
  const b=String(prefix||'').replace(/[^0-9]/g,'').slice(0,8);
  if(b.length!==6&&b.length!==8) return null;
  const list=gBins().filter(x=>x.prefix!==b);
  const rec={prefix:b,kind:kind==='corp'?'corp':'personal',issuer:issuer||'',memo:memo||'',verified:true,count:0};
  list.push(rec); list.sort((a,c)=>a.prefix<c.prefix?-1:1); gSaveBins(list);
  return rec;
}
function gDelBin(prefix){ gSaveBins(gBins().filter(x=>x.prefix!==prefix)); }
/* 긴 대역(8자리)이 짧은 대역(6자리)보다 우선 */
function gLookupBin(cardNo){
  const p=gCardParts(cardNo), list=gBins();
  const find=k=>k?list.find(x=>x.prefix===k):null;
  return find(p.bin8)||find(p.bin6)||null;
}
/* 영수증 표기·담당자 확정 결과 학습. 기존 판정과 다르면 덮어쓰지 않고 충돌만 기록 */
function gLearnBin(cardNo,kind,source){
  const p=gCardParts(cardNo), key=p.bin8||p.bin6;
  if(!key) return null;
  const list=gBins();
  const cur=list.find(x=>x.prefix===key)||(p.bin8?list.find(x=>x.prefix===p.bin6):null);
  if(cur){
    if(cur.kind===kind){ cur.count=(cur.count||0)+1; cur.verified=true; }
    else cur.conflict=(cur.conflict||0)+1;
    gSaveBins(list); return cur;
  }
  const rec={prefix:key,kind,issuer:'',memo:source||'승인 이력에서 학습',verified:true,count:1};
  list.push(rec); list.sort((a,c)=>a.prefix<c.prefix?-1:1); gSaveBins(list);
  return rec;
}

/* ── 판독 원문에서 카드종류 표기 읽기 ──
   라벨 줄('카드종류' '카드사명' '매입사')을 우선, 없으면 '카드'와 구분어가 붙어 있는 줄('신한카드-법인').
   인접 조건이 있어 '법인등록번호'나 상호 속 '법인'은 걸리지 않는다. */
const G_TYPE_LB=/(카\s*드\s*종\s*류|카\s*드\s*사\s*명?|카\s*드\s*명|매\s*입\s*사\s*명?|card\s*type)/i;
const G_TYPE_ADJ=/카\s*드[^가-힣0-9]{0,3}(법인|개인|체크|선불|기프트)|(법인|개인|체크|선불|기프트)[^가-힣0-9]{0,3}카\s*드/;
function gCardTypeFromText(text){
  const t=String(text||''); if(!t) return null;
  const lines=t.split(/\n+/);
  let scope=lines.filter(ln=>G_TYPE_LB.test(ln)).join('\n');
  if(!scope) scope=lines.filter(ln=>G_TYPE_ADJ.test(ln)).join('\n');
  if(!scope) return null;
  if(G_CORP_WORDS.some(w=>scope.indexOf(w)>=0)) return {kind:'corp',line:scope.trim()};
  if(G_NONCORP_WORDS.some(w=>scope.indexOf(w)>=0)) return {kind:'noncorp',line:scope.trim()};
  if(G_PERSONAL_WORDS.some(w=>scope.indexOf(w)>=0)) return {kind:'personal',line:scope.trim()};
  return null;
}

/* 판정 — learn=true 면 영수증 표기로 확인된 결과를 판정표에 학습(제출 시점에만) */
function gCorpCheck(cardNo,ocrText,learn){
  const p=gCardParts(cardNo);
  const typ=gCardTypeFromText(ocrText);
  const label=typ?(typ.kind==='corp'?'corp':'personal'):null;
  if(label){
    if(learn) gLearnBin(cardNo,label,'영수증 카드종류 표기에서 학습');
    if(label==='corp') return {result:'corp',label:'법인카드 확인',basis:'receipt',detail:'영수증 카드종류 표기: '+typ.line+G_CORP_NOTE,needsReview:true};
    return {result:'personal',label:'개인카드 확인',basis:'receipt',detail:'영수증 카드종류 표기: '+typ.line,needsReview:false};
  }
  const hit=gLookupBin(cardNo);
  if(hit){
    const corp=hit.kind==='corp';
    const strong=!!hit.verified&&(hit.count||0)>=3&&!hit.conflict;
    const src='카드번호 앞 '+hit.prefix.length+'자리 '+hit.prefix+(hit.issuer?' · '+hit.issuer:'')+(hit.memo?' ('+hit.memo+')':'')+
      (hit.count?' · 승인 이력 '+hit.count+'건':'')+(hit.conflict?' · 상반된 이력 '+hit.conflict+'건':'');
    if(corp) return {result:'corp',label:strong?'법인카드 확인':'법인카드 추정',basis:'bin',detail:src+G_CORP_NOTE+(strong?'':' · 담당자 확인 필요'),needsReview:true};
    return {result:'personal',label:strong?'개인카드 확인':'개인카드 추정',basis:'bin',detail:src+(strong?'':' · 담당자 확인 필요'),needsReview:!strong};
  }
  return {result:'unknown',label:'법인카드 판정 불가',basis:'none',
    detail:p.bin6?('카드번호 앞자리 '+(p.bin8||p.bin6)+' 가 BIN 판정표에 없고 영수증에도 카드종류 표기가 없습니다'):'카드번호를 확인할 수 없어 판정할 수 없습니다',
    needsReview:true};
}
/* 담당자 확정 — 누가 언제 확정했는지 남기고 판정표에도 학습 */
function gCorpDecide(cardNo,kind,by){
  const corp=kind==='corp';
  gLearnBin(cardNo,corp?'corp':'personal','담당자 확정에서 학습');
  return {result:corp?'corp':'personal',label:corp?'법인카드 확정(담당자)':'개인카드 확정(담당자)',basis:'manual',
    detail:'담당자 '+(by||'')+' 확인 — '+(corp?'법인카드 결제로 확정'+G_CORP_NOTE:'개인카드 결제로 확정')+' · 카드 앞자리는 BIN 판정표에 반영됨',
    by:by||'',ts:gNow().toISOString(),needsReview:false};
}
function gCorpColor(chk){
  if(!chk) return '#64748b';
  if(chk.result==='corp') return '#b45309';
  if(chk.result==='personal') return chk.needsReview?'#64748b':'#0f766e';
  return '#64748b';
}
function gCorpIcon(chk){
  if(!chk) return '•';
  if(chk.result==='corp') return '🏢';
  if(chk.result==='personal') return chk.needsReview?'💳?':'💳';
  return '❓';
}
