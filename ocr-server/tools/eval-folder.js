/* 정확도 측정: 영수증 이미지 폴더 + 정답 CSV(파일명,사업자번호) → 맞힘·못 찾음·틀림 집계
     node tools/eval-folder.js <이미지 폴더> <정답.csv> [결과.csv]
   정답 CSV 예)  file,bizno
                receipt01.jpg,123-45-67891
   개인정보(카드번호·승인번호)는 결과 파일에 쓰지 않는다. */
const fs = require('fs'), path = require('path');
const S = require('../lib/service');
const [dir, ans, outCsv] = process.argv.slice(2);
if (!dir || !ans) { console.log('사용법: node tools/eval-folder.js <이미지 폴더> <정답.csv> [결과.csv]'); process.exit(1); }
const gt = {};
fs.readFileSync(ans, 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1).forEach(l => { const [f, b] = l.split(','); if (f) gt[f.trim()] = (b || '').trim(); });
(async () => {
  const rows = [['file', 'expected', 'ocr', 'result', 'view', 'sec']], c = { OK: 0, MISS: 0, WRONG: 0 };
  for (const f of Object.keys(gt)) {
    const p = path.join(dir, f); if (!fs.existsSync(p)) continue;
    const r = await S.analyze(fs.readFileSync(p));
    const no = r.bizno && r.bizno.no || '';
    const st = !no || r.bizno.state !== 'found' ? 'MISS' : no === gt[f] ? 'OK' : 'WRONG';
    c[st]++; rows.push([f, gt[f], no, st, r.biznoView.replace(/,/g, ' '), (r.ms / 1000).toFixed(1)]);
    console.log(f, st, no);
  }
  console.log(c);
  if (outCsv) fs.writeFileSync(outCsv, '﻿' + rows.map(r => r.join(',')).join('\n'));
  await S.close();
})();
