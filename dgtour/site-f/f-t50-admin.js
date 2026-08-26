/* ============================================================
   시안 F — 관리자 페이지 › 지역사랑 휴가지원
   신청 심사(접수확인→검토→승인/반려→결과통보→환급심사) ·
   지자체 사업설정 · 통계를 담당자가 처리하는 화면.
   신청 데이터는 f-t50.js 의 공용 저장소(dtidF_t50Applies_<uid>)를 본다.
   ============================================================ */

let t50aSub='list';      /* list | biz | stat */
let t50aRegion='';       /* 지자체 필터 */
let t50aStatus='';       /* 상태 필터 */
let t50aBizRegion='';    /* 사업설정 대상 지자체 */
let t50aStatRegion='';   /* 통계 대상 지자체 */

const T50A_SUBS=[
  {key:'list',label:'📋 신청관리'},
  {key:'biz', label:'⚙️ 사업설정'},
  {key:'stat',label:'📊 통계'},
  {key:'screen',label:'🖼 화면설계'}
];
/* 대시보드 타일 ↔ 상태 필터. 승인/환급심사는 복합 상태 */
const T50A_GROUP={appr2:['approved','notified'],refund2:['refund_req','refund_fix']};

/* 지자체 담당자로 로그인하면 자기 지역만 보인다 */
function t50aScope(){ return ft50Persona().region; }
function t50aScoped(){
  const scope=t50aScope();
  const all=ft50All();
  return scope?all.filter(x=>x.a.region===scope):all;
}
function t50aStatuses(key){ return key?(T50A_GROUP[key]||[key]):null; }

function t50aPersonaInit(){
  const sel=document.getElementById('t50aPersona');
  sel.innerHTML=FT50_ADMIN_ACCOUNTS.map(a=>'<option value="'+a.id+'">'+fEsc(a.name)+'</option>').join('');
  sel.value=ft50Persona().id;
}
function t50aPersonaChange(){
  ft50SetPersona(document.getElementById('t50aPersona').value);
  t50aRegion=''; t50aBizRegion=''; t50aStatRegion='';
  t50aRender();
}

function t50aSubTabs(){
  document.getElementById('t50aSubTabs').innerHTML=T50A_SUBS.map(s=>
    '<button class="'+(s.key===t50aSub?'on':'')+'" onclick="t50aGo(\''+s.key+'\')">'+s.label+'</button>').join('');
}
function t50aGo(k){ t50aSub=k; t50aRender(); }

/* 대시보드 KPI — 지역사랑 휴가지원 신청자수·환급자수·환급금액.
   신청자수·환급자수는 동반 인원을 포함한 실제 인원(취소·반려 제외),
   환급금액은 담당자가 환급 승인한 금액의 합계다. */
function t50aKpi(){
  const el=document.getElementById('admT50Kpi');
  if(!el) return;
  const list=t50aScoped().map(x=>x.a);
  const active=list.filter(a=>FT50_INACTIVE.indexOf(a.status)<0);
  const done=list.filter(a=>a.status==='refund_ok');
  const ppl=active.reduce((s,a)=>s+ft50PeopleNum(a),0);
  const rppl=done.reduce((s,a)=>s+ft50PeopleNum(a),0);
  const ramt=done.reduce((s,a)=>s+(a.refundAmount||a.amount||0),0);
  const rows=[
    {lb:'신청자수',  vl:ppl,  un:'명',  dt:'취소·반려 제외'},
    {lb:'환급자수',  vl:rppl, un:'명',  dt:'환급 완료'},
    {lb:'환급금액',  vl:ramt, un:'원',  dt:'지급 확정'},
    {lb:'신청건수',  vl:active.length, un:'건', dt:'진행 중 포함'}
  ];
  el.innerHTML=rows.map(k=>
    '<div class="k"><div class="lb">'+k.lb+'</div>'+
      '<div class="vl">'+fmt(k.vl)+'<small>'+k.un+'</small></div>'+
      '<div class="dt" style="color:var(--sub)">'+k.dt+'</div></div>').join('');
  const scope=t50aScope();
  document.getElementById('admT50KpiNote').textContent=
    (scope?scope+' 담당 지역 기준':'전 지자체 기준')+' · 신청자 화면에서 접수된 실제 데이터를 집계합니다.';
}

function t50aRender(){
  t50aKpi();
  t50aSubTabs();
  if(t50aSub==='biz') t50aRenderBiz();
  else if(t50aSub==='stat') t50aRenderStat();
  else if(t50aSub==='screen') t50aRenderScreen();
  else t50aRenderList();
}

/* ══ 신청관리 ══════════════════════════════════════════════ */
function t50aRegionSelect(){
  const scope=t50aScope();
  if(scope) return '<select disabled><option>'+fEsc(scope)+'</option></select>';
  const names=[...new Set(ft50All().map(x=>x.a.region))];
  return '<select onchange="t50aSetRegion(this.value)"><option value="">전체 지자체</option>'+
    names.map(n=>'<option value="'+fEsc(n)+'"'+(n===t50aRegion?' selected':'')+'>'+fEsc(n)+'</option>').join('')+'</select>';
}
function t50aSetRegion(v){ t50aRegion=v; t50aRenderList(); }
function t50aSetStatus(v){ t50aStatus=v; t50aRenderList(); }
function t50aTile(k){ t50aStatus=(t50aStatus===k?'':k); t50aRenderList(); }

function t50aRenderList(){
  const all=t50aScoped();
  const c=k=>all.filter(x=>x.a.status===k).length;
  const tile=(key,n,label)=>
    '<div class="t50a-tile'+(t50aStatus===key?' on':'')+'" role="button" tabindex="0" onclick="t50aTile(\''+key+'\')" '+
    'onkeydown="if(event.key===\'Enter\')t50aTile(\''+key+'\')"><div class="n">'+n+'</div><div class="l">'+label+' ›</div></div>';

  const scope=t50aScope();
  const stArr=t50aStatuses(t50aStatus);
  const list=all.filter(x=>(scope||!t50aRegion||x.a.region===t50aRegion)&&(!stArr||stArr.indexOf(x.a.status)>=0));

  document.getElementById('t50aBody').innerHTML=
    '<div class="t50a-bar">'+t50aRegionSelect()+
      '<select onchange="t50aSetStatus(this.value)">'+
        ['','received','review','appr2','rejected','canceled','refund2','refund_ok'].map(function(k){
          const lb={'':'전체 상태',received:'접수 대기',review:'검토중',appr2:'승인(통보 포함)',
                    rejected:'반려',canceled:'신청 취소',refund2:'환급 심사',refund_ok:'환급 완료'}[k];
          return '<option value="'+k+'"'+(k===t50aStatus?' selected':'')+'>'+lb+'</option>';
        }).join('')+'</select>'+
      '<div class="rt"><button class="btn gy" onclick="t50aRender()">↻ 새로고침</button>'+
        '<button class="btn gy" onclick="t50aReset()">데모 데이터 초기화</button></div>'+
    '</div>'+
    '<div class="t50a-tiles">'+
      tile('received',c('received'),'접수 대기')+
      tile('review',c('review'),'검토중')+
      tile('appr2',c('approved')+c('notified'),'승인')+
      tile('rejected',c('rejected'),'반려')+
      tile('canceled',c('canceled'),'신청 취소')+
      tile('refund2',c('refund_req')+c('refund_fix'),'환급 심사')+
      tile('refund_ok',c('refund_ok'),'환급 완료')+
    '</div>'+
    (list.length?list.map(t50aCard).join('')
      :'<div class="t50a-empty">표시할 신청 건이 없습니다.<br><a href="t50.html" style="color:var(--pri);font-weight:800">신청자 화면</a>에서 먼저 통합신청을 접수해 보세요.</div>');
}

function t50aCard(x){
  const a=x.a, K="'"+x.k+"',"+x.i;
  const rid='t50aRsn_'+ft50Uid(x.k)+'_'+x.i;
  const nid='t50aNote_'+ft50Uid(x.k)+'_'+x.i;   /* 검토의견 입력창 */
  const st=FT50_ST[a.status]||{t:a.status,cls:'n',ic:'•'};
  const sameSido=(a.addr||'').indexOf(a.sido)===0;
  const inPeriod=(!a.period)||(a.start>=a.period.s&&a.end<=a.period.e);

  const chk='<div class="t50a-chk">'+
    '<span'+(sameSido?' class="bad"':'')+'>'+(sameSido?'✕':'✔')+' 관외거주 — 주소지 '+fEsc(a.addr||'-')+' / 신청지 '+fEsc(a.sido)+'</span>'+
    (a.period?'<span'+(inPeriod?'':' class="bad"')+'>'+(inPeriod?'✔':'✕')+' 여행기간 — 가능기간('+ft50Dot(a.period.s)+'~'+ft50Dot(a.period.e)+') 내 일정</span>':'')+
    '<span>'+(a.youth?'🎉 청년(만 '+a.age+'세) — 청년 기준 적용':'· 청년 기준 해당 없음')+'</span>'+
    '<span>📐 '+ft50GrantOf(a).label+' — 지원 한도 '+ft50Won(ft50RefundCap(a))+' · 환급률 '+ft50GrantRate(a)+'%</span>'+
  '</div>';

  let acts='';
  if(a.status==='received')
    acts='<button class="btn" onclick="t50aDo('+K+',\'review\')">검토 시작</button>';
  else if(a.status==='review'){
    const gr=ft50GrantOf(a);
    acts='<button class="btn" onclick="t50aApprove('+K+')">✅ 승인 — '+gr.label+' 지원 한도 '+ft50Won(gr.cap)+'</button>'+
      '<button class="btn o" style="color:#b91c1c;border-color:#fecaca" onclick="t50aReason('+K+',\'rejected\',\''+rid+'\')">⛔ 반려</button>'+
      '<button class="btn o" style="color:#c2410c;border-color:#fed7aa" onclick="t50aReason('+K+',\'apply_fix\',\''+rid+'\')">✏️ 신청 보완 요청</button>'+
      '<textarea class="t50a-rsn" id="'+rid+'" placeholder="반려 사유를 입력하세요 (예: 신청자격 미충족, 여행 계획 불명확)"></textarea>'+
      t50aNoteBox(a,K,nid);
  }
  else if(a.status==='apply_fix')
    acts='<div class="t50a-note">✏️ 신청 보완을 요청했습니다 — 신청자가 서류·정보를 보완해 재제출하면 <b>검토중</b>으로 돌아옵니다.'+
      (a.fixReason?'<br>요청 사유: '+fEsc(a.fixReason):'')+'</div>'+
      '<button class="btn gy" onclick="t50aDo('+K+',\'review\')">↩ 보완 없이 검토 재개</button>'+
      t50aNoteBox(a,K,nid);
  else if(a.status==='approved')
    acts='<button class="btn" onclick="t50aDo('+K+',\'notified\')">📨 결과 통보 발송 — 승인 금액을 신청자·지역화폐로 전달</button>';
  else if(a.status==='notified')
    acts='<span class="wait">여행 진행 — 신청자의 결제내역 제출·환급 신청을 기다리는 중</span>';
  else if(a.status==='refund_req')
    acts=(function(){
      const dp=t50aDup(x);
      return dp
        ? '<div class="t50a-plan" style="background:#fef2f2;border-color:#fecaca;color:#b91c1c;width:100%">'+
            '🚫 <b>중복 제출 의심</b> — '+fEsc(ft50DupMsg(dp))+
            '<br>같은 결제내역으로 이미 환급 절차가 진행된 건이 있습니다. 환급 승인 전에 반드시 확인해 주세요.</div>'
        : '';
    })()+(function(){
      const c=t50aCorp(a);
      if(!c||!c.needsReview) return '';
      const cd=(a.evidence&&a.evidence.card)?a.evidence.card:'';
      return '<div class="t50a-plan" style="background:#fff7ed;border-color:#fed7aa;color:#9a3412;width:100%">'+
          ft50CorpIcon(c)+' <b>'+c.label+'</b> — '+fEsc(c.detail)+
          '<br>영수증을 확인해 카드 구분을 확정해 주세요. 확정 결과는 BIN 판정표에 학습됩니다.'+
          '<div style="display:flex;gap:7px;margin-top:8px">'+
            '<button class="btn gy" style="font-size:11.5px;padding:6px 10px" onclick="t50aCorpSet('+K+',\'personal\')">💳 개인카드로 확정</button>'+
            '<button class="btn gy" style="font-size:11.5px;padding:6px 10px" onclick="t50aCorpSet('+K+',\'corp\')">🏢 법인카드로 확정</button>'+
          '</div></div>';
    })()+
      '<button class="btn" onclick="t50aRefundOk('+K+')">💰 환급 승인 — '+ft50Won(t50aRefundAmt(a))+' 지급</button>'+
      '<button class="btn o" style="color:#c2410c;border-color:#fed7aa" onclick="t50aReason('+K+',\'refund_fix\',\''+rid+'\')">✏️ 증빙 보완 요청</button>'+
      '<textarea class="t50a-rsn" id="'+rid+'" placeholder="보완 요청 사유를 입력하세요 (예: 숙박 결제내역 누락)"></textarea>'+
      t50aOcrFixLine(a)+
      t50aOcrBox(a,K,'t50aOcr_'+ft50Uid(x.k)+'_'+x.i);
  else if(a.status==='refund_fix')
    acts='<span class="wait">신청자 증빙 보완 대기중</span>';
  else if(a.status==='refund_ok')
    acts='<span class="wait">처리 완료 — 환급금이 지역사랑상품권으로 지급되었습니다</span>'+
      (a.localPay
        ? '<div class="t50a-note">🪙 지역화폐 충전 결과 수신 완료 — '+ft50Won(a.localPay.amount)+
          ' · 거래번호 '+fEsc(a.localPay.txId)+' · 수신일 '+ft50Dot(a.localPay.ts)+'</div>'
        : '<button class="btn gy" style="margin-top:7px" onclick="t50aLocalPay('+K+')">🪙 지역화폐 충전 결과 수신(모의)</button>');
  else if(a.status==='rejected')
    acts='<span class="wait">반려 처리 완료</span>';
  else if(a.status==='canceled')
    acts='<span class="wait">신청자가 신청을 취소했습니다</span>';

  let log='';
  if(a.rejectReason) log+='반려 사유: '+fEsc(a.rejectReason)+'<br>';
  if(a.fixReason) log+='보완 요청 사유: '+fEsc(a.fixReason)+'<br>';
  if(a.reviewNote) log+='검토의견: '+fEsc(a.reviewNote)+
    (a.reviewNoteBy?' <span style="color:var(--sub2)">('+fEsc(a.reviewNoteBy)+' · '+ft50Dot(a.reviewNoteTs||'')+')</span>':'')+'<br>';
  if(a.docs&&a.docs.length) log+='추가 서류 '+a.docs.length+'건: '+
    a.docs.map(function(d){ return fEsc(d.name)+' ('+ft50DocSize(d.size)+')'; }).join(', ')+'<br>';
  if(typeof a.amount==='number') log+='승인 지원금: '+ft50Won(a.amount)+'<br>';
  if(a.history&&a.history.length)
    log+='처리 이력: '+a.history.map(h=>((FT50_ST[h.st]||{t:h.st}).t)+(h.by?'('+fEsc(h.by)+')':'')+' '+ft50Dot(h.ts.slice(0,10))).join(' → ');

  return '<div class="t50a-card">'+
    '<div class="hd"><b>'+fEsc(a.region)+'</b><span class="no">'+fEsc(a.no)+'</span>'+
      '<span style="font-size:12px">신청자 '+fEsc(a.applicant||'-')+' <small style="color:var(--sub2)">(계정 '+fEsc(a.uid||ft50Uid(x.k))+')</small></span>'+
      '<button class="btn gy" style="margin-left:auto;padding:5px 11px;font-size:11.5px" onclick="t50aDetail('+K+')">상세조회</button>'+
      '<span class="badge '+st.cls+'">'+st.ic+' '+st.t+'</span></div>'+
    '<div class="dt">여행 '+ft50Dot(a.start)+' ~ '+ft50Dot(a.end)+' · '+(a.unit==='family'?'가족':'개인')+' '+fEsc(a.people)+'명 · 접수일 '+ft50Dot(a.ts)+
      ((a.members&&a.members.length)?'<br>동반 가족 '+a.members.map(function(m){return fEsc(m.masked)+'('+fEsc(m.rel)+' · 만 '+m.age+'세)';}).join(', '):'')+
      '<br>지원 한도 '+ft50Won(ft50RefundCap(a))+' ('+ft50GrantOf(a).label+' · 환급률 '+ft50GrantRate(a)+'%)'+
      '<br><small>'+fEsc(a.addr||'-')+' (주민등록상 주소지 · '+fEsc(a.authMeans||'본인인증')+')</small></div>'+
    chk+
    (a.plan?'<div class="t50a-plan">여행 계획: '+fEsc(a.plan)+'</div>':'')+
    (a.evidence?'<div class="t50a-plan">🧾 제출 증빙 — 카드번호 '+fEsc(a.evidence.card||'-')+' · 승인번호 '+fEsc(a.evidence.appr||'-')+
      ' · 결재금액 '+ft50Won(a.evidence.amt)+(a.evidence.date?' · 결제일 '+fEsc(a.evidence.date):'')+' · 첨부 '+fEsc(a.evidence.file||'-')+
      '<br><b style="color:var(--ok)">✓ '+fEsc(a.evidence.ocr||'판독 결과와 대조 일치')+
      (a.evidence.date?(a.evidence.date<a.start?' · 숙박 선결제 — 여행 시작 전 결제 인정 건':' · 결제일 여행기간('+a.start+'~'+a.end+') 내 확인'):'')+'</b>'+
      t50aBizLine(a)+
      t50aStayLine(a)+
      t50aCorpLine(a)+'</div>':'')+
    '<div class="t50a-acts">'+acts+'</div>'+
    (log?'<div class="t50a-log">'+log+'</div>':'')+
  '</div>';
}

/* 인정 소비범위 한 줄 — 저장된 상호로 매번 다시 판정한다. 담당자가 판독값 보정으로
   가맹점명을 고치면 그 값으로 재판정된 결과가 바로 보인다 */
function t50aBizLine(a){
  const e=a.evidence;
  if(!e) return '';
  const c=ft50BizCheck(e.shop);
  return '<br><b><span class="badge '+ft50BizBadgeCls(c)+'">'+ft50BizIcon(c)+' '+c.label+'</span>'+
    (e.shop?' <span class="cap">(가맹점 '+fEsc(e.shop)+')</span>':'')+'</b>';
}
/* 숙박 증빙 한 줄 — 숙박확인서는 심사에서 원본을 확인해야 하는 항목이라 목록에서도 보이게 한다 */
function t50aStayLine(a){
  const e=a.evidence;
  if(!e||!e.stay) return '';
  const d=e.stayDoc;
  return '<br><b style="color:#0369a1">🏨 숙박비 결제 건 — '+FT50_STAY_DOC_LABEL+' '+
    (d&&d.name?fEsc(d.name)+' ('+ft50DocSize(d.size)+')':'미첨부')+'</b>';
}
/* 법인카드 확인 결과 한 줄 — 저장된 판정이 없으면 그 자리에서 다시 판정한다 */
function t50aCorp(a){
  if(a.corpCheck) return a.corpCheck;
  if(a.evidence&&a.evidence.card) return ft50CorpCheck(a.evidence.card,'');
  return null;
}
function t50aCorpLine(a){
  const chk=t50aCorp(a);
  if(!chk) return '';
  return '<br><span class="badge '+ft50CorpBadgeCls(chk)+'">'+ft50CorpIcon(chk)+' '+chk.label+'</span>'+
    '<span style="color:var(--sub);font-size:11px"> '+fEsc(chk.detail)+'</span>';
}

/* 증빙 중복 여부 — 다른 신청 건에 같은 영수증이 있는지 */
function t50aDup(x){
  return x.a.evidence ? ft50FindEvidenceDup(x.a.evidence, x.k, x.i) : null;
}

/* 담당자 확정 — 판정 결과를 신청 건에 남기고 BIN 판정표에도 학습시킨다 */
function t50aCorpSet(k,i,kind){
  const r=t50aMutate(k,i,function(rec){
    rec.corpCheck=ft50CorpDecide(rec.evidence?rec.evidence.card:'',kind,ft50Persona().name);
    ft50Hist(rec,rec.status,ft50Persona().name,rec.corpCheck.label);
  });
  if(r) toast(r.corpCheck.label);
}

/* 환급액 = 소비액 × 환급률. 승인 시 확정한 지원 한도를 넘지 못한다 */
function t50aSpend(a){ return (a.evidence?a.evidence.amt:(a.spend||0))||0; }
function t50aRefundAmt(a){
  const cap=ft50RefundCap(a);
  return Math.min(ft50RefundOf(a,t50aSpend(a)),cap,(typeof a.amount==='number')?a.amount:cap);
}

/* ── 처리 동작 ─────────────────────────────────────────── */
function t50aMutate(k,i,fn){
  const l=ft50LoadKey(k);
  if(!l[i]) return null;
  fn(l[i]);
  ft50SaveKey(k,l);
  t50aRender();
  return l[i];
}
function t50aDo(k,i,st){
  const r=t50aMutate(k,i,function(rec){ rec.status=st; ft50Hist(rec,st,ft50Persona().name); });
  if(r) toast(FT50_ST[st].t+' 처리했습니다');
}
function t50aApprove(k,i){
  const r=t50aMutate(k,i,function(rec){
    /* 승인은 신청 유형별 지원 한도를 확정해 통보하는 단계다.
       실제 환급액은 정산에서 소비액 × 환급률로 계산된다 */
    const gr=ft50GrantOf(rec);
    rec.status='approved';
    rec.grantLabel=gr.label; rec.grantRate=ft50GrantRate(rec);
    rec.refundCap=gr.cap; rec.amount=gr.cap;
    ft50Hist(rec,'approved',ft50Persona().name,gr.label+' 지원 한도 '+ft50Won(gr.cap)+' 확정');
  });
  if(r) toast('승인 — '+r.grantLabel+' 지원 한도 '+ft50Won(r.amount));
}
/* 검토의견 입력 박스 — 이미 등록돼 있으면 현재 값을 채워 '수정' 으로 동작한다 */
function t50aNoteBox(a,K,nid){
  const has=!!a.reviewNote;
  return '<textarea class="t50a-rsn" id="'+nid+'" placeholder="검토의견을 입력하세요 (승인·반려 판정과 별개로 남는 담당자 메모)">'+
    (has?fEsc(a.reviewNote):'')+'</textarea>'+
    '<button class="btn gy" style="font-size:11.5px;padding:6px 10px" onclick="t50aNote('+K+',\''+nid+'\')">'+
    (has?'📝 검토의견 수정':'📝 검토의견 등록')+'</button>';
}

/* ══ 화면설계 ══════════════════════════════════════════════
   업무구조도 「반값여행 화면설계」 8개 단위프로세스를 담당자 화면으로 구현한 것이다.
   여기서 바꾼 단계·항목은 신청 화면(t50.html)이 즉시 읽어 반영한다. */
function t50aRenderScreen(){
  const el=document.getElementById('t50aBody');
  if(!el) return;
  const c=ft50ScreenCfg();
  const steps=c.steps.map(function(s,i){
    return '<div class="t50a-row">'+
      '<span class="t50a-no">'+(i+1)+'</span>'+
      '<input class="f-in" id="t50aStep_'+i+'" value="'+fEsc(s)+'" style="flex:1;min-width:0">'+
      '<button class="btn gy" onclick="t50aStepSave('+i+')">수정</button>'+
      '<button class="btn gy" onclick="t50aStepDel('+i+')">삭제</button>'+
      '</div>';
  }).join('');
  const fields=c.fields.map(function(f,i){
    return '<div class="t50a-row">'+
      '<input class="f-in" id="t50aFld_'+i+'" value="'+fEsc(f.label)+'" style="flex:1;min-width:0"'+
        (f.lock?' readonly':'')+'>'+
      '<span class="cap" style="flex:0 0 auto">'+fEsc(f.screen||'-')+'</span>'+
      '<label class="t50a-ck"><input type="checkbox" id="t50aFldShow_'+i+'"'+(f.show!==false?' checked':'')+'> 표시</label>'+
      '<label class="t50a-ck"><input type="checkbox" id="t50aFldReq_'+i+'"'+(f.required?' checked':'')+
        (f.lock?' disabled':'')+'> 필수</label>'+
      '<button class="btn gy" onclick="t50aFieldSave('+i+')">수정</button>'+
      (f.lock?'<span class="cap">기본항목</span>'
             :'<button class="btn gy" onclick="t50aFieldDel('+i+')">삭제</button>')+
      '</div>';
  }).join('');
  el.innerHTML=
    '<div class="sec">'+
      '<div class="sec-h"><div class="sec-t">신청 절차 단계 <span class="cap">프로세스 구성 — 등록·수정·삭제·조회</span></div></div>'+
      '<div class="t50a-note">여기서 바꾼 단계는 신청 화면 상단 진행 표시에 그대로 나타납니다. '+
        '단계 이름만 관리하며 화면 순서 자체는 서비스 흐름에 고정되어 있습니다.</div>'+
      steps+
      '<div class="t50a-row"><input class="f-in" id="t50aStepNew" placeholder="추가할 단계 이름" style="flex:1;min-width:0">'+
        '<button class="btn" onclick="t50aStepAdd()">＋ 단계 등록</button></div>'+
    '</div>'+
    '<div class="sec" style="margin-top:12px">'+
      '<div class="sec-h"><div class="sec-t">신청 화면 표시 항목 <span class="cap">화면설계 정보 — 등록·수정·삭제·조회</span></div></div>'+
      '<div class="t50a-note">표시를 끄면 신청 화면에서 해당 입력란이 사라지고, 필수로 두면 값이 없을 때 접수되지 않습니다.</div>'+
      fields+
      '<div class="t50a-row"><input class="f-in" id="t50aFldNew" placeholder="추가할 항목 이름 (안내 문구로 노출)" style="flex:1;min-width:0">'+
        '<button class="btn" onclick="t50aFieldAdd()">＋ 항목 등록</button></div>'+
      '<button class="btn gy blk" style="margin-top:10px" onclick="t50aScreenReset()">화면설계를 초기값으로 되돌리기</button>'+
    '</div>';
}
function t50aScreenMutate(fn){
  const c=ft50ScreenCfg();
  fn(c);
  ft50SaveScreenCfg(c);
  t50aRenderScreen();
}
/* 프로세스 구성 — 등록 / 수정 / 삭제 */
function t50aStepAdd(){
  const el=document.getElementById('t50aStepNew');
  const v=el?el.value.trim():'';
  if(!v){ toast('단계 이름을 입력해 주세요'); return; }
  t50aScreenMutate(function(c){ c.steps.push(v); });
  toast('단계를 등록했습니다');
}
function t50aStepSave(i){
  const el=document.getElementById('t50aStep_'+i);
  const v=el?el.value.trim():'';
  if(!v){ toast('단계 이름을 입력해 주세요'); return; }
  t50aScreenMutate(function(c){ c.steps[i]=v; });
  toast('단계를 수정했습니다');
}
function t50aStepDel(i){
  const c=ft50ScreenCfg();
  if(c.steps.length<=2){ toast('단계는 2개 이상 유지해야 합니다'); return; }
  t50aScreenMutate(function(x){ x.steps.splice(i,1); });
  toast('단계를 삭제했습니다');
}
/* 화면설계 정보 — 등록 / 수정 / 삭제 */
function t50aFieldAdd(){
  const el=document.getElementById('t50aFldNew');
  const v=el?el.value.trim():'';
  if(!v){ toast('항목 이름을 입력해 주세요'); return; }
  t50aScreenMutate(function(c){
    c.fields.push({id:'x'+Date.now(), label:v, screen:'여행 계획', show:true, required:false, lock:false});
  });
  toast('항목을 등록했습니다');
}
function t50aFieldSave(i){
  const lb=document.getElementById('t50aFld_'+i);
  const sw=document.getElementById('t50aFldShow_'+i);
  const rq=document.getElementById('t50aFldReq_'+i);
  t50aScreenMutate(function(c){
    if(!c.fields[i]) return;
    if(lb&&lb.value.trim()&&!c.fields[i].lock) c.fields[i].label=lb.value.trim();
    if(sw) c.fields[i].show=sw.checked;
    if(rq&&!c.fields[i].lock) c.fields[i].required=rq.checked;
  });
  toast('항목을 수정했습니다');
}
function t50aFieldDel(i){
  t50aScreenMutate(function(c){ if(c.fields[i]&&!c.fields[i].lock) c.fields.splice(i,1); });
  toast('항목을 삭제했습니다');
}
function t50aScreenReset(){
  if(!confirm('화면설계 설정을 초기값으로 되돌릴까요?')) return;
  ft50ResetScreenCfg();
  t50aRenderScreen();
  toast('초기값으로 되돌렸습니다');
}

/* ── 신청서 검토의견 등록·수정 ────────────────────────────
   승인/반려 판정과 별개로 담당자가 남기는 메모다. 같은 입력창으로 등록·수정을
   겸하고, 변경 이력에도 남긴다. */
function t50aNote(k,i,nid){
  const ta=document.getElementById(nid);
  if(!ta) return;
  if(!ta.classList.contains('on')){ ta.classList.add('on'); ta.focus(); return; }
  const v=ta.value.trim();
  if(!v){ toast('검토의견을 입력해 주세요'); ta.focus(); return; }
  const had=!!(ft50LoadKey(k)[i]||{}).reviewNote;
  t50aMutate(k,i,function(rec){
    rec.reviewNote=v;
    rec.reviewNoteBy=ft50Persona().name;
    rec.reviewNoteTs=ft50Today();
    ft50Hist(rec,rec.status,ft50Persona().name,(had?'검토의견 수정':'검토의견 등록')+': '+v);
  });
  toast(had?'검토의견을 수정했습니다':'검토의견을 등록했습니다');
}

/* ── OCR 인식결과 보정 ────────────────────────────────────
   OCR 이 잘못 읽어 정당한 신청이 막히는 것을 담당자가 풀어주는 기능이다.
   다만 이 시스템의 검증 전제는 '판독값 ≠ 입력값이면 반려'이므로, 판독값을 그냥
   덮어쓰면 대조가 무력해진다. 그래서 보정은 다음 조건에서만 허용한다.
     · 무엇을 어떤 값으로 고쳤는지 변경 전·후를 모두 남긴다
     · 사유를 필수로 받는다
     · 보정된 건은 「사람이 보정한 건」으로 표시되어 자동 통과 건과 구분된다
   보정 이력은 evidence.ocrFix 에 누적된다. */
const T50A_OCR_FIELDS=[
  {k:'card', lb:'카드번호'}, {k:'appr', lb:'승인번호'},
  {k:'amt',  lb:'결재금액'}, {k:'date', lb:'결제일'},
  {k:'shop', lb:'가맹점'},   {k:'region', lb:'결제지역'}
];
function t50aOcrBox(a,K,fid){
  const e=a.evidence||{};
  const val={card:e.card||'', appr:e.appr||'', amt:(e.amt==null?'':e.amt),
             date:e.date||'', shop:e.shop||'', region:e.region||''};
  const rows=T50A_OCR_FIELDS.map(function(f){
    return '<div class="t50a-row"><span class="cap" style="flex:0 0 68px">'+f.lb+'</span>'+
      '<input class="f-in" id="'+fid+'_'+f.k+'" value="'+fEsc(String(val[f.k]))+'" style="flex:1;min-width:0"></div>';
  }).join('');
  return '<div class="t50a-note">🔧 판독값 보정 — 고친 항목은 변경 전·후가 이력에 남고, 이 건은 '+
    '「사람이 보정한 건」으로 표시됩니다.</div>'+ rows +
    '<div class="t50a-row"><input class="f-in" id="'+fid+'_why" placeholder="보정 사유 (필수)" style="flex:1;min-width:0">'+
    '<button class="btn gy" onclick="t50aOcrFix('+K+',\''+fid+'\')">보정 저장</button></div>';
}
function t50aOcrFix(k,i,fid){
  const g=function(s){ const el=document.getElementById(fid+'_'+s); return el?el.value.trim():''; };
  const why=g('why');
  if(!why){ toast('보정 사유를 입력해 주세요'); return; }
  const cur=ft50LoadKey(k)[i]; if(!cur||!cur.evidence){ toast('증빙이 없습니다'); return; }
  const before={}, after={};
  T50A_OCR_FIELDS.forEach(function(f){
    const nv=g(f.k);
    const ov=(cur.evidence[f.k]==null?'':String(cur.evidence[f.k]));
    if(nv!==ov){ before[f.k]=ov; after[f.k]=nv; }
  });
  if(!Object.keys(after).length){ toast('바뀐 항목이 없습니다'); return; }
  t50aMutate(k,i,function(rec){
    T50A_OCR_FIELDS.forEach(function(f){
      if(!(f.k in after)) return;
      rec.evidence[f.k]=(f.k==='amt')?(Math.floor(Number(after[f.k]))||0):after[f.k];
    });
    rec.evidence.ocrFix=(rec.evidence.ocrFix||[]).concat([{
      by:ft50Persona().name, ts:ft50Today(), why:why, before:before, after:after
    }]);
    ft50Hist(rec,rec.status,ft50Persona().name,'판독값 보정 ('+
      Object.keys(after).map(function(x){
        const lb=(T50A_OCR_FIELDS.find(function(f){ return f.k===x; })||{lb:x}).lb;
        return lb+' '+(before[x]||'-')+'→'+after[x];
      }).join(', ')+') 사유: '+why);
  });
  toast('판독값을 보정했습니다');
}
/* 보정 이력 표기 — 자동 통과 건과 구분되도록 배지와 변경 내역을 함께 보여준다 */
function t50aOcrFixLine(a){
  const fx=(a.evidence&&a.evidence.ocrFix)||[];
  if(!fx.length) return '';
  return '<div class="t50a-note" style="background:#fff7ed;border-color:#fdba74;color:#9a3412">'+
    '🔧 <b>사람이 보정한 건</b> — 자동 판독만으로 통과한 건이 아닙니다.'+
    fx.map(function(f){
      const chg=Object.keys(f.after).map(function(x){
        const lb=(T50A_OCR_FIELDS.find(function(q){ return q.k===x; })||{lb:x}).lb;
        return lb+' 「'+fEsc(String(f.before[x]||'-'))+'」→「'+fEsc(String(f.after[x]))+'」';
      }).join(', ');
      return '<br>· '+ft50Dot(f.ts)+' '+fEsc(f.by)+' — '+chg+' / 사유: '+fEsc(f.why);
    }).join('')+'</div>';
}

/* ── 지역화폐 환급결과 수신(모의) ─────────────────────────
   운영에서는 지역화폐 시스템이 충전 결과를 회신하는 구간이다.
   데모에서는 담당자가 버튼으로 수신 처리해 결과를 확인할 수 있게 한다. */
function t50aLocalPay(k,i){
  const a=ft50LoadKey(k)[i]; if(!a) return;
  if(!a.refundAmount){ toast('환급 승인 후에 수신할 수 있습니다'); return; }
  t50aMutate(k,i,function(rec){
    rec.localPay={ok:true, amount:rec.refundAmount,
      txId:'LP-'+String(rec.no||'').replace(/[^0-9]/g,'').slice(-6)+'-'+String(rec.refundAmount).slice(0,4),
      ts:ft50Today()};
    ft50Hist(rec,rec.status,ft50Persona().name,'지역화폐 충전 결과 수신 '+ft50Won(rec.refundAmount));
  });
  toast('지역화폐 충전 결과를 수신했습니다');
}

function t50aReason(k,i,st,rid){
  const ta=document.getElementById(rid);
  if(!ta) return;
  if(!ta.classList.contains('on')){ ta.classList.add('on'); ta.focus(); return; }
  const v=ta.value.trim();
  if(!v){ toast('사유를 입력해 주세요'); ta.focus(); return; }
  t50aMutate(k,i,function(rec){
    rec.status=st;
    if(st==='rejected') rec.rejectReason=v; else rec.fixReason=v;   /* apply_fix·refund_fix 공용 */
    ft50Hist(rec,st,ft50Persona().name,v);
  });
  toast(st==='rejected'?'반려 처리했습니다':(st==='apply_fix'?'신청 보완 요청을 보냈습니다':'증빙 보완 요청을 보냈습니다'));
}
function t50aRefundOk(k,i){
  const r=t50aMutate(k,i,function(rec){
    rec.status='refund_ok';
    rec.refundSpend=t50aSpend(rec);
    rec.refundAmount=t50aRefundAmt(rec);
    ft50Hist(rec,'refund_ok',ft50Persona().name,'환급 '+ft50Won(rec.refundAmount));
  });
  if(r) toast('환급 승인 — '+ft50Won(r.refundAmount));
}
function t50aReset(){
  if(!confirm('전 계정의 휴가지원제 신청 데모 데이터를 삭제할까요? (사업설정은 유지됩니다)')) return;
  ft50AppKeys().forEach(k=>localStorage.removeItem(k));
  t50aRender();
  toast('초기화했습니다');
}

/* ── 상세조회 ──────────────────────────────────────────── */
function t50aDetail(k,i){
  const a=ft50LoadKey(k)[i]; if(!a) return;
  const row=(l,v)=>'<div class="kv"><span class="k">'+l+'</span><span class="v">'+(v==null||v===''?'-':v)+'</span></div>';
  const st=FT50_ST[a.status]||{t:a.status,cls:'n',ic:'•'};
  let h='<div class="sec-t" style="margin-bottom:6px">신청 정보</div>'+
    row('접수번호',fEsc(a.no))+
    row('상태','<span class="badge '+st.cls+'">'+st.ic+' '+st.t+'</span>')+
    row('신청자',fEsc(a.applicant||'-')+' (계정 '+fEsc(a.uid||ft50Uid(k))+')')+
    row('신청 지역',fEsc(a.region)+' ('+fEsc(a.sido)+')')+
    row('여행 기간',ft50Dot(a.start)+' ~ '+ft50Dot(a.end)+' · '+fEsc(a.people)+'명')+
    row('신청 단위',(a.unit==='family'?'가족 신청':'개인 신청'))+
    ((a.members&&a.members.length)?row('동반 가족',a.members.map(function(m){return fEsc(m.masked)+'('+fEsc(m.rel)+')';}).join(', ')):'')+
    row('지원 한도',ft50Won(ft50RefundCap(a))+' ('+ft50GrantOf(a).label+')')+
    (a.period?row('지역 여행 가능기간',ft50Dot(a.period.s)+' ~ '+ft50Dot(a.period.e)):'')+
    row('접수일',ft50Dot(a.ts))+
    row('주민등록상 주소지',fEsc(a.addr||'-'))+
    row('본인인증 수단',fEsc(a.authMeans||'-'))+
    (a.plan?row('여행 계획',fEsc(a.plan)):'')+
    /* 추가 서류 조회 — 데모는 파일 본문을 보관하지 않아 메타데이터만 보여준다 */
    row('추가 서류',(a.docs&&a.docs.length)
      ? a.docs.map(function(d){ return '📎 '+fEsc(d.name)+' ('+ft50DocSize(d.size)+')'; }).join('<br>')
      : '첨부 없음')+
    (a.reviewNote?row('검토의견',fEsc(a.reviewNote)+
      (a.reviewNoteBy?' <span style="color:var(--sub2)">('+fEsc(a.reviewNoteBy)+' · '+ft50Dot(a.reviewNoteTs||'')+')</span>':'')):'')+
    (a.fixDoneTs?row('신청 보완 재제출',ft50Dot(a.fixDoneTs)):'')+
    ((a.evidence&&a.evidence.ocrFix&&a.evidence.ocrFix.length)
      ? row('판독값 보정', a.evidence.ocrFix.map(function(f){
          return ft50Dot(f.ts)+' '+fEsc(f.by)+' — '+Object.keys(f.after).map(function(x){
            return x+' 「'+fEsc(String(f.before[x]||'-'))+'」→「'+fEsc(String(f.after[x]))+'」';
          }).join(', ')+' / 사유: '+fEsc(f.why);
        }).join('<br>')) : '')+
    (a.localPay?row('지역화폐 충전 결과','🪙 '+ft50Won(a.localPay.amount)+' · 거래번호 '+fEsc(a.localPay.txId)+' · '+ft50Dot(a.localPay.ts)):'')+
    '<div class="sec-t" style="margin:14px 0 6px">자격 점검</div>'+
    row('관외거주',(a.addr||'').indexOf(a.sido)===0?'미충족 — 거주지와 동일 시·도':'충족')+
    row('청년(만 19~34세)',a.youth?'해당 — 청년 기준 적용 (만 '+a.age+'세)':'해당 없음')+
    row('신청 유형',ft50GrantOf(a).label+' · 환급률 '+ft50GrantRate(a)+'%')+
    row('가족(3인 이상)',ft50PeopleNum(a)>=3?'해당':'해당 없음')+
    '<div class="sec-t" style="margin:14px 0 6px">지원금</div>'+
    row('적용 기준',ft50GrantOf(a).label+' · 환급률 '+ft50GrantRate(a)+'%')+
    row('인정 소비액',(a.refundSpend||t50aSpend(a))?ft50Won(a.refundSpend||t50aSpend(a)):'-')+
    row('승인 지원 한도',typeof a.amount==='number'?ft50Won(a.amount):'-')+
    row('환급 금액',a.refundAmount?ft50Won(a.refundAmount):'-');
  if(a.evidence){
    h+='<div class="sec-t" style="margin:14px 0 6px">제출 증빙</div>'+
      row('카드번호',fEsc(a.evidence.card||'-'))+
      row('승인번호',fEsc(a.evidence.appr||'-'))+
      row('결재금액',ft50Won(a.evidence.amt))+
      row('가맹점',fEsc(a.evidence.shop||'-'))+
      (function(){const c=ft50BizCheck(a.evidence.shop);
        return row('소비 인정','<span class="badge '+ft50BizBadgeCls(c)+'">'+ft50BizIcon(c)+' '+c.label+'</span>')+
               row('판정 근거',fEsc(c.detail));})()+
      (a.evidence.date?row('결제일',fEsc(a.evidence.date)+(a.evidence.date<a.start?' (숙박 선결제 — 여행 시작 전 결제 인정 ✓)':' (여행기간 '+a.start+'~'+a.end+' 내 ✓)')):'')+
      (a.evidence.stay
        ?row('숙박 증빙','🏨 숙박비 결제 건 — '+FT50_STAY_DOC_LABEL+' 첨부 '+
             fEsc((a.evidence.stayDoc&&a.evidence.stayDoc.name)||'-')+
             ((a.evidence.stayDoc&&a.evidence.stayDoc.size)?' ('+ft50DocSize(a.evidence.stayDoc.size)+')':''))
        :row('숙박 증빙','숙박비 결제 건 아님 — '+FT50_STAY_DOC_LABEL+' 해당 없음'))+
      (a.evidence.prepay?row('숙박 선결제','신청자 신고 — 여행 시작 전 결제. 숙박비가 맞는지 '+FT50_STAY_DOC_LABEL+'로 확인해 주세요'):'')+
      row('첨부파일',fEsc(a.evidence.file||'-'))+
      row('OCR 대조','✓ '+fEsc(a.evidence.ocr||'판독 결과와 대조 일치'));
    const _c=t50aCorp(a);
    if(_c) h+=row('법인카드 확인','<span class="badge '+ft50CorpBadgeCls(_c)+'">'+ft50CorpIcon(_c)+' '+ _c.label+'</span>')+
      row('판정 근거',fEsc(_c.detail));
    const _d=ft50FindEvidenceDup(a.evidence,k,i);
    h+=row('중복 제출 검사', _d
      ? '<span class="badge o">🚫 중복 의심</span>'
      : '<span class="badge g">✓ 중복 없음</span>')+
      (_d?row('중복 내역',fEsc(ft50DupMsg(_d))):'');
  }
  if(a.history&&a.history.length){
    h+='<div class="sec-t" style="margin:14px 0 6px">처리 이력</div>'+
      a.history.map(hi=>row((FT50_ST[hi.st]||{t:hi.st}).t,
        hi.ts.slice(0,16).replace('T',' ')+(hi.by?' · '+fEsc(hi.by):'')+(hi.note?' · '+fEsc(hi.note):''))).join('');
  }
  if(a.rejectReason) h+='<div class="sec-t" style="margin:14px 0 6px">반려</div>'+row('사유',fEsc(a.rejectReason));
  if(a.fixReason) h+='<div class="sec-t" style="margin:14px 0 6px">증빙 보완</div>'+row('사유',fEsc(a.fixReason));
  document.getElementById('t50aDtlTitle').textContent=a.region+' · '+a.no;
  document.getElementById('t50aDtlBody').innerHTML=h;
  fOpenModal('t50aDtl');
}

/* ══ 사업설정 ══════════════════════════════════════════════ */
function t50aBizNames(){
  const scope=t50aScope();
  return scope?[scope]:ft50Regions().map(r=>r.name);
}
function t50aSetBizRegion(v){ t50aBizRegion=v; t50aRenderBiz(); }
/* ── 예산 설정 (공사 총괄 관리자 전용) ───────────────────────
   지원금액·환급률은 54개 항목표에서 전부 "통합"으로 분류된 항목이고, 지자체 예산
   총액도 지자체가 스스로 늘릴 수 있는 값이 아니다. 그래서 두 가지 모두 공사 총괄
   관리자만 입력하고, 지자체 담당자에게는 조회 전용으로 보여준다. */
function t50aGrantHtml(name,cfg){
  const hq=ft50IsHQ(), g=ft50GrantCfg(), ro=hq?'':' disabled';
  const lock=hq?''
    :'<div class="t50a-note">🔒 지원금액·환급률·예산 총액은 <b>16개 지자체 공통 기준값</b>이라 '+
     '지자체 담당자 화면에서는 변경할 수 없습니다. 변경이 필요하면 공사 총괄 관리자에게 요청해 주세요.</div>';
  const rows=FT50_GRANT_FIELDS.map(function(f){
    return '<label class="f-lb">'+f.lb+' <span style="font-weight:500;color:var(--sub)">('+f.un+')</span></label>'+
      '<input class="f-in" type="number" min="0" id="t50aG_'+f.k+'" value="'+g[f.k]+'"'+ro+'>';
  }).join('');
  const used=ft50BudgetUsed(name), bud=Number(cfg.budget)||0;
  const pct=bud?Math.min(100,Math.round(used/bud*1000)/10):0;
  return '<div class="t50a-card">'+
      '<div class="sec-t">지원금액 · 환급률<span class="cap" style="font-weight:500;color:var(--sub);font-size:11.5px"> 16개 지자체 공통 기준값</span></div>'+
      '<div style="font-size:11.5px;color:var(--sub);line-height:1.7;margin:4px 0 8px">'+
        '지원 한도는 신청 유형(개인·팀·청년·청년팀·가족형)에 따라 정해지고, 환급액은 '+
        '<b>소비액 × 환급률</b>을 지원 한도로 자른 값입니다.</div>'+
      lock+rows+
      (hq?'<button class="btn blk" style="margin-top:12px" onclick="t50aGrantSave()">💾 지원금액 · 환급률 저장</button>'+
          '<button class="btn gy blk" style="margin-top:7px" onclick="t50aGrantReset()">통합 기준값으로 되돌리기</button>':'')+
    '</div>'+
    '<div class="t50a-card">'+
      '<div class="sec-t">'+fEsc(name)+' 예산 총액<span class="cap" style="font-weight:500;color:var(--sub);font-size:11.5px"> 마감 기준 「예산 소진」 판정용</span></div>'+
      '<div class="t50a-tiles">'+
        '<div class="t50a-tile" style="cursor:default"><div class="n">'+(bud?ft50Won(bud):'미설정')+'</div><div class="l">예산 총액</div></div>'+
        '<div class="t50a-tile" style="cursor:default"><div class="n">'+ft50Won(used)+'</div><div class="l">환급 집행액</div></div>'+
        '<div class="t50a-tile" style="cursor:default"><div class="n">'+(bud?pct+'%':'-')+'</div><div class="l">예산 소진율</div></div>'+
      '</div>'+
      '<label class="f-lb">예산 총액 (원) <span style="font-weight:500;color:var(--sub)">0이면 미설정(한도 없음)</span></label>'+
      '<input class="f-in" type="number" min="0" id="t50aBudget" value="'+bud+'"'+ro+'>'+
      (hq?'<button class="btn blk" style="margin-top:10px" onclick="t50aBudgetSave()">💾 예산 총액 저장</button>':'')+
    '</div>';
}
function t50aGrantSave(){
  if(!ft50IsHQ()){ toast('공사 총괄 관리자만 변경할 수 있습니다'); return; }
  const c={}; let bad=null;
  FT50_GRANT_FIELDS.forEach(function(f){
    const v=Math.floor(Number(document.getElementById('t50aG_'+f.k).value));
    if(!(v>=0)||(f.un==='%'&&v>100)){ bad=bad||f.lb; return; }
    c[f.k]=v;
  });
  if(bad){ toast(bad+' 값을 확인해 주세요'); return; }
  ft50SaveGrantCfg(c); t50aRender();
  toast('지원금액·환급률을 저장했습니다');
}
function t50aGrantReset(){
  if(!ft50IsHQ()){ toast('공사 총괄 관리자만 변경할 수 있습니다'); return; }
  ft50ResetGrantCfg(); t50aRender();
  toast('통합 기준값으로 되돌렸습니다');
}
function t50aBudgetSave(){
  if(!ft50IsHQ()){ toast('공사 총괄 관리자만 변경할 수 있습니다'); return; }
  const v=Math.floor(Number(document.getElementById('t50aBudget').value));
  if(!(v>=0)){ toast('예산 총액을 확인해 주세요'); return; }
  ft50SetRegionCfg(t50aBizRegion,{budget:v}); t50aRender();
  toast('예산 총액을 저장했습니다');
}
function t50aRenderBiz(){
  const names=t50aBizNames();
  if(names.indexOf(t50aBizRegion)<0) t50aBizRegion=names[0]||'';
  if(!t50aBizRegion){ document.getElementById('t50aBody').innerHTML='<div class="t50a-empty">담당 지역이 없습니다.</div>'; return; }
  const name=t50aBizRegion;
  const cfg=ft50RegionCfg(name);
  const used=ft50UsedCount(name);
  document.getElementById('t50aBody').innerHTML=
    '<div class="t50a-bar"><select onchange="t50aSetBizRegion(this.value)"'+(t50aScope()?' disabled':'')+'>'+
      names.map(n=>'<option value="'+fEsc(n)+'"'+(n===name?' selected':'')+'>'+fEsc(n)+'</option>').join('')+'</select></div>'+
    '<div class="t50a-tiles">'+
      '<div class="t50a-tile" style="cursor:default"><div class="n">'+used+'</div><div class="l">현재 접수 인원</div></div>'+
      '<div class="t50a-tile" style="cursor:default"><div class="n">'+cfg.capacity+'</div><div class="l">신청인원조건(정원)</div></div>'+
      '<div class="t50a-tile" style="cursor:default"><div class="n">'+Math.max(0,cfg.capacity-used)+'</div><div class="l">잔여 인원</div></div>'+
    '</div>'+
    '<div class="t50a-card">'+
      '<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;color:var(--ink2)">'+
        '<input type="checkbox" id="t50aBzOpen"'+(cfg.open?' checked':'')+'> 사업 개설(신청 접수 허용)</label>'+
      '<label class="f-lb">신청기간 시작</label><input class="f-in" type="date" id="t50aBzApS" value="'+cfg.applyStart+'">'+
      '<label class="f-lb">신청기간 종료</label><input class="f-in" type="date" id="t50aBzApE" value="'+cfg.applyEnd+'">'+
      '<label class="f-lb">여행 가능기간 시작</label><input class="f-in" type="date" id="t50aBzTrS" value="'+cfg.travelStart+'">'+
      '<label class="f-lb">여행 가능기간 종료</label><input class="f-in" type="date" id="t50aBzTrE" value="'+cfg.travelEnd+'">'+
      '<label class="f-lb">총 접수 가능 인원</label><input class="f-in" type="number" min="1" id="t50aBzCap" value="'+cfg.capacity+'">'+
      '<label class="f-lb">1건당 신청 인원(최소 / 최대)</label>'+
      '<div style="display:flex;gap:8px"><input class="f-in" type="number" min="1" id="t50aBzMin" value="'+cfg.minPeople+'">'+
        '<input class="f-in" type="number" min="1" id="t50aBzMax" value="'+cfg.maxPeople+'"></div>'+
      '<button class="btn blk" style="margin-top:12px" onclick="t50aBizSave()">💾 사업설정 저장</button>'+
    '</div>'+
    t50aGrantHtml(name,cfg)+
    '<div class="t50a-card">'+
      '<div class="sec-t">카드 BIN 판정표<span class="cap" style="font-weight:500;color:var(--sub);font-size:11.5px"> 카드번호로 법인카드 여부 예측</span></div>'+
      '<div style="font-size:11.5px;color:var(--sub);line-height:1.7;margin:4px 0 8px">'+
        '영수증은 카드번호를 마스킹해도 앞자리는 노출되므로(1234-56** 등), <b>앞 6~8자리</b>로 카드 상품을 식별해 '+
        '법인카드 여부를 예측합니다. 영수증에 카드종류가 인쇄된 건과 담당자가 확정한 건은 <b>자동으로 이 표에 학습</b>되어 '+
        '이후 같은 대역은 번호만으로 판정됩니다.</div>'+
      t50aBinListHtml()+
      '<label class="f-lb">카드번호 앞자리 <span style="font-weight:500;color:var(--sub)">(6자리 또는 8자리)</span></label>'+
      '<input class="f-in" type="text" id="t50aBinNo" placeholder="예) 123456 또는 12345678">'+
      '<label class="f-lb">구분</label>'+
      '<select class="f-in" id="t50aBinKind"><option value="corp">법인카드</option><option value="personal">개인카드</option></select>'+
      '<label class="f-lb">카드사·비고 <span style="font-weight:500;color:var(--sub)">(선택)</span></label>'+
      '<input class="f-in" type="text" id="t50aBinIssuer" placeholder="예) 신한카드">'+
      '<button class="btn blk" style="margin-top:10px" onclick="t50aBinAdd()">🏢 판정표에 추가</button>'+
      '<button class="btn gy blk" style="margin-top:7px" onclick="t50aBinReset()">판정표 초기값으로 되돌리기</button>'+
    '</div>'+
    '<div class="t50a-card">'+
      '<div class="sec-t">공지사항</div>'+
      ((cfg.notices&&cfg.notices.length)
        ? cfg.notices.map((n,idx)=>'<div class="t50a-plan"><b>'+fEsc(n.title)+'</b><br>'+fEsc(n.body)+
            '<br><small style="color:var(--sub2)">'+ft50Dot(n.ts)+'</small> '+
            '<button style="color:#b91c1c;font-size:11px;font-weight:700" onclick="t50aNoticeDel('+idx+')">삭제</button></div>').join('')
        : '<div style="font-size:12px;color:var(--sub);padding:8px 0">등록된 공지사항이 없습니다.</div>')+
      '<label class="f-lb">공지 제목</label><input class="f-in" type="text" id="t50aNTitle" placeholder="예) 여행기간 연장 안내">'+
      '<label class="f-lb">공지 내용</label><textarea class="f-in" id="t50aNBody" rows="3" placeholder="공지 내용을 입력하세요"></textarea>'+
      '<button class="btn blk" style="margin-top:10px" onclick="t50aNoticeAdd()">📢 공지 등록</button>'+
    '</div>';
}
function t50aBinListHtml(){
  const list=ft50Bins();
  if(!list.length) return '<div style="font-size:12px;color:var(--sub);padding:6px 0">판정표가 비어 있습니다.</div>';
  return list.map(function(b){
    const corp=b.kind==='corp';
    return '<div class="t50a-plan" style="display:flex;align-items:center;gap:8px">'+
      '<b>'+fEsc(b.prefix)+'</b>'+
      '<span class="badge '+(corp?'o':'g')+'">'+(corp?'🏢 법인':'💳 개인')+'</span>'+
      (b.issuer?'<span style="color:var(--sub)">'+fEsc(b.issuer)+'</span>':'')+
      (b.memo?'<span style="color:var(--sub2);font-size:11px">'+fEsc(b.memo)+'</span>':'')+
      '<span style="color:var(--sub2);font-size:11px">이력 '+(b.count||0)+'건'+
        (b.conflict?' · ⚠ 상반 '+b.conflict+'건':'')+'</span>'+
      '<button style="margin-left:auto;color:#b91c1c;font-size:11px;font-weight:700" onclick="t50aBinDel(\''+b.prefix+'\')">삭제</button></div>';
  }).join('');
}
function t50aBinAdd(){
  const no=document.getElementById('t50aBinNo').value.trim();
  const kind=document.getElementById('t50aBinKind').value;
  const issuer=document.getElementById('t50aBinIssuer').value.trim();
  if(!no){ toast('카드번호 앞자리를 입력해 주세요'); return; }
  const rec=ft50AddBin(no,kind,issuer,'담당자 등록');
  if(!rec){ toast('앞 6자리 또는 8자리로 입력해 주세요'); return; }
  toast('판정표에 추가했습니다 — '+rec.prefix+' '+(kind==='corp'?'법인':'개인'));
  t50aRenderBiz();
}
function t50aBinDel(prefix){
  ft50DelBin(prefix);
  toast('판정표에서 삭제했습니다');
  t50aRenderBiz();
}
function t50aBinReset(){
  if(!confirm('BIN 판정표를 초기값으로 되돌릴까요? 학습된 내용은 사라집니다.')) return;
  ft50ResetBins();
  toast('초기값으로 되돌렸습니다');
  t50aRenderBiz();
}

function t50aBizSave(){
  const v=id=>document.getElementById(id).value;
  ft50SetRegionCfg(t50aBizRegion,{
    open:document.getElementById('t50aBzOpen').checked,
    applyStart:v('t50aBzApS'),applyEnd:v('t50aBzApE'),
    travelStart:v('t50aBzTrS'),travelEnd:v('t50aBzTrE'),
    capacity:Math.max(1,Number(v('t50aBzCap'))||1),
    minPeople:Math.max(1,Number(v('t50aBzMin'))||1),
    maxPeople:Math.max(1,Number(v('t50aBzMax'))||1)
  });
  toast(t50aBizRegion+' 사업설정을 저장했습니다');
  t50aRenderBiz();
}
function t50aNoticeAdd(){
  const title=document.getElementById('t50aNTitle').value.trim();
  const body=document.getElementById('t50aNBody').value.trim();
  if(!title||!body){ toast('공지 제목·내용을 입력해 주세요'); return; }
  const cfg=ft50RegionCfg(t50aBizRegion);
  ft50SetRegionCfg(t50aBizRegion,{notices:[{id:'N'+cfg.notices.length+'_'+ft50Today(),title:title,body:body,ts:ft50Today()}].concat(cfg.notices||[])});
  toast('공지사항을 등록했습니다');
  t50aRenderBiz();
}
function t50aNoticeDel(idx){
  const cfg=ft50RegionCfg(t50aBizRegion);
  ft50SetRegionCfg(t50aBizRegion,{notices:(cfg.notices||[]).filter((n,i)=>i!==idx)});
  t50aRenderBiz();
}

/* ══ 통계 ══════════════════════════════════════════════════ */
function t50aSetStatRegion(v){ t50aStatRegion=v; t50aRenderStat(); }
function t50aStatList(){
  const scope=t50aScope();
  let list=ft50All().map(x=>x.a);
  if(scope) list=list.filter(a=>a.region===scope);
  else if(t50aStatRegion) list=list.filter(a=>a.region===t50aStatRegion);
  return list;
}
function t50aBar(label,n,max){
  return '<div class="row"><div class="lb">'+fEsc(label)+'</div>'+
    '<div class="br"><i style="width:'+(max?Math.round(n/max*100):0)+'%"></i></div><div class="vl">'+n+'</div></div>';
}
function t50aAgeBucket(age){
  if(age==null) return '미확인';
  if(age<20) return '10대'; if(age<30) return '20대'; if(age<40) return '30대';
  if(age<50) return '40대'; if(age<60) return '50대'; return '60대 이상';
}
function t50aHourBucket(tsFull){
  if(!tsFull) return '시각 미확인';
  const h=new Date(tsFull).getHours();
  const bands=[[0,6],[6,9],[9,12],[12,15],[15,18],[18,21],[21,24]];
  const b=bands.find(x=>h>=x[0]&&h<x[1])||bands[bands.length-1];
  return String(b[0]).padStart(2,'0')+'-'+String(b[1]).padStart(2,'0')+'시';
}
function t50aGroupHtml(map,order){
  const keys=order?order.filter(k=>map[k]):Object.keys(map).sort((a,b)=>map[b]-map[a]);
  if(!keys.length) return '<div style="font-size:12px;color:var(--sub);padding:8px 0">데이터가 없습니다.</div>';
  const max=Math.max.apply(null,keys.map(k=>map[k]));
  return '<div class="t50a-bars">'+keys.map(k=>t50aBar(k,map[k],max)).join('')+'</div>';
}
function t50aRenderStat(){
  const scope=t50aScope();
  const list=t50aStatList();
  const active=list.filter(a=>FT50_INACTIVE.indexOf(a.status)<0);
  const ppl=active.reduce((s,a)=>s+ft50PeopleNum(a),0);
  const grant=list.filter(a=>typeof a.amount==='number'&&FT50_INACTIVE.indexOf(a.status)<0).reduce((s,a)=>s+a.amount,0);
  const refund=list.reduce((s,a)=>s+(a.refundAmount||0),0);

  const byRegion={}, byAge={}, byHour={};
  list.forEach(function(a){
    byRegion[a.region]=(byRegion[a.region]||0)+1;
    const ab=t50aAgeBucket(a.age); byAge[ab]=(byAge[ab]||0)+1;
    const hb=t50aHourBucket(a.tsFull); byHour[hb]=(byHour[hb]||0)+1;
  });

  document.getElementById('t50aBody').innerHTML=
    '<div class="t50a-bar">'+
      (scope?'<select disabled><option>'+fEsc(scope)+'</option></select>'
        :'<select onchange="t50aSetStatRegion(this.value)"><option value="">전체 지자체</option>'+
          ft50Regions().map(r=>'<option value="'+fEsc(r.name)+'"'+(r.name===t50aStatRegion?' selected':'')+'>'+fEsc(r.name)+'</option>').join('')+'</select>')+
      '<div class="rt"><button class="btn gy" onclick="t50aExportApplies()">⬇ 신청 데이터 CSV</button>'+
        '<button class="btn gy" onclick="t50aExportRefund()">⬇ 정산 데이터 CSV</button></div>'+
    '</div>'+
    '<div class="t50a-tiles">'+
      '<div class="t50a-tile" style="cursor:default"><div class="n">'+list.length+'</div><div class="l">신청건수</div></div>'+
      '<div class="t50a-tile" style="cursor:default"><div class="n">'+ppl+'</div><div class="l">신청자수(취소·반려 제외)</div></div>'+
      '<div class="t50a-tile" style="cursor:default"><div class="n">'+fmt(grant)+'</div><div class="l">승인 지원금(원)</div></div>'+
      '<div class="t50a-tile" style="cursor:default"><div class="n">'+fmt(refund)+'</div><div class="l">환급 지급액(원)</div></div>'+
    '</div>'+
    '<div class="t50a-card"><div class="sec-t">🗺 지역별 신청현황</div>'+t50aGroupHtml(byRegion)+'</div>'+
    '<div class="t50a-card"><div class="sec-t">🎂 연령대별 신청현황</div>'+
      t50aGroupHtml(byAge,['10대','20대','30대','40대','50대','60대 이상','미확인'])+'</div>'+
    '<div class="t50a-card"><div class="sec-t">🕐 시간대별 신청현황</div>'+
      t50aGroupHtml(byHour,['00-06시','06-09시','09-12시','12-15시','15-18시','18-21시','21-24시','시각 미확인'])+'</div>';
}
/* CSV — 자유입력 값이 =,+,-,@로 시작하면 엑셀이 수식으로 해석하므로 앞에 '를 붙여 무력화 */
function t50aCsvCell(v){
  let s=String(v==null?'':v);
  if(/^[=+\-@]/.test(s)) s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
}
function t50aCsv(filename,rows){
  const csv='﻿'+rows.map(r=>r.map(t50aCsvCell).join(',')).join('\r\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
  a.download=filename;
  document.body.appendChild(a); a.click(); a.remove();
}
function t50aExportApplies(){
  const rows=[['접수번호','지자체','시도','상태','신청자','계정','신청단위','인원','동반가족','여행시작','여행종료','접수일','청년','가족(3인이상)','승인지원금','환급한도']];
  t50aStatList().forEach(a=>rows.push([a.no,a.region,a.sido,(FT50_ST[a.status]||{t:a.status}).t,a.applicant,a.uid,
    a.unit==='family'?'가족':'개인',a.people,
    (a.members||[]).map(function(m){return m.masked+'('+m.rel+')';}).join(' '),
    a.start,a.end,a.ts,a.youth?'Y':'N',ft50GrantOf(a).label,a.amount||'',ft50RefundCap(a)]));
  t50aCsv('지역사랑휴가지원_신청데이터.csv',rows);
  toast('신청 데이터를 내려받았습니다');
}
function t50aExportRefund(){
  const rows=[['접수번호','지자체','신청자','인원','기본지원금','청년가산','가족가산','승인지원금','환급한도','결재금액','카드번호','승인번호','결제일','법인카드확인','판정근거','환급금액']];
  t50aStatList().filter(a=>a.status==='refund_ok').forEach(function(a){
    const c=t50aCorp(a);
    rows.push([a.no,a.region,a.applicant,a.people,
      ft50GrantOf(a).label,ft50GrantRate(a)+'%',a.refundSpend||t50aSpend(a)||'',a.amount||'',ft50RefundCap(a),
      a.evidence?a.evidence.amt:'',a.evidence?a.evidence.card:'',a.evidence?a.evidence.appr:'',a.evidence?a.evidence.date:'',
      c?c.label:'',c?c.detail:'',a.refundAmount||'']);
  });
  t50aCsv('지역사랑휴가지원_정산데이터.csv',rows);
  toast('정산 데이터를 내려받았습니다');
}

/* 신청자 화면(다른 탭)에서 접수·환급신청하면 자동 갱신 */
window.addEventListener('storage',function(e){
  if(e.key&&e.key.indexOf(FT50_AP_PREFIX)===0) t50aRender();
});
