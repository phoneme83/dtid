/* 규칙 단위 시험 — 실제 영수증 번호는 쓰지 않고 체크섬을 계산한 가상 번호만 쓴다.  npm test */
const assert = require('assert');
const B = require('../lib/bizno');
const S = require('../lib/service');

function mk(p9) {   // 앞 9자리 → 체크섬 맞는 10자리
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5]; let s = 0;
  for (let i = 0; i < 9; i++) s += Number(p9[i]) * w[i];
  s += Math.floor(Number(p9[8]) * 5 / 10);
  return p9 + ((10 - s % 10) % 10);
}
const N1 = mk('123456789'), N2 = mk('214810537'), N3 = mk('305220146');
const f = d => d.slice(0, 3) + '-' + d.slice(3, 5) + '-' + d.slice(5);
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('체크섬', () => { assert(B.valid(N1)); assert(!B.valid(N1.slice(0, 9) + ((+N1[9] + 1) % 10))); assert(!B.valid('0' + N1.slice(1))); });
t('사업자 라벨 줄', () => assert.strictEqual(B.extract('[사업자] ' + f(N1) + '\nTEL 033-000-0000').no, f(N1)));
t('하이픈 없는 10자리 + 라벨', () => assert.strictEqual(B.extract('사업자번호 : ' + N2).no, f(N2)));
t('가맹점번호·TID 는 버림', () => assert.strictEqual(B.extract('가맹점번호 : ' + N1 + '\nTID: ' + N2).no, null));
t('TID 앞에 있는 번호는 채택', () => assert.strictEqual(B.extract(f(N3) + ' / TID: 1234567 / Tel: 033-000-0000').no, f(N3)));
t('일시 뒤 전표번호는 버림', () => assert.strictEqual(B.extract('거래일시 26-10-01 12:00:00 1 HNe:' + N2).no, null));
t('라벨 줄 + 다른 줄 하이픈 → 라벨 우선', () => assert.strictEqual(B.extract(f(N2) + '\n사업자번호: ' + f(N1)).no, f(N1)));
t('구분자 • 보정', () => assert.strictEqual(B.extract('사업자번호 ' + N1.slice(0, 3) + '•' + N1.slice(3, 5) + '-' + N1.slice(5)).no, f(N1)));
t('숫자 사이 공백', () => assert.strictEqual(B.extract('사업자번호 : ' + N1[0] + ' ' + N1.slice(1, 3) + '-' + N1.slice(3, 5) + '-' + N1.slice(5, 7) + ' ' + N1.slice(7)).no, f(N1)));
t('두 줄로 나뉜 번호(라벨 줄)', () => assert.strictEqual(B.extract('사업자번호 : ' + f(N3).slice(0, 10) + '\n' + N3.slice(8) + ' 대표').no, f(N3)));
t('라벨 없는 줄은 잇지 않음', () => assert.strictEqual(B.extract('상호 / ' + f(N3).slice(0, 10) + '\n' + N3.slice(8) + ' 대표').no, null));
t('판정: 첫 실패는 재촬영', () => { const g = B.gate({ state: 'none' }, '2026-01-01', 1); assert(g.block && g.retake); });
t('판정: 두 번째 실패는 담당자 확인으로 제출', () => { const g = B.gate({ state: 'none' }, '2026-01-01', 2); assert(!g.block && /담당자/.test(g.note)); });
t('판정: 결제일 이전 폐업은 1회차 재촬영(오독 가능성)', () => { const b = { state: 'found', no: f(N1), nts: { reg: true, cd: '03', end: '20240101' } }; const g = B.gate(b, '2024-06-01', 1); assert(g.block && g.retake && /폐업/.test(g.block)); });
t('판정: 결제일 이전 폐업 2회차는 담당자 확인', () => { const g = B.gate({ state: 'found', no: f(N1), nts: { reg: true, cd: '03', end: '20240101' } }, '2024-06-01', 2); assert(!g.block && /결제일 이전 폐업/.test(g.note)); });
t('표시: 결제일 모르면 폐업 판단 보류', () => assert(/결제일과 비교 필요/.test(B.view({ state: 'found', no: f(N1), nts: { reg: true, cd: '03', end: '20240101' } }).text)));
t('판정: 결제 후 폐업은 통과', () => assert(!B.gate({ state: 'found', no: f(N1), nts: { reg: true, cd: '03', end: '20250101' } }, '2024-06-01', 1).block));
t('대조: 승인번호 불일치', () => {
  const a = { fields: { approval: '12345678', amounts: ['10000'], card: '1234********3456', date: '2026-10-01' }, bizno: { state: 'found', no: f(N1), nokey: true } };
  assert.strictEqual(S.verify(a, { approval: '12345679', amount: 10000, card: '1234567812343456', date: '2026-10-01' }).code, 'MISMATCH');
  assert.strictEqual(S.verify(a, { approval: '12345678', amount: 10000, card: '1234567812343456', date: '2026-10-01' }).code, 'OK');
});
console.log(`\n${n}개 통과`);
