/* Tesseract.js(kor+eng) 판독 — 브라우저 시안(g-ocr.js gOcrRun)과 같은 2단계 흐름.
   1차: 원본(EXIF 회전 반영, 긴 변 3000px 이하로 축소, PNG). 2400px·JPEG 로 줄여 보았으나 판독 시간은 그대로이고
        맞힌 수가 71→69장으로 줄어 되돌렸다(작은 캡처 이미지는 JPEG 압축에 약하다).
   2차: 폭 1800px·흑백·대비 강화 — 1차에서 날짜·승인번호·카드번호·금액·사업자번호 중 빠진 게 있을 때만.
   실측(카드영수증 111장): 사업자번호는 1차만 49장 → 1+2차 72장이라 2차가 중요하다. */
const { createWorker, createScheduler } = require('tesseract.js');
const Jimp = require('jimp');
const F = require('./receipt-fields');
const B = require('./bizno');

let scheduler = null;
let initP = null;

function init(opt = {}) {
  if (initP) return initP;
  const n = Math.max(1, Number(opt.workers || process.env.OCR_WORKERS || 2));
  const lang = opt.lang || process.env.OCR_LANG || 'kor+eng';
  const wopt = {};
  if (opt.langPath || process.env.OCR_LANG_PATH) wopt.langPath = opt.langPath || process.env.OCR_LANG_PATH;
  if (opt.cachePath || process.env.OCR_CACHE_PATH) wopt.cachePath = opt.cachePath || process.env.OCR_CACHE_PATH;
  initP = (async () => {
    const s = createScheduler();
    for (let i = 0; i < n; i++) s.addWorker(await createWorker(lang, 1, wopt));
    scheduler = s;
    return s;
  })();
  return initP;
}

async function images(buf) {
  const im = await Jimp.read(buf);               // EXIF 방향 자동 반영
  const w = im.bitmap.width, h = im.bitmap.height;
  if (Math.max(w, h) > 3000) im.scaleToFit(3000, 3000);
  const p1 = await im.getBufferAsync(Jimp.MIME_PNG);
  const im2 = im.clone().resize(1800, Jimp.AUTO).greyscale().contrast(0.23);   // canvas contrast(1.6) 상당
  const p2 = await im2.getBufferAsync(Jimp.MIME_JPEG);
  return { p1, p2, size: [w, h] };
}

/* buf: 이미지 바이트 → { rawText, ex(필드), confidence, passes, size, ms } */
async function recognize(buf) {
  const t0 = Date.now();
  await init();
  const { p1, p2, size } = await images(buf);
  const r1 = await scheduler.addJob('recognize', p1);
  let raw = r1.data.text || '', conf = r1.data.confidence || 0, passes = 1;
  const ex = F.gOcrExtract(raw);
  if (!(ex.date && ex.appr && ex.card && ex.amts.length && B.extract(raw).no)) {
    const r2 = await scheduler.addJob('recognize', p2);
    const raw2 = r2.data.text || '', ex2 = F.gOcrExtract(raw2);
    ['date', 'appr', 'card', 'shop', 'region', 'nonCard'].forEach(k => { if (!ex[k] && ex2[k]) ex[k] = ex2[k]; });
    ex2.amts.forEach(v => { if (ex.amts.indexOf(v) < 0) ex.amts.push(v); });
    raw = raw + '\n' + raw2; conf = Math.max(conf, r2.data.confidence || 0); passes = 2;
  }
  return { rawText: raw, ex, confidence: Math.round(conf), passes, size, ms: Date.now() - t0 };
}

async function close() { if (scheduler) await scheduler.terminate(); scheduler = null; initP = null; }

module.exports = { init, recognize, close };
