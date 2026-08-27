/* ============================================================
   시안 F — 지역사랑 휴가지원제(대한민국 반값여행) 공용 데이터 계층
   t50.html(신청자 화면) / admin.html(관리자 페이지) 가 같은 저장소를 본다.
   신청 데이터는 계정별 키(dtidF_t50Applies_<uid>)로 분리 저장되고,
   관리자 페이지는 전 계정을 집계해 심사한다.
   ※ 승인/반려·결과통보·환급심사는 관리자 페이지에서만 수행한다.
   ============================================================ */

const FT50_AP_PREFIX  = 'dtidF_t50Applies_';
const FT50_CFG_KEY    = 'dtidF_t50BizCfg';
const FT50_PERSONA_KEY= 'dtidF_admPersona';
const FT50_ID_PREFIX  = 'dtidF_t50Identity_';   /* 본인인증(PASS·행정정보 공동이용) 결과 */

/* ── 지원금액 · 환급률 (통합 기준값, 전국 공통) ────────────────
   개인 1인 10만원 / 팀 2인 이상 20만원 / 청년 1인 14만원 / 청년팀 2인 이상 28만원 /
   가족형 3~5인 50만원, 기본·청년 환급률 50% — 1차 분석안 16p 통합 적용값이다.
   54개 항목표에서 지원금액·환급률은 전부 "통합"으로 분류된 항목이라 지자체가
   개별로 바꿀 수 없다. 그래서 지역별 사업설정과 분리해 전국 공통 키에 두고,
   관리시스템에서도 공사 총괄 관리자만 입력·수정할 수 있게 한다.
   환급액은 "소비액 × 환급률"을 지원 한도로 자른 값이다. */
const FT50_GRANT_KEY = 'dtidF_t50GrantCfg';
const FT50_GRANT_DEFAULT = {solo:100000, team:200000, youthSolo:140000, youthTeam:280000,
                            family:500000, rate:50, youthRate:50, useEnd:'2026-12-31'};
const FT50_GRANT_FIELDS = [
  {k:'solo',      lb:'개인 1인',       un:'원'},
  {k:'team',      lb:'팀 2인 이상',     un:'원'},
  {k:'youthSolo', lb:'청년 1인',       un:'원'},
  {k:'youthTeam', lb:'청년팀 2인 이상', un:'원'},
  {k:'family',    lb:'가족형 3~5인',    un:'원'},
  {k:'rate',      lb:'기본 환급률',     un:'%'},
  {k:'youthRate', lb:'청년 환급률',     un:'%'}
];
const FT50_FAMILY_MAX = 5;                       /* 가족 단위 신청 시 본인 포함 최대 인원 */
/* ── 현장 사용처 — 「관내 가맹점」 ────────────────────────────
   16곳 모두 "관내 가맹점"으로 골격이 같고 명칭만 다르다(1차 분석안 6p).
   통합 적용값은 「관내 가맹점」으로 명칭을 통일한다(16p). */
const FT50_USE_SCOPE_LABEL = '관내 가맹점';
function ft50GrantCfg(){
  let c=null;
  try{ c=JSON.parse(localStorage.getItem(FT50_GRANT_KEY)||'null'); }catch(e){}
  return Object.assign({}, FT50_GRANT_DEFAULT, (c&&typeof c==='object')?c:{});
}
function ft50SaveGrantCfg(c){ localStorage.setItem(FT50_GRANT_KEY, JSON.stringify(c||{})); }
function ft50ResetGrantCfg(){ localStorage.removeItem(FT50_GRANT_KEY); }
/* 신청 건에 적용되는 지원 기준 — {key, label, cap} */
function ft50GrantOf(a){
  const g=ft50GrantCfg(), n=ft50PeopleNum(a);
  if(a.unit==='family'&&n>=3) return {key:'family', label:'가족형 3~5인', cap:g.family};
  if(n>=2) return a.youth?{key:'youthTeam', label:'청년팀 2인 이상', cap:g.youthTeam}
                         :{key:'team', label:'팀 2인 이상', cap:g.team};
  return a.youth?{key:'youthSolo', label:'청년 1인', cap:g.youthSolo}
                :{key:'solo', label:'개인 1인', cap:g.solo};
}
function ft50GrantCap(a){ return ft50GrantOf(a).cap; }
function ft50GrantRate(a){ const g=ft50GrantCfg(); return a.youth?g.youthRate:g.rate; }
/* 소비액 기준 환급액 — 환급률을 적용한 뒤 지원 한도로 자른다 */
function ft50RefundOf(a, spend){
  return Math.min(Math.floor((Number(spend)||0)*ft50GrantRate(a)/100), ft50GrantCap(a));
}
/* ── 지자체 설정값 스키마 (54개 항목) ────────────────────────
   1차 분석안 12p「관리자 화면 설정값 예시」와 「54항목 통합/옵션 분류」를 그대로
   스키마로 옮긴다. A안(단일 템플릿 + 설정값)의 핵심이 이 계층이라, 항목을 코드에
   흩뿌리지 않고 한 곳에 정의해 두고 화면이 이 정의를 읽어 렌더링한다.
   항목마다 성격이 셋이고, 성격에 따라 저장 위치와 수정 권한이 갈린다.
     fixed   16곳 이미 동일 — 변경 불가. 값만 보여준다(저장하지 않는다)
     unified 통합 — 최다값으로 통일한 전국 공통값. 공사 총괄 관리자만 수정
     option  옵션 — 지자체 사정(예산·인력·상권)에 종속. 지자체 담당자가 선택
   type: select(드롭다운) · toggle(ON/OFF) · number(숫자)
   ※ 여기 담긴 값은 지자체 협의 전 제안값이다(16p 단서와 동일). 협의 결과가
     나오면 def 값을 고치거나 관리자 화면에서 조정한다. */
const FT50_CFG_SCHEMA=[
 {group:'대상 · 신청 조건',items:[
  {k:'foreigner',   lb:'외국인 여부',      scope:'unified',type:'select',opts:['제외','허용'],def:'제외',
   note:'명시 제외 5곳 기준'},
  {k:'applyPerYear',lb:'연간 신청횟수',    scope:'unified',type:'select',opts:['연 1회','연 2회'],def:'연 1회',
   note:'연 1회 7곳 최다'},
  {k:'repAgeMin',   lb:'여행대표자 나이제한',scope:'unified',type:'number',def:18,un:'세 이상',
   note:'만 18세 이상 — 명시 3곳 중 2곳'},
  {k:'applyDeadline',lb:'신청 마감',       scope:'unified',type:'select',opts:['여행 1일 전','여행 2일 전','여행 5일 전'],def:'여행 1일 전',
   note:'여행 1일 전 9곳 최다'},
  {k:'officeHours', lb:'운영시간 제한',    scope:'option', type:'select',opts:['10~17시','09~18시','제한 없음'],def:'10~17시',
   note:'행정인력 여건에 종속 — 09~18시 7곳 협의 필요'},
  {k:'approveNotice',lb:'승인 안내 수단',  scope:'option', type:'select',opts:['알림톡','문자','발송 없음'],def:'알림톡',
   note:'알림톡 6곳 최다 · 문자 발송 지자체 협의 필요'},
  {k:'closeRule',   lb:'마감 기준',        scope:'option', type:'select',opts:['예산 소진','선착순'],def:'예산 소진',
   by:'ft50CloseState',note:'예산 소진 9곳 최다 · 확정 방침 「예산 기준」 — 예산 총액 도달 시 접수 마감'},
  {k:'youthQuota',  lb:'청년 선착순 제한', scope:'option', type:'toggle',on:'운영',off:'미운영',def:false,
   note:'예산 규모·인구에 종속 — 13곳 미표기 · 확정 방침 「별도 관리 불필요」로 정원 로직 미연결'},
  {k:'dtidRequired',lb:'디지털관광주민증',  scope:'unified',type:'toggle',on:'필수',off:'선택',def:true,
   by:'ft50DtidCheck',note:'확정 방침 — 주민증 서비스 가입자만 신청 가능(비로그인 접수 차단)'}
 ]},
 {group:'정산 · 지급',items:[
  {k:'settleDeadline',lb:'정산 신청 기한', scope:'unified',type:'select',opts:[5,7,10,14,15],def:10,un:'일',
   note:'여행 종료 후 10일 — 6곳 최다'},
  {k:'settleCount', lb:'정산 신청 횟수',   scope:'unified',type:'select',opts:['1회','2회'],def:'1회',
   note:'1회 8곳 최다'},
  {k:'settleUnit',  lb:'정산 단위',        scope:'option', type:'select',opts:['단위 없음','5천원','1만원'],def:'단위 없음',
   note:'13곳 미표기 · 고창·완도·남해 협의'},
  {k:'payoutDays',  lb:'지급 소요기간',    scope:'unified',type:'select',opts:[7,10,14,30],def:14,un:'일 이내',
   note:'14일 7곳 최다'}
 ]},
 {group:'결제 · 영수증 증빙',items:[
  {k:'payMethod',   lb:'주요 결제수단',    scope:'option', type:'select',
   opts:['Chak 앱','제로페이','코나아이 실물카드','비플페이','그리고 앱','월출페이','지역사랑카드'],def:'Chak 앱',
   note:'기존 결제인프라 계약에 종속 — Chak 6 · 제로페이 5'},
  {k:'payoutMethod',lb:'지급 수단',        scope:'option', type:'select',
   opts:['모바일 지역상품권','제로페이 PIN','코나아이 실물카드','비플페이 PIN','그리고 앱','월출페이 앱'],def:'모바일 지역상품권',
   note:'결제수단에 종속'},
  {k:'cardReceipt', lb:'카드영수증 업로드',scope:'option', type:'toggle',on:'허용',off:'차단',def:true,
   note:'인정 9곳 최다 · 불인정 지자체 협의 필요'},
  {k:'cashReceipt', lb:'현금영수증 업로드',scope:'option', type:'toggle',on:'허용',off:'차단',def:false,
   note:'불인정 11곳 최다 · 인정 지자체 협의 필요'},
  {k:'simpleReceipt',lb:'간이영수증 · 계좌이체',scope:'fixed',type:'select',
   def:function(){return FT50_ALWAYS_REJECT.join(' · ')+' 불인정';},by:'ft50EvNonCard',
   note:'16곳 동일 — 변경 불가'},
  {k:'corpReceipt', lb:'법인 · 타인명의 영수증',scope:'fixed',type:'select',def:'불인정',by:'ft50CorpCheck',
   note:'16곳 동일 — 변경 불가'},
  {k:'stayPrepay',  lb:'숙박 선결제 증빙', scope:'fixed', type:'select',
   def:function(){return '인정 (여행 시작일 기준 '+FT50_PREPAY_MAX_DAYS+'일 전까지)';},by:'ft50EvDateCheck',
   note:'16곳 동일 — 변경 불가'},
  {k:'stayDocRule', lb:'숙박 증빙서류',    scope:'fixed', type:'select',
   def:function(){return FT50_STAY_DOC_LABEL+' + 결제영수증';},by:'ft50EvStayCheck',
   note:'골격 16곳 공통 — 명칭 통일'}
 ]},
 {group:'인정 소비범위 · 사용처',items:[
  {k:'spendItems',  lb:'인정 항목',        scope:'fixed', type:'select',
   def:function(){return FT50_SPEND_CATS.map(function(c){return c.cat;}).join(' · ');},by:'ft50BizCheck',
   note:'골격 16곳 공통 — 표현 통일'},
  {k:'excludeBiz',  lb:'인정제외 업종',    scope:'fixed', type:'select',
   def:function(){return FT50_EXCLUDED_BIZ.map(function(b){return b.biz;}).join(' · ');},by:'ft50BizCheck',
   note:'핵심 5종 15곳 공통'},
  {k:'revenueLimit',lb:'연매출 기준제외',  scope:'unified',type:'select',opts:['30억 초과 제외','미적용'],def:'30억 초과 제외',
   note:'30억 기준 8곳 명시'},
  {k:'excludeStay', lb:'인정제외 숙박',    scope:'option', type:'toggle',on:'별도 표기',off:'미적용',def:false,
   note:'5곳 명시(횡성·강진·고흥·하동·남해)'},
  {k:'livingExclude',lb:'생활소비 · 특정서비스 제외',scope:'option',type:'toggle',on:'별도 표기',off:'미적용',def:false,
   note:'6곳 명시'},
  {k:'facilityExcept',lb:'특정시설 예외인정',scope:'option',type:'toggle',on:'인정',off:'예외 없음',def:false,
   note:'하동·남해 2곳만'},
  {k:'useScope',    lb:'현장 사용처',      scope:'fixed', type:'select',
   def:function(){return FT50_USE_SCOPE_LABEL;},by:'환급 완료 안내',
   note:'골격 16곳 공통 — 명칭 통일 (F는 결제 화면이 없어 안내 표기까지 반영)'},
  {k:'onlineShop',  lb:'온라인 사용처',    scope:'option', type:'toggle',on:'지역쇼핑몰 허용',off:'없음',def:true,
   note:'지역쇼핑몰 9곳 최다'},
  {k:'deliveryApp', lb:'배달앱 사용',      scope:'option', type:'toggle',on:'허용',off:'불허',def:false,
   note:'밀양만 가능 — 협의 필요'},
  {k:'giftRefund',  lb:'상품권 환불규정',  scope:'unified',type:'toggle',on:'명문화',off:'미표기',def:true,
   note:'명시 6곳 기준'}
 ]},
 {group:'관광지 방문 인증',items:[
  {k:'visitCount',  lb:'방문 필수 개소수', scope:'option', type:'select',opts:['1개소','2개소 이상'],def:'2개소 이상',
   note:'지역 관광자원 밀도 차이 — 2개소 이상 10곳 최다'},
  {k:'spotRule',    lb:'관광지 기준',      scope:'unified',type:'select',opts:['지정관광지','숙박시설'],def:'지정관광지',
   note:'지정관광지 15곳 최다'},
  {k:'photoRule',   lb:'사진 조건',        scope:'fixed', type:'select',def:'얼굴 포함 인증사진',
   note:'16곳 공통 — 방문 인증 절차 미구현으로 현재는 표기용'},
  {k:'metaCheck',   lb:'메타데이터 확인',  scope:'option', type:'toggle',on:'적용',off:'미적용',def:false,
   note:'기술역량 종속 — 밀양 1곳만'},
  {k:'merchantLimit',lb:'가맹점당 소비한도',scope:'option',type:'number',def:0,un:'원',zero:'한도 없음',
   note:'평창·제천만 한도 존재 · 확정 방침 「누적액 상한 불필요」로 검증 미연결'},
  {k:'revisitBonus',lb:'재방문 추가혜택',  scope:'option', type:'toggle',on:'운영',off:'미운영',def:false,
   note:'영암만 운영 — 추후 논의 대상(환급 가산 로직 미연결)'}
 ]}
];
const FT50_CFG_SCOPE_LABEL={fixed:'고정',unified:'통합',option:'옵션'};
const FT50_CFG_SCOPE_COLOR={fixed:'#64748b',unified:'#1d4ed8',option:'#047857'};

/* 통합(unified) 값은 전국 공통이라 지역별 사업설정과 분리해 따로 저장한다 */
const FT50_UNIFIED_KEY='dtidF_t50UnifiedCfg';
function ft50UnifiedCfg(){
  try{const c=JSON.parse(localStorage.getItem(FT50_UNIFIED_KEY)||'null');return (c&&typeof c==='object')?c:{};}
  catch(e){return {};}
}
function ft50SaveUnifiedCfg(c){localStorage.setItem(FT50_UNIFIED_KEY,JSON.stringify(c||{}));}
function ft50ResetUnifiedCfg(){localStorage.removeItem(FT50_UNIFIED_KEY);}

function ft50CfgItems(){
  return FT50_CFG_SCHEMA.reduce(function(a,g){return a.concat(g.items);},[]);
}
function ft50CfgItem(k){
  return ft50CfgItems().filter(function(i){return i.k===k;})[0]||null;
}
/* 기본값 — 함수로 정의된 항목은 그때 평가한다.
   고정 항목의 값을 화면용으로 따로 적어두면 실제 동작과 어긋나므로, 판정에 쓰는
   상수(FT50_EXCLUDED_BIZ 등)를 스키마가 직접 읽게 하기 위한 장치다. 이 파일은
   스키마가 해당 상수보다 위에 정의돼 있어 지연 평가가 반드시 필요하다. */
function ft50CfgDef(it){return (typeof it.def==='function')?it.def():it.def;}
/* 설정값 읽기 — fixed는 정의값, unified는 전국 공통, option은 지자체별 */
function ft50CfgVal(region,k){
  const it=ft50CfgItem(k);
  if(!it)return null;
  if(it.scope==='fixed')return ft50CfgDef(it);
  if(it.scope==='unified'){
    const c=ft50UnifiedCfg();
    return (k in c)?c[k]:ft50CfgDef(it);
  }
  const o=ft50RegionCfg(region).opt||{};
  return (k in o)?o[k]:ft50CfgDef(it);
}
/* 화면에 그대로 쓸 수 있는 문구 */
function ft50CfgText(region,k){
  const it=ft50CfgItem(k);
  if(!it)return '';
  const v=ft50CfgVal(region,k);
  if(it.type==='toggle')return v?it.on:it.off;
  if(it.type==='number'){
    if(it.zero&&!Number(v))return it.zero;
    return Number(v).toLocaleString('ko-KR')+(it.un||'');
  }
  return String(v)+(it.un||'');
}
function ft50SetUnified(k,v){
  const c=ft50UnifiedCfg();c[k]=v;ft50SaveUnifiedCfg(c);
}
function ft50SetOption(region,k,v){
  const o=Object.assign({},ft50RegionCfg(region).opt||{});
  o[k]=v;
  ft50SetRegionCfg(region,{opt:o});
}
/* 지자체 담당자가 만질 수 있는 항목인가 — option만 가능하고 unified는 공사 전용 */
function ft50CfgEditable(it){
  if(!it||it.scope==='fixed')return false;
  return it.scope==='option'?true:ft50IsHQ();
}

/* ── 접수 마감 판정 ──────────────────────────────────────────
   마감 기준(closeRule)은 지자체 선택 항목이고, 확정 방침은 「예산 기준」이다.
     예산 소진  지자체 예산 총액을 환급 집행액이 채우면 마감 (9곳 최다 · 기본값)
     선착순    사업설정의 정원(capacity)을 신청 인원이 채우면 마감
   예산 총액이 0(미설정)이면 예산 소진 판정을 하지 않는다 — 총액을 넣지 않은
   지자체의 접수가 통째로 막히면 안 되기 때문이다. */
function ft50CloseState(region){
  const cfg = ft50RegionCfg(region);
  const rule = ft50CfgVal(region, 'closeRule');
  if(rule === '선착순'){
    const used = ft50UsedCount(region);
    return {rule:rule, closed:used >= cfg.capacity, used:used, cap:cfg.capacity,
      msg:'선착순 — 정원 ' + cfg.capacity + '명 중 ' + used + '명 접수'};
  }
  const bud = Number(cfg.budget) || 0, spent = ft50BudgetUsed(region);
  if(!bud) return {rule:rule, closed:false, used:spent, cap:0,
    msg:'예산 총액 미설정 — 예산 소진 판정 없음'};
  const pct = Math.min(100, Math.round(spent / bud * 1000) / 10);
  return {rule:rule, closed:spent >= bud, used:spent, cap:bud, pct:pct,
    msg:'예산 소진율 ' + pct + '% (' + spent.toLocaleString('ko-KR') + ' / ' + bud.toLocaleString('ko-KR') + '원)'};
}

/* ── 디지털관광주민증 필수화 ─────────────────────────────────
   '27년 전체 필수 전환 방침에 따라, 필수로 설정된 지자체는 주민증 서비스
   가입자만 신청할 수 있다. 이 프로토타입에서 가입 여부는 로그인 계정 보유로
   판단한다(비로그인 = guest). 통과하면 null, 아니면 {code, msg}. */
function ft50DtidCheck(region, uid){
  if(!ft50CfgVal(region, 'dtidRequired')) return null;
  if(uid && uid !== 'guest') return null;
  return {code:'nodtid',
    msg:'\u274c <b>디지털관광주민증 가입자만 신청할 수 있습니다.</b> ' +
        '이 지자체는 주민증 발급(서비스 가입)을 신청 조건으로 두고 있습니다. ' +
        '로그인 후 다시 신청해 주세요.'};
}

/* ── 설정값 안내 문구 ────────────────────────────────────────
   1차 분석안 8p — 유형A(안내 누락)·유형B(선택지 분리) 항목은 "개발 영역이 아님,
   문구 작성 영역"으로 분류돼 있다. 지역별 화면을 따로 만들지 않고 설정값을 문구로
   풀어 보여주는 것이 A안(단일 템플릿)의 요체라, 어느 단계에서 무엇을 보여줄지도
   화면 코드가 아니라 이 표에 둔다.
   stage: intro(사업안내) · apply(신청) · settle(정산) · refund(환급)
   fmt 가 빈 문자열을 돌려주면 그 줄은 표시하지 않는다(해당 없음). */
const FT50_GUIDE = [
  {stage:'intro', k:'foreigner',     fmt:function(v){return v==='제외'?'외국인은 신청할 수 없습니다.':'외국인도 신청할 수 있습니다.';}},
  {stage:'intro', k:'applyPerYear',  fmt:function(v){return '1인당 '+v+' 신청할 수 있습니다.';}},
  {stage:'intro', k:'repAgeMin',     fmt:function(v){return '여행 대표자는 만 '+Number(v)+'세 이상이어야 합니다.';}},
  {stage:'intro', k:'officeHours',   fmt:function(v){return v==='제한 없음'?'접수 운영시간 제한이 없습니다.':'접수·상담 운영시간은 '+v+'입니다.';}},
  {stage:'intro', k:'spotRule',      fmt:function(v){return '방문 인증은 '+v+' 기준입니다.';}},
  {stage:'intro', k:'revenueLimit',  fmt:function(v){return v==='미적용'?'':'연매출 30억원을 초과하는 가맹점 결제는 인정되지 않습니다.';}},
  {stage:'intro', k:'excludeStay',   fmt:function(v){return v?'일부 숙박업소는 인정 대상에서 제외됩니다(지자체 별도 안내).':'';}},
  {stage:'intro', k:'livingExclude', fmt:function(v){return v?'생활소비·특정 서비스 결제는 인정되지 않습니다(지자체 별도 안내).':'';}},
  {stage:'intro', k:'facilityExcept',fmt:function(v){return v?'일부 시설은 예외로 인정됩니다(지자체 별도 안내).':'';}},
  {stage:'apply', k:'dtidRequired',  fmt:function(v){return v?'디지털관광주민증 가입자만 신청할 수 있습니다.':'';}},
  {stage:'apply', k:'closeRule',     fmt:function(v){return v==='선착순'?'정원이 차면 접수가 마감됩니다.':'예산이 소진되면 접수가 마감됩니다.';}},
  {stage:'apply', k:'applyDeadline', fmt:function(v){return '신청 마감은 '+v+'입니다.';}},
  {stage:'apply', k:'approveNotice', fmt:function(v){return v==='발송 없음'?'승인 결과는 마이페이지에서 확인해 주세요.':'승인 결과 통보: '+v;}},
  {stage:'settle',k:'settleCount',   fmt:function(v){return '정산은 신청 건당 '+v+'만 신청할 수 있습니다.';}},
  {stage:'settle',k:'settleUnit',    fmt:function(v){return v==='단위 없음'?'':'정산 금액은 '+v+' 단위로 계산됩니다.';}},
  {stage:'refund',k:'payoutDays',    fmt:function(v){return '환급금은 정산 승인 후 '+Number(v)+'일 이내 지급됩니다.';}},
  {stage:'refund',k:'payoutMethod',  fmt:function(v){return '환급금 지급수단: '+v;}},
  {stage:'refund',k:'onlineShop',    fmt:function(v){return v?'환급금은 지역쇼핑몰에서도 사용할 수 있습니다.':'환급금은 온라인에서는 사용할 수 없습니다.';}},
  {stage:'refund',k:'deliveryApp',   fmt:function(v){return v?'배달앱 결제에도 사용할 수 있습니다.':'배달앱 결제에는 사용할 수 없습니다.';}},
  {stage:'refund',k:'giftRefund',    fmt:function(v){return v?'상품권 환불은 지자체 환불규정에 따릅니다.':'';}}
];
/* 해당 단계의 안내 문구 목록 — 설정값이 바뀌면 문구도 함께 바뀐다 */
function ft50GuideLines(region, stages){
  const want = [].concat(stages);
  return FT50_GUIDE.filter(function(g){ return want.indexOf(g.stage) >= 0; })
    .map(function(g){
      if(!ft50CfgItem(g.k)) return '';
      try{ return g.fmt(ft50CfgVal(region, g.k)) || ''; }catch(e){ return ''; }
    })
    .filter(function(s){ return !!s; });
}
/* 화면에 그대로 넣을 수 있는 안내 블록 */
function ft50GuideHtml(region, stages, cls, title){
  const lines = ft50GuideLines(region, stages);
  if(!lines.length) return '';
  return '<div class="' + (cls || '') + '">' + (title ? '<b>' + title + '</b><br>' : '') +
    lines.map(function(l){ return '· ' + l; }).join('<br>') + '</div>';
}

/* ── 정산 신청 기한 판정 ─────────────────────────────────────
   설정값 settleDeadline(여행 종료 후 N일) 안에 제출해야 정산이 접수된다.
   기한은 통합 항목이라 전국 공통값이지만, 신청 화면은 지자체 설정을 그대로 읽는
   구조를 지켜 region 을 받아 판정한다(옵션으로 바뀌어도 화면은 그대로 동작한다). */
function ft50SettleDue(a){
  const days=Number(ft50CfgVal(a.region,'settleDeadline'))||0;
  /* 날짜 계산은 UTC 기준으로 한다 — 로컬 시각으로 파싱하면 toISOString 에서
     시차만큼 밀려 마감일이 하루 앞당겨진다(KST 기준 -1일) */
  const end=Date.parse(a.end+'T00:00:00Z');
  if(isNaN(end)) return null;
  return new Date(end+days*86400000).toISOString().slice(0,10);
}
/* 통과하면 null, 기한이 지났으면 {code:'late', due, msg} */
function ft50SettleCheck(a,today){
  const due=ft50SettleDue(a);
  if(!due) return null;
  today=today||ft50Today();
  if(today<=due) return null;
  return {code:'late', due:due,
    msg:'\u274c <b>정산 신청 기한이 지났습니다.</b> 이 신청 건의 정산 기한은 여행 종료('+a.end+') 후 '+
        ft50CfgText(a.region,'settleDeadline')+'인 <b>'+due+'</b>까지입니다. 기한이 지난 건은 담당 지자체에 문의해 주세요.'};
}
/* 남은 기한 안내 문구 */
function ft50SettleDueText(a,today){
  const due=ft50SettleDue(a);
  if(!due) return '';
  const d=ft50DayDiff(today||ft50Today(), due);
  if(isNaN(d)) return '';
  if(d<0) return '정산 신청 기한 경과 \u2014 기한 '+due;
  return '정산 신청 기한 · 여행 종료 후 '+ft50CfgText(a.region,'settleDeadline')+' \u2014 '+due+'까지 ('+d+'일 남음)';
}

/* ── 상품권 사용기한 ─────────────────────────────────────────
   16곳 모두 2026.12.31.로 이미 같은 항목이라(1차 분석안 6p) 통합 적용값도 그대로
   쓴다(16p). 해가 바뀌면 날짜만 바뀌는 값이라 설정값으로 빼되, 16곳 공통 항목이라
   지자체가 아니라 공사 총괄 관리자가 관리한다.
   기한이 지나면 잔액을 쓸 수 없고 회수 대상이 된다. 사용자 화면에는 템플릿
   구성(17p)의 "사용기한 카운트 다운"으로 남은 일수를 보여준다. */
function ft50UseEnd(){ return ft50GrantCfg().useEnd||FT50_GRANT_DEFAULT.useEnd; }
function ft50UseDaysLeft(today){
  return ft50DayDiff(today||ft50Today(), ft50UseEnd());
}
function ft50UseExpired(today){
  const d=ft50UseDaysLeft(today);
  return !isNaN(d)&&d<0;
}
/* 사용기한 안내 — 남은 일수에 따라 단계를 나눠 문구·색을 다르게 준다 */
function ft50UseEndInfo(today){
  const d=ft50UseDaysLeft(today), e=ft50UseEnd().replace(/-/g,'.');
  if(isNaN(d)) return {state:'none', days:NaN, date:e, msg:''};
  if(d<0)   return {state:'expired', days:d, date:e, msg:'⛔ 사용기한 만료 ('+e+') — 잔액을 사용할 수 없습니다'};
  if(d===0) return {state:'today',   days:d, date:e, msg:'⏰ 오늘이 사용기한 마지막 날입니다 ('+e+')'};
  if(d<=30) return {state:'soon',    days:d, date:e, msg:'⏰ 사용기한 '+e+' — <b>'+d+'일</b> 남았습니다'};
  return      {state:'ok',      days:d, date:e, msg:'🗓 사용기한 '+e+' — '+d+'일 남음'};
}
function ft50UseEndColor(info){
  if(!info) return 'var(--sub)';
  if(info.state==='expired') return '#b91c1c';
  if(info.state==='today'||info.state==='soon') return '#b45309';
  return 'var(--sub)';
}

/* 지자체 예산 총액 집행분 — "마감 기준 = 예산 소진" 판정용. 0이면 미설정 */
function ft50BudgetUsed(region){
  return ft50All().filter(function(x){ return x.a.region===region&&x.a.status==='refund_ok'; })
    .reduce(function(s,x){ return s+(x.a.refundAmount||0); }, 0);
}

const FT50_ST = {
  received:  {t:'접수 대기',      lane:'공사',   ic:'📥', cls:'n'},
  review:    {t:'검토중',         lane:'지자체', ic:'🔎', cls:'o'},
  apply_fix: {t:'신청 보완 요청', lane:'지자체', ic:'✏️', cls:'o'},
  approved:  {t:'승인',           lane:'지자체', ic:'✅', cls:'g'},
  notified:  {t:'결과 통보 완료', lane:'공사',   ic:'📨', cls:'g'},
  refund_req:{t:'환급 심사 대기', lane:'지자체', ic:'🧾', cls:'p'},
  refund_fix:{t:'증빙 보완 요청', lane:'지자체', ic:'✏️', cls:'o'},
  refund_ok: {t:'환급 완료',      lane:'지자체', ic:'💰', cls:'g'},
  rejected:  {t:'반려',           lane:'지자체', ic:'⛔', cls:'o'},
  canceled:  {t:'신청 취소',      lane:'신청자', ic:'↩',  cls:'n'}
};
/* 정상 진행 경로 — 타임라인 표시 순서 */
const FT50_FLOW = ['received','review','approved','notified','refund_req','refund_ok'];
const FT50_INACTIVE = ['rejected','canceled'];

/* 지자체별 여행 가능기간 시드값 (지자체가 사업설정에서 변경 가능) */
const FT50_LEGACY_PERIODS={
  '영광':{s:'2026-07-01',e:'2026-08-31'},'해남':{s:'2026-07-15',e:'2026-09-30'},
  '완도':{s:'2026-07-07',e:'2026-08-24'},'강진':{s:'2026-08-01',e:'2026-10-31'},
  '고창':{s:'2026-09-01',e:'2026-10-31'},'거창':{s:'2026-08-16',e:'2026-11-15'},
  '하동':{s:'2026-06-01',e:'2026-06-30'},'횡성':{s:'2026-06-01',e:'2026-07-15'},
  '고흥':{s:'2026-05-15',e:'2026-06-30'},'영암':{s:'2026-06-10',e:'2026-07-20'},
  '남해':{s:'2026-05-01',e:'2026-06-15'},'밀양':{s:'2026-06-01',e:'2026-06-30'},
  '제천':{s:'2026-05-20',e:'2026-06-30'},'합천':{s:'2026-06-15',e:'2026-07-31'},
  '영월':{s:'2026-06-01',e:'2026-07-31'},'평창':{s:'2026-07-01',e:'2026-09-15'}
};

function ft50Regions(){ return (typeof TOUR50_REGIONS!=='undefined')?TOUR50_REGIONS:[]; }
function ft50PeopleNum(a){ return a.people==='6'?6:(Number(a.people)||1); }
function ft50Won(n){ return (n||0).toLocaleString('ko-KR')+'원'; }
function ft50Today(){ return new Date().toISOString().slice(0,10); }
function ft50Dot(d){ return d?String(d).replace(/-/g,'.'):''; }

/* ── 지자체 사업설정 (사업개설 · 신청기간 · 여행 가능기간 · 신청인원조건 · 공지) ── */
function ft50DefaultCfg(name){
  const r=ft50Regions().find(x=>x.name===name);
  const p=FT50_LEGACY_PERIODS[name];
  return {
    open:r?r.status==='open':true,
    applyStart:'2020-01-01', applyEnd:'2030-12-31',
    travelStart:p?p.s:'2026-01-01', travelEnd:p?p.e:'2026-12-31',
    capacity:200, minPeople:1, maxPeople:6, budget:0,
    notices:[]
  };
}
function ft50AllCfg(){ try{ return JSON.parse(localStorage.getItem(FT50_CFG_KEY)||'{}'); }catch(e){ return {}; } }
function ft50RegionCfg(name){ return Object.assign({}, ft50DefaultCfg(name), ft50AllCfg()[name]||{}); }
function ft50SetRegionCfg(name,patch){
  const all=ft50AllCfg();
  all[name]=Object.assign({}, ft50RegionCfg(name), patch);
  localStorage.setItem(FT50_CFG_KEY,JSON.stringify(all));
  return all[name];
}
function ft50InApplyPeriod(cfg,today){
  today=today||ft50Today();
  return today>=cfg.applyStart && today<=cfg.applyEnd;
}

/* ── 신청 데이터 (계정별 분리 저장) ── */
function ft50Key(uid){ return FT50_AP_PREFIX+uid; }
function ft50LoadKey(k){ try{ return JSON.parse(localStorage.getItem(k)||'[]'); }catch(e){ return []; } }
function ft50SaveKey(k,list){ localStorage.setItem(k,JSON.stringify(list)); }
function ft50My(uid){ return ft50LoadKey(ft50Key(uid)); }
function ft50SaveMy(uid,list){ ft50SaveKey(ft50Key(uid),list); }
function ft50AppKeys(){
  const ks=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&k.indexOf(FT50_AP_PREFIX)===0) ks.push(k);
  }
  return ks;
}
/* [{k:저장키, i:index, a:신청}] — 관리자 페이지의 전 계정 집계 */
function ft50All(){
  const out=[];
  ft50AppKeys().forEach(function(k){
    ft50LoadKey(k).forEach(function(a,i){ out.push({k:k,i:i,a:a}); });
  });
  return out;
}
function ft50Uid(k){ return k.slice(FT50_AP_PREFIX.length); }
/* 지역별 접수 인원(취소·반려 제외) — 사업설정 capacity와 비교 */
function ft50UsedCount(region){
  return ft50All().filter(x=>x.a.region===region&&FT50_INACTIVE.indexOf(x.a.status)<0)
    .reduce((s,x)=>s+ft50PeopleNum(x.a),0);
}

/* ── 인정 소비범위 · 인정 제외업종 ───────────────────────────
   인정항목은 16곳이 "숙박·음식·관광·체험·쇼핑"으로 골격이 같고 표현만 다르며,
   통합 적용값은 이 5종으로 표현을 통일한다(1차 분석안 6p·16p).
   인정 제외업종은 주유소·금은방·유흥·학원·카센터 5종이 15곳 공통이다(고흥만 상이).
   영수증 OCR이 읽어낸 가맹점 상호로 1차 판정하되, 상호는 오독이 잦으므로
     · 제외업종 키워드가 잡히면 → 반려 (부정수급 방지가 우선)
     · 인정 5종 키워드가 잡히면 → 통과, 어느 항목인지 표시
     · 어느 쪽도 아니면        → 통과시키되 담당자 확인 대상으로 표시
   로 나눈다. 상호를 못 읽었다고 정상 신청을 막지 않으면서, 확인되지 않은 건이
   자동 통과로 위장되지도 않게 하는 것이 목적이다. 담당자는 「판독값 보정」으로
   상호를 고쳐 재판정할 수 있다(관리시스템은 저장된 상호로 매번 다시 판정한다).
   ※ 키워드 표는 데모용이다. 운영에서는 가맹점 DB의 업종코드로 판정해야 하며,
     "연매출 30억 기준 제외"도 그 DB가 있어야 판정할 수 있다. */
const FT50_SPEND_CATS = [
  {cat:'숙박', kw:['호텔','모텔','펜션','리조트','게스트하우스','민박','콘도','한옥','스테이','글램핑','캠핑','야영장','유스호스텔']},
  {cat:'음식', kw:['식당','음식','한식','중식','일식','양식','분식','국밥','갈비','횟집','해장','카페','커피','베이커리','제과','제빵','치킨','피자','뷔페','국수','칼국수']},
  {cat:'관광', kw:['관광','박물관','미술관','전시','수목원','식물원','동물원','아쿠아리움','케이블카','유람선','전망대','테마파크','기념관','민속촌','관람']},
  {cat:'체험', kw:['체험','공방','클래스','승마','카약','서핑','래프팅','짚라인','도자기','농장','목장','레저','액티비티','공예']},
  {cat:'쇼핑', kw:['마트','상회','특산','기념품','상점','쇼핑','상사','로컬푸드','하나로','전통시장','판매장','직판장','농협']}
];
const FT50_EXCLUDED_BIZ = [
  {biz:'주유소', kw:['주유소','주유','SK에너지','현대오일','오일뱅크','칼텍스','에쓰오일','SOIL','충전소','LPG']},
  {biz:'금은방', kw:['금은방','귀금속','보석','쥬얼리','주얼리']},
  {biz:'유흥',   kw:['유흥','단란주점','룸살롱','나이트클럽','노래방','노래연습장','캬바레','성인용품']},
  {biz:'학원',   kw:['학원','교습소','어학원','입시','과외']},
  {biz:'카센터', kw:['카센터','카센타','정비소','자동차정비','타이어','공업사']}
];
/* 상호 비교용 정규화 — 공백·구분기호를 없애고 대문자로 맞춘다 (S-OIL → SOIL) */
function ft50BizNorm(s){ return String(s || '').replace(/[\s\-·.,()]/g, '').toUpperCase(); }
function ft50BizHit(norm, kw){ return kw.some(function(w){ return norm.indexOf(ft50BizNorm(w)) >= 0; }); }
/* 가맹점 상호로 소비 인정 여부를 판정한다 — {result, label, detail, cat|biz} */
function ft50BizCheck(shop){
  const s = ft50BizNorm(shop);
  if(!s) return {result:'unknown', label:'가맹점 확인 불가',
    detail:'상호를 읽지 못해 업종을 판정하지 못했습니다. 담당자가 영수증 원본으로 확인합니다.'};
  const ex = FT50_EXCLUDED_BIZ.filter(function(b){ return ft50BizHit(s, b.kw); })[0];
  if(ex) return {result:'excluded', biz:ex.biz, label:'제외 업종 — ' + ex.biz,
    detail:'주유소·금은방·유흥·학원·카센터는 통합 기준 공통 제외 업종입니다(15곳 공통).'};
  const inc = FT50_SPEND_CATS.filter(function(c){ return ft50BizHit(s, c.kw); })[0];
  if(inc) return {result:'included', cat:inc.cat, label:'인정 항목 — ' + inc.cat,
    detail:'인정 소비범위(숙박·음식·관광·체험·쇼핑) 중 ' + inc.cat + '에 해당합니다.'};
  return {result:'unknown', label:'업종 확인 필요',
    detail:'인정 5종·제외 5종 어디에도 해당하지 않아 담당자가 영수증 원본으로 확인합니다.'};
}
function ft50BizBadgeCls(c){
  if(!c) return 'n';
  if(c.result === 'excluded') return 'o';
  if(c.result === 'included') return 'g';
  return 'n';
}
function ft50BizIcon(c){
  if(!c) return '\u2022';
  if(c.result === 'excluded') return '\ud83d\udeab';
  if(c.result === 'included') return '\u2705';
  return '\u2753';
}
function ft50BizRejectMsg(c, shop){
  return '❌ <b>인정 제외업종입니다.</b> 영수증의 가맹점 <b>' + (shop || '-') + '</b> — <b>' + c.biz +
    '</b> 업종으로 판독되었습니다. 주유소·금은방·유흥·학원·카센터는 통합 기준 공통 제외 업종이라 환급 대상이 아닙니다. ' +
    '상호를 잘못 읽은 것이라면 다른 증빙을 첨부하거나 담당 지자체에 문의해 주세요.';
}

/* ── 간이영수증 · 계좌이체 불인정 ────────────────────────────
   16개 지자체가 전부 불인정으로 이미 같은 항목이다(1차 분석안 6p·16p).
   카드 매출전표가 아닌 전표를 걸러내는 판별(ft50EvNonCard)에서 함께 잡고,
   안내 문구로 "왜 안 되는지"를 이 두 유형에만 덧붙인다. */
const FT50_ALWAYS_REJECT = ['간이영수증', '계좌이체 확인증'];
function ft50NonCardNote(reason){
  return (FT50_ALWAYS_REJECT.indexOf(reason) >= 0)
    ? ' 간이영수증과 계좌이체 확인증은 <b>16개 지자체 모두 정산 증빙으로 인정하지 않습니다.</b>'
    : '';
}

/* ── 숙박 증빙서류 ───────────────────────────────────────────
   16개 지자체가 모두 "숙박확인서 + 결제영수증"을 숙박 증빙의 골격으로 두고
   있고 명칭만 숙박확인서·숙박증명서·투숙확인서 등으로 갈린다(1차 분석안 6p).
   통합 적용값은 「숙박확인서」로 명칭을 통일한다(16p).
   결제영수증만으로는 실제 투숙 여부를 알 수 없어 숙소가 발급한 확인서를 함께
   받아야 정산이 성립한다. 숙박 선결제 인정도 숙박 건에만 적용되므로, 선결제
   신고는 숙박비 결제 건으로 표시한 경우에만 유효하다. */
const FT50_STAY_DOC_LABEL = '숙박확인서';
/* 숙박 증빙 판정 — 통과하면 null, 아니면 {code, msg}
   stay: 숙박비 결제 건인지, doc: 첨부한 숙박확인서 {name,size} (없으면 null) */
function ft50EvStayCheck(stay, doc){
  if(!stay) return null;
  if(!doc || !doc.name) return {code:'nodoc',
    msg:'❌ <b>' + FT50_STAY_DOC_LABEL + '가 첨부되지 않았습니다.</b> 숙박비를 결제한 건은 결제영수증과 ' +
        FT50_STAY_DOC_LABEL + '를 함께 제출해야 합니다. 숙소에서 발급받은 ' + FT50_STAY_DOC_LABEL +
        '(숙박증명서·투숙확인서 등 명칭이 달라도 됩니다)를 첨부해 주세요.'};
  return null;
}

/* ── 숙박 선결제 인정 ────────────────────────────────────────
   숙박비는 예약할 때 미리 결제하는 것이 보통이라 16개 지자체가 모두 "숙박 선결제
   인정"을 공통 기준으로 두고 있다(반값여행 통합 플랫폼 1차 분석안 6p·16p).
   그런데 결제일을 여행기간과만 대조하면 여행 전에 결제한 숙박비가 전부 반려된다.
   그래서 신청자가 "숙박 선결제"로 신고한 건은 여행 시작 전 결제도 인정하되,
   여행과 무관한 오래된 결제까지 들어오지 않도록 인정 기간을 둔다.
   ※ 인정 기간은 통합 플랫폼에서 지자체 설정값으로 빼야 할 항목이다. */
const FT50_PREPAY_MAX_DAYS = 180;
/* 'YYYY-MM-DD' 두 날짜의 일수 차 (to - from). 파싱 실패 시 NaN */
function ft50DayDiff(from, to){
  const a = Date.parse(from + 'T00:00:00'), b = Date.parse(to + 'T00:00:00');
  return (isNaN(a) || isNaN(b)) ? NaN : Math.round((b - a) / 86400000);
}
/* 결제일 판정 — 통과하면 null, 아니면 {code, msg}
   after  : 여행 종료 후 결제        before : 여행 시작 전 결제인데 선결제 미신고
   toofar : 선결제 신고했으나 인정 기간(FT50_PREPAY_MAX_DAYS)을 넘김 */
function ft50EvDateCheck(a, date, prepay){
  if(!date) return {code:'empty', msg:'결제일(영수증의 승인·결제 날짜)을 입력해 주세요'};
  if(date > a.end) return {code:'after',
    msg:'❌ <b>결제일이 여행기간 밖입니다.</b> 결제일은 <b>' + date + '</b>이나, 이 신청 건의 여행기간은 <b>' +
        a.start + ' ~ ' + a.end + '</b>입니다. 여행이 끝난 뒤 결제한 영수증은 환급 대상이 아닙니다.'};
  if(date >= a.start) return null;
  if(!prepay) return {code:'before',
    msg:'❌ <b>여행 시작 전에 결제한 영수증입니다.</b> 결제일은 <b>' + date + '</b>이나, 이 신청 건의 여행 시작일은 <b>' +
        a.start + '</b>입니다. 예약할 때 미리 결제한 <b>숙박비</b>라면 「숙박비 결제 건」과 「숙박 선결제」에 체크하고 ' +
        FT50_STAY_DOC_LABEL + '를 첨부한 뒤 다시 제출해 주세요. ' +
        '숙박 외 항목은 여행기간 중에 결제한 영수증만 환급 대상입니다.'};
  const d = ft50DayDiff(date, a.start);
  if(isNaN(d) || d > FT50_PREPAY_MAX_DAYS) return {code:'toofar',
    msg:'❌ <b>숙박 선결제 인정 기간을 벗어났습니다.</b> 결제일 <b>' + date + '</b>은 여행 시작일(' + a.start + ') 기준 ' +
        (isNaN(d) ? '확인 불가' : d + '일 전') + '으로, 인정 기간 ' + FT50_PREPAY_MAX_DAYS + '일을 넘습니다.'};
  return null;
}
/* 판독 결과 화면에 붙이는 결제일 표시 문구 */
function ft50EvDateBadge(a, date, prepay){
  const r = ft50EvDateCheck(a, date, prepay);
  if(!r) return (date < a.start) ? ' ✅ 숙박 선결제 인정' : ' ✅ 여행기간 내';
  if(r.code === 'before') return ' ⚠️ 여행 시작 전 결제 — 숙박 선결제 확인 필요';
  return ' ⚠️ 여행기간 밖';
}

/* ── 증빙 중복 제출 차단 ─────────────────────────────────────
   같은 영수증을 다시 제출하는 것이 가장 흔한 부정수급 유형이다.
   ① 승인번호가 같은 건, 또는 ② 카드 앞자리·결재금액·결제일이 모두 같은 건이
   다른 신청 건(다른 계정 포함)에 이미 있으면 중복으로 판정한다.
   취소·반려된 건은 환급이 이뤄지지 않았으므로 대상에서 제외한다. */
const FT50_DUP_EXCLUDE = ['canceled', 'rejected'];
function ft50NormAppr(v){ return String(v || '').replace(/[^0-9]/g, ''); }
function ft50EvKeyCombo(e){
  if(!e) return null;
  const lead = String(e.card || '').replace(/[\s\-]/g, '').replace(/[^0-9]/g, '*').match(/^\d+/);
  if(!lead || !e.amt || !e.date) return null;
  return lead[0].slice(0, 6) + '|' + e.amt + '|' + e.date;
}
/* selfKey/selfIdx 는 지금 제출하는 신청 건 — 자기 자신은 중복으로 보지 않는다 */
function ft50FindEvidenceDup(ev, selfKey, selfIdx){
  const appr = ft50NormAppr(ev && ev.appr);
  const combo = ft50EvKeyCombo(ev);
  let found = null;
  ft50All().some(function(x){
    if(x.k === selfKey && x.i === selfIdx) return false;
    if(FT50_DUP_EXCLUDE.indexOf(x.a.status) >= 0) return false;
    const e = x.a.evidence;
    if(!e) return false;
    let reason = null;
    if(appr.length >= 6 && ft50NormAppr(e.appr) === appr) reason = 'appr';
    else if(combo && ft50EvKeyCombo(e) === combo) reason = 'combo';
    if(!reason) return false;
    found = {reason:reason, no:x.a.no, uid:x.a.uid || ft50Uid(x.k), region:x.a.region,
             status:x.a.status, appr:e.appr, amt:e.amt, date:e.date,
             ts:e.ts || x.a.ts};
    return true;
  });
  return found;
}
function ft50DupMsg(dup){
  if(!dup) return '';
  const why = dup.reason === 'appr'
    ? '승인번호 ' + dup.appr + ' 가 이미 사용되었습니다'
    : '카드 앞자리·결재금액·결제일이 모두 같은 증빙이 이미 제출되었습니다';
  return why + ' (접수번호 ' + dup.no + ' · ' + dup.region + ' · 계정 ' + dup.uid +
         ' · 현재 상태 ' + ((FT50_ST[dup.status] || {t:dup.status}).t) + ')';
}

/* 처리 이력 기록 — 누가 언제 어떤 처리를 했는지 남긴다 */
function ft50Hist(rec,st,by,note){
  if(!rec.history) rec.history=[];
  rec.history.push({st:st,ts:new Date().toISOString(),by:by||'',note:note||''});
}

/* 신청 건에 저장된 한도가 있으면 그 값을 쓴다 — 승인 당시의 기준을 보존하기 위함 */
function ft50RefundCap(a){ return a.refundCap||ft50GrantCap(a); }

/* ── 주민등록등본 조회(모의) ────────────────────────────────
   실제 서비스는 행정정보 공동이용망으로 세대원을 회신받는다. 프로토타입에서는
   본인 주민등록번호를 입력한 시점에 계정·생년월일로 결정되는 세대를 구성한다.
   개인정보 최소화를 위해 이름은 가운데 글자를 가린 상태로만 표시한다.
   신청 가능 대상은 배우자와 직계 존·비속뿐이며, 형제·자매 등은 제외된다. */
const FT50_DIRECT_RELS=['배우자','자녀','부','모','조부','조모','손자','손녀'];
function ft50MaskName(name){
  const s=String(name||'');
  if(s.length<=1) return s;
  if(s.length===2) return s.charAt(0)+'*';
  return s.charAt(0)+'*'.repeat(s.length-2)+s.charAt(s.length-1);
}
function ft50IsDirect(rel){ return FT50_DIRECT_RELS.indexOf(rel)>=0; }
function ft50Household(uid,selfName,selfAge){
  const h=(typeof fHash==='function')?fHash((uid||'guest')+'household'):11;
  const sur=String(selfName||'김').charAt(0);
  const given=['서준','지우','하윤','도윤','서연','민준','지호','수아','예은','시우','채원','현우'];
  const pick=function(k){ return given[(h>>k)%given.length]; };
  const y=new Date().getFullYear();
  const rows=[];
  /* 배우자 — 신청자가 만 30세 이상일 때만 세대에 있다고 본다 */
  if(selfAge>=30) rows.push({rel:'배우자',name:sur==='김'?'이'+pick(1):sur+pick(1),birthYear:y-selfAge+((h>>2)%5-2)});
  /* 자녀 — 만 35세 이상이면 1~2명 */
  if(selfAge>=35){
    rows.push({rel:'자녀',name:sur+pick(3),birthYear:y-((h>>3)%14+6)});
    if((h>>4)%2===0) rows.push({rel:'자녀',name:sur+pick(5),birthYear:y-((h>>5)%10+3)});
  }
  /* 직계 존속 */
  rows.push({rel:'부',name:sur+pick(6),birthYear:y-selfAge-((h>>6)%8+25)});
  rows.push({rel:'모',name:sur==='김'?'박'+pick(7):sur+pick(7),birthYear:y-selfAge-((h>>7)%8+23)});
  /* 신청 대상이 아닌 세대원(형제·자매) — 제외 사유를 보여주기 위해 함께 조회된다 */
  rows.push({rel:'형제',name:sur+pick(8),birthYear:y-selfAge-((h>>8)%6-3)});
  return rows.map(function(r,i){
    return {
      id:'H'+i,
      rel:r.rel,
      name:r.name,
      masked:ft50MaskName(r.name),
      birthYear:r.birthYear,
      age:y-r.birthYear,
      eligible:ft50IsDirect(r.rel),
      why:ft50IsDirect(r.rel)?'':'직계 존·비속 및 배우자가 아니어서 신청할 수 없습니다'
    };
  });
}

/* ── 본인인증 · 주소지 확인 ────────────────────────────────
   실제 서비스는 인증기관(PASS·모바일 신분증 등)과 행정정보 공동이용망이
   성명·생년월일·주민등록상 주소를 회신한다. 프로토타입에서는 입력받은
   주민등록번호로 만 나이만 판정하고(번호는 어디에도 저장하지 않는다),
   주소지는 반값여행 참여 지자체 중 1곳을 시뮬레이션으로 배정한다. */
const FT50_SI={'밀양':'밀양시','제천':'제천시'};   /* 시(市)인 지자체, 나머지는 군 */
function ft50Sigungu(name){ return FT50_SI[name]||(name+'군'); }

/* ── 반값여행 화면설계 (프로세스 구성 · 화면설계 정보) ────────
   업무구조도의 「반값여행 화면설계」 8개 단위프로세스에 대응하는 설정 계층이다.
   신청 절차 단계와 신청 화면 표시 항목을 담당자가 데이터로 관리하고, 신청 화면이
   그 값을 읽어 렌더링한다. 즉 등록·수정한 내용이 실제 화면에 바로 반영된다.
     · 프로세스 구성 등록·수정·삭제·조회 → 신청 절차 단계(steps)
     · 화면설계 정보 등록·수정·삭제·조회 → 신청 화면 표시 항목(fields) */
const FT50_SCREEN_KEY = 'dtidF_t50ScreenCfg';
const FT50_STEPS_DEFAULT  = ['본인인증','주소지 확인','지역 선택','여행 계획','접수 완료'];
const FT50_FIELDS_DEFAULT = [
  {id:'family', label:'신청 단위(개인·가족)', screen:'여행 계획', show:true,  required:false, lock:true},
  {id:'plan',   label:'간단한 여행 계획',     screen:'여행 계획', show:true,  required:false, lock:false},
  {id:'docs',   label:'추가 서류 첨부',       screen:'여행 계획', show:true,  required:false, lock:false}
];
function ft50ScreenCfg(){
  let c=null;
  try{ c=JSON.parse(localStorage.getItem(FT50_SCREEN_KEY)||'null'); }catch(e){}
  if(!c||typeof c!=='object') c={};
  const steps=Array.isArray(c.steps)&&c.steps.length?c.steps:FT50_STEPS_DEFAULT.slice();
  /* 기본 항목은 항상 존재해야 하므로 저장값을 기본값 위에 덮어쓴다 */
  const saved=Array.isArray(c.fields)?c.fields:[];
  const fields=FT50_FIELDS_DEFAULT.map(function(d){
    const f=saved.find(function(x){ return x&&x.id===d.id; });
    return f?Object.assign({},d,f,{lock:d.lock}):Object.assign({},d);
  });
  saved.forEach(function(f){ if(f&&f.id&&!fields.some(function(x){ return x.id===f.id; })) fields.push(f); });
  return {steps:steps, fields:fields};
}
function ft50SaveScreenCfg(c){ localStorage.setItem(FT50_SCREEN_KEY, JSON.stringify(c||{})); }
function ft50ResetScreenCfg(){ localStorage.removeItem(FT50_SCREEN_KEY); }
/* 화면 표시 항목 조회 — 없으면 기본값(표시·선택) */
function ft50Field(id){
  const f=ft50ScreenCfg().fields.find(function(x){ return x.id===id; });
  return f||{id:id,label:id,show:true,required:false};
}

/* ── 관내·인접지역 거주자 제외 검증 ──────────────────────────
   반값여행은 '관외 거주자'가 그 지역에서 쓰는 돈을 지원하는 사업이라, 주소지가
   신청 지역과 같은 시군구이거나 인접 시군구면 신청할 수 없다.
   ※ 아래 인접표는 데모용이다. 운영에서는 지자체가 관리하는 행정구역 인접 정보로
     교체해야 한다(사업 공고마다 인접 판정 범위가 달라질 수 있다). */
const FT50_NEARBY = {
  '영광':['함평','장성','고창','무안'],
  '해남':['강진','영암','완도','진도','목포'],
  '완도':['해남','강진','장흥','진도'],
  '강진':['해남','영암','장흥','완도'],
  '고창':['영광','정읍','부안','함평','장성'],
  '거창':['함양','합천','산청','김천','무주'],
  '하동':['진주','사천','남해','산청','광양','구례'],
  '횡성':['원주','홍천','평창','영월','춘천'],
  '고흥':['보성','장흥','여수','순천'],
  '영암':['해남','강진','나주','목포','무안','장성'],
  '남해':['하동','사천','통영','여수','광양'],
  '밀양':['창녕','청도','양산','김해','울주'],
  '제천':['단양','충주','영월','원주','영주'],
  '합천':['거창','산청','의령','창녕','고령'],
  '영월':['정선','평창','제천','태백','횡성'],
  '평창':['정선','강릉','홍천','횡성','영월']
};
function ft50NearbyOf(region){ return FT50_NEARBY[region]||[]; }
/* 접미사(시·군·구)를 떼고 비교한다 — 주소는 '함평군', 인접표는 '함평' 형태 */
function ft50BareGu(v){ return String(v||'').replace(/\s+/g,'').replace(/(시|군|구)$/,''); }
/* 반환: 'same'(관내) | 'nearby'(인접) | null(신청 가능) */
function ft50AddrBlock(region, addrSigungu){
  if(!region||!addrSigungu) return null;
  const a = ft50BareGu(addrSigungu);
  if(ft50BareGu(ft50Sigungu(region))===a || ft50BareGu(region)===a) return 'same';
  return ft50NearbyOf(region).some(function(n){ return ft50BareGu(n)===a; }) ? 'nearby' : null;
}

/* ── 추가 서류 입력값 검증 ───────────────────────────────────
   신청서에 첨부하는 보조 서류(가족관계증명서·숙박 예약확인서 등)를 받는다.
   데모는 localStorage 라 파일 본문을 보관할 수 없어 메타데이터만 남긴다. */
const FT50_DOC_MAX      = 5;                 /* 최대 첨부 개수 */
const FT50_DOC_MAX_SIZE = 10 * 1024 * 1024;  /* 각 10MB */
const FT50_DOC_EXT      = ['jpg','jpeg','png','pdf'];
/* 반환: null(통과) 또는 사용자에게 보여줄 사유 문자열 */
function ft50DocCheck(file, already){
  if(!file) return '파일을 선택해 주세요';
  if((already||0) >= FT50_DOC_MAX) return '첨부는 최대 ' + FT50_DOC_MAX + '개까지 가능합니다';
  const ext = String(file.name||'').split('.').pop().toLowerCase();
  if(FT50_DOC_EXT.indexOf(ext) < 0)
    return '허용되지 않는 형식입니다 (' + FT50_DOC_EXT.join('·') + '만 가능)';
  if(typeof file.size === 'number' && file.size > FT50_DOC_MAX_SIZE)
    return '파일이 너무 큽니다 (각 10MB 이하)';
  if(typeof file.size === 'number' && file.size === 0) return '빈 파일입니다';
  return null;
}
function ft50DocSize(n){
  if(typeof n !== 'number') return '';
  return n >= 1048576 ? (n/1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n/1024)) + 'KB';
}
function ft50PickAddr(){
  /* 배정하면 모집중 지역이 전부 인근 처리되어 신청 가능 지역이 0이 되는
     시·도는 후보에서 제외한다 (예: 모집중이 모두 전라남도인데 전남 주소지) */
  const all=ft50Regions();
  const cands=all.filter(function(c){
    return all.some(function(o){ return o.status==='open'&&o.sido!==c.sido; });
  });
  const pool=cands.length?cands:all;
  const r=pool[Math.floor(Math.random()*pool.length)];
  const sigungu=ft50Sigungu(r.name);
  return {sido:r.sido,sigungu:sigungu,full:r.sido+' '+sigungu};
}
/* 주민등록번호로 만 나이 계산 (뒷자리 첫 숫자로 세기 판별). 형식 오류면 null */
function ft50AgeFromRrn(r1,r2){
  const yy=Number(r1.slice(0,2)),mm=Number(r1.slice(2,4)),dd=Number(r1.slice(4,6));
  const g=Number(r2.charAt(0));
  if(mm<1||mm>12||dd<1||dd>31) return null;
  let century;
  if(g===1||g===2||g===5||g===6) century=1900;
  else if(g===3||g===4||g===7||g===8) century=2000;
  else if(g===9||g===0) century=1800;
  else return null;
  function calcAge(c){
    const birth=new Date(c+yy,mm-1,dd);
    if(isNaN(birth.getTime())) return null;
    const today=new Date();
    let a=today.getFullYear()-birth.getFullYear();
    if(today.getMonth()<birth.getMonth()||(today.getMonth()===birth.getMonth()&&today.getDate()<birth.getDate())) a--;
    return a;
  }
  let age=calcAge(century);
  /* 프로토타입 편의 보정: 2000년대생을 뒷자리 1·2로 입력하는 흔한 실수(→만 100세 이상)는 2000년대로 재해석 */
  if(age!==null&&century===1900&&age>=100) age=calcAge(2000);
  return age;
}

/* ── 대기열(신청 인원조건 초과 시 선착순 대기) ────────────── */
const FT50_QUEUE_PREFIX='dtidF_t50Queue_';
const FT50_MYQ_PREFIX  ='dtidF_t50MyQueue_';
const FT50_LOCK_PREFIX ='dtidF_t50Lock_';
function ft50QueueLoad(region){ try{ return JSON.parse(localStorage.getItem(FT50_QUEUE_PREFIX+region)||'[]'); }catch(e){ return []; } }
function ft50QueueSave(region,list){ localStorage.setItem(FT50_QUEUE_PREFIX+region,JSON.stringify(list)); }
function ft50QueuePos(region,id){
  const q=ft50QueueLoad(region);
  const i=q.findIndex(x=>x.id===id);
  return i<0?-1:i+1;
}
/* 자리가 나면 대기열 맨 앞부터 실제 신청(received)으로 전환 */
function ft50QueueAdvance(region){
  const cfg=ft50RegionCfg(region);
  let used=ft50UsedCount(region);
  const q=ft50QueueLoad(region);
  const promoted=[];
  while(q.length){
    const head=q[0];
    const ppl=ft50PeopleNum(head.draft);
    if(used+ppl>cfg.capacity) break;
    const key=ft50Key(head.uid);
    const list=ft50LoadKey(key);
    const rec=Object.assign({},head.draft,{status:'received',no:'T50-2026-'+String(1001+ft50All().length)});
    ft50Hist(rec,'received',head.draft.applicant||'','대기열 통과 후 접수');
    list.unshift(rec);
    ft50SaveKey(key,list);
    used+=ppl; q.shift();
    promoted.push(head);
  }
  if(promoted.length) ft50QueueSave(region,q);
  return promoted;
}
/* 동시접속 신청 정합성 확인용 버전 카운터 */
function ft50LockVersion(region){ return Number(localStorage.getItem(FT50_LOCK_PREFIX+region)||'0'); }
function ft50LockBump(region){
  const v=ft50LockVersion(region)+1;
  localStorage.setItem(FT50_LOCK_PREFIX+region,String(v));
  return v;
}
/* 정원 대비 접수 가능 여부 — ok / queue(정원~130%) / overload(130% 초과) */
function ft50DecideCapacity(region,ppl){
  const cfg=ft50RegionCfg(region);
  const v0=ft50LockVersion(region);
  let used=ft50UsedCount(region);
  if(ft50LockVersion(region)!==v0) used=ft50UsedCount(region);   /* 다른 탭에서 접수 발생 → 최신값 재확인 */
  if(used+ppl<=cfg.capacity) return {mode:'ok',cfg:cfg,used:used};
  if(used+ppl<=Math.ceil(cfg.capacity*1.3)) return {mode:'queue',cfg:cfg,used:used};
  return {mode:'overload',cfg:cfg,used:used};
}

/* ── 관리자 계정(페르소나) — 공사 총괄 / 지자체 담당자 권한 분리 ── */
const FT50_ADMIN_ACCOUNTS=[{id:'kto',name:'공사 총괄 관리자',region:null}].concat(
  ft50Regions().map(r=>({id:'gov_'+r.name,name:r.sido+' '+r.name+' 담당자',region:r.name}))
);
function ft50Persona(){
  const id=localStorage.getItem(FT50_PERSONA_KEY)||'kto';
  return FT50_ADMIN_ACCOUNTS.find(a=>a.id===id)||FT50_ADMIN_ACCOUNTS[0];
}
function ft50SetPersona(id){ localStorage.setItem(FT50_PERSONA_KEY,id); }
/* 통합 기준값(지원금액·환급률·예산)은 공사 총괄 관리자만 바꿀 수 있다 — 지자체 담당자는 조회만 */
function ft50IsHQ(){ return !ft50Persona().region; }
