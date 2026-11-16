#!/usr/bin/env node
/* 명령줄 판독:  node cli.js <이미지> [<이미지> ...] [--date YYYY-MM-DD] [--raw]
   국세청 조회를 하려면 실행 전에 환경변수 NTS_SERVICE_KEY 를 설정한다. */
const fs = require('fs');
const S = require('./lib/service');

const args = process.argv.slice(2);
const files = [], opt = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--date') opt.payDate = args[++i];
  else if (args[i] === '--raw') opt.includeRaw = true;
  else files.push(args[i]);
}
if (!files.length) { console.log('사용법: node cli.js <영수증 이미지...> [--date YYYY-MM-DD] [--raw]'); process.exit(1); }
(async () => {
  for (const f of files) {
    try {
      const r = await S.analyze(fs.readFileSync(f), opt);
      console.log(JSON.stringify({ file: f, ...r }, null, 2));
    } catch (e) { console.log(JSON.stringify({ file: f, error: e.message })); }
  }
  await S.close();
})();
