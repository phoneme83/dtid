/* 자동 생성 — tools/sync-from-site.js 가 dgtour/site-g/g-ocr.js 의 순수 함수(브라우저 API 미사용)를 복사한 것. 직접 고치지 말 것. */
const G_SPEND_CATS=[
  {cat:'숙박',kw:['호텔','모텔','펜션','리조트','게스트하우스','민박','콘도','한옥','스테이','글램핑','캠핑','야영장','유스호스텔']},
  {cat:'음식',kw:['식당','음식','한식','중식','일식','양식','분식','국밥','갈비','횟집','해장','카페','커피','베이커리','제과','제빵','치킨','피자','뷔페','국수','칼국수','한우','막국수']},
  {cat:'관광',kw:['관광','박물관','미술관','전시','수목원','식물원','동물원','아쿠아리움','케이블카','유람선','전망대','테마파크','기념관','민속촌','관람','레일바이크']},
  {cat:'체험',kw:['체험','공방','클래스','승마','카약','서핑','래프팅','짚라인','도자기','농장','목장','레저','액티비티','공예']},
  {cat:'쇼핑',kw:['마트','상회','특산','기념품','상점','쇼핑','상사','로컬푸드','하나로','전통시장','판매장','직판장','농협','직매장']}
];
const G_EXCL_KW=[
  {biz:'주유소',kw:['주유소','주유','SK에너지','현대오일','오일뱅크','칼텍스','에쓰오일','SOIL','충전소','LPG']},
  {biz:'금은방',kw:['금은방','귀금속','보석','쥬얼리','주얼리']},
  {biz:'유흥',kw:['유흥','단란주점','룸살롱','나이트클럽','노래방','노래연습장','캬바레','성인용품']},
  {biz:'학원',kw:['학원','교습소','어학원','입시','과외']},
  {biz:'카센터',kw:['카센터','카센타','정비소','자동차정비','타이어','공업사']}
];
function gBizNorm(s){ return String(s||'').replace(/[\s\-·.,()]/g,'').toUpperCase(); }
function gBizCheck(shop){
  const s=gBizNorm(shop);
  const hit=kw=>kw.some(w=>s.indexOf(gBizNorm(w))>=0);
  if(!s) return {result:'unknown',label:'가맹점 확인 불가',detail:'상호를 읽지 못해 업종을 판정하지 못했습니다. 담당자가 영수증 원본으로 확인합니다.'};
  const ex=G_EXCL_KW.find(b=>hit(b.kw));
  if(ex) return {result:'excluded',biz:ex.biz,label:'제외 업종 — '+ex.biz,detail:'주유소·금은방·유흥·학원·카센터는 전국 공통 제외 업종입니다(운영기준 S2).'};
  const inc=G_SPEND_CATS.find(c=>hit(c.kw));
  if(inc) return {result:'included',cat:inc.cat,label:'인정 항목 — '+inc.cat,detail:'인정 업종(숙박·음식·관광·체험·쇼핑) 중 '+inc.cat+'에 해당합니다.'};
  return {result:'unknown',label:'업종 확인 필요',detail:'인정 5종·제외 5종 어디에도 해당하지 않아 담당자가 영수증 원본으로 확인합니다.'};
}

/* 숫자 정규화: 122,900 / 122.900 → 122900 */
function gOcrNorm(s){
  let t=String(s||'');
  for(let k=0;k<3;k++) t=t.replace(/(\d)\s*[.,]\s*(\d{3})(?!\d)/g,'$1$2');
  return t.replace(/[,\s]/g,'');
}
/* 결제일 추출 — 라벨(거래일시·DATE 등) 줄 우선, 2자리 연도는 라벨·시간이 있는 줄에서만 */
function gOcrDate(raw){
  const LB=/(거래일시|승인일|거래일|일시|date)/i;
  const pad=n=>('0'+n).slice(-2);
  const mk=(y,m,d)=>{ m=Number(m); d=Number(d); if(m<1||m>12||d<1||d>31) return null; return y+'-'+pad(m)+'-'+pad(d); };
  let found=null;
  String(raw||'').split(/\n+/).some(ln=>{
    const lb=LB.test(ln); let v=null;
    let m=ln.match(/(20\d{2})\s*[.\-\/년]\s*(\d{1,2})\s*[.\-\/월]\s*(\d{1,2})/);
    if(m) v=mk(m[1],m[2],m[3]);
    if(!v&&(lb||/\d{1,2}:\d{2}/.test(ln))){ m=ln.match(/\b(\d{2})[.\-\/](\d{1,2})[.\-\/](\d{1,2})\b/); if(m) v=mk('20'+m[1],m[2],m[3]); }
    if(!v) return false;
    if(lb){ found=v; return true; }
    if(!found) found=v;
    return false;
  });
  return found;
}
/* 비카드 전표 식별 — 간이영수증·계좌이체는 항상 불인정(P3), 현금영수증은 숙박만 인정(P2) */
function gOcrNonCard(raw){
  const t=String(raw||'');
  const credit=/신용\s*카드|신용\s*거래|신용\s*승인|신용\s*재승인|카드\s*결제|매\s*입\s*사/.test(t);
  if(/간\s*이\s*영\s*수\s*증|간이\s*과세\s*영수증/.test(t)) return '간이영수증';
  if(/이\s*체\s*확\s*인\s*증|무통장\s*입금|입금\s*확인증|계\s*좌\s*이\s*체/.test(t)) return '계좌이체 확인증';
  if(!credit&&/멤버\s*[십쉽][^\n]{0,12}매\s*출\s*전\s*표/.test(t)) return '멤버십 전표';
  if(credit) return null;
  if(/현금\s*영수증|현금\s*[（(]\s*소득공제|자진\s*발급/.test(t)) return '현금영수증';
  if(/멤버\s*[십쉽]|포인트\s*전표/.test(t)) return '멤버십·포인트 전표';
  return null;
}
/* 상호 추출 — '상호' '상 호 명' '가맹점명' 등 */
function gOcrShop(raw){
  const LB=/(상\s*호\s*명?|가\s*맹\s*점\s*명?|매\s*장\s*명|store)\s*[:：]/i;
  let found=null;
  String(raw||'').split(/\n+/).some(ln=>{
    const m=ln.match(LB); if(!m) return false;
    let v=ln.slice(m.index+m[0].length).trim();
    v=v.split(/\s{2,}/)[0].trim().replace(/\s*(대\s*표\s*자|TEL|전\s*화|사업자).*$/i,'').trim();
    if(v.length>=2){ found=v; return true; }
    return false;
  });
  return found;
}
/* ── 결제지역 추출 (시도 축약 혼재·구는 시와 함께·괄호 병기 동 등 실측 편차 반영) ── */
const G_OCR_SIDO=[
  ['서울특별시','서울시'],['부산광역시','부산시'],['대구광역시','대구시'],['인천광역시','인천시'],['광주광역시','광주시'],
  ['대전광역시','대전시'],['울산광역시','울산시'],['세종특별자치시','세종시'],['강원특별자치도','강원도'],['전북특별자치도','전북'],
  ['제주특별자치도','제주도'],['경기도','경기도'],['강원도','강원도'],['충청북도','충북'],['충청남도','충남'],['전라북도','전북'],
  ['전라남도','전남'],['경상북도','경북'],['경상남도','경남'],['제주도','제주도'],
  ['서울','서울시'],['부산','부산시'],['대구','대구시'],['인천','인천시'],['광주','광주시'],['대전','대전시'],['울산','울산시'],
  ['세종','세종시'],['경기','경기도'],['강원','강원도'],['충북','충북'],['충남','충남'],['전북','전북'],['전남','전남'],
  ['경북','경북'],['경남','경남'],['제주','제주도']];
const G_OCR_SIDO_SI=['서울특별시','부산광역시','대구광역시','인천광역시','광주광역시','대전광역시','울산광역시','세종특별자치시'];
function gOcrSido(s){ for(let i=0;i<G_OCR_SIDO.length;i++){ if(s.indexOf(G_OCR_SIDO[i][0])>=0) return G_OCR_SIDO[i][1]; } return null; }
function gOcrParseAddr(s){
  if(!s) return null;
  const sd=gOcrSido(s); let sgg=null,m;
  m=s.match(/([가-힣]{1,8}구)(?![가-힣])/);
  if(m){
    const gu=m[1], pre=s.slice(0,m.index).match(/([가-힣]{2,10}시)\s*$/);
    if(pre&&G_OCR_SIDO_SI.indexOf(pre[1])<0) sgg=pre[1]+' '+gu;
    else if(sd&&/시$/.test(sd)) sgg=sd+' '+gu;
    else sgg=gu;
  }
  if(!sgg){ m=s.match(/([가-힣]{2,10}(?:시|군))(?![가-힣])/); if(m&&G_OCR_SIDO_SI.indexOf(m[1])<0) sgg=m[1]; }
  let emd=null;
  m=s.match(/[（(]\s*([가-힣]{1,8}\d?(?:읍|면|동|가))\s*[）)]/); if(m) emd=m[1];
  if(!emd){ m=s.match(/([가-힣]{1,8}(?:읍|면))(?![가-힣])/); if(m) emd=m[1]; }
  if(!emd){ m=s.match(/([가-힣]{1,6}\d?(?:동|가))(?![가-힣])/); if(m) emd=m[1]; }
  if(!emd){ m=s.match(/([가-힣]{1,10}\d*(?:번길|가길|로|길))(?![가-힣])/); if(m) emd=m[1]; }
  if(!sgg&&!emd) return null;
  return {sgg,emd};
}
function gOcrRegion(raw){
  const LB=/(주\s*소|사\s*업\s*장|가맹점\s*주소)\s*[:：]?/;
  let labeled=null,plain=null;
  String(raw||'').split(/\n+/).forEach(ln=>{
    const m=ln.match(LB);
    const body=(m?ln.slice(m.index+m[0].length):ln).trim();
    if(!gOcrSido(body)&&!/[가-힣]{1,10}(시|군|구)(?![가-힣])/.test(body)) return;
    const r=gOcrParseAddr(body); if(!r) return;
    if(m){ if(!labeled) labeled=r; } else if(!plain) plain=r;
  });
  return labeled||plain;
}
function gOcrRegionText(r){ if(!r) return null; return [r.sgg,r.emd].filter(Boolean).join(' ')||null; }
/* 결제지역 대조: 'match' | 'mismatch' | null(판정 불가 → 담당자 확인). 시군구를 읽었을 때만 판정 */
function gOcrRegionMatch(region,regionName){
  if(!region||!region.sgg||!regionName) return null;
  const base=v=>String(v||'').replace(/\s+/g,'').replace(/(시|군|구)$/,'');
  const want=base(regionName); if(!want) return null;
  return String(region.sgg).split(/\s+/).some(tk=>base(tk)===want)?'match':'mismatch';
}
/* 원문에서 카드번호·승인번호·금액·결제일·상호·지역 추출 (마스킹 *·X·● 는 와일드카드) */
function gOcrExtract(raw){
  raw=String(raw||'');
  const res={card:null,appr:null,amts:[],date:gOcrDate(raw)};
  const CARD_LB=/(card|카드)/i, APPR_LB=/(approv|appr|승인)/i, AMT_LB=/(amount|amt|금액|합계|total)/i;
  raw.split(/\n+/).forEach(ln=>{
    const ns=gOcrNorm(ln), lts=ln.trim().split(/\s+/);
    if(!res.card&&CARD_LB.test(ln)){
      for(let ti=0;ti<lts.length;ti++){
        const t=lts[ti].replace(/[-—._/]/g,'');
        if(!/^[0-9]/.test(t)) continue;
        const w=t.replace(/[^0-9]/g,'*').slice(0,19), vis=w.replace(/\*/g,'').length;
        if((w.indexOf('*')>=0||w.length>=15)&&vis>=4&&w.length>=8){ res.card=w; break; }
      }
    }
    if(APPR_LB.test(ln)){
      lts.forEach(tk=>{
        const digits=tk.replace(/[^0-9]/g,''), deco=tk.replace(/[\[\]〔〕［］():：]/g,'');
        if(digits===deco&&digits.length>=6&&digits.length<=9){
          if(!res.appr||Math.abs(digits.length-8)<Math.abs(res.appr.length-8)) res.appr=digits;
        }
      });
    }
    if(AMT_LB.test(ln)){ const m=ns.match(/\d{3,9}/g); if(m) m.forEach(v=>res.amts.push(v)); }
  });
  if(!res.appr){ const b=raw.match(/[\[〔［]\s*(\d{7,9})\s*[\]〕］]/); if(b) res.appr=b[1]; }
  const toks=raw.split(/\s+/);
  if(!res.card) toks.some(tk=>{ const t=tk.replace(/[^0-9*xX●•#\-]/g,'').replace(/-/g,'').replace(/[xX●•#]/g,'*'); if(/\*/.test(t)&&t.length>=15&&t.length<=19){ res.card=t; return true; } return false; });
  if(!res.appr) toks.some(tk=>{ const t=tk.replace(/[^0-9]/g,''); if(t.length===8&&tk.length<=12){ res.appr=t; return true; } return false; });
  res.shop=gOcrShop(raw); res.region=gOcrRegion(raw); res.nonCard=gOcrNonCard(raw);
  return res;
}
/* 마스킹 카드번호와 입력 카드번호 대조 — 보이는 숫자는 같은 자리에서 일치해야 한다 */
function gOcrCardMatch(entered,ocrCard){
  entered=String(entered||'').replace(/[^0-9]/g,'');
  const tok=String(ocrCard||'').replace(/[^0-9*]/g,''), vis=tok.replace(/\*/g,'');
  if(vis.length<4) return false;
  if(tok.length===entered.length){ for(let j=0;j<tok.length;j++){ if(tok.charAt(j)!=='*'&&tok.charAt(j)!==entered.charAt(j)) return false; } return true; }
  const fr=tok.match(/^[0-9]+/), bk=tok.match(/[0-9]+$/); let ok=false;
  if(fr){ if(entered.indexOf(fr[0])!==0) return false; ok=true; }
  if(bk){ if(entered.slice(-bk[0].length)!==bk[0]) return false; ok=true; }
  return ok;
}

module.exports={gOcrExtract,gOcrNorm,gOcrDate,gOcrNonCard,gOcrShop,gOcrRegion,gOcrRegionText,gOcrRegionMatch,gOcrParseAddr,gOcrCardMatch,gBizCheck};
