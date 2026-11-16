/* 영수증 판독(analyze)과 입력값 대조·제출 판정(verify).
   국세청 인증키는 환경변수 NTS_SERVICE_KEY 로만 받는다(파일·로그에 남기지 않는다). */
const OCR = require('./ocr');
const F = require('./receipt-fields');
const B = require('./bizno');

if (process.env.NTS_SERVICE_KEY) B.config({ key: process.env.NTS_SERVICE_KEY });

/* 이미지 → 판독 결과. 이미지는 메모리에서만 쓰고 저장하지 않는다. */
const TIMEOUT = Number(process.env.OCR_TIMEOUT_MS || 120000);
async function analyze(buf, opt = {}) {
  /* 판독 시간 제한 — 크고 흐린 사진은 수 분 걸리기도 한다(실측 최대 약 6분). 넘으면 '판독 불가'로 돌려
     재촬영 안내를 받게 한다. 진행 중인 판독 작업은 끝날 때까지 작업자 하나를 쓴다. */
  let timer;
  const r = await Promise.race([OCR.recognize(buf), new Promise(res => { timer = setTimeout(() => res(null), TIMEOUT); })]);
  clearTimeout(timer);
  if (!r) {
    return { fields: { shop: null, region: null, regionParsed: null, card: null, approval: null, amounts: [], date: null, nonCard: null },
             bizno: { state: 'none' }, biznoView: '판독 시간 초과 — 사진이 선명하지 않습니다', spend: F.gBizCheck(null),
             confidence: 0, passes: 0, imageSize: null, ms: TIMEOUT, timeout: true };
  }
  const o = { mode: 'real', rawText: r.rawText, ex: r.ex };
  await B.attach(o);                                   // 사업자번호 추출 → 보정 후보 → 국세청 조회
  const ex = r.ex;
  return {
    fields: {
      shop: ex.shop || null,
      region: F.gOcrRegionText(ex.region),
      regionParsed: ex.region || null,
      card: ex.card || null,
      approval: ex.appr || null,
      amounts: ex.amts || [],
      date: ex.date || null,
      nonCard: ex.nonCard || null
    },
    bizno: o.biz,
    biznoView: B.view(o.biz, opt.payDate || ex.date).text,
    spend: F.gBizCheck(ex.shop),
    confidence: r.confidence,
    passes: r.passes,
    imageSize: r.size,
    ms: r.ms,
    rawText: opt.includeRaw ? r.rawText : undefined
  };
}

/* 판독 결과 + 신청자 입력값 → 제출 판정
   input: { card, approval, amount, date, region? }, attempt: 같은 증빙의 몇 번째 업로드인지(1부터) */
function verify(analysis, input = {}, attempt = 1) {
  const f = analysis.fields || {}, errors = [], notes = [];
  const cash = f.nonCard === '현금영수증';
  if (f.nonCard && !cash) {
    return { ok: false, code: 'NON_CARD', errors: [f.nonCard + '은(는) 증빙으로 인정되지 않습니다(간이영수증·계좌이체·멤버십 전표 불인정)'], notes };
  }
  const card = String(input.card || '').replace(/\D/g, ''), appr = String(input.approval || '').trim();
  const amt = String(Math.floor(Number(input.amount) || 0)), date = input.date || '';
  if (f.approval && appr && f.approval !== appr) errors.push('승인번호(영수증: ' + f.approval + ')');
  if (f.amounts && f.amounts.length && amt !== '0' && f.amounts.indexOf(amt) < 0) errors.push('결제금액(영수증: ' + f.amounts.join('/') + ')');
  if (!cash && f.card && card && !F.gOcrCardMatch(card, f.card)) errors.push('카드번호(영수증: ' + f.card + ')');
  if (f.date && date && f.date !== date) errors.push('결제일(영수증: ' + f.date + ')');
  if (errors.length) return { ok: false, code: 'MISMATCH', errors, notes };
  if (input.region && F.gOcrRegionMatch(f.regionParsed, input.region) === 'mismatch') {
    return { ok: false, code: 'REGION', errors: ['결제지역 불일치(영수증: ' + f.region + ')'], notes };
  }
  const g = B.gate(analysis.bizno, f.date || date, Math.max(1, Number(attempt) || 1));
  if (g.block) {
    return { ok: false, code: 'RETAKE', retake: true,
             message: g.block.replace(/<[^>]+>/g, ''), errors: [], notes, bizno: g.no };
  }
  if (g.note) notes.push(g.note);
  if (analysis.spend && analysis.spend.result === 'excluded') return { ok: false, code: 'EXCLUDED_BIZ', errors: [analysis.spend.label], notes };
  return { ok: true, code: 'OK', errors: [], notes, bizno: g.no, needsReview: notes.some(n => !/^국세청 미조회/.test(n)) };
}

/* 국세청 상태조회 프록시용 — 웹 화면이 인증키 없이 서버에 물어보게 한다 */
async function biznoStatus(list) {
  const nums = (list || []).map(n => String(n).replace(/\D/g, '')).filter(n => n.length === 10).slice(0, 100);
  if (!nums.length) return {};
  if (!B.getKey()) throw Object.assign(new Error('NTS_SERVICE_KEY 미설정'), { status: 503 });
  return B.ntsStatus(nums);
}

module.exports = { analyze, verify, biznoStatus, init: OCR.init, close: OCR.close, B, F };
