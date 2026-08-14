/* 반값여행(t50) 공용 설정·집계 스크립트 — t50-admin.html / t50-apply.html / mypage-history.html 공유
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
