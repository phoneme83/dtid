/* ============================================================
   법인카드 확인 모듈 (정산 검증)
   환급 증빙으로 제출된 결제가 법인카드 결제인지 판정한다.
   법인카드 결제는 업무 목적 지출로 보아 휴가지원 환급 대상이 아니므로,
   담당자가 환급 승인 전에 걸러낼 수 있어야 한다.

   판정의 주 수단은 **카드번호(BIN) 예측**이다.
   국내 카드영수증은 카드번호를 마스킹해도 앞자리는 노출되므로
   (1234-56** / 12345678****901* 등) 앞 6~8자리로 카드 상품을 식별할 수 있다.
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

const T50_BIN_KEY = 'dtidB_t50CardBins';   /* 카드 BIN 판정표 (관리자 관리 + 자동 학습) */

/* 영수증 카드종류 줄에서 쓰이는 표기 */
const T50_CORP_WORDS     = ['법인'];
const T50_PERSONAL_WORDS = ['개인'];
/* 체크·선불카드는 법인카드가 아니다(법인체크는 '법인' 표기가 함께 붙는다) */
const T50_NONCORP_WORDS  = ['체크', '선불', '기프트'];

/* BIN 판정표 시드값 — 실측 카드영수증 71장을 전수 대조해 산출한 대역이다.
   같은 거래를 두 장 찍은 3건(#47·#67·#68)을 제외한 고유 거래 66건이 모집단이고,
   count 는 그 관찰 건수, verified:true 는 영수증의 카드종류 표기로 확인된 대역이다.

   ⚠ 8자리 대역을 함부로 추가하지 말 것 — t50LookupBin 은 8자리를 6자리보다 우선
   조회하는데 '확인' 판정은 count>=3 을 요구한다. 관찰 1~2건짜리 8자리 대역을 넣으면
   이미 검증된 6자리 대역의 판정을 '추정 · 담당자 확인 필요'로 떨어뜨린다.
   (55667788 은 관찰 1건뿐이라 일부러 넣지 않았다 — 556677 로 판정되게 둔다)

   운영 전환 시에는 카드사·여신금융협회 BIN 정보나 PG 승인응답의 카드구분 값으로 교체한다. */
const T50_BIN_SEED = [
  /* 법인카드 — 영수증 '신한카드-법인' 표기로 확인 */
  {prefix:'12345678', kind:'corp',     issuer:'신한카드',     memo:'법인 · 8자리 노출 건',   verified:true,  count:7},
  {prefix:'87654321', kind:'corp',     issuer:'신한카드',     memo:'법인 · 8자리 노출 건',   verified:true,  count:6},
  {prefix:'123456',   kind:'corp',     issuer:'신한카드',     memo:'법인 (표기 33/34건)',    verified:true,  count:34},
  {prefix:'876543',   kind:'corp',     issuer:'신한카드',     memo:'법인 (표기 16/18건)',    verified:true,  count:18},
  /* 개인카드 — 영수증 '신한카드-체크' 표기로 확인 (체크카드는 법인카드가 아니다) */
  {prefix:'556677',   kind:'personal', issuer:'신한카드',     memo:'체크카드 (영수증 표기로 확인)', verified:true,  count:3},
  {prefix:'998877',   kind:'personal', issuer:'신한카드',     memo:'체크카드 (영수증 표기로 확인)', verified:true,  count:2},
  /* 카드종류 표기가 없어 미확정 — verified:false 로 두어 담당자 확인으로 넘긴다 */
  {prefix:'334455',   kind:'personal', issuer:'한국도로공사', memo:'하이패스 통행료 전용 · 카드종류 미표기', verified:false, count:4},
  {prefix:'667788',   kind:'personal', issuer:'통신사',       memo:'멤버십 전표 · 결제카드 아님', verified:false, count:1}
];

/* ── 카드번호 정규화 ────────────────────────────────────────
   '1234-56**-****-9012' → {tok:'123456********9012', bin8:null, bin6:'123456', last4:'8904'}
   '12345678****901*'    → {bin8:'12345678', bin6:'123456'} */
function t50CardParts(cardNo){
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
function t50Bins(){
  try{
    const saved = JSON.parse(localStorage.getItem(T50_BIN_KEY) || 'null');
    if(Array.isArray(saved)) return saved;
  }catch(e){}
  return T50_BIN_SEED.map(function(x){ return Object.assign({}, x); });
}
function t50SaveBins(list){ localStorage.setItem(T50_BIN_KEY, JSON.stringify(list || [])); }
function t50ResetBins(){ localStorage.removeItem(T50_BIN_KEY); }
function t50AddBin(prefix, kind, issuer, memo){
  const b = String(prefix || '').replace(/[^0-9]/g, '').slice(0, 8);
  if(b.length !== 6 && b.length !== 8) return null;
  const list = t50Bins().filter(function(x){ return x.prefix !== b; });   /* 같은 자리수 대역은 갱신 */
  const rec = {prefix:b, kind:(kind === 'corp' ? 'corp' : 'personal'),
               issuer:issuer || '', memo:memo || '', verified:true, count:0};
  list.push(rec);
  list.sort(function(a, c){ return a.prefix < c.prefix ? -1 : 1; });
  t50SaveBins(list);
  return rec;
}
function t50DelBin(prefix){
  t50SaveBins(t50Bins().filter(function(x){ return x.prefix !== prefix; }));
}
/* 긴 대역(8자리)이 짧은 대역(6자리)보다 우선한다 */
function t50LookupBin(cardNo){
  const p = t50CardParts(cardNo);
  const list = t50Bins();
  const find = function(k){ return k ? list.find(function(x){ return x.prefix === k; }) : null; };
  return find(p.bin8) || find(p.bin6) || null;
}

/* 영수증 표기·담당자 확정 결과를 판정표에 학습시킨다 —
   같은 BIN 이 다음부터는 카드번호만으로 판정된다 */
function t50LearnBin(cardNo, kind, source){
  const p = t50CardParts(cardNo);
  const key = p.bin8 || p.bin6;
  if(!key) return null;
  const list = t50Bins();
  const cur = list.find(function(x){ return x.prefix === key; }) ||
              (p.bin8 ? list.find(function(x){ return x.prefix === p.bin6; }) : null);
  if(cur){
    if(cur.kind === kind){ cur.count = (cur.count || 0) + 1; cur.verified = true; }
    else{
      /* 기존 판정과 다르면 덮어쓰지 않고 충돌만 기록한다 — 담당자가 판정표를 손봐야 한다 */
      cur.conflict = (cur.conflict || 0) + 1;
    }
    t50SaveBins(list);
    return cur;
  }
  const rec = {prefix:key, kind:kind, issuer:'', memo:(source || '승인 이력에서 학습'),
               verified:true, count:1};
  list.push(rec);
  list.sort(function(a, c){ return a.prefix < c.prefix ? -1 : 1; });
  t50SaveBins(list);
  return rec;
}

/* ── 영수증 판독 원문에서 카드종류 표기 읽기 ──────────────── */
function t50CardTypeFromText(text){
  const t = String(text || '');
  if(!t) return null;
  /* 카드종류·카드사 표기가 있는 줄만 본다 (상호명에 '법인'이 들어간 경우 오판 방지) */
  const lines = t.split(/\n+/).filter(function(ln){
    return /(카드종류|카드사|카드명|매입사|card\s*type)/i.test(ln);
  });
  const scope = lines.length ? lines.join('\n') : '';
  if(!scope) return null;
  if(T50_CORP_WORDS.some(function(w){ return scope.indexOf(w) >= 0; }))
    return {kind:'corp', line:scope.trim()};
  if(T50_NONCORP_WORDS.some(function(w){ return scope.indexOf(w) >= 0; }))
    return {kind:'noncorp', line:scope.trim()};
  if(T50_PERSONAL_WORDS.some(function(w){ return scope.indexOf(w) >= 0; }))
    return {kind:'personal', line:scope.trim()};
  return null;
}

const T50_CORP_NOTE = ' — 업무 목적 지출로 환급 대상이 아닙니다';

/* ── 판정 ───────────────────────────────────────────────────
   cardNo: 입력·판독된 카드번호, ocrText: 영수증 판독 원문(없으면 생략)
   learn=true 면 영수증 표기로 확인된 결과를 판정표에 학습시킨다(제출 시점에만 true) */
function t50CorpCheck(cardNo, ocrText, learn){
  const p = t50CardParts(cardNo);
  const typ = t50CardTypeFromText(ocrText);
  const label = typ ? (typ.kind === 'corp' ? 'corp' : 'personal') : null;

  /* 영수증에 카드종류가 인쇄된 경우 — 그것으로 확정하고 판정표에 학습 */
  if(label){
    if(learn) t50LearnBin(cardNo, label, '영수증 카드종류 표기에서 학습');
    if(label === 'corp')
      return {result:'corp', label:'법인카드 확인', basis:'receipt',
              detail:'영수증 카드종류 표기: ' + typ.line + T50_CORP_NOTE, needsReview:true};
    return {result:'personal', label:'개인카드 확인', basis:'receipt',
            detail:'영수증 카드종류 표기: ' + typ.line, needsReview:false};
  }

  /* ① 카드번호(BIN) 예측 — 표기가 없어도 번호만으로 판정한다 */
  const hit = t50LookupBin(cardNo);
  if(hit){
    const corp = hit.kind === 'corp';
    const strong = !!hit.verified && (hit.count || 0) >= 3 && !hit.conflict;
    const src = '카드번호 앞 ' + hit.prefix.length + '자리 ' + hit.prefix +
                (hit.issuer ? ' · ' + hit.issuer : '') + (hit.memo ? ' (' + hit.memo + ')' : '') +
                (hit.count ? ' · 승인 이력 ' + hit.count + '건' : '') +
                (hit.conflict ? ' · 상반된 이력 ' + hit.conflict + '건' : '');
    if(corp)
      return {result:'corp', label: strong ? '법인카드 확인' : '법인카드 추정', basis:'bin',
              detail: src + T50_CORP_NOTE + (strong ? '' : ' · 담당자 확인 필요'),
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
function t50CorpDecide(cardNo, kind, by){
  const corp = (kind === 'corp');
  t50LearnBin(cardNo, corp ? 'corp' : 'personal', '담당자 확정에서 학습');
  return {
    result: corp ? 'corp' : 'personal',
    label: corp ? '법인카드 확정(담당자)' : '개인카드 확정(담당자)',
    basis: 'manual',
    detail: '담당자 ' + (by || '') + ' 확인 — ' +
            (corp ? '법인카드 결제로 확정' + T50_CORP_NOTE : '개인카드 결제로 확정') +
            ' · 카드 앞자리는 BIN 판정표에 반영됨',
    by: by || '',
    ts: new Date().toISOString().slice(0, 16).replace('T', ' '),
    needsReview: false
  };
}

/* 표시용 색상·아이콘 */
function t50CorpColor(chk){
  if(!chk) return '#64748b';
  if(chk.result === 'corp') return '#b45309';        /* 법인카드는 환급 대상이 아니므로 주의색 */
  if(chk.result === 'personal') return chk.needsReview ? '#64748b' : '#0f766e';
  return '#64748b';
}
function t50CorpIcon(chk){
  if(!chk) return '\u2022';
  if(chk.result === 'corp') return '\ud83c\udfe2';
  if(chk.result === 'personal') return chk.needsReview ? '\ud83d\udcb3?' : '\ud83d\udcb3';
  return '\u2753';
}
