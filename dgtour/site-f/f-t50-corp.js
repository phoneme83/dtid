/* ============================================================
   법인카드 확인 모듈 (정산 검증)
   환급 증빙으로 제출된 결제가 법인카드 결제인지 판정한다.
   법인카드 결제는 업무 목적 지출로 보아 휴가지원 환급 대상이 아니므로,
   담당자가 환급 승인 전에 걸러낼 수 있어야 한다.

   판정의 주 수단은 **카드번호(BIN) 예측**이다.
   국내 카드영수증은 카드번호를 마스킹해도 앞자리는 노출되므로
   (1234-56** / 12345678****9012 등) 앞 6~8자리로 카드 상품을 식별할 수 있다.
   신청자는 전국의 일반 국민이라 기관이 카드 목록을 미리 등록해 둘 수는 없지만,
   BIN 판정표는 기관이 관리할 수 있다.

     ① 카드번호(BIN) 예측  — 앞 8자리 → 앞 6자리 순으로 판정표를 조회한다.
                             판정표 항목이 영수증 표기로 검증된 것이면 '확인',
                             아직 검증 전이면 '추정'으로 구분한다.
     ② 영수증 카드종류 표기 — 판독 원문에 카드종류가 인쇄되어 있으면 그것으로 확정하고,
                             그 결과를 판정표에 학습시켜 이후 같은 BIN 은 번호만으로 판정된다.
                             (실측 71장의 고유 거래 66건 중 49건 = 74% 에 인쇄되어 있었다)
     ③ 담당자 확정         — ①②로 확정되지 않은 건은 담당자가 확정하고, 그 결과도 학습된다.

   판정 결과: {result:'corp'|'personal'|'unknown', label, basis, detail, needsReview}
     basis: bin | receipt | manual | none
   ============================================================ */

const FT50_BIN_KEY = 'dtidF_t50CardBins';   /* 카드 BIN 판정표 (관리자 관리 + 자동 학습) */

/* 영수증 카드종류 줄에서 쓰이는 표기 */
const FT50_CORP_WORDS     = ['법인'];
const FT50_PERSONAL_WORDS = ['개인'];
/* 체크·선불카드는 법인카드가 아니다(법인체크는 '법인' 표기가 함께 붙는다) */
const FT50_NONCORP_WORDS  = ['체크', '선불', '기프트'];

/* BIN 판정표 시드값 — 비워 둔다.
   실측 영수증에서 뽑은 카드 대역은 특정 카드 소지자를 가리키는 원본 데이터라
   공개 저장소에 남기지 않는다. 판정은 아래 두 경로로 충분히 동작한다.
     ① 영수증 카드종류 표기 — 실측 기준 74%의 전표에 인쇄되어 있고 BIN 예측보다 근거가 강하다
     ② 담당자 확정 — ①로 확정되지 않은 건
   확정된 결과는 ft50LearnBin 이 브라우저(localStorage)에만 학습시키므로 저장소에는 남지 않는다.
   기관이 여신금융협회 BIN 정보나 PG 승인응답의 카드구분 값을 확보하면
   관리자 화면 「카드 BIN 판정표」에서 등록해 쓴다. */
const FT50_BIN_SEED = [];

/* ── 카드번호 정규화 ────────────────────────────────────────
   '1234-56**-****-9012' → {tok:'123456******9012', bin8:null, bin6:'123456', last4:'9012'}
   '12345678****9012'    → {bin8:'12345678', bin6:'123456'} */
function ft50CardParts(cardNo){
  const raw = String(cardNo || '').replace(/[\s\-]/g, '');
  const tok = raw.replace(/[^0-9]/g, '*');       /* 마스킹 문자는 어떤 기호로 읽혔든 * 로 */
  const lead = (tok.match(/^\d+/) || [''])[0];   /* 앞쪽 연속 숫자 = 노출된 자리 */
  const m = tok.match(/(\d{4})$/);
  return {
    tok: tok,
    lead: lead,
    bin8: lead.length >= 8 ? lead.slice(0, 8) : null,
    bin6: lead.length >= 6 ? lead.slice(0, 6) : null,
    last4: m ? m[1] : null
  };
}

/* ── BIN 판정표 ─────────────────────────────────────────────── */
function ft50Bins(){
  try{
    const saved = JSON.parse(localStorage.getItem(FT50_BIN_KEY) || 'null');
    if(Array.isArray(saved)) return saved;
  }catch(e){}
  return FT50_BIN_SEED.map(function(x){ return Object.assign({}, x); });
}
function ft50SaveBins(list){ localStorage.setItem(FT50_BIN_KEY, JSON.stringify(list || [])); }
function ft50ResetBins(){ localStorage.removeItem(FT50_BIN_KEY); }
function ft50AddBin(prefix, kind, issuer, memo){
  const b = String(prefix || '').replace(/[^0-9]/g, '').slice(0, 8);
  if(b.length !== 6 && b.length !== 8) return null;
  const list = ft50Bins().filter(function(x){ return x.prefix !== b; });   /* 같은 자리수 대역은 갱신 */
  const rec = {prefix:b, kind:(kind === 'corp' ? 'corp' : 'personal'),
               issuer:issuer || '', memo:memo || '', verified:true, count:0};
  list.push(rec);
  list.sort(function(a, c){ return a.prefix < c.prefix ? -1 : 1; });
  ft50SaveBins(list);
  return rec;
}
function ft50DelBin(prefix){
  ft50SaveBins(ft50Bins().filter(function(x){ return x.prefix !== prefix; }));
}
/* 긴 대역(8자리)이 짧은 대역(6자리)보다 우선한다 */
function ft50LookupBin(cardNo){
  const p = ft50CardParts(cardNo);
  const list = ft50Bins();
  const find = function(k){ return k ? list.find(function(x){ return x.prefix === k; }) : null; };
  return find(p.bin8) || find(p.bin6) || null;
}

/* 영수증 표기·담당자 확정 결과를 판정표에 학습시킨다 —
   같은 BIN 이 다음부터는 카드번호만으로 판정된다 */
function ft50LearnBin(cardNo, kind, source){
  const p = ft50CardParts(cardNo);
  const key = p.bin8 || p.bin6;
  if(!key) return null;
  const list = ft50Bins();
  const cur = list.find(function(x){ return x.prefix === key; }) ||
              (p.bin8 ? list.find(function(x){ return x.prefix === p.bin6; }) : null);
  if(cur){
    if(cur.kind === kind){ cur.count = (cur.count || 0) + 1; cur.verified = true; }
    else{
      /* 기존 판정과 다르면 덮어쓰지 않고 충돌만 기록한다 — 담당자가 판정표를 손봐야 한다 */
      cur.conflict = (cur.conflict || 0) + 1;
    }
    ft50SaveBins(list);
    return cur;
  }
  const rec = {prefix:key, kind:kind, issuer:'', memo:(source || '승인 이력에서 학습'),
               verified:true, count:1};
  list.push(rec);
  list.sort(function(a, c){ return a.prefix < c.prefix ? -1 : 1; });
  ft50SaveBins(list);
  return rec;
}

/* ── 영수증 판독 원문에서 카드종류 표기 읽기 ──────────────
   라벨('카드종류' '카드사명' '매입사')이 있는 줄을 우선 보되, 실측 전표에는 라벨 없이
   '신한카드-법인 매출표' '[신한카드법인]' 처럼 카드사 표기가 독립 줄로 인쇄되는 형태가
   많아 라벨만 보면 상당수를 놓친다. 라벨 줄이 없으면 '카드'와 구분어가 서로 붙어 있는
   줄을 찾는다. 인접 조건이 있어 '법인등록번호'나 상호명 속 '법인'은 걸리지 않는다.
   라벨에 공백이 끼어드는 경우('카 드 명')도 허용한다. */
const FT50_TYPE_LB  = /(카\s*드\s*종\s*류|카\s*드\s*사\s*명?|카\s*드\s*명|매\s*입\s*사\s*명?|card\s*type)/i;
const FT50_TYPE_ADJ = /카\s*드[^가-힣0-9]{0,3}(법인|개인|체크|선불|기프트)|(법인|개인|체크|선불|기프트)[^가-힣0-9]{0,3}카\s*드/;
function ft50CardTypeFromText(text){
  const t = String(text || '');
  if(!t) return null;
  const lines = t.split(/\n+/);
  let scope = lines.filter(function(ln){ return FT50_TYPE_LB.test(ln); }).join('\n');
  if(!scope) scope = lines.filter(function(ln){ return FT50_TYPE_ADJ.test(ln); }).join('\n');
  if(!scope) return null;
  if(FT50_CORP_WORDS.some(function(w){ return scope.indexOf(w) >= 0; }))
    return {kind:'corp', line:scope.trim()};
  if(FT50_NONCORP_WORDS.some(function(w){ return scope.indexOf(w) >= 0; }))
    return {kind:'noncorp', line:scope.trim()};
  if(FT50_PERSONAL_WORDS.some(function(w){ return scope.indexOf(w) >= 0; }))
    return {kind:'personal', line:scope.trim()};
  return null;
}

const FT50_CORP_NOTE = ' — 업무 목적 지출로 환급 대상이 아닙니다';

/* ── 판정 ───────────────────────────────────────────────────
   cardNo: 입력·판독된 카드번호, ocrText: 영수증 판독 원문(없으면 생략)
   learn=true 면 영수증 표기로 확인된 결과를 판정표에 학습시킨다(제출 시점에만 true) */
function ft50CorpCheck(cardNo, ocrText, learn){
  const p = ft50CardParts(cardNo);
  const typ = ft50CardTypeFromText(ocrText);
  const label = typ ? (typ.kind === 'corp' ? 'corp' : 'personal') : null;

  /* 영수증에 카드종류가 인쇄된 경우 — 그것으로 확정하고 판정표에 학습 */
  if(label){
    if(learn) ft50LearnBin(cardNo, label, '영수증 카드종류 표기에서 학습');
    if(label === 'corp')
      return {result:'corp', label:'법인카드 확인', basis:'receipt',
              detail:'영수증 카드종류 표기: ' + typ.line + FT50_CORP_NOTE, needsReview:true};
    return {result:'personal', label:'개인카드 확인', basis:'receipt',
            detail:'영수증 카드종류 표기: ' + typ.line, needsReview:false};
  }

  /* ① 카드번호(BIN) 예측 — 표기가 없어도 번호만으로 판정한다 */
  const hit = ft50LookupBin(cardNo);
  if(hit){
    const corp = hit.kind === 'corp';
    const strong = !!hit.verified && (hit.count || 0) >= 3 && !hit.conflict;
    const src = '카드번호 앞 ' + hit.prefix.length + '자리 ' + hit.prefix +
                (hit.issuer ? ' · ' + hit.issuer : '') + (hit.memo ? ' (' + hit.memo + ')' : '') +
                (hit.count ? ' · 승인 이력 ' + hit.count + '건' : '') +
                (hit.conflict ? ' · 상반된 이력 ' + hit.conflict + '건' : '');
    if(corp)
      return {result:'corp', label: strong ? '법인카드 확인' : '법인카드 추정', basis:'bin',
              detail: src + FT50_CORP_NOTE + (strong ? '' : ' · 담당자 확인 필요'),
              needsReview:true};
    return {result:'personal', label: strong ? '개인카드 확인' : '개인카드 추정', basis:'bin',
            detail: src + (strong ? '' : ' · 담당자 확인 필요'), needsReview: !strong};
  }

  /* ② 판정표에 없는 대역 — 담당자가 확정해야 한다 */
  return {result:'unknown', label:'법인카드 판정 불가', basis:'none',
          detail: p.bin6
            ? ('카드번호 앞자리 ' + (p.bin8 || p.bin6) + ' 가 BIN 판정표에 없고 영수증에도 카드종류 표기가 없습니다')
            : '카드번호를 확인할 수 없어 판정할 수 없습니다',
          needsReview:true};
}

/* ③ 담당자 확정 — 누가 언제 확정했는지 남기고, 판정표에도 학습시킨다 */
function ft50CorpDecide(cardNo, kind, by){
  const corp = (kind === 'corp');
  ft50LearnBin(cardNo, corp ? 'corp' : 'personal', '담당자 확정에서 학습');
  return {
    result: corp ? 'corp' : 'personal',
    label: corp ? '법인카드 확정(담당자)' : '개인카드 확정(담당자)',
    basis: 'manual',
    detail: '담당자 ' + (by || '') + ' 확인 — ' +
            (corp ? '법인카드 결제로 확정' + FT50_CORP_NOTE : '개인카드 결제로 확정') +
            ' · 카드 앞자리는 BIN 판정표에 반영됨',
    by: by || '',
    ts: new Date().toISOString().slice(0, 16).replace('T', ' '),
    needsReview: false
  };
}

/* 배지 색상 클래스 — f.css 의 .badge g/o/n 을 그대로 쓴다 */
function ft50CorpBadgeCls(chk){
  if(!chk) return 'n';
  if(chk.result === 'corp') return 'o';        /* 법인카드는 환급 대상이 아니므로 주의색 */
  if(chk.result === 'personal') return chk.needsReview ? 'n' : 'g';
  return 'n';
}
function ft50CorpIcon(chk){
  if(!chk) return '•';
  if(chk.result === 'corp') return '🏢';
  if(chk.result === 'personal') return chk.needsReview ? '💳?' : '💳';
  return '❓';
}
