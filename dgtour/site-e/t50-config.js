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
    capacity:9999,minPeople:1,maxPeople:6,
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

/* ── 신청 단위(개인/가족) · 환급 한도 ────────────────────────
   신청자 1명당 최대 환급액은 10만원, 가족 신청은 본인 포함 5명까지다. */
const T50_MAX_PER_PERSON=100000;
const T50_FAMILY_MAX=5;
function t50RefundCap(a){return t50PeopleNum(a)*T50_MAX_PER_PERSON;}

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
