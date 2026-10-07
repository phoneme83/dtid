/* ═══════════════════════════════════════════════════════════════════
   시안 G — 대한민국 반값여행 통합플랫폼 (착수보고안 · 굳앤트 ’26.10.)
   공용 데이터·저장소·화면 셸.  모든 site-g 페이지가 이 파일을 쓴다.

   원칙
   - 화면 구조·흐름은 착수보고(32쪽)를 따른다. (bangap.or.kr 3영역)
   - 기존 테스트 홈페이지(시안 A~F)가 더 고도화된 기능은 그 수준을 유지한다.
     (대기열·동시접속, 영수증 OCR, 법인카드·중복 탐지, 관리자 심사·통계)
   - 실데이터가 아닌 값(신규 9개 지역 정보·결제수단·업소 등)은 데모용이다.

   저장 키 (localStorage, 접두사 dtidG_)
   공유   dtidG_applies · dtidG_notices · dtidG_inquiries · dtidG_regionCfg
          dtidG_stdLock · dtidG_stdOpt · dtidG_queue_<지역>_<회차> · dtidG_lock_<지역>
          dtidG_dayOffset · dtidG_persona · dtidG_seq
   계정별 dtidG_noti_<uid> · dtidG_alert_<uid> · dtidG_pay_<uid> · dtidG_wallet_<uid>
          dtidG_seeded_<uid>
   로그인  dgtour_user_id (전 시안 공유)
   ═══════════════════════════════════════════════════════════════════ */

const G_LOGIN_KEY='dgtour_user_id';
const G_P='dtidG_';

/* ── 저장소 ───────────────────────────────────────────────────── */
function gGet(k,def){ try{ const v=localStorage.getItem(G_P+k); return v==null?def:JSON.parse(v); }catch(e){ return def; } }
function gSet(k,v){ try{ localStorage.setItem(G_P+k,JSON.stringify(v)); return true; }catch(e){ return false; } }   /* 용량 초과·차단 시 false */
function gUid(){ try{ return localStorage.getItem(G_LOGIN_KEY)||''; }catch(e){ return ''; } }
function gUGet(k,def,uid){ return gGet(k+'_'+(uid||gUid()),def); }
function gUSet(k,v,uid){ gSet(k+'_'+(uid||gUid()),v); }
function gSeq(){ const n=(gGet('seq',1000)||1000)+1; gSet('seq',n); return n; }

/* ── 날짜 (데모용 시간 이동: dtidG_dayOffset 일) ────────────────── */
function gNow(){ const d=new Date(); d.setDate(d.getDate()+(Number(gGet('dayOffset',0))||0)); return d; }
function gToday(){ const d=gNow(); d.setHours(0,0,0,0); return d; }
function gYmd(d){ d=(d instanceof Date)?d:new Date(d); const p=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
function gAdd(d,n){ const x=(d instanceof Date)?new Date(d):new Date(d+'T00:00:00'); x.setDate(x.getDate()+n); return x; }
function gD(s){
  if(s instanceof Date) return s;
  s=String(s==null?'':s);
  if(s.length>10&&s[10]==='T'){ const d=new Date(s); if(!isNaN(d)){ d.setHours(0,0,0,0); return d; } }   /* 타임스탬프는 현지 날짜로(UTC 'Z' 값이 하루 밀리지 않게) */
  return new Date(s.slice(0,10)+'T00:00:00');
}
function gRealToday(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
function gDiff(a,b){ return Math.round((gD(b)-gD(a))/86400000); }      /* b - a (일) */
function gMD(s){ const d=gD(s); return String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0'); }
function gDot(s){ const d=gD(s); return d.getFullYear()+'.'+gMD(d); }
/* 현지 시각 ISO 문자열(UTC 변환 없음) — 결제일을 날짜로 자를 때 하루 밀리지 않게 */
function gLocalIso(d){ d=d||gNow(); const p=n=>String(n).padStart(2,'0'); return gYmd(d)+'T'+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()); }
function gDT(iso){ const d=new Date(iso); const p=n=>String(n).padStart(2,'0'); return gDot(d)+' '+p(d.getHours())+':'+p(d.getMinutes()); }
function gAgo(iso){
  const m=Math.round((gNow()-new Date(iso))/60000);
  if(m<1) return '방금'; if(m<60) return m+'분 전'; if(m<1440) return Math.round(m/60)+'시간 전';
  return Math.round(m/1440)+'일 전';
}

/* ── 공용 유틸 ────────────────────────────────────────────────── */
function gEsc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function gWon(n){ return (Number(n)||0).toLocaleString('ko-KR')+'원'; }
function gMan(n){ n=Number(n)||0; return (n%10000===0)?(n/10000)+'만원':gWon(n); }
function gHash(s){ let h=0; s=String(s); for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))|0; } return Math.abs(h); }
/* 받침에 맞는 조사: gJosa('평창군','은는') → '은', gJosa('밀양시','과와') → '와' */
function gJosa(w,pair){ const c=String(w||'').trim().slice(-1).charCodeAt(0); const has=c>=0xAC00&&c<=0xD7A3?(c-0xAC00)%28!==0:false; return has?pair[0]:pair[1]; }
function gQS(k){ return new URLSearchParams(location.search).get(k); }
function gMask(name){ name=String(name||''); if(name.length<2) return name; if(name.length===2) return name[0]+'*'; return name[0]+'*'.repeat(name.length-2)+name[name.length-1]; }

/* ═══ 1. 참여 지역 (25곳) ═══════════════════════════════════════════
   착수보고 p11 지도: 접수중 4 · 오픈예정 9 · 마감 12.
   기존 16곳은 테스트 홈페이지 실데이터(TOUR50_REGIONS: 사진·전화·운영시간·좌표)를 잇고,
   새 9곳(화천·태안·서천·안동·영천·함양·산청·장흥·고성)은 데모 값이다.
   좌표 l·t 는 ../assets/img/half-map.png (640×804) 기준 % */
const G_REGION_BASE=[
  /* slug, 이름, 정식명, 시도, 권역, 그룹(open|soon|closed), 좌표, 대표색 */
  ['pyeongchang','평창','평창군','강원특별자치도','강원','open',  66.0,19.5,'#1d4ed8'],
  ['yeonggwang', '영광','영광군','전라남도',      '전라','open',  12.0,68.0,'#b45309'],
  ['hadong',     '하동','하동군','경상남도',      '경상','open',  45.5,73.0,'#15803d'],
  ['miryang',    '밀양','밀양시','경상남도',      '경상','open',  65.0,67.0,'#be123c'],
  ['hwacheon',   '화천','화천군','강원특별자치도','강원','soon',  47.0,10.0,'#0e7490'],
  ['taean',      '태안','태안군','충청남도',      '충청','soon',  14.0,37.0,'#0369a1'],
  ['seocheon',   '서천','서천군','충청남도',      '충청','soon',  19.0,50.0,'#4d7c0f'],
  ['andong',     '안동','안동시','경상북도',      '경상','soon',  69.0,42.0,'#7c2d12'],
  ['yeongcheon', '영천','영천시','경상북도',      '경상','soon',  72.0,55.0,'#9333ea'],
  ['hamyang',    '함양','함양군','경상남도',      '경상','soon',  40.0,60.5,'#166534'],
  ['sancheong',  '산청','산청군','경상남도',      '경상','soon',  43.0,66.0,'#0f766e'],
  ['jangheung',  '장흥','장흥군','전라남도',      '전라','soon',  25.0,81.5,'#1e40af'],
  ['gangjin',    '강진','강진군','전라남도',      '전라','soon',  20.0,80.0,'#b91c1c'],
  ['geochang',   '거창','거창군','경상남도',      '경상','closed',45.0,58.5,'#365314'],
  ['hapcheon',   '합천','합천군','경상남도',      '경상','closed',48.0,64.0,'#a16207'],
  ['gochang',    '고창','고창군','전북특별자치도','전라','closed',16.0,62.0,'#c2410c'],
  ['goseong',    '고성','고성군','경상남도',      '경상','closed',54.0,78.0,'#0284c7'],
  ['namhae',     '남해','남해군','경상남도',      '경상','closed',47.0,81.0,'#0891b2'],
  ['yeongam',    '영암','영암군','전라남도',      '전라','closed',16.0,74.5,'#9f1239'],
  ['haenam',     '해남','해남군','전라남도',      '전라','closed', 9.5,85.5,'#065f46'],
  ['goheung',    '고흥','고흥군','전라남도',      '전라','closed',33.0,85.5,'#1d4ed8'],
  ['wando',      '완도','완도군','전라남도',      '전라','closed',20.5,91.0,'#0f766e'],
  ['hoengseong', '횡성','횡성군','강원특별자치도','강원','closed',50.5,22.0,'#7f1d1d'],
  ['jecheon',    '제천','제천시','충청북도',      '충청','closed',51.0,33.0,'#4338ca'],
  ['yeongwol',   '영월','영월군','강원특별자치도','강원','closed',62.0,27.5,'#166534']
];
const G_ZONES=['강원','충청','전라','경상'];

/* 인접 시군구 — 거주지가 신청 지역과 같거나 인접하면 신청 불가 (통합항목 '제외지역: 주변 지역')
   기존 16곳은 시안 D 의 T50_NEARBY, 평창은 착수보고 p16 원문, 신규 9곳은 데모 값 */
const G_NEARBY={
  pyeongchang:['강릉','정선','횡성','홍천','영월'],
  yeonggwang:['함평','장성','고창','무안'], hadong:['진주','사천','남해','산청','광양','구례'],
  miryang:['창녕','청도','양산','김해','울주'], hwacheon:['춘천','양구','철원'],
  taean:['서산'], seocheon:['보령','부여','군산'], andong:['영주','예천','의성','청송','영양','봉화'],
  yeongcheon:['경산','군위','청송','포항','경주'], hamyang:['거창','산청','남원','장수'],
  sancheong:['함양','거창','합천','진주','하동'], jangheung:['강진','보성','영암','화순'],
  gangjin:['해남','영암','장흥','완도'], geochang:['함양','합천','산청','김천','무주'],
  hapcheon:['거창','산청','의령','창녕','고령'], gochang:['영광','정읍','부안','함평','장성'],
  goseong:['통영','사천','진주','창원'], namhae:['하동','사천','통영','여수','광양'],
  yeongam:['해남','강진','나주','목포','무안','장성'], haenam:['강진','영암','완도','진도','목포'],
  goheung:['보성','장흥','여수','순천'], wando:['해남','강진','장흥','진도'],
  hoengseong:['원주','홍천','평창','영월','춘천'], jecheon:['단양','충주','영월','원주','영주'],
  yeongwol:['정선','평창','제천','태백','횡성']
};

const G_PAY_APPS=['CHAK','비플페이','오케이페이','NH농협','하나원큐'];

/* 지역별 '이게 달라요' 등 특이사항 — 평창은 착수보고 p16 원문, 나머지는 데모 */
const G_REGION_SPECIAL={
  pyeongchang:{intro:'고원의 바람이 부는 곳, 평창으로 떠나는 반값여행',app:'CHAK',
    attractions:['대관령 양떼목장','월정사 전나무숲길','삼양라운드힐','평창 대관령 고원'],
    extraExcl:'골프장·관광택시', photoRule:'얼굴·랜드마크·간판 3가지가 보이게', dept:'평창군청 관광정책과'}
};

function gRegionsAll(){ return G_REGION_BASE.map(b=>gRegion(b[0])); }
function gRegion(slug){
  const b=G_REGION_BASE.find(x=>x[0]===slug); if(!b) return null;
  const [s,name,full,sido,zone,group,l,t,color]=b;
  const legacy=(typeof TOUR50_REGIONS!=='undefined')?TOUR50_REGIONS.find(r=>r.name===name):null;
  const sp=G_REGION_SPECIAL[s]||{};
  const det=(typeof REGION_DETAIL!=='undefined')?REGION_DETAIL[name]:null;
  const app=sp.app||G_PAY_APPS[gHash(s)%G_PAY_APPS.length];
  const venues=det&&det.venues?det.venues:[];
  const clean=v=>v&&v.name&&!/\.\.\.|…/.test(v.name);   /* 실사이트 카드가 말줄임한 이름은 쓰지 않는다 */
  const attractions=sp.attractions?sp.attractions.slice():(venues.filter(v=>clean(v)&&/관람|체험|자연|관광/.test(v.cat)).slice(0,4).map(v=>v.name));
  while(attractions.length<4) attractions.push(name+' 지정관광지 '+(attractions.length+1));
  const r={
    slug:s,name,full,sido,zone,group,l,t,color,
    image:legacy&&legacy.image?legacy.image:null,
    phone:(legacy&&legacy.phone)||(det&&det.phone)||'1330',
    hours:(legacy&&legacy.hours)||'평일 09:00~18:00 (주말·공휴일 제외)',
    intro:sp.intro||(name+'에서 만나는 반값여행 — 여행 경비의 절반을 지역사랑상품권으로 돌려드립니다'),
    app, voucher:(name+'사랑상품권'),
    attractions, nearby:G_NEARBY[s]||[],
    extraExcl:sp.extraExcl||'', photoRule:sp.photoRule||'얼굴과 관광지 안내판이 함께 보이게',
    dept:sp.dept||(full+'청 관광과'),
    links:{tour:'region.html?r='+s,mall:'merchants.html?r='+s,spots:'region.html?r='+s+'#spots'}   /* 실제 지자체 링크는 관리자 '지역 콘텐츠'에서 입력 */
  };
  const ov=(gGet('regionCfg',{})||{})[s]||{};       /* 관리자 '지역 콘텐츠' 덮어쓰기 */
  Object.keys(ov).forEach(k=>{ if(k!=='rounds') r[k]=ov[k]; });
  if(typeof r.nearby==='string') r.nearby=r.nearby.split(/[,·\s]+/).filter(Boolean);
  ['nearby','attractions'].forEach(k=>{ if(!Array.isArray(r[k])) r[k]=[]; });
  while(r.attractions.length<4) r.attractions.push(name+' 지정관광지 '+(r.attractions.length+1));
  r.rounds=gRounds(s,group,ov.rounds);
  return r;
}
function gRegionByName(name){ const b=G_REGION_BASE.find(x=>x[1]===name||x[2]===name); return b?gRegion(b[0]):null; }
function gSetRegionCfg(slug,patch){ const all=gGet('regionCfg',{})||{}; all[slug]=Object.assign({},all[slug]||{},patch); gSet('regionCfg',all); }

/* ── 회차 ── 오늘 기준 상대 날짜로 만들어 언제 열어도 접수중/오픈예정/마감이 고르게 보인다.
   관리자 '회차 일정'에서 저장하면 그 값을 쓴다. */
function gRounds(slug,group,saved){
  if(saved&&saved.length) return saved.map(x=>Object.assign({},x));
  const T=gRealToday(), h=gHash(slug), d=n=>gYmd(gAdd(T,n));   /* 실제 날짜 기준 — dayOffset 으로 시간을 옮기면 회차가 열리고 닫혀야 한다 */
  const q=40+(h%5)*10;
  if(group==='open') return [
    {n:1,applyStart:d(-95),applyEnd:d(-70),travelStart:d(-88),travelEnd:d(-50),quota:q},
    {n:2,applyStart:d(-10-h%5),applyEnd:d(18+h%7),travelStart:d(-3),travelEnd:d(55),quota:q},
    {n:3,applyStart:d(45),applyEnd:d(75),travelStart:d(50),travelEnd:d(105),quota:q}];
  if(group==='soon'){ const o=2+h%11; return [
    {n:1,applyStart:d(o),applyEnd:d(o+28),travelStart:d(o+4),travelEnd:d(o+60),quota:q},
    {n:2,applyStart:d(o+70),applyEnd:d(o+95),travelStart:d(o+74),travelEnd:d(o+125),quota:q}]; }
  return [
    {n:1,applyStart:d(-130),applyEnd:d(-100),travelStart:d(-125),travelEnd:d(-80),quota:q},
    {n:2,applyStart:d(-45),applyEnd:d(-12-h%9),travelStart:d(-40),travelEnd:d(10),quota:q}];
}
/* 회차 상태: soon | open | full(조기마감) | closed */
function gRoundState(slug,rd){
  const T=gYmd(gToday());
  if(T<rd.applyStart) return 'soon';
  if(T>rd.applyEnd) return 'closed';
  return gRoundUsed(slug,rd.n)>=rd.quota?'full':'open';
}
/* 지역 상태: 진행 중인 회차 > 가장 가까운 예정 회차 > 마지막 회차 */
function gRegionState(r){
  r=(typeof r==='string')?gRegion(r):r;
  const st=r.rounds.map(rd=>({rd,st:gRoundState(r.slug,rd)}));
  const open=st.find(x=>x.st==='open'); if(open) return {state:'open',round:open.rd,dday:gDiff(gToday(),open.rd.applyEnd)};
  const soon=st.filter(x=>x.st==='soon').sort((a,b)=>a.rd.applyStart<b.rd.applyStart?-1:1)[0];
  const full=st.find(x=>x.st==='full');
  if(full) return {state:'closed',round:full.rd,full:true,next:soon?soon.rd:null};
  if(soon){
    const past=st.some(x=>x.st==='closed');
    return {state:past?'closed':'soon',round:soon.rd,dday:gDiff(gToday(),soon.rd.applyStart),next:soon.rd,
            nextOnly:past};   /* 지난 회차가 있으면 '이번 회차 마감', 첫 회차 전이면 '오픈예정' */
  }
  return {state:'closed',round:r.rounds[r.rounds.length-1],next:null};
}
const G_STATE_LABEL={open:'접수중',soon:'오픈예정',closed:'마감',full:'조기마감'};
const G_STATE_COLOR={open:'#d63d24',soon:'#2563eb',closed:'#9aa1ac',full:'#9aa1ac'};

/* 거주지로 신청 가능 여부: 'same' 관내 | 'nearby' 인접 | null 가능 */
function gBareGu(v){ return String(v||'').replace(/\s+/g,'').replace(/(특별자치시|특별자치도|광역시|특별시)$/,'').replace(/(시|군|구)$/,''); }
/* 시·도 표기 차이(전라남도/전남, 강원특별자치도/강원 …)를 앞 두 글자 + 남·북 구분으로 맞춘다 */
function gSidoKey(s){ s=String(s||'').replace(/\s+/g,''); const m=s.match(/^(충청|전라|경상)(남|북)/); if(m) return m[1][0]+m[2]; return s.slice(0,2); }
function gAddrBlock(slug,sigungu,sido){
  const r=gRegion(slug); if(!r||!sigungu) return null;
  const a=gBareGu(sigungu);
  /* 이름이 같아도 시·도가 다르면 관내가 아니다 (강원 고성군 ≠ 경남 고성군) */
  if(gBareGu(r.name)===a&&(!sido||gSidoKey(sido)===gSidoKey(r.sido))) return 'same';
  return r.nearby.some(n=>gBareGu(n)===a)?'nearby':null;
}

/* ═══ 2. 운영기준 54개 = 통합 43(잠금) + 옵션 11 (착수보고 p26~28) ══════
   num: 화면 로직이 쓰는 수치. 공사(총괄)만 통합 항목 값을 바꿀 수 있다(dtidG_stdLock).
   옵션 항목은 지자체가 지역별로 고른다(dtidG_stdOpt[지역][id]). */
const G_STD_CATS=[
  ['basic','기본 조건'],['grant','지원 금액'],['apply','사전신청'],['settle','정산신청'],
  ['visit','방문 인증'],['pay','결제·영수증'],['scope','인정 소비'],['use','지급·사용']];
const G_STD=[
  {id:'B1',cat:'basic',name:'지원 대상',val:'관외 거주자'},
  {id:'B2',cat:'basic',name:'제외 지역',val:'주변(인접) 지역 거주자'},
  {id:'B3',cat:'basic',name:'외국인',val:'제외'},
  {id:'B4',cat:'basic',name:'연간 신청 횟수',val:'연 1회',num:1},
  {id:'B5',cat:'basic',name:'대표자 나이',val:'만 18세 이상',num:18},
  {id:'B6',cat:'basic',name:'운영 시간',opt:true,choices:['09시 ~ 18시','10시 ~ 17시'],def:'09시 ~ 18시'},

  {id:'M1',cat:'grant',name:'개인 1인 지원',val:'최대 10만원',num:100000},
  {id:'M2',cat:'grant',name:'팀(2인 이상) 지원',val:'최대 20만원',num:200000},
  {id:'M3',cat:'grant',name:'가족 지원',val:'최대 50만원',num:500000},
  {id:'M4',cat:'grant',name:'청년 지원',val:'최대 14만원',num:140000},
  {id:'M5',cat:'grant',name:'청년팀 지원',val:'최대 28만원',num:280000},
  {id:'M6',cat:'grant',name:'기본 환급률',val:'50%',num:50},
  {id:'M7',cat:'grant',name:'청년 환급률',val:'70%',num:70},
  {id:'M8',cat:'grant',name:'최소 소비액',val:'1인 10만원',num:100000},
  {id:'M9',cat:'grant',name:'청년 기준',val:'만 19~34세',num:[19,34]},
  {id:'M10',cat:'grant',name:'정산 단위',val:'미표기(원 단위)',num:1,check:true},
  {id:'M11',cat:'grant',name:'추가 혜택(재방문 등)',opt:true,choices:['적용 안 함','재방문 시 환급률 +10%p'],def:'적용 안 함'},
  {id:'M12',cat:'grant',name:'가맹점당 소비 한도',opt:true,choices:['한도 없음','가맹점당 30만원','가맹점당 50만원'],def:'한도 없음'},

  {id:'A1',cat:'apply',name:'신청 마감',val:'여행 2일 전까지(영업일)',num:2},
  {id:'A2',cat:'apply',name:'신청 가능 시점',val:'여행 1개월 전부터',num:30},
  {id:'A3',cat:'apply',name:'본인인증',val:'디지털 관광주민증 통합로그인'},
  {id:'A4',cat:'apply',name:'신분증',val:'주민번호 뒷자리 마스킹 제출'},
  {id:'A5',cat:'apply',name:'가족 증빙 서류',val:'주민등록등본'},
  {id:'A6',cat:'apply',name:'미성년자 동행 서류',val:'필수(가족관계 증빙)'},
  {id:'A7',cat:'apply',name:'승인 안내 방식',val:'알림톡(문자 미사용)'},

  {id:'C1',cat:'settle',name:'정산 기한',val:'여행 종료 후 10일 이내',num:10},
  {id:'C2',cat:'settle',name:'정산 횟수',val:'1회',num:1},
  {id:'C3',cat:'settle',name:'디지털 관광주민증',val:'신청자 전원 필수'},
  {id:'C4',cat:'settle',name:'마감 기준(청년 포함)',val:'예산 소진 시 마감(선착순 아님)'},
  {id:'C5',cat:'settle',name:'여행 일정',val:'최대 7일',num:7,check:true},

  {id:'V1',cat:'visit',name:'인증 사진',val:'얼굴 포함'},
  {id:'V2',cat:'visit',name:'인증 관광지',val:'지자체 지정관광지'},
  {id:'V3',cat:'visit',name:'사진 메타데이터 확인',val:'미적용'},
  {id:'V4',cat:'visit',name:'방문 필수 개소 수',opt:true,choices:['1개소 이상','2개소 이상'],def:'2개소 이상'},

  {id:'P1',cat:'pay',name:'카드영수증',val:'불인정(숙박 제외)'},
  {id:'P2',cat:'pay',name:'현금영수증',val:'불인정(숙박 제외)'},
  {id:'P3',cat:'pay',name:'간이영수증·계좌이체',val:'불인정'},
  {id:'P4',cat:'pay',name:'법인·타인 명의 결제',val:'불인정'},
  {id:'P5',cat:'pay',name:'숙박 선결제',val:'인정(여행 전 180일 이내)',num:180},
  {id:'P6',cat:'pay',name:'숙박 증빙',val:'날인 숙박확인서 + 결제영수증'},
  {id:'P7',cat:'pay',name:'주요 결제수단',opt:true,choices:G_PAY_APPS,def:null},

  {id:'S1',cat:'scope',name:'인정 업종',val:'숙박·음식·관광·체험·쇼핑'},
  {id:'S2',cat:'scope',name:'제외 업종',val:'주유소·카센터·금은방·학원·유흥업소'},
  {id:'S3',cat:'scope',name:'연매출 기준',val:'연매출 30억원 초과 업소 제외',num:3000000000},
  {id:'S4',cat:'scope',name:'인정 제외 숙박',opt:true,input:'text',def:''},
  {id:'S5',cat:'scope',name:'생활소비·특정서비스 제외',opt:true,input:'text',def:''},
  {id:'S6',cat:'scope',name:'특정시설 예외 인정',opt:true,input:'text',def:''},

  {id:'U1',cat:'use',name:'지원금 지급 기간',val:'정산 승인 후 14일 이내',num:14},
  {id:'U2',cat:'use',name:'현장 사용처',val:'관내 가맹점'},
  {id:'U3',cat:'use',name:'사용 기한',val:'당해 12월 31일'},
  {id:'U4',cat:'use',name:'환불 규정',val:'명문화(미사용 잔액 환불 불가)'},
  {id:'U5',cat:'use',name:'지급 앱',opt:true,choices:G_PAY_APPS,def:null},
  {id:'U6',cat:'use',name:'온라인 사용처',opt:true,input:'text',def:''},
  {id:'U7',cat:'use',name:'배달앱 사용',opt:true,choices:['불가','허용(지역 공공배달앱)'],def:'불가'}
];
/* 효과값: {val, num, opt, locked} */
function gStd(id,slug){
  const s=G_STD.find(x=>x.id===id); if(!s) return null;
  if(s.opt){
    const per=(gGet('stdOpt',{})||{})[slug]||{};
    let v=per[id];
    if(v==null){ v=s.def; if(v==null&&slug){ const r=gRegion(slug); v=r?r.app:G_PAY_APPS[0]; } }
    return {val:v==null?'':v,opt:true,locked:false,def:s};
  }
  const ov=(gGet('stdLock',{})||{})[id]||{};
  return {val:ov.val!=null?ov.val:s.val,num:ov.num!=null?ov.num:s.num,opt:false,locked:true,def:s};
}
function gStdNum(id){ const v=gStd(id); return v?v.num:null; }
function gSetStdOpt(slug,id,val){ const all=gGet('stdOpt',{})||{}; all[slug]=Object.assign({},all[slug]||{}); all[slug][id]=val; gSet('stdOpt',all); }
function gSetStdLock(id,val,num){ const all=gGet('stdLock',{})||{}; all[id]={val,num}; gSet('stdLock',all); }

/* ═══ 3. 여행 유형·지원금 (착수보고 p13·p18·p26) ═════════════════════
   유형 4종: 개인 / 청년 / 단체(팀 2인 이상) / 가족.  청년팀 = 단체 전원 청년.
   환급액 = min(인정 소비액 × 환급률, 유형 한도). 최소 소비액 = 1인 10만원 × 인원. */
const G_TYPES=[
  {key:'solo',  nm:'개인',     sub:'1인 여행',             em:'🧳'},
  {key:'youth', nm:'청년',     sub:'만 19~34세 1인',       em:'🎒'},
  {key:'team',  nm:'단체(팀)', sub:'2인 이상 · 전원 청년이면 청년팀', em:'👥'},
  {key:'family',nm:'가족',     sub:'가족관계 2인 이상 · 등본 확인', em:'👨‍👩‍👧'}
];
function gAge(birthYmd,at){ const b=gD(birthYmd), t=gD(at||gToday()); let a=t.getFullYear()-b.getFullYear(); const m=t.getMonth()-b.getMonth(); if(m<0||(m===0&&t.getDate()<b.getDate())) a--; return a; }
function gIsYouth(birthYmd){ const r=gStdNum('M9')||[19,34]; const a=gAge(birthYmd); return a>=r[0]&&a<=r[1]; }
/* people: [{birth}] (본인 포함) */
function gGrant(type,people){
  const n=Math.max(1,(people||[]).length);
  const allYouth=(people||[]).length>0&&(people||[]).every(p=>p.birth&&gIsYouth(p.birth));
  const base=gStdNum('M6')||50, yr=gStdNum('M7')||70;
  let cap,rate,label;
  if(type==='family'){ cap=gStdNum('M3'); rate=base; label='가족'; }
  else if(type==='team'){ if(allYouth){ cap=gStdNum('M5'); rate=yr; label='청년팀'; } else { cap=gStdNum('M2'); rate=base; label='단체(팀)'; } }
  else if(type==='youth'){ cap=gStdNum('M4'); rate=yr; label='청년'; }
  else { cap=gStdNum('M1'); rate=base; label='개인'; }
  return {cap,rate,label,minSpend:(gStdNum('M8')||100000)*n,people:n};
}
function gTypeName(k){ const t=G_TYPES.find(x=>x.key===k); return t?t.nm:k; }

/* ═══ 4. 계정 (디지털 관광주민증 로그인 — 테스트 계정) ════════════════
   착수보고: 디주 로그인 → 등록정보 자동 입력, 행정정보 공동이용으로 거주지 자동 확인.
   데모 거주지는 계정마다 고정한다(user3 = 강릉 → 평창은 인접지역이라 신청 불가 시연). */
const G_RESIDENCE={
  user1:{sido:'서울특별시',sigungu:'마포구'},
  user2:{sido:'경기도',sigungu:'수원시'},
  user3:{sido:'강원특별자치도',sigungu:'강릉시'},
  user4:{sido:'부산광역시',sigungu:'해운대구'},
  user5:{sido:'전라남도',sigungu:'목포시'}
};
function gUser(){ return gUserOf(gUid()); }
/* 지정한 계정의 프로필 (관리자 화면이 다른 계정 시연 데이터를 만들 때도 쓴다) */
function gUserOf(id){
  if(!id||typeof ACCOUNTS==='undefined') return null;
  const a=ACCOUNTS.find(x=>x.id===id); if(!a) return null;
  const b=(typeof getAccountBirth==='function')?getAccountBirth(id):{ymd:'1990-01-01',dot:'1990.01.01'};
  const res=G_RESIDENCE[id]||{sido:'서울특별시',sigungu:'종로구'};
  return {id,name:a.name,birth:b.ymd,birthDot:b.dot,phone:'010-'+(1000+gHash(id)%9000)+'-'+(1000+gHash(id+'p')%9000),
    sido:res.sido,sigungu:res.sigungu,addr:res.sido+' '+res.sigungu,av:a.emojiAv,youth:gIsYouth(b.ymd)};
}
function gLoginUrl(){ return 'login.html?next='+encodeURIComponent(location.pathname.split('/').pop()+location.search); }
function gRequireLogin(){ if(!gUser()){ location.replace(gLoginUrl()); return false; } return true; }
function gLogout(){ try{ localStorage.removeItem(G_LOGIN_KEY); }catch(e){} location.href='index.html'; }

/* ═══ 5. 신청 (사전신청 → 심사 → 여행 → 정산 → 환급) ══════════════════
   app = { id, uid, userName, region(slug), round, type, people[], start, end, plan,
           docs[], agree{}, status, grant{cap,rate,label,minSpend}, createdAt,
           history[{at,st,by,memo}], fix{reason,due,target,files[]}, change{...},
           review{memo}, settle{...}, refund{amount,pin,paidAt,registered} } */
const G_ST={
  received:      {nm:'접수 완료',   stage:'wait',   c:'#64748b'},
  review:        {nm:'심사중',      stage:'wait',   c:'#2563eb'},
  fix:           {nm:'보완 필요',   stage:'fix',    c:'#d63d24'},
  approved:      {nm:'승인 완료',   stage:'trip',   c:'#0f766e'},
  change_review: {nm:'일정 변경 심사중',stage:'trip',c:'#7c3aed'},
  rejected:      {nm:'반려',        stage:'end',    c:'#9f1239'},
  canceled:      {nm:'신청 취소',   stage:'end',    c:'#94a3b8'},
  settle_review: {nm:'정산 심사중', stage:'settle', c:'#b45309'},
  settle_fix:    {nm:'정산 보완 필요',stage:'fix',  c:'#d63d24'},
  refund_ok:     {nm:'환급 승인',   stage:'settle', c:'#15803d'},
  refunded:      {nm:'환급 완료',   stage:'done',   c:'#15803d'}
};
/* 마이페이지 단계판 (착수보고 p23): 보완 필요 / 승인 대기 / 여행 예정 / 정산 심사 / 환급 완료 */
const G_STAGES=[['fix','보완 필요'],['wait','승인 대기'],['trip','여행 예정'],['settle','정산 심사'],['done','환급 완료']];
/* 진행바 5단계: 신청-승인-여행-정산-환급 */
function gProgress(a){
  const s=a.status, T=gYmd(gToday());
  if(s==='refunded') return 5;
  if(s==='settle_review'||s==='settle_fix'||s==='refund_ok') return 4;
  if(s==='approved'||s==='change_review') return T>=a.start?3:2;
  if(s==='rejected'||s==='canceled') return 1;
  return 1;
}
const G_INACTIVE=['rejected','canceled'];

function gApps(){ const l=gGet('applies',[]); return Array.isArray(l)?l.filter(a=>a&&typeof a==='object'&&a.id).map(a=>{ ['people','history','docs','visits'].forEach(k=>{ if(a[k]!=null&&!Array.isArray(a[k])) a[k]=[]; }); if(!a.people) a.people=[]; if(!a.history) a.history=[]; return a; }):[]; }   /* 필드가 빠진 레코드도 기본값으로 */   /* 형식이 깨진 값이 섞여도 화면이 멈추지 않게 */
function gSaveApps(list){ return gSet('applies',list); }
function gMyApps(uid){ uid=uid||gUid(); return gApps().filter(a=>a.uid===uid).sort((a,b)=>a.createdAt<b.createdAt?1:-1); }
function gApp(id){ return gApps().find(a=>a.id===id)||null; }
/* 저장에 실패하면(용량 초과 등) null — 호출한 화면이 '접수 완료'를 띄우지 않게 */
function gPutApp(app){ const l=gApps(); const i=l.findIndex(a=>a.id===app.id); if(i>=0) l[i]=app; else l.push(app); return gSaveApps(l)?app:null; }
function gNewAppId(){ return 'B'+String(gToday().getFullYear()).slice(2)+'-'+gSeq(); }
function gRoundUsed(slug,n){ return gApps().filter(a=>a.region===slug&&a.round===n&&G_INACTIVE.indexOf(a.status)<0).length; }
/* 상태 변경 + 이력 + 알림 (알림 매트릭스 p9) */
function gSetStatus(id,st,opt){
  opt=opt||{};
  const a=gApp(id); if(!a) return null;
  const prev=a.status; a.status=st;
  a.history=a.history||[];
  a.history.push({at:gLocalIso(gNow()),st,by:opt.by||'system',memo:opt.memo||''});
  if(opt.patch) Object.assign(a,opt.patch);
  if(!gPutApp(a)) return null;   /* 저장 실패 시 알림도 보내지 않는다 */
  const r=gRegion(a.region);
  const tag=(r?r.full:'')+' '+a.round+'회차';
  const N={
    approved:['approve','승인 완료',tag+' 반값여행 신청이 승인되었습니다. 여행 일정과 관광지 인증 요건을 확인해 주세요.',true],
    rejected:['reject','반려',tag+' 신청이 반려되었습니다. 사유: '+(opt.memo||'-'),true],
    fix:['fix','보완 요청',tag+' 신청 건에 보완이 필요합니다. 사유: '+(opt.memo||'-')+(a.fix&&a.fix.due?' · 기한: '+gMD(a.fix.due):''),true],
    settle_fix:['fix','정산 보완 요청',tag+' 정산 건에 보완이 필요합니다. 사유: '+(opt.memo||'-'),true],
    settle_review:['settle','정산 접수',tag+' 정산 신청이 접수되었습니다. 심사 후 '+(gStdNum('U1')||14)+'일 이내 지급됩니다.',true],
    refunded:['refund','환급 완료',tag+' 환급금 '+gWon(a.refund&&a.refund.amount)+'이 '+(r?r.voucher:'지역사랑상품권')+'으로 지급되었습니다.',true],
    canceled:['cancel','신청 취소',tag+' 신청이 취소되었습니다.',false]
  }[st];
  if(N&&!opt.silent) gNotify(a.uid,N[0],a.region,N[1],N[2],'mypage.html?app='+a.id,N[3]);
  return a;
}

/* ═══ 6. 알림 — 화면 알림창 / 알림톡(모의) / 마이페이지 알림(30일) ═══════ */
const G_NOTI_KIND={open:['오픈 알림','#7c3aed'],approve:['승인 완료','#2563eb'],reject:['반려','#9f1239'],
  fix:['보완 요청','#d63d24'],change:['일정 변경','#0f766e'],settle:['정산 접수','#b45309'],
  refund:['환급 완료','#15803d'],answer:['문의 답변','#16a34a'],cancel:['신청 취소','#64748b']};
function gNotis(uid){
  const cut=gAdd(gToday(),-30);
  const l=gUGet('noti',[],uid); return (Array.isArray(l)?l:[]).filter(n=>n&&new Date(n.at)>=cut).sort((a,b)=>a.at<b.at?1:-1);
}
function gNotify(uid,kind,region,title,body,link,talk){
  if(!uid) return;
  const l=gUGet('noti',[],uid)||[];
  const n={id:'N'+gSeq(),kind,region,title,body,link:link||'',at:gLocalIso(gNow()),read:false,talk:!!talk};
  l.push(n); gUSet('noti',l,uid);
  if(uid===gUid()&&talk) gTalkPreview(n);
  gRefreshBell();
  return n;
}
function gUnread(){ return gNotis().filter(n=>!n.read).length; }
function gReadAll(){ const l=gUGet('noti',[])||[]; l.forEach(n=>n.read=true); gUSet('noti',l); gRefreshBell(); }
function gReadOne(id){ const l=gUGet('noti',[])||[]; const n=l.find(x=>x.id===id); if(n){ n.read=true; gUSet('noti',l); } gRefreshBell(); }

/* 오픈 알림 신청 / 관심지역 — 접수 시작 시 알림톡 (p9·p12·p17) */
function gAlerts(){ return gUGet('alert',[])||[]; }
function gHasAlert(slug,n){ return gAlerts().some(x=>x.region===slug&&(n==null||x.round===n)); }
function gAddAlert(slug,n){
  const l=gAlerts(); if(l.some(x=>x.region===slug&&x.round===n)) return false;
  l.push({region:slug,round:n,at:gLocalIso(gNow()),sent:false}); gUSet('alert',l); return true;
}
function gRemoveAlert(slug,n){ gUSet('alert',gAlerts().filter(x=>!(x.region===slug&&x.round===n))); }
/* 페이지를 열 때마다 확인: 신청한 회차가 열렸으면 오픈 알림 1회 발송 */
function gCheckOpenAlerts(){
  if(!gUid()) return;
  const l=gAlerts(); let ch=false;
  l.forEach(x=>{
    if(x.sent) return;
    const r=gRegion(x.region); if(!r) return;
    const rd=r.rounds.find(z=>z.n===x.round)||gRegionState(r).round;
    if(rd&&gRoundState(r.slug,rd)==='open'){
      x.sent=true; ch=true;
      gNotify(gUid(),'open',r.slug,'오픈 알림',r.full+' '+rd.n+'회차 사전신청 접수가 시작되었습니다. ('+gMD(rd.applyStart)+'~'+gMD(rd.applyEnd)+')','region.html?r='+r.slug,true);
    }
  });
  if(ch) gUSet('alert',l);
}

/* ═══ 7. 공지·FAQ·문의 ════════════════════════════════════════════
   공지: scope 'all'(통합) | 지역 slug.  kind: notice | faq.  pin: 상단 고정 */
function gNotices(){
  let l=gGet('notices',null);
  if(!Array.isArray(l)){ l=gSeedNotices(); gSet('notices',l); }
  return l.filter(n=>n&&n.id).slice().sort((a,b)=>(b.pin?1:0)-(a.pin?1:0)||(a.date<b.date?1:-1));
}
function gSaveNotices(l){ gSet('notices',l); }
function gSeedNotices(){
  const T=gToday(), d=n=>gYmd(gAdd(T,n));
  let i=0; const N=(scope,kind,title,body,date,pin)=>({id:'T'+(++i),scope,kind,title,body,date,pin:!!pin});
  return [
    N('all','notice','반값여행 25개 지역 확대 시행 안내','올해부터 전국 25개 인구감소지역으로 반값여행이 확대됩니다. 통합 플랫폼에서 디지털 관광주민증 로그인 한 번으로 모든 지역을 신청할 수 있습니다.',d(-40),true),
    N('all','notice','올해부터 지역화폐 결제 내역만 소비로 인정됩니다','카드·현금영수증은 숙박을 제외하고 인정되지 않습니다. 여행지에서는 지역화폐 앱으로 결제해 주세요.',d(-40),true),
    N('pyeongchang','notice','2회차 사전신청 접수 시작 (선착순 아님 · 예산 소진 시 마감)','평창군 2회차 사전신청을 시작합니다.',d(-9)),
    N('pyeongchang','notice','지정 유료 관광지 3개소 추가 안내','방문 인증이 가능한 지정관광지 3개소가 추가되었습니다.',d(-17)),
    N('wando','faq','반값여행 인증샷 이벤트','완도군 지정관광지 인증 사진을 SNS에 올리면 기념품을 드립니다.',d(-25)),
    N('hadong','notice','하동군 2회차 여행기간 안내','2회차 여행기간을 확인해 주세요.',d(-6)),
    N('all','notice','알림톡 수신 안내','심사 결과·보완 요청·환급 안내는 디지털 관광주민증에 등록된 휴대폰으로 알림톡 발송됩니다.',d(-30)),
    N('all','faq','디지털 관광주민증 가입이 꼭 필요한가요?','네. 반값여행은 디지털 관광주민증 로그인으로 신청합니다. 동행자도 가입하거나 카카오톡 인증이 필요합니다.',d(-50)),
    N('all','faq','동행자가 디지털 관광주민증 가입이 어려우면 어떻게 하나요?','신청 2단계에서 동행자를 카카오톡 인증으로 확인하거나 신분증 사본(주민번호 뒷자리 마스킹)을 첨부할 수 있습니다.',d(-50)),
    N('all','faq','여행을 못 가게 되면 재신청할 수 있나요?','승인 전에는 마이페이지에서 취소할 수 있습니다. 연 1회 신청 기준이라 취소한 건은 횟수에 포함되지 않습니다.',d(-50)),
    N('all','faq','어떤 결제가 소비로 인정되나요?','여행지 관내 가맹점에서 지역화폐로 결제한 금액이 인정됩니다. 숙박은 카드 결제도 날인 숙박확인서와 함께 인정됩니다.',d(-50)),
    N('all','faq','정산은 언제까지 해야 하나요?','여행 종료 후 10일 이내에 정산신청을 해 주세요. 심사 후 14일 이내 지역사랑상품권으로 지급됩니다.',d(-50))
  ];
}
function gInquiries(){ const l=gGet('inquiries',null); return Array.isArray(l)?l.filter(q=>q&&q.id):gSeedInquiries(); }
function gSaveInquiries(l){ gSet('inquiries',l); }
function gSeedInquiries(){
  const T=gToday(), d=n=>gYmd(gAdd(T,n));
  const l=[
    {id:'Q1',region:'pyeongchang',uid:'user9',name:'이**',title:'정산 서류 보완은 어디서 하나요?',body:'보완 요청을 받았는데 어디서 제출하나요?',secret:false,at:d(-6),answer:{body:'마이페이지 > 신청 내역 > 상세보기에서 [수정하러 가기]를 누르시면 됩니다.',at:d(-5)}},
    {id:'Q2',region:'pyeongchang',uid:'user8',name:'박**',title:'비공개 문의입니다',body:'(비공개)',secret:true,at:d(-4),answer:null},
    {id:'Q3',region:'pyeongchang',uid:'user7',name:'최**',title:'동행자 변경이 가능한가요?',body:'승인 후 동행자를 바꿀 수 있나요?',secret:false,at:d(-3),answer:{body:'여행 시작 2일 전까지 일정 변경 창에서 요청하시면 재승인 후 반영됩니다.',at:d(-2)}},
    {id:'Q4',region:'pyeongchang',uid:'user6',name:'정**',title:'비공개 문의입니다',body:'(비공개)',secret:true,at:d(-2),answer:{body:'(비공개 답변)',at:d(-1)}}
  ];
  gSaveInquiries(l); return l;
}
function gAnswerInquiry(id,body){
  const l=gInquiries(); const q=l.find(x=>x.id===id); if(!q) return;
  q.answer={body,at:gYmd(gToday())}; gSaveInquiries(l);
  gNotify(q.uid,'answer',q.region,'문의 답변','"'+q.title+'" 문의에 답변이 등록되었습니다.','support.html?r='+q.region+'&tab=qna',true);
}

/* ═══ 8. 업소·지역화폐 결제 (데모) ═══════════════════════════════════
   소비인정 업소 목록(p20)과 지역화폐 앱 결제(pay.html)가 같은 목록을 쓴다.
   excluded: 제외 업종(주유소·카센터·금은방·학원·유흥) — 결제는 되지만 정산에서 불인정 */
const G_MERCHANT_CATS=['음식','관광','쇼핑','숙박'];
function gMerchants(slug){
  const r=gRegion(slug); if(!r) return [];
  /* 관리자 '소비인정 업소' 엑셀(CSV) 업로드 목록이 있으면 그것을 쓴다 */
  if(Array.isArray(r.merchants)&&r.merchants.length)
    return r.merchants.map((m,i)=>Object.assign({id:slug+'-u'+i,excluded:m.cat==='제외'||G_EXCLUDED_BIZ.some(w=>String(m.name).indexOf(w)>=0)},m));
  const n=r.name, towns=['읍','중앙면','북면','남면'];
  const det=(typeof REGION_DETAIL!=='undefined')?REGION_DETAIL[n]:null;
  const real=(det&&det.venues||[]).filter(v=>v.name&&!/\.\.\.|…/.test(v.name)).slice(0,6).map((v,i)=>({cat:/숙박/.test(v.cat)?'숙박':/쇼핑|시장/.test(v.cat)?'쇼핑':/관람|체험|자연/.test(v.cat)?'관광':'음식',name:v.name}));
  const base=[
    ['음식',n+' 한우촌'],['음식',n+' 막국수'],['음식',n+' 장터국밥'],['음식','카페 '+n],
    ['관광',n+' 목장 체험장'],['관광',n+' 레일바이크'],['쇼핑',n+' 로컬푸드직매장'],['쇼핑',n+' 전통시장 상회'],
    ['숙박',n+' 힐링펜션'],['숙박',n+' 호텔']
  ];
  const seen={};   /* 실데이터 업소가 업종만 바꿔 두 번 들어가지 않게 이름 기준으로 하나만 */
  const list=real.concat(base.map(x=>({cat:x[0],name:x[1]}))).filter(m=>seen[m.name]?false:(seen[m.name]=1));   /* 자르지 않는다 — 실데이터가 많은 지역에서 숙박 업소가 빠졌었다 */
  const excl=[{cat:'제외',name:n+' 셀프주유소',biz:'주유소'},{cat:'제외',name:n+' 카센터',biz:'카센터'},{cat:'제외',name:n+' 금은방',biz:'금은방'}];
  return list.concat(excl).map((m,i)=>Object.assign({id:slug+'-m'+i,addr:r.full+' '+n+towns[i%4]+' '+(10+gHash(m.name)%180)+'번길',excluded:m.cat==='제외'},m));
}
const G_EXCLUDED_BIZ=['주유소','카센터','금은방','학원','유흥'];

function gPayments(uid){ return gUGet('pay',[],uid)||[]; }
function gAddPayment(p,uid){
  const l=gPayments(uid);
  p=Object.assign({id:'PAY'+gSeq(),approval:String(10000000+gHash(String(Math.random()))%89999999),at:gLocalIso(gNow()),method:'지역화폐'},p);
  l.push(p); gUSet('pay',l,uid); return p;
}
/* 정산 2단계 '지역화폐 결제내역 불러오기' (모의 API): 신청 지역 + 여행기간 결제 */
function gFetchLocalPay(app){
  const s=app.start, e=app.end;
  return gPayments(app.uid).filter(p=>p.region===app.region&&p.at.slice(0,10)>=s&&p.at.slice(0,10)<=e);
}
/* 인정/불인정 자동 분류 — 제외 업종, 여행기간 외, 가맹점당 한도 */
function gClassify(items,app){
  const lim=gStd('M12',app.region).val, per=/30만/.test(lim)?300000:/50만/.test(lim)?500000:Infinity;
  const used={};
  return items.map(p=>{
    const x=Object.assign({},p); x.ok=true; x.reason='';
    const day=String(p.at||p.date||'').slice(0,10);
    if(p.excluded||G_EXCLUDED_BIZ.some(w=>String(p.biz||p.merchant||'').indexOf(w)>=0)){ x.ok=false; x.reason='제외 업종'; }
    else if(p.cat!=='숙박'&&(day<app.start||day>app.end)){ x.ok=false; x.reason='여행기간 외 결제'; }
    else if(p.cat==='숙박'&&p.prepay&&gDiff(day,app.start)>(gStdNum('P5')||180)){ x.ok=false; x.reason='숙박 선결제 기한 초과'; }
    else if(p.src==='upload'&&p.cat!=='숙박'){ x.ok=false; x.reason='카드·현금영수증 불인정(숙박만 인정)'; }
    else { const k=p.merchant; const before=used[k]||0; if(before+p.amount>per){ x.ok=false; x.reason='가맹점당 소비 한도 초과'; } else used[k]=before+p.amount; }
    return x;
  });
}
function gRefundOf(app,recognized){
  const g=app.grant||gGrant(app.type,app.people);
  const revisit=/재방문/.test(gStd('M11',app.region).val)&&gApps().some(a=>a.uid===app.uid&&a.id!==app.id&&a.region===app.region&&a.status==='refunded');
  const rate=g.rate+(revisit?10:0);
  const raw=Math.floor(recognized*rate/100);
  return {raw,amount:Math.min(raw,g.cap),cap:g.cap,rate,revisit,meetsMin:recognized>=g.minSpend};
}

/* ═══ 9. 대기열·동시접속 (테스트 홈페이지 고도화 기능 유지) ══════════════
   정원(quota) 이내면 즉시 접수, 정원의 130%까지는 대기열, 그 이상은 과부하 안내.
   동시접속은 지역별 버전 카운터로 낙관적 잠금(같은 브라우저 탭 간 시연용). */
function gQueueKey(slug,n){ return 'queue_'+slug+'_'+n; }
function gQueue(slug,n){ return gGet(gQueueKey(slug,n),[])||[]; }
function gQueueSave(slug,n,l){ gSet(gQueueKey(slug,n),l); }
function gLockVer(slug){ return Number(gGet('lock_'+slug,0))||0; }
function gLockBump(slug){ const v=gLockVer(slug)+1; gSet('lock_'+slug,v); return v; }
function gCapacity(slug,rd){
  const used=gRoundUsed(slug,rd.n), q=gQueue(slug,rd.n).length;
  const qMax=Math.max(3,Math.ceil(rd.quota*0.3));   /* 정원이 작아도 대기열은 최소 3자리 */
  return {used,quota:rd.quota,queue:q,queueMax:qMax,mode:used<rd.quota?'ok':(q<qMax?'queue':'over')};
}

/* ═══ 10. 관리자 페르소나 ════════════════════════════════════════ */
function gPersonas(){ return [{id:'hq',name:'한국관광공사 총괄',region:null}].concat(G_REGION_BASE.map(b=>({id:'gov_'+b[0],name:b[2]+' 담당자',region:b[0]}))); }
function gPersona(){ const id=gGet('persona','hq'); return gPersonas().find(p=>p.id===id)||gPersonas()[0]; }
function gSetPersona(id){ gSet('persona',id); }

/* ═══ 11. 데모 시드 — 처음 로그인한 계정의 마이페이지가 비어 보이지 않게 ═══════
   착수보고 p23 의 6건 구성(보완 1·승인대기 1·여행예정 1·정산심사 1·환급완료 2)을 재현 */
function gSeedDemo(uid){
  uid=uid||gUid(); if(!uid||gUGet('seeded',false,uid)) return;
  const u=gUserOf(uid); if(!u) return;
  const T=gToday(), d=n=>gYmd(gAdd(T,n)), at=n=>gLocalIso(gAdd(T,n));
  const me={name:u.name,birth:u.birth,rel:'본인',verified:'dju'};
  const comp={name:'김동행',birth:'1992-05-14',rel:'동행',verified:'kakao'};
  const alt=['hapcheon','geochang','goheung','haenam','jecheon','yeongam'];
  const pick=s=>{ if(!gAddrBlock(s,u.sigungu)) return s; return alt.find(x=>!gAddrBlock(x,u.sigungu)); };
  /* 지난 건은 그 지역 회차의 여행 시작일 기준으로 — 회차 기간 밖 날짜가 되지 않게 */
  const rs=(slug,n,k)=>{ const rg=gRegion(pick(slug)); const rd=rg&&(rg.rounds.find(x=>x.n===n)||rg.rounds[0]); return gYmd(gAdd(rd.travelStart,k)); };
  const yS=rs('yeonggwang',1,3), wS=rs('wando',1,4), nS=rs('namhae',1,2);
  let ago=40;
  const mk=(region,round,type,people,start,end,status,extra)=>{
    region=pick(region); ago-=5;
    const id=gNewAppId(), g=gGrant(type,people);
    const a=Object.assign({id,uid,demo:true,userName:u.name,region,round,type,people,start,end,plan:'',docs:[],
      agree:{check:true,privacy:true,third:true},status,grant:g,createdAt:at(-ago),
      history:[{at:at(-ago),st:'received',by:'system',memo:'사전신청 접수'}]},extra||{});
    if(status!=='received') a.history.push({at:at(-ago+2),st:status,by:'demo',memo:''});
    return a;
  };
  const list=[
    mk('pyeongchang',2,'team',[me,comp],d(8),d(10),'fix',{fix:{target:'apply',reason:'동행자 신분증 사본 판독 불가(재첨부 필요)',due:d(4),files:[]}}),
    mk('miryang',2,'solo',[me],d(14),d(15),'review'),
    mk('hadong',2,'solo',[me],d(3),d(4),'approved'),
    mk('yeonggwang',1,'solo',[me],gYmd(gAdd(yS,0)),gYmd(gAdd(yS,1)),'settle_review',{settle:{id:'S'+gSeq(),at:at(-8),items:[
      {src:'localpay',merchant:'영광 한우촌',cat:'음식',amount:68000,at:gYmd(gAdd(yS,0))+'T12:10:00',ok:true},
      {src:'localpay',merchant:'영광 힐링펜션',cat:'숙박',amount:90000,at:gYmd(gAdd(yS,0))+'T15:00:00',ok:true},
      {src:'localpay',merchant:'영광 셀프주유소',cat:'제외',amount:50000,at:gYmd(gAdd(yS,1))+'T09:30:00',ok:false,reason:'제외 업종'}],
      visits:[{spot:'영광 지정관광지 1',date:gYmd(gAdd(yS,0)),method:'qr',gps:true},{spot:'영광 지정관광지 2',date:gYmd(gAdd(yS,1)),method:'qr',gps:true}],
      recognized:158000,rejectedAmt:50000,expected:79000}}),
    mk('wando',1,'solo',[me],gYmd(gAdd(wS,0)),gYmd(gAdd(wS,1)),'refunded',{settle:{id:'S'+gSeq(),at:at(-55),items:[
      {src:'localpay',merchant:'완도 전복식당',cat:'음식',amount:80000,at:gYmd(gAdd(wS,0))+'T12:00:00',ok:true},
      {src:'localpay',merchant:'완도 로컬푸드직매장',cat:'쇼핑',amount:70000,at:gYmd(gAdd(wS,1))+'T11:00:00',ok:true}],
      visits:[{spot:'완도 지정관광지 1',date:gYmd(gAdd(wS,0)),method:'qr',gps:true}],recognized:150000,rejectedAmt:0,expected:75000},
      refund:{amount:75000,pin:'5821-0394-2210',paidAt:gYmd(gAdd(wS,15)),registered:false}}),
    mk('namhae',1,'solo',[me],gYmd(gAdd(nS,0)),gYmd(gAdd(nS,2)),'refunded',{settle:{id:'S'+gSeq(),at:at(-85),items:[
      {src:'localpay',merchant:'남해 멸치쌈밥',cat:'음식',amount:120000,at:gYmd(gAdd(nS,0))+'T12:00:00',ok:true},
      {src:'localpay',merchant:'남해 독일마을 상회',cat:'쇼핑',amount:180000,at:gYmd(gAdd(nS,1))+'T11:00:00',ok:true}],
      visits:[],recognized:300000,rejectedAmt:0,expected:100000},
      refund:{amount:100000,pin:'7710-2283-9015',paidAt:gYmd(gAdd(nS,15)),registered:true}})
  ];
  const all=gApps().concat(list); gSaveApps(all);
  const nl=gUGet('noti',[],uid)||[];
  const push=(kind,region,title,body,link,ago,read)=>nl.push({id:'N'+gSeq(),kind,region,title,body,link,at:gLocalIso(new Date(gNow().getTime()-ago*86400000)),read:!!read,talk:true});
  const R=i=>gRegion(list[i].region);
  push('answer',list[0].region,'문의 답변','"동행자 변경이 가능한가요?" 문의에 답변이 등록되었습니다.','support.html?r='+list[0].region+'&tab=qna',0.1);
  push('fix',list[0].region,'보완 요청',R(0).full+' 2회차 신청 건에 보완이 필요합니다. 사유: 동행자 신분증 사본 판독 불가(재첨부 필요)','mypage.html?app='+list[0].id,1);
  push('open',list[0].region,'오픈 알림',R(0).full+' 2회차 사전신청 접수가 시작되었습니다.','region.html?r='+list[0].region,2,true);
  push('approve',list[2].region,'승인 완료',R(2).full+' 2회차 반값여행 신청이 승인되었습니다.','mypage.html?app='+list[2].id,5,true);
  push('settle',list[3].region,'정산 접수',R(3).full+' 1회차 정산 신청이 접수되었습니다.','mypage.html?app='+list[3].id,8,true);
  push('refund',list[4].region,'환급 완료',R(4).full+' 1회차 환급금 75,000원이 '+R(4).voucher+'으로 지급되었습니다.','mypage.html?app='+list[4].id,15,true);
  gUSet('noti',nl,uid);
  gUSet('seeded',true,uid);
}

/* ═══ 12. 화면 셸 — 통합 헤더 / 지자체 헤더 / 푸터 / 플로팅 / 알림 패널 ═══════
   gShell({mode:'hub'|'region'|'my', slug, active})  — body 맨 앞에 헤더, 끝에 푸터를 넣는다. */
function gShell(opt){
  opt=opt||{};
  if(typeof ACCOUNTS==='undefined'||typeof TOUR50_REGIONS==='undefined'){   /* 배포 서버 일시 오류로 공용 데이터를 못 받은 경우 */
    const w=document.createElement('div'); w.className='g-loadfail';
    w.innerHTML='공용 데이터를 불러오지 못했습니다. 잠시 후 <a href="#" onclick="location.reload();return false">새로고침</a>해 주세요.';
    document.body.insertBefore(w,document.body.firstChild);
  }
  const u=gUser();
  const r=opt.slug?gRegion(opt.slug):null;
  const zones=G_ZONES.map(z=>'<div class="g-zone"><b>'+z+'</b>'+G_REGION_BASE.filter(b=>b[4]===z).map(b=>{
      const st=gRegionState(b[0]).state;
      return '<a href="region.html?r='+b[0]+'"><i class="dot '+st+'"></i>'+b[2]+'</a>';
    }).join('')+'</div>').join('');
  const userBox=u
    ?'<button class="g-bell" onclick="gToggleBell(event)" aria-label="알림">🔔<span class="g-badge" id="gBellBadge"></span></button>'+
     '<a class="g-me" href="mypage.html">'+gEsc(u.name)+' 님</a>'
    :'<a class="g-login" href="'+gLoginUrl()+'">디주 로그인</a>';
  let nav='';
  if(opt.mode==='region'&&r){
    const q='?r='+r.slug;
    nav='<nav class="g-nav">'+
      '<a class="'+(opt.active==='apply'?'on':'')+'" href="apply.html'+q+'">사전신청</a>'+
      '<a class="'+(opt.active==='settle'?'on':'')+'" href="settle.html'+q+'">정산신청</a>'+
      '<div class="g-dd"><a class="'+(opt.active==='guide'?'on':'')+'" href="rguide.html'+q+'">사업안내 ▾</a><div class="g-ddm">'+
        '<a href="rguide.html'+q+'">신청·정산 안내</a><a href="merchants.html'+q+'">소비인정 업소</a><a href="localpay.html'+q+'">지역화폐 사용법</a></div></div>'+
      '<div class="g-dd"><a class="'+(opt.active==='support'?'on':'')+'" href="support.html'+q+'">고객지원 ▾</a><div class="g-ddm">'+
        '<a href="support.html'+q+'&tab=notice">공지사항</a><a href="support.html'+q+'&tab=faq">자주 묻는 질문</a><a href="support.html'+q+'&tab=qna">문의하기</a></div></div>'+
      '<div class="g-dd"><a href="#">다른 지역 ▾</a><div class="g-ddm g-zones">'+zones+'</div></div>'+
    '</nav>';
  } else {
    nav='<nav class="g-nav">'+
      '<a class="'+(opt.active==='guide'?'on':'')+'" href="guide.html">사업안내</a>'+
      '<div class="g-dd"><a href="index.html#map">참여지역 ▾</a><div class="g-ddm g-zones">'+zones+'</div></div>'+
      '<a class="'+(opt.active==='notice'?'on':'')+'" href="notice.html">공지사항</a>'+
      (u?'<a class="'+(opt.active==='my'?'on':'')+'" href="mypage.html">마이페이지</a>':'')+
    '</nav>';
  }
  const logo='<a class="g-logo" href="index.html"><span class="g-dju">디지털 관광주민증</span><i>|</i><span class="g-bg">대한민국 반값여행</span>'+
    (r&&opt.mode==='region'?'<i>|</i><span class="g-rg" style="color:'+r.color+'">'+gEsc(r.full)+'</span>':'')+'</a>';
  const head=document.createElement('header');
  head.className='g-head'+(opt.mode==='region'?' region':'');
  head.innerHTML='<div class="g-in">'+logo+nav+'<div class="g-user">'+userBox+
    '<button class="g-burger" onclick="document.body.classList.toggle(\'g-navopen\')" aria-label="메뉴">☰</button></div></div>'+
    '<div class="g-bellp" id="gBellP" onclick="event.stopPropagation()"></div>';
  document.body.insertBefore(head,document.body.firstChild);

  const foot=document.createElement('footer'); foot.className='g-foot';
  foot.innerHTML=(opt.mode==='region'&&r
      ?'<div class="g-rband"><div class="g-in"><b>'+gEsc(r.dept)+'</b> · '+gEsc(r.phone)+' · '+gEsc(gStd('B6',r.slug).val)+' 운영'+
        ' <a href="support.html?r='+r.slug+'&tab=qna">문의하기 ›</a> <a href="index.html">통합 메인 ›</a></div></div>':'')+
    '<div class="g-in"><div class="g-fl"><b>한국관광공사</b> · 강원특별자치도 원주시 세계로 10 · 고객센터 1330</div>'+
    '<div class="g-fl"><a href="guide.html#gdNotes">이용약관</a> · <a href="guide.html#gdNotes"><b>개인정보처리방침</b></a> · <a href="../sites.html">시안 목록</a> · <a href="wireframe.html">시안 G 설명</a> · <a href="admin.html">관리자</a></div>'+
    '<div class="g-fl g-demo">시안 G — 「대한민국 반값여행 통합플랫폼 구축용역 착수보고」(’26.10.) 화면 구조를 따른 테스트용 목업입니다. 실제 인증·결제·발송은 하지 않습니다.</div></div>';
  document.body.appendChild(foot);

  if(opt.mode==='region'&&r){
    const fl=document.createElement('div'); fl.className='g-float';
    fl.innerHTML='<a href="'+r.links.tour+'" title="관광홈페이지">🏞<span>관광</span></a><a href="'+r.links.mall+'" title="지역몰">🛍<span>지역몰</span></a>'+
      '<a href="region.html?r='+r.slug+'#spots" title="관광지 소개">📍<span>관광지</span></a><a href="pay.html?r='+r.slug+'" title="지역화폐 앱(모의)">💳<span>지역화폐</span></a>'+
      '<a href="#" onclick="scrollTo({top:0,behavior:\'smooth\'});return false" title="맨 위로">▲<span>TOP</span></a>';
    document.body.appendChild(fl); document.body.classList.add('has-float');
  }
  if(!document.getElementById('gToast')){ const t=document.createElement('div'); t.id='gToast'; t.setAttribute('role','status'); document.body.appendChild(t); }
  if(!document.getElementById('gModal')){ const m=document.createElement('div'); m.id='gModal'; m.className='g-modal'; m.onclick=e=>{ if(e.target===m) gCloseModal(); }; document.body.appendChild(m); }
  document.addEventListener('click',()=>{ const p=document.getElementById('gBellP'); if(p) p.classList.remove('on'); });
  gCheckOpenAlerts();
  gRefreshBell();
}
function gRefreshBell(){
  const b=document.getElementById('gBellBadge'); if(!b) return;
  const n=gUid()?gUnread():0; b.textContent=n>9?'9+':n; b.style.display=n?'':'none';
}
function gSafeLink(u){ u=String(u||''); return /^[a-z0-9_-]+\.html([?#][^\s"'<>]*)?$/i.test(u)?u:'mypage.html'; }   /* 같은 폴더 화면만 — javascript: 등 차단 */
function gNotiItem(n){
  const k=G_NOTI_KIND[n.kind]||['알림','#64748b'], r=gRegion(n.region);
  return '<a class="g-ni'+(n.read?'':' unread')+'" href="'+gEsc(gSafeLink(n.link))+'" onclick="gReadOne(\''+n.id+'\')">'+
    '<i style="background:'+k[1]+'"></i><div><b>'+(r?gEsc(r.full)+' · ':'')+gEsc(n.title)+'</b><p>'+gEsc(n.body)+'</p><small>'+gAgo(n.at)+(n.talk?' · 알림톡 발송':'')+'</small></div></a>';
}
function gToggleBell(e){
  e.stopPropagation();
  const p=document.getElementById('gBellP'); if(!p) return;
  if(p.classList.contains('on')){ p.classList.remove('on'); return; }
  const l=gNotis();
  p.innerHTML='<div class="g-bh"><b>알림</b><span>최근 30일 보관</span></div>'+
    (l.length?l.slice(0,8).map(gNotiItem).join(''):'<p class="g-empty">새 알림이 없습니다</p>')+
    '<div class="g-bf"><a href="mypage.html#noti">전체 보기</a><button onclick="gReadAll();gToggleBell(event);gToggleBell(event)">모두 읽음</button></div>';
  p.classList.add('on');
}

/* 화면 알림창(토스트) — 방금 한 행동의 결과 */
function gToast(msg,kind){
  const t=document.getElementById('gToast'); if(!t) return alert(msg);
  t.className='on '+(kind||''); t.textContent=msg;
  clearTimeout(gToast._t); gToast._t=setTimeout(()=>t.className='',2600);
}
/* 알림톡 미리보기(모의 발송) — 카카오 알림톡 말풍선 모양 */
function gTalkPreview(n){
  const r=gRegion(n.region);
  let box=document.getElementById('gTalk');
  if(!box){ box=document.createElement('div'); box.id='gTalk'; document.body.appendChild(box); }
  box.innerHTML='<div class="g-talk"><div class="g-th">💬 알림톡 · 반값여행 '+gEsc(n.title)+'</div><div class="g-tb">'+gEsc(n.body)+'</div>'+
    '<a class="g-tbtn" href="'+gEsc(gSafeLink(n.link))+'">'+(n.kind==='fix'?'마이페이지에서 제출':'자세히 보기')+'</a><small>모의 발송 — 실제 알림톡은 보내지 않습니다</small></div>';
  box.className='on'; clearTimeout(gTalkPreview._t); gTalkPreview._t=setTimeout(()=>box.className='',5200);
}
function gModal(html,cls){
  const m=document.getElementById('gModal'); if(!m) return;
  m.innerHTML='<div class="g-mbox '+(cls||'')+'"><button class="g-mx" onclick="gCloseModal()" aria-label="닫기">×</button>'+html+'</div>';
  m.classList.add('on'); document.body.style.overflow='hidden';
  m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true');
  if(!m.classList.contains('was-open')) gModal._ret=document.activeElement;
  m.classList.add('was-open');
  const box=m.querySelector('.g-mbox'); box.setAttribute('tabindex','-1');
  const f=box.querySelector('input,select,textarea,button:not(.g-mx),a[href]'); (f||box).focus({preventScroll:true});
}
function gCloseModal(){
  const m=document.getElementById('gModal'); if(m){ m.classList.remove('on','was-open'); m.innerHTML=''; }
  document.body.style.overflow='';
  if(gModal._ret&&gModal._ret.focus) try{ gModal._ret.focus({preventScroll:true}); }catch(e){}
}
document.addEventListener('keydown',e=>{
  const m=document.getElementById('gModal'); if(!m||!m.classList.contains('on')) return;
  if(e.key==='Escape'){ gCloseModal(); return; }
  if(e.key==='Tab'){   /* 모달 밖으로 포커스가 빠지지 않게 */
    const f=[...m.querySelectorAll('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled&&x.offsetParent!==null);
    if(!f.length) return; const a=f[0], z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){ z.focus(); e.preventDefault(); } else if(!e.shiftKey&&document.activeElement===z){ a.focus(); e.preventDefault(); }
  }
});

/* 상태 배지 */
function gBadge(st){ const s=G_ST[st]||{nm:st,c:'#64748b'}; return '<span class="g-st" style="--c:'+s.c+'">'+s.nm+'</span>'; }
function gStateBadge(state){ return '<span class="g-ss '+state+'">'+(G_STATE_LABEL[state]||state)+'</span>'; }
/* 지역 대표 이미지(없으면 대표색 그라데이션) */
function gRegionBg(r){ return r.image?'url(\''+(/^(https?:)?\/\//.test(r.image)?r.image:'../'+r.image.replace(/^\.\.\//,''))+'\') center/cover':'linear-gradient(135deg,'+r.color+',#0f172a)'; }
