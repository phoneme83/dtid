/* 반값여행(t50) 공용 설정·집계 스크립트 — admin.html(관리자 페이지) / t50-apply.html / mypage-history.html 공유
   업무구조도(2026년 지역사랑 휴가지원 업무구조도.pptx) 중 "지자체 사업설정"·"신청 접수(대기열/선착순)"가
   admin·apply 양쪽에서 같은 데이터를 봐야 하므로 여기 한 곳에 모은다. theme.js/common.js와 같은 공용 스크립트 컨벤션. */

/* ── 지자체별 반값여행 여행 가능기간 시드값 (구 t50-apply.html의 AP_PERIODS를 이관) ── */
const T50_LEGACY_PERIODS={
  '영광':{s:'2026-07-01',e:'2026-08-31'},'해남':{s:'2026-07-15',e:'2026-09-30'},
  '완도':{s:'2026-07-07',e:'2026-08-24'},'강진':{s:'2026-08-01',e:'2026-10-31'},
  '고창':{s:'2026-09-01',e:'2026-10-31'},'거창':{s:'2026-08-16',e:'2026-11-15'},
  '하동':{s:'2026-06-01',e:'2026-06-30'},'횡성':{s:'2026-06-01',e:'2026-07-15'},
  '고흥':{s:'2026-05-15',e:'2026-06-30'},'영암':{s:'2026-06-10',e:'2026-07-20'},
  '남해':{s:'2026-05-01',e:'2026-06-15'},'밀양':{s:'2026-06-01',e:'2026-06-30'},
  '제천':{s:'2026-05-20',e:'2026-06-30'},'합천':{s:'2026-06-15',e:'2026-07-31'},
  '영월':{s:'2026-06-01',e:'2026-07-31'},'평창':{s:'2026-07-01',e:'2026-09-15'}
};

function t50Regions(){return (typeof TOUR50_REGIONS!=='undefined')?TOUR50_REGIONS:[];}
function t50PeopleNum(a){return a.people==='6'?6:(Number(a.people)||1);}

/* ── 지자체 사업설정(사업개설·신청기간·여행기간·신청인원조건·공지사항) ── */
const T50_BIZCFG_KEY='dtidE_t50BizCfg';

function t50DefaultRegionCfg(name){
  const r=t50Regions().find(x=>x.name===name);
  const p=T50_LEGACY_PERIODS[name];
  return {
    open:r?r.status==='open':true,
    applyStart:'2020-01-01',applyEnd:'2030-12-31',
    travelStart:p?p.s:'2026-01-01',travelEnd:p?p.e:'2026-12-31',
    capacity:9999,minPeople:1,maxPeople:6,budget:0,
    notices:[]
  };
}
function t50Cfg(){try{return JSON.parse(localStorage.getItem(T50_BIZCFG_KEY)||'{}');}catch(e){return{};}}
function t50SaveCfg(cfg){localStorage.setItem(T50_BIZCFG_KEY,JSON.stringify(cfg));}
function t50RegionCfg(name){
  const all=t50Cfg();
  return Object.assign({},t50DefaultRegionCfg(name),all[name]||{});
}
function t50SetRegionCfg(name,patch){
  const all=t50Cfg();
  all[name]=Object.assign({},t50RegionCfg(name),patch);
  t50SaveCfg(all);
  return all[name];
}
/* 신청기간(접수 가능 기간) 내 여부 — 'YYYY-MM-DD' 오늘 날짜 기준 */
function t50InApplyPeriod(cfg,today){
  today=today||new Date().toISOString().slice(0,10);
  return today>=cfg.applyStart&&today<=cfg.applyEnd;
}

/* ── 지자체 계정(페르소나) — "지자체 계정별" 심사/통계 권한 분리 ── */
const ADMIN_ACCOUNTS=[{id:'kto',name:'공사 총괄 관리자',region:null}].concat(
  t50Regions().map(r=>({id:'gov_'+r.name,name:r.sido+' '+r.name+' 담당자',region:r.name}))
);
const T50_PERSONA_KEY='dtidE_admPersona';
function admPersona(){
  const id=localStorage.getItem(T50_PERSONA_KEY)||'kto';
  return ADMIN_ACCOUNTS.find(a=>a.id===id)||ADMIN_ACCOUNTS[0];
}
function admSetPersona(id){localStorage.setItem(T50_PERSONA_KEY,id);}
/* 통합 기준값(지원금액·환급률·예산)은 공사 총괄 관리자만 바꿀 수 있다 — 지자체 담당자는 조회만 */
function admIsHQ(){return !admPersona().region;}


/* ── 전 계정 신청 데이터 집계 (계정별 키 dtidE_t50Applies_<uid>로 분리 저장됨) ── */
const T50_AP_PREFIX='dtidE_t50Applies_';
/* 대기열 진입 중인 내 신청 티켓(지역+id) — apply.html이 참조하는 계정별 키 접두사 */
const T50_MYQ_PREFIX='dtidE_t50MyQueue_';
function t50AppKeys(){
  const ks=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&(k.indexOf(T50_AP_PREFIX)===0||k==='dtidE_t50Applies'))ks.push(k);
  }
  return ks;
}
function t50LoadKey(k){try{return JSON.parse(localStorage.getItem(k)||'[]');}catch(e){return[];}}
function t50SaveKeyList(k,l){localStorage.setItem(k,JSON.stringify(l));}
/* [{k:저장키, i:키 내 index, a:신청}] 형태로 전 계정 신청 건을 모은다 */
function t50AllApplications(){
  const out=[];
  t50AppKeys().forEach(function(k){
    t50LoadKey(k).forEach(function(a,i){out.push({k:k,i:i,a:a});});
  });
  return out;
}
/* 지역별 사용 인원(취소·반려 제외) — 사업설정의 capacity(신청인원조건)와 비교해 대기열/과부하 판단에 사용 */
const T50_INACTIVE_STATUS=['rejected','canceled'];
function t50UsedCount(region){
  return t50AllApplications()
    .filter(x=>x.a.region===region&&T50_INACTIVE_STATUS.indexOf(x.a.status)<0)
    .reduce((s,x)=>s+t50PeopleNum(x.a),0);
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
const T50_SPEND_CATS=[
  {cat:'숙박',kw:['호텔','모텔','펜션','리조트','게스트하우스','민박','콘도','한옥','스테이','글램핑','캠핑','야영장','유스호스텔']},
  {cat:'음식',kw:['식당','음식','한식','중식','일식','양식','분식','국밥','갈비','횟집','해장','카페','커피','베이커리','제과','제빵','치킨','피자','뷔페','국수','칼국수']},
  {cat:'관광',kw:['관광','박물관','미술관','전시','수목원','식물원','동물원','아쿠아리움','케이블카','유람선','전망대','테마파크','기념관','민속촌','관람']},
  {cat:'체험',kw:['체험','공방','클래스','승마','카약','서핑','래프팅','짚라인','도자기','농장','목장','레저','액티비티','공예']},
  {cat:'쇼핑',kw:['마트','상회','특산','기념품','상점','쇼핑','상사','로컬푸드','하나로','전통시장','판매장','직판장','농협']}
];
const T50_EXCLUDED_BIZ=[
  {biz:'주유소',kw:['주유소','주유','SK에너지','현대오일','오일뱅크','칼텍스','에쓰오일','SOIL','충전소','LPG']},
  {biz:'금은방',kw:['금은방','귀금속','보석','쥬얼리','주얼리']},
  {biz:'유흥',kw:['유흥','단란주점','룸살롱','나이트클럽','노래방','노래연습장','캬바레','성인용품']},
  {biz:'학원',kw:['학원','교습소','어학원','입시','과외']},
  {biz:'카센터',kw:['카센터','카센타','정비소','자동차정비','타이어','공업사']}
];
/* 상호 비교용 정규화 — 공백·구분기호를 없애고 대문자로 맞춘다 (S-OIL → SOIL) */
function t50BizNorm(s){return String(s||'').replace(/[\s\-·.,()]/g,'').toUpperCase();}
function t50BizHit(norm,kw){return kw.some(function(w){return norm.indexOf(t50BizNorm(w))>=0;});}
/* 가맹점 상호로 소비 인정 여부를 판정한다 — {result, label, detail, cat|biz} */
function t50BizCheck(shop){
  const s=t50BizNorm(shop);
  if(!s)return {result:'unknown',label:'가맹점 확인 불가',
    detail:'상호를 읽지 못해 업종을 판정하지 못했습니다. 담당자가 영수증 원본으로 확인합니다.'};
  const ex=T50_EXCLUDED_BIZ.filter(function(b){return t50BizHit(s,b.kw);})[0];
  if(ex)return {result:'excluded',biz:ex.biz,label:'제외 업종 — '+ex.biz,
    detail:'주유소·금은방·유흥·학원·카센터는 통합 기준 공통 제외 업종입니다(15곳 공통).'};
  const inc=T50_SPEND_CATS.filter(function(c){return t50BizHit(s,c.kw);})[0];
  if(inc)return {result:'included',cat:inc.cat,label:'인정 항목 — '+inc.cat,
    detail:'인정 소비범위(숙박·음식·관광·체험·쇼핑) 중 '+inc.cat+'에 해당합니다.'};
  return {result:'unknown',label:'업종 확인 필요',
    detail:'인정 5종·제외 5종 어디에도 해당하지 않아 담당자가 영수증 원본으로 확인합니다.'};
}
function t50BizColor(c){
  if(!c)return '#64748b';
  if(c.result==='excluded')return '#b91c1c';
  if(c.result==='included')return '#0f766e';
  return '#b45309';
}
function t50BizIcon(c){
  if(!c)return '\u2022';
  if(c.result==='excluded')return '\ud83d\udeab';
  if(c.result==='included')return '\u2705';
  return '\u2753';
}
function t50BizRejectMsg(c,shop){
  return '❌ <b>인정 제외업종입니다.</b> 영수증의 가맹점 <b>'+(shop||'-')+'</b> — <b>'+c.biz+
    '</b> 업종으로 판독되었습니다. 주유소·금은방·유흥·학원·카센터는 통합 기준 공통 제외 업종이라 환급 대상이 아닙니다. '+
    '상호를 잘못 읽은 것이라면 다른 증빙을 첨부하거나 담당 지자체에 문의해 주세요.';
}

/* ── 간이영수증 · 계좌이체 불인정 ────────────────────────────
   16개 지자체가 전부 불인정으로 이미 같은 항목이다(1차 분석안 6p·16p).
   카드 매출전표가 아닌 전표를 걸러내는 판별(apOcrNonCard·ft50EvNonCard)에서
   함께 잡고, 안내 문구로 "왜 안 되는지"를 이 두 유형에만 덧붙인다. */
const T50_ALWAYS_REJECT=['간이영수증','계좌이체 확인증'];
function t50NonCardNote(reason){
  return (T50_ALWAYS_REJECT.indexOf(reason)>=0)
    ? ' 간이영수증과 계좌이체 확인증은 <b>16개 지자체 모두 정산 증빙으로 인정하지 않습니다.</b>'
    : '';
}

/* ── 현장 사용처 — 「관내 가맹점」 ────────────────────────────
   16곳 모두 골격이 같고 명칭만 다르다(1차 분석안 6p). 통합 적용값은 명칭 통일(16p).
   그동안 지역화폐 앱(t50-pay.html) 안에만 있어 설정값 스키마와 값이 이원화돼 있었다.
   화면이 아니라 공용 설정에 두고, 스키마(useScope)가 이 상수를 그대로 읽는다. */
const T50_USE_SCOPE_LABEL='관내 가맹점';

/* ── 숙박 증빙서류 ───────────────────────────────────────────
   16개 지자체가 모두 "숙박확인서 + 결제영수증"을 숙박 증빙의 골격으로 두고
   있고 명칭만 숙박확인서·숙박증명서·투숙확인서 등으로 갈린다(1차 분석안 6p).
   통합 적용값은 「숙박확인서」로 명칭을 통일한다(16p).
   결제영수증만으로는 실제 투숙 여부를 알 수 없어 숙소가 발급한 확인서를 함께
   받아야 정산이 성립한다. 숙박 선결제 인정도 숙박 건에만 적용되므로, 선결제
   신고는 숙박비 결제 건으로 표시한 경우에만 유효하다. */
const T50_STAY_DOC_LABEL='숙박확인서';
/* 숙박 증빙 판정 — 통과하면 null, 아니면 {code, msg}
   stay: 숙박비 결제 건인지, doc: 첨부한 숙박확인서 {name,size} (없으면 null) */
function t50EvStayCheck(stay,doc){
  if(!stay)return null;
  if(!doc||!doc.name)return {code:'nodoc',
    msg:'❌ <b>'+T50_STAY_DOC_LABEL+'가 첨부되지 않았습니다.</b> 숙박비를 결제한 건은 결제영수증과 '+
        T50_STAY_DOC_LABEL+'를 함께 제출해야 합니다. 숙소에서 발급받은 '+T50_STAY_DOC_LABEL+
        '(숙박증명서·투숙확인서 등 명칭이 달라도 됩니다)를 첨부해 주세요.'};
  return null;
}

/* ── 숙박 선결제 인정 ────────────────────────────────────────
   숙박비는 예약할 때 미리 결제하는 것이 보통이라 16개 지자체가 모두 "숙박 선결제
   인정"을 공통 기준으로 두고 있다(반값여행 통합 플랫폼 1차 분석안 6p·16p).
   그런데 결제일을 여행기간과만 대조하면 여행 전에 결제한 숙박비가 전부 반려된다.
   그래서 신청자가 "숙박 선결제"로 신고한 건은 여행 시작 전 결제도 인정하되,
   여행과 무관한 오래된 결제까지 들어오지 않도록 인정 기간을 둔다.
   ※ 인정 기간은 통합 플랫폼에서 지자체 설정값으로 빼야 할 항목이다. 여기서는
     16곳 공통 기준만 두고, 담당자가 심사에서 숙박 여부를 최종 확인한다. */
const T50_PREPAY_MAX_DAYS=180;
/* 'YYYY-MM-DD' 두 날짜의 일수 차 (to - from). 파싱 실패 시 NaN */
function t50DayDiff(from,to){
  const a=Date.parse(from+'T00:00:00'),b=Date.parse(to+'T00:00:00');
  return (isNaN(a)||isNaN(b))?NaN:Math.round((b-a)/86400000);
}
/* 결제일 판정 — 통과하면 null, 아니면 {code, msg}
   after  : 여행 종료 후 결제        before : 여행 시작 전 결제인데 선결제 미신고
   toofar : 선결제 신고했으나 인정 기간(T50_PREPAY_MAX_DAYS)을 넘김 */
function t50EvDateCheck(a,date,prepay){
  if(!date)return {code:'empty',msg:'결제일(영수증의 승인·결제 날짜)을 입력해 주세요'};
  if(date>a.end)return {code:'after',
    msg:'❌ <b>결제일이 여행기간 밖입니다.</b> 결제일은 <b>'+date+'</b>이나, 이 신청 건의 여행기간은 <b>'+
        a.start+' ~ '+a.end+'</b>입니다. 여행이 끝난 뒤 결제한 영수증은 환급 대상이 아닙니다.'};
  if(date>=a.start)return null;
  if(!prepay)return {code:'before',
    msg:'❌ <b>여행 시작 전에 결제한 영수증입니다.</b> 결제일은 <b>'+date+'</b>이나, 이 신청 건의 여행 시작일은 <b>'+
        a.start+'</b>입니다. 예약할 때 미리 결제한 <b>숙박비</b>라면 「숙박비 결제 건」과 「숙박 선결제」에 체크하고 '+
        T50_STAY_DOC_LABEL+'를 첨부한 뒤 다시 제출해 주세요. '+
        '숙박 외 항목은 여행기간 중에 결제한 영수증만 환급 대상입니다.'};
  const d=t50DayDiff(date,a.start);
  if(isNaN(d)||d>T50_PREPAY_MAX_DAYS)return {code:'toofar',
    msg:'❌ <b>숙박 선결제 인정 기간을 벗어났습니다.</b> 결제일 <b>'+date+'</b>은 여행 시작일('+a.start+') 기준 '+
        (isNaN(d)?'확인 불가':d+'일 전')+'으로, 인정 기간 '+T50_PREPAY_MAX_DAYS+'일을 넘습니다.'};
  return null;
}
/* 판독 결과 화면에 붙이는 결제일 표시 문구 */
function t50EvDateBadge(a,date,prepay){
  const r=t50EvDateCheck(a,date,prepay);
  if(!r)return (date<a.start)?' ✅ 숙박 선결제 인정':' ✅ 여행기간 내';
  if(r.code==='before')return ' ⚠️ 여행 시작 전 결제 — 숙박 선결제 확인 필요';
  return ' ⚠️ 여행기간 밖';
}

/* ── 증빙 중복 제출 차단 ─────────────────────────────────────
   같은 영수증을 다시 제출하는 것이 가장 흔한 부정수급 유형이다.
   ① 승인번호가 같은 건, 또는 ② 카드 앞자리·결재금액·결제일이 모두 같은 건이
   다른 신청 건(다른 계정 포함)에 이미 있으면 중복으로 판정한다.
   취소·반려된 건은 환급이 이뤄지지 않았으므로 대상에서 제외한다. */
const T50_DUP_EXCLUDE=['canceled','rejected'];

/* ── 관내·인접지역 거주자 제외 검증 ──────────────────────────
   반값여행은 '관외 거주자'가 그 지역에서 쓰는 돈을 지원하는 사업이라, 주소지가
   신청 지역과 같은 시군구이거나 인접 시군구면 신청할 수 없다.
   ※ 아래 인접표는 데모용이다. 운영에서는 지자체가 관리하는 행정구역 인접 정보로
     교체해야 한다(사업 공고마다 인접 판정 범위가 달라질 수 있다). */
const T50_NEARBY={
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
function t50NearbyOf(region){ return T50_NEARBY[region]||[]; }
function t50BareGu(v){ return String(v||'').replace(/\s+/g,'').replace(/(시|군|구)$/,''); }
/* 반환: 'same'(관내) | 'nearby'(인접) | null(신청 가능) */
function t50AddrBlock(region,addrSigungu){
  if(!region||!addrSigungu) return null;
  const a=t50BareGu(addrSigungu);
  if(t50BareGu(region)===a) return 'same';
  return t50NearbyOf(region).some(function(n){ return t50BareGu(n)===a; })?'nearby':null;
}

/* ── 추가 서류 입력값 검증 ───────────────────────────────────
   신청서에 붙이는 보조 서류. 데모는 localStorage 라 파일 본문을 보관할 수 없어
   파일명·크기·형식만 남긴다. */
const T50_DOC_MAX=5;
const T50_DOC_MAX_SIZE=10*1024*1024;
const T50_DOC_EXT=['jpg','jpeg','png','pdf'];
function t50DocCheck(file,already){
  if(!file) return '파일을 선택해 주세요';
  if((already||0)>=T50_DOC_MAX) return '첨부는 최대 '+T50_DOC_MAX+'개까지 가능합니다';
  const ext=String(file.name||'').split('.').pop().toLowerCase();
  if(T50_DOC_EXT.indexOf(ext)<0) return '허용되지 않는 형식입니다 ('+T50_DOC_EXT.join('·')+'만 가능)';
  if(typeof file.size==='number'&&file.size>T50_DOC_MAX_SIZE) return '파일이 너무 큽니다 (각 10MB 이하)';
  if(typeof file.size==='number'&&file.size===0) return '빈 파일입니다';
  return null;
}
function t50DocSize(n){
  if(typeof n!=='number') return '';
  return n>=1048576?(n/1048576).toFixed(1)+'MB':Math.max(1,Math.round(n/1024))+'KB';
}

/* ── 반값여행 화면설계 (프로세스 구성 · 화면설계 정보) ────────
   업무구조도 「반값여행 화면설계」 8개 단위프로세스에 대응하는 설정 계층.
   담당자가 신청 절차 단계와 신청 화면 표시 항목을 관리하고, 신청 화면이 그 값을
   읽어 렌더링한다. 즉 등록·수정한 내용이 실제 화면에 바로 반영된다. */
const T50_SCREEN_KEY='dtidE_t50ScreenCfg';
const T50_STEPS_DEFAULT=['본인인증','주소지 확인','지역 선택','여행 계획','접수 완료'];
const T50_FIELDS_DEFAULT=[
  {id:'family',label:'신청 단위(개인·가족)',screen:'여행 계획',show:true,required:false,lock:true},
  {id:'plan',  label:'간단한 여행 계획',    screen:'여행 계획',show:true,required:false,lock:false},
  {id:'docs',  label:'추가 서류 첨부',      screen:'여행 계획',show:true,required:false,lock:false}
];
function t50ScreenCfg(){
  let c=null;
  try{ c=JSON.parse(localStorage.getItem(T50_SCREEN_KEY)||'null'); }catch(e){}
  if(!c||typeof c!=='object') c={};
  const steps=Array.isArray(c.steps)&&c.steps.length?c.steps:T50_STEPS_DEFAULT.slice();
  const saved=Array.isArray(c.fields)?c.fields:[];
  const fields=T50_FIELDS_DEFAULT.map(function(d){
    const f=saved.find(function(x){ return x&&x.id===d.id; });
    return f?Object.assign({},d,f,{lock:d.lock}):Object.assign({},d);
  });
  saved.forEach(function(f){ if(f&&f.id&&!fields.some(function(x){ return x.id===f.id; })) fields.push(f); });
  return {steps:steps,fields:fields};
}
function t50SaveScreenCfg(c){ localStorage.setItem(T50_SCREEN_KEY,JSON.stringify(c||{})); }
function t50ResetScreenCfg(){ localStorage.removeItem(T50_SCREEN_KEY); }
function t50Field(id){
  const f=t50ScreenCfg().fields.find(function(x){ return x.id===id; });
  return f||{id:id,label:id,show:true,required:false};
}

const T50_DUP_ST_LABEL={received:'접수 대기',review:'검토중',apply_fix:'신청 보완 요청',approved:'승인',notified:'결과 통보',
  refund_req:'환급 심사 대기',refund_fix:'증빙 보완 요청',refund_ok:'환급 완료'};
function t50NormAppr(v){return String(v||'').replace(/[^0-9]/g,'');}
function t50EvKeyCombo(e){
  if(!e)return null;
  const lead=String(e.card||'').replace(/[\s\-]/g,'').replace(/[^0-9]/g,'*').match(/^\d+/);
  if(!lead||!e.amt||!e.date)return null;
  return lead[0].slice(0,6)+'|'+e.amt+'|'+e.date;
}
/* selfKey/selfIdx 는 지금 제출하는 신청 건 — 자기 자신은 중복으로 보지 않는다 */
function t50FindEvidenceDup(ev,selfKey,selfIdx){
  const appr=t50NormAppr(ev&&ev.appr);
  const combo=t50EvKeyCombo(ev);
  let found=null;
  t50AllApplications().some(function(x){
    if(x.k===selfKey&&x.i===selfIdx)return false;
    if(T50_DUP_EXCLUDE.indexOf(x.a.status)>=0)return false;
    const e=x.a.evidence;
    if(!e)return false;
    let reason=null;
    if(appr.length>=6&&t50NormAppr(e.appr)===appr)reason='appr';
    else if(combo&&t50EvKeyCombo(e)===combo)reason='combo';
    if(!reason)return false;
    found={reason:reason,no:x.a.no,uid:x.a.uid||'',region:x.a.region,status:x.a.status,
           appr:e.appr,amt:e.amt,date:e.date};
    return true;
  });
  return found;
}
function t50DupMsg(dup){
  if(!dup)return '';
  const why=dup.reason==='appr'
    ? '승인번호 '+dup.appr+' 가 이미 사용되었습니다'
    : '카드 앞자리·결재금액·결제일이 모두 같은 증빙이 이미 제출되었습니다';
  return why+' (접수번호 '+dup.no+' · '+dup.region+' · 계정 '+dup.uid+
         ' · 현재 상태 '+(T50_DUP_ST_LABEL[dup.status]||dup.status)+')';
}

/* ── 대기열(선착순 초과 시) ── */
const T50_QUEUE_PREFIX='dtidE_t50Queue_';
function t50QueueKey(region){return T50_QUEUE_PREFIX+region;}
function t50QueueLoad(region){try{return JSON.parse(localStorage.getItem(t50QueueKey(region))||'[]');}catch(e){return[];}}
function t50QueueSave(region,list){localStorage.setItem(t50QueueKey(region),JSON.stringify(list));}
function t50QueuePos(region,id){
  const q=t50QueueLoad(region);
  const idx=q.findIndex(x=>x.id===id);
  return idx<0?-1:idx+1;
}
/* 자리가 나면 대기열 맨 앞부터 실제 신청(received)으로 전환. 승격된 draft 배열을 반환 */
function t50QueueAdvance(region){
  const cfg=t50RegionCfg(region);
  let used=t50UsedCount(region);
  const q=t50QueueLoad(region);
  const promoted=[];
  while(q.length){
    const head=q[0];
    const ppl=t50PeopleNum(head.draft);
    if(used+ppl>cfg.capacity)break;
    const key=T50_AP_PREFIX+head.uid;
    const list=t50LoadKey(key);
    const rec=Object.assign({},head.draft,{status:'received',no:'T50-2026-'+String(1001+list.length)});
    if(!rec.history)rec.history=[];
    rec.history.push({st:'received',ts:new Date().toISOString(),note:'대기열 통과 후 접수'});
    list.unshift(rec);
    t50SaveKeyList(key,list);
    used+=ppl;
    q.shift();
    promoted.push(head);
  }
  if(promoted.length)t50QueueSave(region,q);
  return promoted;
}

/* ── 동시접속 신청 정합성 검증용 락(버전 카운터) ── */
const T50_LOCK_PREFIX='dtidE_t50Lock_';
function t50LockVersion(region){return Number(localStorage.getItem(T50_LOCK_PREFIX+region)||'0');}
function t50LockBump(region){
  const v=t50LockVersion(region)+1;
  localStorage.setItem(T50_LOCK_PREFIX+region,String(v));
  return v;
}

/* ── 신청 단위(개인/가족) ────────────────────────────────────
   가족 신청은 본인 포함 5명까지다(가족형 3~5인 기준).
   환급 한도는 인원 정액이 아니라 신청 유형별 통합 기준값을 따른다 → t50GrantOf */
const T50_FAMILY_MAX=5;

/* ── 지원금액 · 환급률 (통합 기준값, 전국 공통) ────────────────
   개인 1인 10만원 / 팀 2인 이상 20만원 / 청년 1인 14만원 / 청년팀 2인 이상 28만원 /
   가족형 3~5인 50만원, 기본·청년 환급률 50% — 1차 분석안 16p 통합 적용값이다.
   54개 항목표에서 지원금액·환급률은 전부 "통합"으로 분류된 항목이라 지자체가
   개별로 바꿀 수 없다. 그래서 지역별 사업설정(T50_BIZCFG_KEY)과 분리해 전국 공통
   키에 두고, 관리시스템에서도 공사 총괄 관리자만 입력·수정할 수 있게 한다.
   환급액은 "소비액 × 환급률"을 지원 한도로 자른 값이다. 승인 시점에는 소비액을
   알 수 없으므로 지원 한도를 통보하고, 정산 때 실제 소비액으로 확정한다. */
const T50_GRANT_KEY='dtidA_t50GrantCfg';
const T50_GRANT_DEFAULT={solo:100000,team:200000,youthSolo:140000,youthTeam:280000,
                         family:500000,rate:50,youthRate:50,useEnd:'2026-12-31'};
const T50_GRANT_FIELDS=[
  {k:'solo',     lb:'개인 1인',        un:'원'},
  {k:'team',     lb:'팀 2인 이상',      un:'원'},
  {k:'youthSolo',lb:'청년 1인',        un:'원'},
  {k:'youthTeam',lb:'청년팀 2인 이상',  un:'원'},
  {k:'family',   lb:'가족형 3~5인',     un:'원'},
  {k:'rate',     lb:'기본 환급률',      un:'%'},
  {k:'youthRate',lb:'청년 환급률',      un:'%'}
];
function t50GrantCfg(){
  let c=null;
  try{c=JSON.parse(localStorage.getItem(T50_GRANT_KEY)||'null');}catch(e){}
  return Object.assign({},T50_GRANT_DEFAULT,(c&&typeof c==='object')?c:{});
}
function t50SaveGrantCfg(c){localStorage.setItem(T50_GRANT_KEY,JSON.stringify(c||{}));}
function t50ResetGrantCfg(){localStorage.removeItem(T50_GRANT_KEY);}
/* 신청 건에 적용되는 지원 기준 — {key, label, cap} */
function t50GrantOf(a){
  const g=t50GrantCfg(),n=t50PeopleNum(a);
  if(a.unit==='family'&&n>=3)return {key:'family',label:'가족형 3~5인',cap:g.family};
  if(n>=2)return a.youth?{key:'youthTeam',label:'청년팀 2인 이상',cap:g.youthTeam}
                        :{key:'team',label:'팀 2인 이상',cap:g.team};
  return a.youth?{key:'youthSolo',label:'청년 1인',cap:g.youthSolo}
                :{key:'solo',label:'개인 1인',cap:g.solo};
}
function t50GrantCap(a){return t50GrantOf(a).cap;}
function t50GrantRate(a){const g=t50GrantCfg();return a.youth?g.youthRate:g.rate;}
/* 소비액 기준 환급액 — 환급률을 적용한 뒤 지원 한도로 자른다 */
function t50RefundOf(a,spend){
  return Math.min(Math.floor((Number(spend)||0)*t50GrantRate(a)/100),t50GrantCap(a));
}
/* 신청 건에 저장된 한도가 있으면 그 값을 쓴다 — 승인 당시의 기준을 보존하기 위함 */
function t50RefundCap(a){return a.refundCap||t50GrantCap(a);}

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
const T50_CFG_SCHEMA=[
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
   note:'예산 소진 9곳 최다'},
  {k:'youthQuota',  lb:'청년 선착순 제한', scope:'option', type:'toggle',on:'운영',off:'미운영',def:false,
   note:'예산 규모·인구에 종속 — 13곳 미표기'},
  {k:'dtidRequired',lb:'디지털관광주민증',  scope:'unified',type:'toggle',on:'필수',off:'선택',def:true,
   note:'현재는 제천만 필수 → 전체 필수로 변경 예정'}
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
   def:function(){return T50_ALWAYS_REJECT.join(' · ')+' 불인정';},by:'apOcrNonCard',
   note:'16곳 동일 — 변경 불가'},
  {k:'corpReceipt', lb:'법인 · 타인명의 영수증',scope:'fixed',type:'select',def:'불인정',by:'t50CorpCheck',
   note:'16곳 동일 — 변경 불가'},
  {k:'stayPrepay',  lb:'숙박 선결제 증빙', scope:'fixed', type:'select',
   def:function(){return '인정 (여행 시작일 기준 '+T50_PREPAY_MAX_DAYS+'일 전까지)';},by:'t50EvDateCheck',
   note:'16곳 동일 — 변경 불가'},
  {k:'stayDocRule', lb:'숙박 증빙서류',    scope:'fixed', type:'select',
   def:function(){return T50_STAY_DOC_LABEL+' + 결제영수증';},by:'t50EvStayCheck',
   note:'골격 16곳 공통 — 명칭 통일'}
 ]},
 {group:'인정 소비범위 · 사용처',items:[
  {k:'spendItems',  lb:'인정 항목',        scope:'fixed', type:'select',
   def:function(){return T50_SPEND_CATS.map(function(c){return c.cat;}).join(' · ');},by:'t50BizCheck',
   note:'골격 16곳 공통 — 표현 통일'},
  {k:'excludeBiz',  lb:'인정제외 업종',    scope:'fixed', type:'select',
   def:function(){return T50_EXCLUDED_BIZ.map(function(b){return b.biz;}).join(' · ');},by:'t50BizCheck',
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
   def:function(){return T50_USE_SCOPE_LABEL;},by:'payUseBlock',
   note:'골격 16곳 공통 — 명칭 통일'},
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
   note:'지역 상권규모 종속 — 평창·제천만 한도 존재'},
  {k:'revisitBonus',lb:'재방문 추가혜택',  scope:'option', type:'toggle',on:'운영',off:'미운영',def:false,
   note:'지역 전략적 인센티브 — 영암만 운영'}
 ]}
];
const T50_CFG_SCOPE_LABEL={fixed:'고정',unified:'통합',option:'옵션'};
const T50_CFG_SCOPE_COLOR={fixed:'#64748b',unified:'#1d4ed8',option:'#047857'};

/* 통합(unified) 값은 전국 공통이라 지역별 사업설정과 분리해 따로 저장한다 */
const T50_UNIFIED_KEY='dtidA_t50UnifiedCfg';
function t50UnifiedCfg(){
  try{const c=JSON.parse(localStorage.getItem(T50_UNIFIED_KEY)||'null');return (c&&typeof c==='object')?c:{};}
  catch(e){return {};}
}
function t50SaveUnifiedCfg(c){localStorage.setItem(T50_UNIFIED_KEY,JSON.stringify(c||{}));}
function t50ResetUnifiedCfg(){localStorage.removeItem(T50_UNIFIED_KEY);}

function t50CfgItems(){
  return T50_CFG_SCHEMA.reduce(function(a,g){return a.concat(g.items);},[]);
}
function t50CfgItem(k){
  return t50CfgItems().filter(function(i){return i.k===k;})[0]||null;
}
/* 기본값 — 함수로 정의된 항목은 그때 평가한다.
   고정 항목의 값을 화면용으로 따로 적어두면 실제 동작과 어긋나므로,
   판정에 쓰는 상수(T50_EXCLUDED_BIZ 등)를 스키마가 직접 읽게 하기 위한 장치다. */
function t50CfgDef(it){return (typeof it.def==='function')?it.def():it.def;}
/* 설정값 읽기 — fixed는 정의값, unified는 전국 공통, option은 지자체별 */
function t50CfgVal(region,k){
  const it=t50CfgItem(k);
  if(!it)return null;
  if(it.scope==='fixed')return t50CfgDef(it);
  if(it.scope==='unified'){
    const c=t50UnifiedCfg();
    return (k in c)?c[k]:t50CfgDef(it);
  }
  const o=t50RegionCfg(region).opt||{};
  return (k in o)?o[k]:t50CfgDef(it);
}
/* 화면에 그대로 쓸 수 있는 문구 */
function t50CfgText(region,k){
  const it=t50CfgItem(k);
  if(!it)return '';
  const v=t50CfgVal(region,k);
  if(it.type==='toggle')return v?it.on:it.off;
  if(it.type==='number'){
    if(it.zero&&!Number(v))return it.zero;
    return Number(v).toLocaleString('ko-KR')+(it.un||'');
  }
  return String(v)+(it.un||'');
}
function t50SetUnified(k,v){
  const c=t50UnifiedCfg();c[k]=v;t50SaveUnifiedCfg(c);
}
function t50SetOption(region,k,v){
  const o=Object.assign({},t50RegionCfg(region).opt||{});
  o[k]=v;
  t50SetRegionCfg(region,{opt:o});
}
/* 지자체 담당자가 만질 수 있는 항목인가 — option만 가능하고 unified는 공사 전용 */
function t50CfgEditable(it){
  if(!it||it.scope==='fixed')return false;
  return it.scope==='option'?true:admIsHQ();
}

/* ── 정산 신청 기한 판정 ─────────────────────────────────────
   설정값 settleDeadline(여행 종료 후 N일) 안에 제출해야 정산이 접수된다.
   기한은 통합 항목이라 전국 공통값이지만, 신청 화면은 지자체 설정을 그대로 읽는
   구조를 지켜 region 을 받아 판정한다(옵션으로 바뀌어도 화면은 그대로 동작한다). */
function t50SettleDue(a){
  const days=Number(t50CfgVal(a.region,'settleDeadline'))||0;
  /* 날짜 계산은 UTC 기준으로 한다 — 로컬 시각으로 파싱하면 toISOString 에서
     시차만큼 밀려 마감일이 하루 앞당겨진다(KST 기준 -1일) */
  const end=Date.parse(a.end+'T00:00:00Z');
  if(isNaN(end))return null;
  return new Date(end+days*86400000).toISOString().slice(0,10);
}
/* 통과하면 null, 기한이 지났으면 {code:'late', due, msg} */
function t50SettleCheck(a,today){
  const due=t50SettleDue(a);
  if(!due)return null;
  today=today||new Date().toISOString().slice(0,10);
  if(today<=due)return null;
  return {code:'late',due:due,
    msg:'\u274c <b>정산 신청 기한이 지났습니다.</b> 이 신청 건의 정산 기한은 여행 종료('+a.end+') 후 '+
        t50CfgText(a.region,'settleDeadline')+'인 <b>'+due+'</b>까지입니다. 기한이 지난 건은 담당 지자체에 문의해 주세요.'};
}
/* 남은 기한 안내 문구 */
function t50SettleDueText(a,today){
  const due=t50SettleDue(a);
  if(!due)return '';
  today=today||new Date().toISOString().slice(0,10);
  const d=t50DayDiff(today,due);
  if(isNaN(d))return '';
  if(d<0)return '정산 신청 기한 경과 — 기한 '+due;
  return '정산 신청 기한 · 여행 종료 후 '+t50CfgText(a.region,'settleDeadline')+' \u2014 '+due+'까지 ('+d+'일 남음)';
}

/* ── 상품권 사용기한 ─────────────────────────────────────────
   16곳 모두 2026.12.31.로 이미 같은 항목이라(1차 분석안 6p) 통합 적용값도 그대로
   쓴다(16p). 다만 해가 바뀌면 날짜만 바뀌는 값이므로 설정값으로 빼되, 16곳 공통
   항목이라 지자체가 아니라 공사 총괄 관리자가 관리한다.
   기한이 지나면 잔액을 쓸 수 없고 회수 대상이 된다. 사용자 화면에는 템플릿
   구성(17p)의 "사용기한 카운트 다운"으로 남은 일수를 보여준다. */
function t50UseEnd(){return t50GrantCfg().useEnd||T50_GRANT_DEFAULT.useEnd;}
function t50UseDaysLeft(today){
  return t50DayDiff(today||new Date().toISOString().slice(0,10),t50UseEnd());
}
function t50UseExpired(today){
  const d=t50UseDaysLeft(today);
  return !isNaN(d)&&d<0;
}
/* 사용기한 안내 — 남은 일수에 따라 단계를 나눠 문구·색을 다르게 준다 */
function t50UseEndInfo(today){
  const d=t50UseDaysLeft(today),e=t50UseEnd().replace(/-/g,'.');
  if(isNaN(d))return {state:'none',days:NaN,date:e,msg:''};
  if(d<0)  return {state:'expired',days:d,date:e,msg:'⛔ 사용기한 만료 ('+e+') — 잔액을 사용할 수 없습니다'};
  if(d===0)return {state:'today', days:d,date:e,msg:'⏰ 오늘이 사용기한 마지막 날입니다 ('+e+')'};
  if(d<=30)return {state:'soon',  days:d,date:e,msg:'⏰ 사용기한 '+e+' — <b>'+d+'일</b> 남았습니다'};
  return     {state:'ok',    days:d,date:e,msg:'🗓 사용기한 '+e+' — '+d+'일 남음'};
}
function t50UseEndColor(info){
  if(!info)return '#64748b';
  if(info.state==='expired')return '#b91c1c';
  if(info.state==='today'||info.state==='soon')return '#b45309';
  return '#64748b';
}

/* ── 지자체 예산 총액 ────────────────────────────────────────
   "마감 기준 = 예산 소진"이 9곳으로 최다인 항목이라(1차 분석안 6p·16p) 지자체별
   예산 총액이 있어야 소진 여부를 판단할 수 있다. 예산은 지자체가 스스로 늘릴 수
   있는 값이 아니므로 사업설정 안에 두되 공사 총괄 관리자만 입력한다.
   0이면 미설정(한도 없음)으로 본다. */
function t50BudgetUsed(region){
  return t50AllApplications()
    .filter(function(x){return x.a.region===region&&x.a.status==='refund_ok';})
    .reduce(function(s,x){return s+(x.a.refundAmount||0);},0);
}

/* ── 주민등록등본 조회(모의) ──────────────────────────────────
   실제 서비스는 행정정보 공동이용망으로 세대원을 회신받는다. 프로토타입에서는
   계정·나이로 결정되는 세대를 구성하며, 개인정보 최소화를 위해 이름은 가운데
   글자를 가려 표시한다. 신청 대상은 배우자와 직계 존·비속뿐이다. */
const T50_DIRECT_RELS=['배우자','자녀','부','모','조부','조모','손자','손녀'];
function t50MaskName(name){
  const s=String(name||'');
  if(s.length<=1)return s;
  if(s.length===2)return s.charAt(0)+'*';
  return s.charAt(0)+new Array(s.length-1).join('*')+s.charAt(s.length-1);
}
function t50IsDirect(rel){return T50_DIRECT_RELS.indexOf(rel)>=0;}
function t50HashStr(s){let h=0;for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0;}return Math.abs(h);}
function t50Household(uid,selfName,selfAge){
  const h=t50HashStr((uid||'guest')+'household');
  const sur=String(selfName||'김').charAt(0);
  const given=['서준','지우','하윤','도윤','서연','민준','지호','수아','예은','시우','채원','현우'];
  const pick=function(k){return given[(h>>k)%given.length];};
  const y=new Date().getFullYear();
  const rows=[];
  if(selfAge>=30)rows.push({rel:'배우자',name:(sur==='김'?'이':sur)+pick(1),birthYear:y-selfAge+((h>>2)%5-2)});
  if(selfAge>=35){
    rows.push({rel:'자녀',name:sur+pick(3),birthYear:y-((h>>3)%14+6)});
    if((h>>4)%2===0)rows.push({rel:'자녀',name:sur+pick(5),birthYear:y-((h>>5)%10+3)});
  }
  rows.push({rel:'부',name:sur+pick(6),birthYear:y-selfAge-((h>>6)%8+25)});
  rows.push({rel:'모',name:(sur==='김'?'박':sur)+pick(7),birthYear:y-selfAge-((h>>7)%8+23)});
  /* 신청 대상이 아닌 세대원 — 제외 사유를 보여주기 위해 함께 조회된다 */
  rows.push({rel:'형제',name:sur+pick(8),birthYear:y-selfAge-((h>>8)%6-3)});
  return rows.map(function(r,i){
    const ok=t50IsDirect(r.rel);
    return {id:'H'+i,rel:r.rel,name:r.name,masked:t50MaskName(r.name),
      birthYear:r.birthYear,age:y-r.birthYear,eligible:ok,
      why:ok?'':'직계 존·비속 및 배우자가 아니어서 신청할 수 없습니다'};
  });
}
