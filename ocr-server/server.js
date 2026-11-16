/* 영수증 OCR 서버 — Node 기본 http 모듈만 사용(프레임워크 없음)
   환경변수: PORT(8080) · NTS_SERVICE_KEY(국세청 인증키, Decoding) · ALLOWED_ORIGINS(CORS, 쉼표 구분, 기본 없음)
            MAX_BODY_MB(15) · OCR_WORKERS(2) · OCR_LANG(kor+eng) · OCR_LANG_PATH · OCR_CACHE_PATH
   경로: GET /health · GET / (시험 화면) · POST /api/receipt/analyze · POST /api/receipt/verify · POST /api/bizno/status */
const http = require('http');
const fs = require('fs');
const path = require('path');
const S = require('./lib/service');

const PORT = Number(process.env.PORT || 8080);
const MAX = Number(process.env.MAX_BODY_MB || 15) * 1024 * 1024;
const ORIGINS = String(process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

function cors(req, res) {
  const o = req.headers.origin;
  if (o && (ORIGINS.includes('*') || ORIGINS.includes(o))) {
    res.setHeader('Access-Control-Allow-Origin', ORIGINS.includes('*') ? '*' : o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function body(req) {
  return new Promise((ok, no) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > MAX) { no(Object.assign(new Error('이미지가 너무 큽니다(최대 ' + (MAX >> 20) + 'MB)'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', no);
  });
}
/* 이미지 받기: Content-Type image/* 원본 바이트 또는 JSON {image:"base64 또는 data:URL", payDate?} */
async function readImage(req) {
  const raw = await body(req), ct = String(req.headers['content-type'] || '');
  if (/^image\//.test(ct) || ct === 'application/octet-stream') return { buf: raw, opt: {} };
  if (/json/.test(ct)) {
    const j = JSON.parse(raw.toString('utf8') || '{}');
    const b64 = String(j.image || '').replace(/^data:[^,]+,/, '');
    if (!b64) throw Object.assign(new Error('image 필드가 비어 있습니다'), { status: 400 });
    return { buf: Buffer.from(b64, 'base64'), opt: { payDate: j.payDate, includeRaw: !!j.includeRaw } };
  }
  throw Object.assign(new Error('Content-Type 은 image/* 또는 application/json 이어야 합니다'), { status: 415 });
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true, nts: !!S.B.getKey() });
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(path.join(__dirname, 'public', 'index.html')).pipe(res);
    }
    if (req.method === 'POST' && url.pathname === '/api/receipt/analyze') {
      const { buf, opt } = await readImage(req);
      if (url.searchParams.get('payDate')) opt.payDate = url.searchParams.get('payDate');
      return send(res, 200, await S.analyze(buf, opt));
    }
    if (req.method === 'POST' && url.pathname === '/api/receipt/verify') {
      const j = JSON.parse((await body(req)).toString('utf8') || '{}');
      if (!j.analysis) return send(res, 400, { error: 'analysis(판독 결과)가 필요합니다' });
      return send(res, 200, S.verify(j.analysis, j.input || {}, j.attempt || 1));
    }
    if (req.method === 'POST' && url.pathname === '/api/bizno/status') {
      const j = JSON.parse((await body(req)).toString('utf8') || '{}');
      return send(res, 200, { data: await S.biznoStatus(j.b_no) });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    /* 카드번호·이미지 등 개인정보가 로그에 남지 않도록 메시지만 기록 */
    console.error(new Date().toISOString(), req.method, url.pathname, e.message);
    send(res, e.status || 500, { error: e.status ? e.message : '판독 중 오류가 발생했습니다' });
  }
});

S.init().then(() => {
  server.listen(PORT, () => console.log(`receipt-ocr listening on :${PORT} · 국세청 조회 ${S.B.getKey() ? '사용' : '미설정(체크섬만)'}`));
});
process.on('SIGTERM', () => server.close(() => S.close().then(() => process.exit(0))));
