/* ═══════════════════════════════════════════════════════════════════
   영수증 사업자등록번호 판독·검증 (시안 A~G 공용)  — window.BIZNO

   흐름: OCR 원문 → ① 사업자번호 추출(체크섬 통과분만) → ② 못 찾으면 '거의 맞는' 번호의
   한 자리 보정 후보를 만들어 국세청 조회로 하나만 남을 때 확정 → ③ 국세청 상태조회
   (계속·휴업·폐업, 결제일 기준 폐업 여부) → ④ 제출 판정.

   추출 규칙은 실측 카드영수증 111장을 Claude 가 직접 판독하며 쓴 방법을 옮긴 것이다.
     · 체크섬(국세청 검증식)이 맞는 10자리만 인정, 첫 자리 0·가운데 00 은 사업자번호가 아님
     · 번호 바로 앞 라벨이 '주인': 사업자·등록번호 → 채택 / 가맹점번호·TID·단말기·승인·전표·일시 → 버림
     · 형식 우선순위: ddd-dd-ddddd > 붙은 10자리 > 띄어쓰기를 붙여야 되는 것(라벨 줄에서만)
     · OCR 오독 보정: 구분자 • · ~ 공백, O/D→0, I/l/|→1, '()'·'口'→0, '이'→01, 두 줄로 나뉜 번호
   실측 결과(Tesseract kor+eng, 111장): 72장 판독·오판 0건. 못 읽은 건은 재촬영 안내 →
   두 번째도 실패하면 제출은 받고 담당자 확인으로 넘긴다(정당한 신청이 막히지 않도록).

   국세청 조회: 공공데이터포털 「국세청_사업자등록정보 진위확인 및 상태조회 서비스」.
   인증키는 관리자 화면에서 입력해 이 브라우저(localStorage)에만 저장한다 — 공개 레포라
   코드에 넣지 않는다. 운영에서는 서버가 대신 호출해야 한다(ocr-server/ 참고).
   키가 없으면 체크섬까지만 확인하고 '국세청 미조회'로 남긴다.
   ═══════════════════════════════════════════════════════════════════ */
(function(root){
const KEY_LS='dtid_nts_service_key';
let memKey='';   /* 서버(Node)에서는 config({key}) 로 메모리에만 둔다 */
const NTS_URL='https://api.odcloud.kr/api/nts-businessman/v1/status';
const MSG_RETAKE='📷 <b>사진이 선명하지 않습니다. 다시 촬영하여 업로드해주시기 바랍니다.</b>';
const fails={};   /* 재촬영 횟수 — 증빙 폼별 */

function valid(d){
  d=String(d||'').replace(/\D/g,'');
  if(d.length!==10||/^0/.test(d)||/^\d{3}00/.test(d)||/^(\d)\1{9}$/.test(d)) return false;
  const w=[1,3,7,1,3,7,1,3,5]; let s=0;
  for(let i=0;i<9;i++) s+=Number(d[i])*w[i];
  s+=Math.floor(Number(d[8])*5/10);
  return (10-s%10)%10===Number(d[9]);
}
function fmt(d){ d=String(d).replace(/\D/g,''); return d.slice(0,3)+'-'+d.slice(3,5)+'-'+d.slice(5); }
const LB=/([사시자치하싸][\s.]*[업입엽압][\s.]*[자사가天]|등\s*록\s*번\s*호|business|biz\s*no|사업장\s*번호)/i;
const BAD=/(가\s*맹|가맴|기맹|merchant|T\s*I\s*D|CAT\s*ID|단\s*말|승\s*인|슴\s*인|전\s*표|POS|고\s*유\s*번\s*호|영\s*수\s*증\s*번\s*호|주\s*문|회\s*원|거\s*래\s*번\s*호|카\s*드\s*번\s*호)/i;
const DT=/(\d{1,2}:\d{2}(:\d{2})?|20\d{2}[.\-\/]\d{1,2}[.\-\/]\d{1,2}|\b\d{2}[.\-\/]\d{2}[.\-\/]\d{2}\b)/;
const HEAD=/(대\s*표|TEL|Tel|전\s*화|상\s*호|매\s*장\s*명|\/)/;
/* 숫자 자리에 끼어든 글자 보정 — 앞뒤가 숫자·구분자일 때만 바꾼다 */
function fix(s){
  let t=String(s||'');
  t=t.replace(/\(\s*\)|口|ㅁ/g,'0');
  t=t.replace(/([\d\-•·.~ ])이(?=\d)/g,'$101');
  const M={O:'0',o:'0',D:'0',Q:'0',I:'1',l:'1','|':'1','!':'1',i:'1','ㅣ':'1',S:'5',s:'5',B:'8',Z:'2',z:'2',G:'6'};
  for(let k=0;k<2;k++) t=t.replace(/(^|[\d\-•·.~ ])([OoDQIl|!iㅣSsBZzG])(?=[\d\-•·.~ ]|$)/g,(m,a,c)=>a+M[c]);
  return t;
}
/* 한 줄에서 체크섬이 맞는 후보 — at: 줄 안 위치(바로 앞 라벨이 주인) */
function scan(s){
  const seen={};
  const push=(d,form,rank,at)=>{ if(valid(d)&&(!seen[d]||seen[d].rank<rank)) seen[d]={d,form,rank,at}; };
  let m;
  const H=/(?<!\d)(\d{3})\s?[-–—~•·]{1,2}\s?(\d{2})\s?[-–—~•·]{1,2}\s?(\d(?:\s?\d){4})(?!\d)/g;
  while((m=H.exec(s))) push(m[1]+m[2]+m[3].replace(/\s/g,''),'hyph',3,m.index);
  const P=/(?<![\d])(\d{10})(?![\d\-])/g;
  while((m=P.exec(s))) push(m[1],'plain',2,m.index);
  const J=s.replace(/(\d)\s+(?=\d)/g,'$1'), JH=/(?<!\d)(\d{3})[-–—~•·]?(\d{2})[-–—~•·]?(\d{5})(?!\d)/g;
  while((m=JH.exec(J))) push(m[1]+m[2]+m[3],'joined',1,-1);
  const L=/(?<!\d)(\d{11,12})(?!\d)/g;   /* 라벨 글자가 숫자로 섞여 11~12자리가 된 경우 */
  while((m=L.exec(J))){ for(let i=0;i+10<=m[1].length;i++) push(m[1].substr(i,10),'window',0,-1); }
  return Object.keys(seen).map(k=>seen[k]);
}
function owner(x,at){
  let best=null,pos=-1,m;
  [[LB,'biz'],[BAD,'bad'],[DT,'bad']].forEach(([re,kind])=>{
    const g=new RegExp(re.source,'gi');
    while((m=g.exec(x))){ if(m.index<at&&m.index>pos){ pos=m.index; best=kind; } }
  });
  return best;
}
function lines(raw){ return String(raw||'').split(/\n+/).map(v=>v.trim()).filter(Boolean); }
/* 사업자번호 추출 → {no, score, label, others} */
function extract(raw){
  const ls=lines(raw), cands={};
  const add=(d,sc,ln)=>{ if(!cands[d]||cands[d].score<sc) cands[d]={no:fmt(d),score:sc,line:ln}; };
  ls.forEach((ln,i)=>{
    const lb=LB.test(ln);
    const prevLb=!lb&&i>0&&LB.test(ls[i-1])&&!/\d{5}/.test(ls[i-1]);
    const head=HEAD.test(ln)||/[\[［(（]\s*\d{3}/.test(ln);
    [[ln,0],[fix(ln),-0.3]].forEach(([x,pen])=>{
      scan(x).forEach(c=>{
        const own=c.at<0?(lb?'biz':null):owner(x,c.at);
        if(own==='bad') return;
        if((c.form==='joined'||c.form==='window')&&own!=='biz'&&!prevLb) return;
        const ctx=own==='biz'?2:(prevLb?1.5:(head?0.5:0));
        add(c.d,ctx+(c.form==='hyph'?1.5:c.form==='plain'?1:0)+pen,ln);
      });
    });
    /* 두 줄로 나뉜 번호 — 사업자 라벨 줄에서만 잇는다. 라벨 없이 이으면 다음 줄 숫자가 붙어
       '남의 등록 번호'가 만들어지는 일이 실측에서 있었다(국세청 조회까지 통과) */
    const tail=lb&&fix(ln).match(/(\d{3})[-–—~·•]\s?(\d{2})[-–—~·•]\s?(\d{1,4})\s*$/);
    if(tail&&ls[i+1]){
      const hd=fix(ls[i+1]).match(/^\D{0,2}(\d{1,4})/);
      if(hd){ const d=tail[1]+tail[2]+tail[3]+hd[1]; if(d.length===10&&valid(d)) add(d,2+1.2,ln+' / '+ls[i+1]); }
    }
  });
  const list=Object.keys(cands).map(k=>cands[k]).filter(c=>c.score>=1).sort((a,b)=>b.score-a.score);
  if(!list.length) return {no:null,score:0,label:null,others:[]};
  return {no:list[0].no,score:Math.round(list[0].score*10)/10,others:list.slice(1).map(c=>c.no)};
}
/* 체크섬이 틀린 '거의 맞는' 번호 → 한 자리만 바꿔 체크섬이 맞는 후보들 (국세청 조회로 가린다) */
function nearCands(raw){
  const out=[];
  lines(raw).forEach(ln=>{
    const x=fix(ln), lb=LB.test(ln); let m;
    const re=lb?/(?<!\d)(\d{3})[-–—~•·\s]{0,3}(\d{2})[-–—~•·\s]{0,3}(\d{5})(?!\d)/g:/(?<!\d)(\d{3})\s?[-–—~•·]\s?(\d{2})\s?[-–—~•·]\s?(\d{5})(?!\d)/g;
    while((m=re.exec(x))){
      if(owner(x,m.index)==='bad') continue;
      const d=m[1]+m[2]+m[3]; if(valid(d)) continue;
      for(let i=0;i<10;i++) for(let v=0;v<10;v++){
        const c=d.slice(0,i)+v+d.slice(i+1);
        if(c!==d&&valid(c)&&out.indexOf(c)<0) out.push(c);
      }
    }
  });
  return out.slice(0,100);
}
/* ── 국세청 상태조회 ── */
function getKey(){ if(memKey) return memKey; try{ return (typeof localStorage!=='undefined'&&localStorage.getItem(KEY_LS))||''; }catch(e){ return ''; } }
function config(o){ if(o&&o.key!=null) memKey=String(o.key).trim(); }
function setKey(k){ try{ k?localStorage.setItem(KEY_LS,k.trim()):localStorage.removeItem(KEY_LS); }catch(e){} }
/* 국세청 조회 — 실패(시간초과·일시 오류)하면 1번 더 시도한다 */
function ntsStatus(nums){
  return ntsOnce(nums).catch(e=>{ if(e&&e.noKey) throw e; return new Promise(r=>setTimeout(r,800)).then(()=>ntsOnce(nums)); });
}
function ntsOnce(nums){
  const key=getKey();
  if(!key) return Promise.resolve(null);
  const ctl=typeof AbortController!=='undefined'?new AbortController():null;
  const to=setTimeout(()=>{ if(ctl) ctl.abort(); },10000);
  return fetch(NTS_URL+'?serviceKey='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({b_no:nums.map(n=>String(n).replace(/\D/g,''))}),signal:ctl?ctl.signal:undefined})
    .then(r=>r.json()).then(d=>{
      clearTimeout(to);
      if(!d||d.status_code!=='OK'||!Array.isArray(d.data)) throw new Error('nts');
      const map={}; d.data.forEach(x=>{ map[x.b_no]=x; }); return map;
    }).catch(e=>{ clearTimeout(to); throw e; });
}
function ntsInfo(x){
  if(!x) return null;
  return {reg:!!x.b_stt_cd, cd:x.b_stt_cd||'', stt:x.b_stt||'', tax:x.tax_type||'', end:x.end_dt||''};
}
/* OCR 결과 객체에 사업자번호 판독·조회 결과(o.biz)를 붙인다 — 항상 resolve */
function attach(o){
  if(!o) return Promise.resolve(o);
  if(o.mode!=='real'){ o.biz={state:'mock'}; return Promise.resolve(o); }
  const raw=o.raw||o.rawText||'';
  if(/DEMO\s*RECEIPT/i.test(raw)){ const e=extract(raw); o.biz={state:'demo',no:e.no}; return Promise.resolve(o); }
  const e=extract(raw);
  if(e.no){
    o.biz={state:'found',no:e.no,others:e.others};
    return ntsStatus([e.no]).then(map=>{
      if(!map){ o.biz.nts=null; o.biz.nokey=true; return o; }
      o.biz.nts=ntsInfo(map[e.no.replace(/-/g,'')]);
      if(o.biz.nts&&!o.biz.nts.reg) o.biz.state='unregistered';
      return o;
    }).catch(()=>{ o.biz.ntsErr=true; return o; });
  }
  const near=nearCands(raw);
  o.biz={state:'none'};
  if(!near.length) return Promise.resolve(o);
  return ntsStatus(near).then(map=>{
    if(!map) return o;
    const reg=near.filter(c=>map[c]&&map[c].b_stt_cd);
    if(reg.length===1){ o.biz={state:'found',no:fmt(reg[0]),fixed:true,nts:ntsInfo(map[reg[0]])}; }
    else if(reg.length>1) o.biz={state:'ambiguous',cands:reg.map(fmt)};
    return o;
  }).catch(()=>o);
}
function d8(s){ return String(s||'').replace(/\D/g,'').slice(0,8); }
function endTxt(e){ return e?e.slice(0,4)+'-'+e.slice(4,6)+'-'+e.slice(6,8):''; }
/* 판독 결과 화면용 한 줄 {text, tone:'ok'|'warn'|'bad'|'muted'} */
function view(b,payDate){
  if(!b) return {text:'확인 불가',tone:'muted'};
  if(b.state==='mock') return {text:'확인 불가 (모의 판독)',tone:'muted'};
  if(b.state==='demo') return {text:(b.no||'-')+' · 데모 영수증(국세청 조회 생략)',tone:'muted'};
  if(b.state==='none') return {text:'판독 불가 — 사진이 선명하지 않습니다',tone:'warn'};
  if(b.state==='ambiguous') return {text:'판독 불확실 — 후보가 여러 개입니다('+b.cands.join(', ')+')',tone:'warn'};
  if(b.state==='unregistered') return {text:b.no+' ⚠️ 국세청에 등록되지 않은 번호',tone:'warn'};
  const n=b.nts, base=b.no+(b.fixed?' (흐린 자리 보정)':'');
  if(b.nokey) return {text:base+' · 체크섬 확인(국세청 조회 미설정)',tone:'muted'};
  if(b.ntsErr||!n) return {text:base+' · 국세청 조회 실패(담당자 재조회)',tone:'warn'};
  if(n.cd==='03'){
    if(!payDate) return {text:base+' ⚠️ 폐업 사업자(폐업일 '+endTxt(n.end)+') — 결제일과 비교 필요',tone:'warn'};
    const before=n.end&&n.end<=d8(payDate);
    return {text:base+(before?' ❌ 결제일 이전 폐업('+endTxt(n.end)+')':' ✅ 결제 후 폐업('+endTxt(n.end)+')'),tone:before?'bad':'ok'};
  }
  if(n.cd==='02') return {text:base+' ⚠️ 휴업 사업자',tone:'warn'};
  return {text:base+' ✅ 국세청 '+(n.stt||'계속사업자'),tone:'ok'};
}
/* 제출 판정 → {block: 사용자에게 보일 HTML|null, note: 담당자용 메모|null, no}
   formKey: 증빙 폼 이름(브라우저 — 재촬영 횟수를 이 모듈이 센다) 또는 숫자(서버 — 몇 번째 시도인지 호출자가 넘긴다) */
function gate(b,payDate,formKey){
  const v=view(b,payDate), no=b&&b.no||null;
  if(!b||b.state==='mock'||b.state==='demo') return {block:null,note:null,no};
  const n0=b.nts, closedBefore=b.state==='found'&&n0&&n0.cd==='03'&&n0.end&&payDate&&n0.end<=d8(payDate);
  if(b.state==='found'&&!closedBefore){
    const n=b.nts;
    if(n&&n.cd==='02') return {block:null,note:'휴업 사업자(국세청 조회 기준) — 담당자 확인',no};
    if(b.ntsErr) return {block:null,note:'국세청 조회 실패 — 담당자 재조회 필요',no};
    reset(formKey);
    return {block:null,note:b.nokey?'국세청 미조회(체크섬만 확인)':null,no};
  }
  /* 판독 불가·불확실·미등록·결제일 이전 폐업 → 첫 번째는 재촬영 안내, 두 번째부터는 담당자 확인으로 제출.
     결제일 이전 폐업도 바로 반려하지 않는다 — 오독한 번호가 우연히 다른(폐업한) 사업자와 맞은 사례가 실측에 있었다 */
  let tries;
  if(typeof formKey==='number') tries=formKey;
  else { const k=formKey||'_'; fails[k]=(fails[k]||0)+1; tries=fails[k]; }
  if(tries<2){
    const why=closedBefore?'판독한 번호('+no+')가 결제일 이전에 폐업한 사업자(폐업일 '+endTxt(n0.end)+')로 조회됩니다.'
             :b.state==='unregistered'?'판독한 번호('+no+')가 국세청에 등록되어 있지 않습니다.'
             :b.state==='ambiguous'?'사업자등록번호의 흐린 자리를 확정하지 못했습니다.'
             :'영수증의 사업자등록번호를 읽지 못했습니다.';
    return {block:MSG_RETAKE+'<br>'+why+' 가게 이름·사업자번호가 찍힌 윗부분이 잘 보이도록 밝은 곳에서 영수증을 평평하게 펴고 촬영해 주세요.',note:null,no,retake:true};
  }
  return {block:null,note:'사업자번호 확인 필요 — '+v.text.replace(/<[^>]+>/g,'')+' (재촬영 후에도 실패, 담당자가 원본 확인)',no};
}
function reset(k){ if(typeof k!=='number') delete fails[k||'_']; }
/* 증빙에 남길 값 */
function record(o,g){ return {bizno:(g&&g.no)||(o&&o.biz&&o.biz.no)||'',biznoNote:(g&&g.note)||'',biznoView:view(o&&o.biz).text}; }
/* 관리자용 한 줄 (증빙 객체 e) */
function adminLine(e){
  if(!e||(!e.bizno&&!e.biznoNote&&!e.biznoView)) return '';
  const warn=!!e.biznoNote&&!/^국세청 미조회/.test(e.biznoNote);
  return '<br><b style="color:'+(warn?'#b45309':'#0f766e')+'">'+(warn?'⚠️':'🏢')+' 사업자번호 '+(e.bizno||'-')+
    (e.biznoView?' · '+String(e.biznoView).replace(/^[\d\-]+\s*/,''):'')+(e.biznoNote?' · '+e.biznoNote:'')+'</b>';
}
/* 관리자 화면 인증키 입력 상자 */
function keyBox(id){
  const el=document.getElementById(id); if(!el) return;
  const has=!!getKey();
  el.innerHTML='<div style="border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;margin:10px 0;font-size:13px;line-height:1.6;background:#f8fafc;color:#0f172a">'+
    '🏢 <b>국세청 사업자 상태조회</b> — '+(has?'<b style="color:#0f766e">인증키 설정됨</b>':'<b style="color:#b45309">인증키 미설정(체크섬까지만 확인)</b>')+
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px"><input id="'+id+'_k" type="password" autocomplete="off" placeholder="공공데이터포털 Decoding 인증키" style="flex:1;min-width:180px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px">'+
    '<button type="button" id="'+id+'_s" style="padding:6px 12px;border-radius:6px;border:0;background:#0f766e;color:#fff;font-weight:700;cursor:pointer">저장</button>'+
    (has?'<button type="button" id="'+id+'_d" style="padding:6px 12px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer">삭제</button>':'')+'</div>'+
    '<small style="color:#64748b">키는 이 브라우저에만 저장되고 서버·레포로 보내지 않습니다. 같은 사이트의 모든 시안이 함께 씁니다.</small></div>';
  document.getElementById(id+'_s').onclick=()=>{ const v=document.getElementById(id+'_k').value.trim(); if(v){ setKey(v); keyBox(id); } };
  const d=document.getElementById(id+'_d'); if(d) d.onclick=()=>{ setKey(''); keyBox(id); };
}
const API={extract,valid,fmt,fix,nearCands,attach,view,gate,reset,record,adminLine,keyBox,getKey,setKey,config,ntsStatus,DEMO_NO:'123-45-67891'};
if(typeof module!=='undefined'&&module.exports) module.exports=API; else root.BIZNO=API;
})(typeof window!=='undefined'?window:globalThis);
