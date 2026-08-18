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

/* 1인당 기본 지원금 · 가산율 */
const FT50_PER_PERSON = 50000;
const FT50_YOUTH_RATE = 0.2;                     /* 청년(만 19~34세) */
const FT50_FAMILY_RATE= 0.1;                     /* 가족(3인 이상) */

const FT50_ST = {
  received:  {t:'접수 대기',      lane:'공사',   ic:'📥', cls:'n'},
  review:    {t:'검토중',         lane:'지자체', ic:'🔎', cls:'o'},
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
    capacity:200, minPeople:1, maxPeople:6,
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

/* 처리 이력 기록 — 누가 언제 어떤 처리를 했는지 남긴다 */
function ft50Hist(rec,st,by,note){
  if(!rec.history) rec.history=[];
  rec.history.push({st:st,ts:new Date().toISOString(),by:by||'',note:note||''});
}

/* 지원금 산정 — 기본(인원×5만) + 청년 20% + 가족(3인 이상) 10% */
function ft50Calc(a){
  const base=ft50PeopleNum(a)*FT50_PER_PERSON;
  const youth=a.youth?Math.round(base*FT50_YOUTH_RATE):0;
  const family=(ft50PeopleNum(a)>=3)?Math.round(base*FT50_FAMILY_RATE):0;
  return {base:base,youth:youth,family:family,total:base+youth+family};
}

/* ── 본인인증 · 주소지 확인 ────────────────────────────────
   실제 서비스는 인증기관(PASS·모바일 신분증 등)과 행정정보 공동이용망이
   성명·생년월일·주민등록상 주소를 회신한다. 프로토타입에서는 입력받은
   주민등록번호로 만 나이만 판정하고(번호는 어디에도 저장하지 않는다),
   주소지는 반값여행 참여 지자체 중 1곳을 시뮬레이션으로 배정한다. */
const FT50_SI={'밀양':'밀양시','제천':'제천시'};   /* 시(市)인 지자체, 나머지는 군 */
function ft50Sigungu(name){ return FT50_SI[name]||(name+'군'); }
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
