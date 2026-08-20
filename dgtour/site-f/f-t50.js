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

/* 1인당 기본 지원금 · 가산율 · 한도 */
const FT50_PER_PERSON = 50000;
const FT50_YOUTH_RATE = 0.2;                     /* 청년(만 19~34세) */
const FT50_FAMILY_RATE= 0.1;                     /* 가족(3인 이상) */
const FT50_MAX_PER_PERSON = 100000;              /* 신청자 1명당 최대 환급액 */
const FT50_FAMILY_MAX = 5;                       /* 가족 단위 신청 시 본인 포함 최대 인원 */

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

/* 지원금 산정 — 기본(인원×5만) + 청년 20% + 가족(3인 이상) 10%.
   단 신청자 1명당 최대 환급액(10만원)을 넘지 못한다 */
function ft50Calc(a){
  const n=ft50PeopleNum(a);
  const base=n*FT50_PER_PERSON;
  const youth=a.youth?Math.round(base*FT50_YOUTH_RATE):0;
  const family=(n>=3)?Math.round(base*FT50_FAMILY_RATE):0;
  const cap=ft50RefundCap(a);
  const sum=base+youth+family;
  return {base:base,youth:youth,family:family,cap:cap,capped:sum>cap,total:Math.min(sum,cap)};
}
/* 환급 한도 = 인원 × 1인당 최대 환급액 */
function ft50RefundCap(a){ return ft50PeopleNum(a)*FT50_MAX_PER_PERSON; }

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
