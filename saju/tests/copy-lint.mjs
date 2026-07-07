/**
 * 카피 자동 검수 (PRD §8.5) — 사용자 노출 문장 게이트
 *  (a) 한 문장 60자 초과 → 실패 (AC3)
 *  (b) 한자·전문용어 금지어 → 실패
 *  (c) 모든 부정 해석(조심 블록)에 해결 팁 동봉 → 구조 검사 (AC5)
 *
 * 정적 템플릿뿐 아니라, 다양한 생년월일로 실제 리포트를 생성해
 * 조립된 문장까지 전부 검사한다.
 */
import { calculateSaju } from '../js/engine.js';
import { buildReport, buildCompat, collectStaticCopy } from '../js/report.js';

const BANNED = [
  '태과', '저조', '부재', '상생', '상극', '득령', '실령', '득지',
  '일간', '월지', '일지', '시주', '연주', '월주', '일주',
  '사주팔자', '명식', '십성', '십이운성', '지장간',
  '용신', '희신', '기신', '신강', '신약',
  '비겁', '식상', '관성', '인성', '재성',
  '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인',
  '역마살', '도화살', '화개살', '신살', '관살',
];
const CJK = /[⺀-⿟㐀-䶿一-鿿豈-﫿]/;

function lintString(str, where, problems) {
  if (CJK.test(str)) {
    problems.push(`[한자] ${where}: "${str}"`);
  }
  for (const w of BANNED) {
    if (str.includes(w)) problems.push(`[금지어:${w}] ${where}: "${str}"`);
  }
  // 문장 단위 길이 검사
  const sentences = str.split(/(?<=[.!?])\s*/).filter((s) => s.trim());
  for (const s of sentences) {
    if (s.trim().length > 60) problems.push(`[60자 초과:${s.trim().length}자] ${where}: "${s.trim()}"`);
  }
}

function walkStrings(obj, where, problems, skipKeys = new Set()) {
  if (typeof obj === 'string') { lintString(obj, where, problems); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => walkStrings(v, `${where}[${i}]`, problems, skipKeys)); return; }
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (skipKeys.has(k)) continue;
      walkStrings(v, `${where}.${k}`, problems, skipKeys);
    }
  }
}

export async function runCopyLint() {
  console.log('카피 린트 (§8.5)');
  const problems = [];
  let checkedStrings = 0;

  // (1) 정적 템플릿 전체
  const staticCopy = collectStaticCopy();
  staticCopy.forEach((s, i) => { lintString(s, `static#${i}`, problems); checkedStrings++; });

  // (2) 생성된 리포트: 일간 10종·계절·시간모름을 폭넓게 커버
  //     내부 데이터 키(오행 이름, 분류명 등)는 화면에 직접 노출되지 않으므로 제외
  const skipKeys = new Set(['useEls', 'avoidEls', 'domEl', 'counts', 'mainCat', 'catEasy', 'from']);
  const samples = [];
  for (let y = 1970; y <= 2005; y += 3) {
    samples.push({ year: y, month: ((y * 7) % 12) + 1, day: ((y * 3) % 27) + 1, hour: (y % 24), minute: 0, gender: y % 2 ? 'M' : 'F' });
  }
  samples.push({ year: 1992, month: 12, day: 16, hour: 16, minute: 30, gender: 'F' });
  samples.push({ year: 1995, month: 12, day: 18, hour: 8, minute: 30, gender: 'M' });
  samples.push({ year: 1988, month: 7, day: 15, gender: 'F', timeUnknown: true });
  samples.push({ year: 2001, month: 2, day: 4, hour: 23, minute: 40, gender: 'M' });

  const charts = [];
  for (const s of samples) {
    const chart = calculateSaju({ longitude: 126.98, ...s });
    charts.push(chart);
    const report = buildReport(chart);
    walkStrings(report, `report(${s.year}-${s.month}-${s.day})`, problems, skipKeys);
    checkedStrings++;

    // AC5: 모든 조심 블록에 팁 존재
    for (const c of report.cautions) {
      if (!c.tip || !c.tip.trim()) problems.push(`[팁 없음] report(${s.year}-${s.month}-${s.day}): "${c.text}"`);
    }
    if (report.cautions.length < 1) problems.push(`[조심 블록 없음] report(${s.year}-${s.month}-${s.day})`);
    if (report.strengths.length < 3) problems.push(`[장점 3개 미만] report(${s.year}-${s.month}-${s.day})`);
  }

  // (3) 궁합 문장
  for (let i = 0; i + 1 < charts.length; i += 2) {
    const compat = buildCompat(charts[i], charts[i + 1]);
    walkStrings(compat.lines, `compat#${i}`, problems, skipKeys);
  }

  if (problems.length) {
    problems.slice(0, 40).forEach((p) => console.error('  ✗ ' + p));
    if (problems.length > 40) console.error(`  … 외 ${problems.length - 40}건`);
    return { pass: 0, fail: problems.length };
  }
  console.log(`  ✓ 문장 검사 통과 (템플릿 ${staticCopy.length}건 + 생성 리포트 ${samples.length}건)`);
  return { pass: 1, fail: 0 };
}
