/* 시안(dgtour)의 판독 규칙을 서버 모듈로 복사한다 — 규칙을 고치면 시안 쪽을 고친 뒤 이 스크립트로 맞춘다.
   레포 안(dtid/ocr-server)에서만 동작한다. 서버에 배포한 패키지에는 결과물(lib/*.js)만 있으면 된다.
     node tools/sync-from-site.js */
const fs=require('fs'), path=require('path');
const SITE=path.join(__dirname,'..','..','dgtour');
fs.copyFileSync(path.join(SITE,'assets','bizno.js'),path.join(__dirname,'..','lib','bizno.js'));
const g=fs.readFileSync(path.join(SITE,'site-g','g-ocr.js'),'utf8');
const a=g.indexOf('const G_SPEND_CATS'), b=g.indexOf('/* 2차 판독용 전처리');
if(a<0||b<0) throw new Error('g-ocr.js 구조가 바뀌었습니다 — 잘라낼 위치를 확인하세요');
const body=g.slice(a,b).trim();
const out='/* 자동 생성 — tools/sync-from-site.js 가 dgtour/site-g/g-ocr.js 의 순수 함수(브라우저 API 미사용)를 복사한 것. 직접 고치지 말 것. */\n'+
  body+'\n\nmodule.exports={gOcrExtract,gOcrNorm,gOcrDate,gOcrNonCard,gOcrShop,gOcrRegion,gOcrRegionText,gOcrRegionMatch,gOcrParseAddr,gOcrCardMatch,gBizCheck};\n';
fs.writeFileSync(path.join(__dirname,'..','lib','receipt-fields.js'),out);
console.log('synced lib/bizno.js, lib/receipt-fields.js');
