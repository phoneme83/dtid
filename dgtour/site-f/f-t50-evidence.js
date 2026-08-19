/* ============================================================
   시안 F — 환급 증빙(영수증) 판독·대조 유틸
   시안 A~E(t50-apply.html)의 OCR 로직을 그대로 옮긴 것으로, 화면과 무관한
   순수 함수만 모았다. 폼·버튼 등 화면 처리는 t50.html 이 담당한다.

   판독 흐름: 첨부 → Tesseract.js(kor+eng) 1차 판독 → 누락 필드가 있으면
   대비 강화 전처리 이미지로 2차 판독 → 카드번호·승인번호·금액·결제일 추출 →
   사용자가 입력한 값과 대조. 엔진 로드 실패 시 모의 판독으로 폴백한다.

   실제 한국 카드영수증 판독에서 확인된 함정 3가지를 그대로 반영:
   ① 한글 라벨은 eng 모델로 못 읽음 → kor+eng 필수
   ② OCR이 천단위 쉼표를 마침표로 읽음(122,900 → 122.900) → 구분자 정규화
   ③ 마스킹 ******가 뭉개져 길이가 어긋남 → 앞·뒤 노출 숫자로 대조
   ============================================================ */

/* 승인번호(모의) — 금액에서 결정되는 8자리 */
function ft50EvApprNo(amt){ return String((amt*73+20260708)%90000000+10000000); }

/* 데모 영수증·모의 판독의 기준 결제내역 — 가맹점 결제(모의) 기록이 있으면 마지막 건 */
function ft50EvSource(a){
  const p=(a&&a.payments&&a.payments.length)?a.payments[a.payments.length-1]:null;
  return p?{merchant:p.merchant,amt:p.amt}:{merchant:'🏨 바다뷰 펜션',amt:45000};
}
/* 결제일이 신청 건의 여행기간(start~end) 안인지 */
function ft50EvInPeriod(a,d){ return !!d&&d>=a.start&&d<=a.end; }

/* 숫자 정규화: 천단위 구분자를 쉼표로 읽든 마침표로 읽든 붙여준다 (122,900 / 122.900 → 122900) */
function ft50EvNorm(s){
  let t=s;
  for(let k=0;k<3;k++) t=t.replace(/(\d)\s*[.,]\s*(\d{3})(?!\d)/g,'$1$2');
  return t.replace(/[,\s]/g,'');
}

/* 원문에서 결제일(승인일) 추출 — 'YYYY-MM-DD', 못 찾으면 null.
   거래일시·DATE 등 라벨이 있는 줄을 우선하고, 2자리 연도는 시간 표기나
   날짜 라벨이 함께 있는 줄에서만 인정한다 (승인번호 오인 방지) */
function ft50EvDate(raw){
  const DATE_LB=/(거래일시|승인일|거래일|일시|date)/i;
  const pad=function(n){ return ('0'+n).slice(-2); };
  const mk=function(y,m,d){
    m=Number(m); d=Number(d);
    if(m<1||m>12||d<1||d>31) return null;
    return y+'-'+pad(m)+'-'+pad(d);
  };
  let found=null;
  raw.split(/\n+/).some(function(ln){
    const lb=DATE_LB.test(ln);
    let v=null;
    /* 4자리 연도: 2026-07-09 / 2026.07.09 / 2026년 7월 9일 — 구분자 필수 */
    let m=ln.match(/(20\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/);
    if(m) v=mk(m[1],m[2],m[3]);
    /* 2자리 연도: 라벨 또는 시간 표기가 있는 줄에서만 */
    if(!v&&(lb||/\d{1,2}:\d{2}/.test(ln))){
      m=ln.match(/\b(\d{2})[.\-\/](\d{1,2})[.\-\/](\d{1,2})\b/);
      if(m) v=mk('20'+m[1],m[2],m[3]);
    }
    if(!v) return false;
    if(lb){ found=v; return true; }   /* 라벨 있는 줄이 최우선 */
    if(!found) found=v;               /* 무라벨은 첫 매치만 유지 */
    return false;
  });
  return found;
}

/* 원문에서 카드번호·승인번호·금액을 라벨 기준으로 추출.
   카드번호의 *·X·● 마스킹은 와일드카드로 취급한다 */
function ft50EvExtract(raw){
  const res={card:null,appr:null,amts:[],date:ft50EvDate(raw)};
  const CARD_LB=/(card|카드)/i, APPR_LB=/(approv|appr|승인)/i, AMT_LB=/(amount|amt|금액|합계|total)/i;
  raw.split(/\n+/).forEach(function(ln){
    const ns=ft50EvNorm(ln);
    const lts=ln.trim().split(/\s+/);
    /* 카드번호: 숫자로 시작하고 마스킹이 섞인(또는 15자리 이상인) 토큰 */
    if(!res.card&&CARD_LB.test(ln)){
      for(let ti=0;ti<lts.length;ti++){
        const t=lts[ti].replace(/[-—._/]/g,'');
        if(!/^[0-9]/.test(t)) continue;
        const w=t.replace(/[^0-9]/g,'*').slice(0,19);
        const vis=w.replace(/\*/g,'').length;
        if((w.indexOf('*')>=0||w.length>=15)&&vis>=4&&w.length>=8){ res.card=w; break; }
      }
    }
    /* 승인번호: 순수 숫자 토큰(괄호 등 장식 허용) 중 6~9자리, 8자리 우선 */
    if(APPR_LB.test(ln)){
      lts.forEach(function(tk){
        const digits=tk.replace(/[^0-9]/g,'');
        const deco=tk.replace(/[\[\]〔〕［］():：]/g,'');
        if(digits===deco&&digits.length>=6&&digits.length<=9){
          if(!res.appr||Math.abs(digits.length-8)<Math.abs(res.appr.length-8)) res.appr=digits;
        }
      });
    }
    if(AMT_LB.test(ln)){
      const m=ns.match(/\d{3,9}/g);
      if(m) m.forEach(function(v){ res.amts.push(v); });
    }
  });
  /* 국내 카드 전표의 승인번호는 [00000000]처럼 대괄호로만 표기되는 경우가 많다 */
  if(!res.appr){
    const b=raw.match(/[\[〔［]\s*(\d{7,9})\s*[\]〕］]/);
    if(b) res.appr=b[1];
  }
  /* 라벨을 못 읽은 경우의 보조 추출 — 공백 단위 토큰으로만 판단 */
  const toks=raw.split(/\s+/);
  if(!res.card){
    toks.some(function(tk){
      const t=tk.replace(/[^0-9*xX●•#\-]/g,'').replace(/-/g,'').replace(/[xX●•#]/g,'*');
      if(/\*/.test(t)&&t.length>=15&&t.length<=19){ res.card=t; return true; }
      return false;
    });
  }
  if(!res.appr){
    toks.some(function(tk){
      const t=tk.replace(/[^0-9]/g,'');
      if(t.length===8&&tk.length<=12){ res.appr=t; return true; }
      return false;
    });
  }
  /* 상호명·결제지역·비카드 전표 여부 (미검출은 null → 화면에서 '확인 불가') */
  res.shop=ft50EvShop(raw);
  res.region=ft50EvRegion(raw);
  res.nonCard=ft50EvNonCard(raw);
  return res;
}

/* 마스킹된 카드번호와 입력 카드번호 대조: 보이는 숫자는 같은 자리에서 일치해야 함 */
function ft50EvCardMatch(entered,ocrCard){
  const tok=(ocrCard||'').replace(/[^0-9*]/g,'');
  const vis=tok.replace(/\*/g,'');
  if(vis.length<4) return false;                     /* 노출 숫자가 너무 적으면 판정 불가 */
  if(tok.length===entered.length){
    for(let j=0;j<tok.length;j++){
      if(tok.charAt(j)!=='*'&&tok.charAt(j)!==entered.charAt(j)) return false;
    }
    return true;
  }
  /* 길이가 어긋나면(OCR 글자 누락) 앞·뒤 연속 노출 숫자로 비교 */
  const fr=tok.match(/^[0-9]+/), bk=tok.match(/[0-9]+$/);
  let ok=false;
  if(fr){ if(entered.indexOf(fr[0])!==0) return false; ok=true; }
  if(bk){ if(entered.slice(-bk[0].length)!==bk[0]) return false; ok=true; }
  return ok;
}

/* 2차 판독용 전처리 — 폭 1800px + 흑백·대비 강화.
   저대비·구겨진 영수증은 원본 그대로면 날짜 숫자가 뭉개진다 */
function ft50EvPrep(file){
  return new Promise(function(res,rej){
    const img=new Image();
    const url=URL.createObjectURL(file);
    img.onload=function(){
      const w=1800,h=Math.round(img.height*w/img.width);
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      const x=c.getContext('2d');
      x.filter='grayscale(1) contrast(1.6)';
      x.drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      res(c.toDataURL('image/jpeg',0.9));
    };
    img.onerror=function(){ URL.revokeObjectURL(url); rej(new Error('img load')); };
    img.src=url;
  });
}

/* Tesseract.js(실제 OCR 엔진) 지연 로드 */
let ft50TessReady=null;
function ft50EvLoadTess(){
  if(window.Tesseract) return Promise.resolve();
  if(ft50TessReady) return ft50TessReady;
  ft50TessReady=new Promise(function(res,rej){
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload=function(){ res(); };
    s.onerror=function(){ ft50TessReady=null; rej(new Error('tesseract load fail')); };
    document.head.appendChild(s);
  });
  return ft50TessReady;
}

/* 데모 영수증 PNG 생성 — 승인번호·금액·결제일이 인쇄된 이미지를 내려받는다.
   숫자는 Latin 라벨로 인쇄해야 판독률이 높다 */
function ft50EvSampleImage(a){
  const src=ft50EvSource(a), appr=ft50EvApprNo(src.amt);
  const c=document.createElement('canvas'); c.width=520; c.height=640;
  const x=c.getContext('2d');
  x.fillStyle='#ffffff'; x.fillRect(0,0,520,640);
  x.fillStyle='#111111'; x.textAlign='center';
  x.font='bold 34px Arial'; x.fillText('RECEIPT',260,60);
  x.font='22px Arial'; x.textAlign='left';
  /* 상호·주소·카드종류는 한글 라벨로 (실제 전표와 같은 형태여야 판독 로직을 탄다),
     숫자 필드는 판독률 때문에 Latin 라벨을 유지한다 */
  const lines=[
    '상 호 명 : '+String(src.merchant).replace(/[^0-9A-Za-z가-힣 ]/g,'').trim(),
    '주소 : '+a.region+' 중앙로 1',
    'DATE : '+a.start+' 14:22',      /* 결제일-여행기간 검증을 통과하도록 여행 시작일로 인쇄 */
    '--------------------------------',
    '카드종류 : 신한카드개인',
    'CARD NO : 1234-56XX-XXXX-3456',
    'AMOUNT : '+src.amt,
    'APPROVAL NO : '+appr,
    '--------------------------------',
    'JIYEOKSARANG DEMO RECEIPT'
  ];
  lines.forEach(function(t,li){ x.fillText(t,32,116+li*52); });
  const el=document.createElement('a');
  el.href=c.toDataURL('image/png');
  el.download='demo-receipt-'+appr+'.png';
  document.body.appendChild(el); el.click(); el.remove();
  return {appr:appr,amt:src.amt,date:a.start};
}


/* ── 비카드 전표 식별 ─────────────────────────────────────────
   현금영수증·멤버십 전표는 카드 결제 증빙이 아니다. 카드번호 자리에 휴대폰번호나
   멤버십 번호가 인쇄되므로, 그대로 두면 임의의 카드번호를 입력해도 카드번호 대조가
   건너뛰어져 통과된다. 첨부 단계에서 걸러 반려 사유를 준다.
   신용카드 승인 표기가 함께 있으면(멤버십 할인 전표가 붙어 나온 경우) 카드 결제로 본다. */
function ft50EvNonCard(raw){
  const t=String(raw||'');
  const credit=/신용\s*카드|신용\s*거래|신용\s*승인|신용\s*재승인|카드\s*결제|매\s*입\s*사/.test(t);
  if(!credit&&/멤버\s*[십쉽][^\n]{0,12}매\s*출\s*전\s*표/.test(t)) return '멤버십 전표';
  if(credit) return null;
  if(/현금\s*영수증|현금\s*[（(]\s*소득공제|자진\s*발급/.test(t)) return '현금영수증';
  if(/멤버\s*[십쉽]|포인트\s*전표/.test(t)) return '멤버십·포인트 전표';
  return null;
}

/* ── 상호명 추출 — 라벨이 '상호' '상 호 명' '가맹점명' 등으로 갈리고 공백이 끼어든다 ── */
function ft50EvShop(raw){
  const LB=/(상\s*호\s*명?|가\s*맹\s*점\s*명?|매\s*장\s*명|store)\s*[:：]/i;
  let found=null;
  String(raw||'').split(/\n+/).some(function(ln){
    const m=ln.match(LB);
    if(!m) return false;
    let v=ln.slice(m.index+m[0].length).trim();
    v=v.split(/\s{2,}/)[0].trim();
    v=v.replace(/\s*(대\s*표\s*자|TEL|전\s*화|사업자).*$/i,'').trim();
    if(v.length>=2){ found=v; return true; }
    return false;
  });
  return found;
}

/* ── 결제지역 추출 ───────────────────────────────────────────
   반값여행은 지역 소비 증빙이라 결제지역이 신청 지자체와 맞는지가 핵심인데
   기존 판독은 주소를 아예 보지 않았다. 실측 전표의 표기 편차를 반영한다:
     ① 시도명 축약 혼재 — '강원' / '강원도' / '강원특별자치도'
     ② 구는 시와 함께 적어야 식별된다 ('중구'만으로는 서울/대구 구분 불가)
     ③ 읍면동이 빠지고 도로명만 인쇄된 전표가 흔하다 → 도로명으로 대체
     ④ 동을 괄호로 병기하는 형태 — '세계로 53 (반곡동)'
     ⑤ '종로2가'처럼 '가'로 끝나는 법정동이 있다 */
const FT50_SIDO=[
  ['서울특별시','서울시'],['부산광역시','부산시'],['대구광역시','대구시'],
  ['인천광역시','인천시'],['광주광역시','광주시'],['대전광역시','대전시'],
  ['울산광역시','울산시'],['세종특별자치시','세종시'],
  ['강원특별자치도','강원도'],['전북특별자치도','전북'],['제주특별자치도','제주도'],
  ['경기도','경기도'],['강원도','강원도'],['충청북도','충북'],['충청남도','충남'],
  ['전라북도','전북'],['전라남도','전남'],['경상북도','경북'],['경상남도','경남'],
  ['제주도','제주도'],
  ['서울','서울시'],['부산','부산시'],['대구','대구시'],['인천','인천시'],
  ['광주','광주시'],['대전','대전시'],['울산','울산시'],['세종','세종시'],
  ['경기','경기도'],['강원','강원도'],['충북','충북'],['충남','충남'],
  ['전북','전북'],['전남','전남'],['경북','경북'],['경남','경남'],['제주','제주도']
];
/* 시도 이름이면서 '시'로 끝나는 것 — 기초자치단체 '시'와 구분해야 한다 */
const FT50_SIDO_SI=['서울특별시','부산광역시','대구광역시','인천광역시',
                 '광주광역시','대전광역시','울산광역시','세종특별자치시'];
function ft50EvSido(s){
  for(let i=0;i<FT50_SIDO.length;i++){ if(s.indexOf(FT50_SIDO[i][0])>=0) return FT50_SIDO[i][1]; }
  return null;
}
function ft50EvParseAddr(s){
  if(!s) return null;
  const sd=ft50EvSido(s);
  let sgg=null,m;
  /* 구가 있으면 반드시 앞에 시를 붙인다 ('중구'처럼 두 글자 구가 있어 최소 1자) */
  m=s.match(/([가-힣]{1,8}구)(?![가-힣])/);
  if(m){
    const gu=m[1];
    const pre=s.slice(0,m.index).match(/([가-힣]{2,10}시)\s*$/);
    if(pre&&FT50_SIDO_SI.indexOf(pre[1])<0) sgg=pre[1]+' '+gu;      /* 성남시 분당구 */
    else if(sd&&/시$/.test(sd))            sgg=sd+' '+gu;           /* 서울시 송파구 */
    else                                   sgg=gu;
  }
  if(!sgg){
    m=s.match(/([가-힣]{2,10}(?:시|군))(?![가-힣])/);
    if(m&&FT50_SIDO_SI.indexOf(m[1])<0) sgg=m[1];
  }
  /* 읍면동 — 괄호 병기 > 읍·면 > 동·가 > 도로명 */
  let emd=null;
  m=s.match(/[（(]\s*([가-힣]{1,8}\d?(?:읍|면|동|가))\s*[）)]/);
  if(m) emd=m[1];
  if(!emd){ m=s.match(/([가-힣]{1,8}(?:읍|면))(?![가-힣])/);            if(m) emd=m[1]; }
  if(!emd){ m=s.match(/([가-힣]{1,6}\d?(?:동|가))(?![가-힣])/);          if(m) emd=m[1]; }
  if(!emd){ m=s.match(/([가-힣]{1,10}\d*(?:번길|가길|로|길))(?![가-힣])/); if(m) emd=m[1]; }
  if(!sgg&&!emd) return null;
  return {sgg:sgg,emd:emd};
}
function ft50EvRegion(raw){
  const LB=/(주\s*소|사\s*업\s*장|가맹점\s*주소)\s*[:：]?/;
  let labeled=null,plain=null;
  String(raw||'').split(/\n+/).forEach(function(ln){
    const m=ln.match(LB);
    const body=(m?ln.slice(m.index+m[0].length):ln).trim();
    if(!ft50EvSido(body)&&!/[가-힣]{1,10}(시|군|구)(?![가-힣])/.test(body)) return;
    const r=ft50EvParseAddr(body);
    if(!r) return;
    if(m){ if(!labeled) labeled=r; }
    else if(!plain) plain=r;
  });
  return labeled||plain;
}
/* 결제지역을 한 줄로 — 둘 다 없으면 null (화면에서 '확인 불가'로 표시된다) */
function ft50EvRegionText(r){
  if(!r) return null;
  return [r.sgg,r.emd].filter(Boolean).join(' ')||null;
}

/* 첨부 파일 판독 — {mode:'real',text,ex,file} 또는 {mode:'mock',...} 으로 resolve.
   onProgress(문구)로 진행 상황을 알린다. 90초 넘으면 모의 판독으로 폴백 */
function ft50EvRead(file,a,onProgress){
  function rec(src){
    /* 한글 영수증 라벨([금액]·카드·승인 등)을 읽기 위해 kor+eng 사용 */
    return Tesseract.recognize(src,'kor+eng',{logger:function(m){
      if(onProgress&&m.status==='recognizing text') onProgress('🔍 영수증 판독 중… '+Math.round(m.progress*100)+'%');
    }});
  }
  const timeout=new Promise(function(_,rej){ setTimeout(function(){ rej(new Error('ocr timeout')); },90000); });
  return Promise.race([
    ft50EvLoadTess().then(function(){ return rec(file); }).then(function(r){
      const raw=r.data.text||'';
      const ex=ft50EvExtract(raw);
      if(ex.date&&ex.appr&&ex.card&&ex.amts.length) return {raw:raw,ex:ex};
      /* 누락 필드가 있으면 전처리 이미지로 2차 판독 후 빈 필드만 병합 */
      if(onProgress) onProgress('🔍 영수증 정밀 판독 중… (대비 강화 2차 판독)');
      return ft50EvPrep(file).then(rec).then(function(r2){
        const raw2=r2.data.text||'';
        const ex2=ft50EvExtract(raw2);
        ['date','appr','card'].forEach(function(k){ if(!ex[k]&&ex2[k]) ex[k]=ex2[k]; });
        ex2.amts.forEach(function(v){ if(ex.amts.indexOf(v)<0) ex.amts.push(v); });
        return {raw:raw+'\n'+raw2,ex:ex};
      }).catch(function(){ return {raw:raw,ex:ex}; });   /* PDF 등 이미지 로드 불가 시 1차 결과 유지 */
    }),
    timeout
  ]).then(function(res){
    return {mode:'real',text:ft50EvNorm(res.raw),ex:res.ex,file:file.name};
  }).catch(function(){
    /* 엔진 로드/판독 실패 시 모의 판독으로 폴백 — 데모가 멈추지 않도록 */
    const src=ft50EvSource(a);
    return {mode:'mock',merchant:src.merchant,amt:src.amt,appr:ft50EvApprNo(src.amt),
            card:'123456******3456',date:a.start,file:file.name};
  });
}

/* 입력값 ↔ 판독 결과 대조. 통과하면 null, 실패하면 사용자에게 보여줄 HTML 문자열 */
function ft50EvVerify(o,a,input){
  const card=input.card, appr=input.appr, amt=input.amt, payDate=input.date;
  if(o.mode==='real'){
    const ex=o.ex||{};
    /* 카드 결제 증빙이 아니면 대조 자체가 성립하지 않는다 */
    if(ex.nonCard)
      return '❌ <b>카드 결제 증빙이 아닙니다.</b> 첨부하신 파일은 <b>'+ex.nonCard+
        '</b>으로 판독되었습니다. 카드번호 자리에 인쇄된 번호는 결제카드 번호가 아니므로 대조할 수 없습니다. '+
        '신용카드 매출전표(카드번호·승인번호가 인쇄된 영수증)를 첨부해 주세요.';
    const fails=[];
    if(ex.appr){ if(ex.appr!==appr) fails.push('승인번호(영수증: '+ex.appr+')'); }
    else if(o.text.indexOf(appr)<0) fails.push('승인번호(영수증에서 확인 불가)');
    const amtStr=String(amt);
    if(ex.amts&&ex.amts.length){
      if(ex.amts.indexOf(amtStr)<0)
        fails.push('결재금액(영수증: '+ex.amts.map(function(v){ return Number(v).toLocaleString('ko-KR'); }).join('/')+'원)');
    }else if(o.text.indexOf(amtStr)<0) fails.push('결재금액(영수증에서 확인 불가)');
    if(ex.card&&!ft50EvCardMatch(card,ex.card)) fails.push('카드번호(영수증: '+ex.card+')');
    if(ex.date&&ex.date!==payDate) fails.push('결제일(영수증: '+ex.date+')');
    if(fails.length)
      return '❌ <b>정보가 잘못 입력되었습니다.</b> 영수증(OCR) 판독 결과와 다음 항목이 일치하지 않습니다: <b>'+
        fails.join(', ')+'</b>. 영수증의 표기와 동일하게 입력해 주세요.';
    /* 결제일-여행기간 대조: 영수증 판독일(검출 시) 기준, 미검출 시 입력값 기준 */
    const effDate=ex.date||payDate;
    if(!ft50EvInPeriod(a,effDate))
      return '❌ <b>결제일이 여행기간 밖입니다.</b> 영수증의 결제일은 <b>'+effDate+'</b>이나, 이 신청 건의 여행기간은 <b>'+
        a.start+' ~ '+a.end+'</b>입니다. 여행기간 중에 결제한 영수증만 환급 대상입니다.';
    return null;
  }
  if(appr!==o.appr||amt!==o.amt||(o.card&&!ft50EvCardMatch(card,o.card))||(o.date&&o.date!==payDate))
    return '❌ <b>정보가 잘못 입력되었습니다.</b> 영수증 판독 결과와 카드번호·승인번호·결재금액·결제일 중 일치하지 않는 항목이 있습니다. 다시 확인해 주세요.';
  if(!ft50EvInPeriod(a,payDate))
    return '❌ <b>결제일이 여행기간 밖입니다.</b> 결제일은 <b>'+payDate+'</b>이나, 이 신청 건의 여행기간은 <b>'+
      a.start+' ~ '+a.end+'</b>입니다. 여행기간 중에 결제한 영수증만 환급 대상입니다.';
  return null;
}
