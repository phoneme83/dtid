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

/* ── 본인인증(PASS·행정정보 공동이용) 모의 결과 ──────────────
   실제 서비스는 인증기관이 성명·생년월일·주민등록상 주소를 회신한다.
   여기서는 계정 id로 고정된 값을 만들어 재신청 시에도 같은 자격이 나오게 한다. */
const FT50_RESIDENCES=[
  {sido:'서울특별시',sgg:'마포구'},{sido:'경기도',sgg:'성남시 분당구'},
  {sido:'부산광역시',sgg:'해운대구'},{sido:'충청북도',sgg:'청주시 상당구'},
  {sido:'대전광역시',sgg:'유성구'}
];
function ft50Identity(uid,name){
  try{
    const saved=JSON.parse(localStorage.getItem(FT50_ID_PREFIX+uid)||'null');
    if(saved) return saved;
  }catch(e){}
  const h=(typeof fHash==='function')?fHash(uid||'guest'):7;
  const res=FT50_RESIDENCES[h%FT50_RESIDENCES.length];
  const age=[27,33,41,52,29][h%5];
  const rec={
    name:name||'회원',
    age:age,
    youth:(age>=19&&age<=34),
    sido:res.sido,
    addr:res.sido+' '+res.sgg,
    means:['PASS 통신사 인증','모바일 신분증','행정정보 공동이용','금융인증서'][h%4],
    ts:new Date().toISOString()
  };
  localStorage.setItem(FT50_ID_PREFIX+uid,JSON.stringify(rec));
  return rec;
}
function ft50IdentityDone(uid){ return !!localStorage.getItem(FT50_ID_PREFIX+uid); }

/* ── 관리자 계정(페르소나) — 공사 총괄 / 지자체 담당자 권한 분리 ── */
const FT50_ADMIN_ACCOUNTS=[{id:'kto',name:'공사 총괄 관리자',region:null}].concat(
  ft50Regions().map(r=>({id:'gov_'+r.name,name:r.sido+' '+r.name+' 담당자',region:r.name}))
);
function ft50Persona(){
  const id=localStorage.getItem(FT50_PERSONA_KEY)||'kto';
  return FT50_ADMIN_ACCOUNTS.find(a=>a.id===id)||FT50_ADMIN_ACCOUNTS[0];
}
function ft50SetPersona(id){ localStorage.setItem(FT50_PERSONA_KEY,id); }
