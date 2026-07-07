/**
 * 회귀 테스트 (PRD §9.4, AC1·AC4·AC6) + 카피 린트 (§8.5, AC3·AC5)
 * 실행: node saju/tests/run-tests.mjs
 */
import { calculateSaju, ipchunUtc } from '../js/engine.js';
import { runCopyLint } from './copy-lint.mjs';

let pass = 0;
let fail = 0;
function eq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; console.error(`  ✗ ${label}: expected ${e}, got ${a}`); }
}

function pillarStr(p) {
  return p.stem.hanja + p.branch.hanja;
}

// ---------------------------------------------------------------------------
// 케이스 A: 양력 1992-12-16, 申시(16:30 입력, 서울), 여
// ---------------------------------------------------------------------------
{
  console.log('케이스 A (1992-12-16 16:30 서울, 여)');
  const c = calculateSaju({ year: 1992, month: 12, day: 16, hour: 16, minute: 30, gender: 'F', longitude: 126.98 });
  eq('년주', pillarStr(c.pillars.year), '壬申');
  eq('월주', pillarStr(c.pillars.month), '壬子');
  eq('일주', pillarStr(c.pillars.day), '丙寅');
  eq('시주', pillarStr(c.pillars.hour), '丙申');
  eq('일간', c.dayMaster.hanja, '丙');
  // 십성
  eq('십성 시간', c.pillars.hour.tenGodStem, '비견');
  eq('십성 월간', c.pillars.month.tenGodStem, '편관');
  eq('십성 년간', c.pillars.year.tenGodStem, '편관');
  eq('십성 일지', c.pillars.day.tenGodBranch, '편인');
  eq('십성 월지', c.pillars.month.tenGodBranch, '정관');
  eq('십성 시지', c.pillars.hour.tenGodBranch, '편재');
  eq('십성 년지', c.pillars.year.tenGodBranch, '편재');
  // 십이운성
  eq('운성 일지', c.pillars.day.lifeStage, '장생');
  eq('운성 월지', c.pillars.month.lifeStage, '태');
  eq('운성 년지', c.pillars.year.lifeStage, '병');
  eq('운성 시지', c.pillars.hour.lifeStage, '병');
  // 신살 (일지 삼합 기준)
  eq('신살 년지 역마', c.pillars.year.sinsal, ['역마']);
  eq('신살 시지 역마', c.pillars.hour.sinsal, ['역마']);
  eq('신살 일지 지살', c.pillars.day.sinsal, ['지살']);
  eq('신살 월지 재살', c.pillars.month.sinsal, ['재살']);
  // 신강/신약·용신
  eq('신강신약', c.strength.verdict, '신약');
  eq('용신', [...c.yongsin.use].sort(), ['목', '화']);
}

// ---------------------------------------------------------------------------
// 케이스 B: 양력 1995-12-18, 辰시(08:30 입력, 서울), 남
// ---------------------------------------------------------------------------
{
  console.log('케이스 B (1995-12-18 08:30 서울, 남)');
  const c = calculateSaju({ year: 1995, month: 12, day: 18, hour: 8, minute: 30, gender: 'M', longitude: 126.98 });
  eq('년주', pillarStr(c.pillars.year), '乙亥');
  eq('월주', pillarStr(c.pillars.month), '戊子');
  eq('일주', pillarStr(c.pillars.day), '癸未');
  eq('시주', pillarStr(c.pillars.hour), '丙辰');
  eq('일간', c.dayMaster.hanja, '癸');
  // 십성
  eq('십성 시간', c.pillars.hour.tenGodStem, '정재');
  eq('십성 월간', c.pillars.month.tenGodStem, '정관');
  eq('십성 년간', c.pillars.year.tenGodStem, '식신');
  eq('십성 시지', c.pillars.hour.tenGodBranch, '정관');
  eq('십성 일지', c.pillars.day.tenGodBranch, '편관');
  eq('십성 월지', c.pillars.month.tenGodBranch, '비견');
  eq('십성 년지', c.pillars.year.tenGodBranch, '겁재');
  // 십이운성
  eq('운성 시지', c.pillars.hour.lifeStage, '양');
  eq('운성 일지', c.pillars.day.lifeStage, '묘');
  eq('운성 월지', c.pillars.month.lifeStage, '건록');
  eq('운성 년지', c.pillars.year.lifeStage, '제왕');
  // 신살
  eq('신살 시지 반안', c.pillars.hour.sinsal, ['반안']);
  eq('신살 일지 화개', c.pillars.day.sinsal, ['화개']);
  eq('신살 월지 도화', c.pillars.month.sinsal, ['도화']);
  eq('신살 년지 지살', c.pillars.year.sinsal, ['지살']);
  // 신강/신약·용신 (조후: 겨울생 → 화 우선)
  eq('신강신약', c.strength.verdict, '신강');
  eq('용신', [...c.yongsin.use].sort(), ['목', '화']);
  eq('용신 1순위(조후 화)', c.yongsin.use[0], '화');
}

// ---------------------------------------------------------------------------
// AC6: 절입/자시 경계
// ---------------------------------------------------------------------------
{
  console.log('경계 케이스 (AC6)');
  // 입춘 경계: 2000년 입춘은 2/4 (KST 20:40 무렵). 2/3은 전년, 2/5는 당년.
  const before = calculateSaju({ year: 2000, month: 2, day: 3, hour: 12, minute: 0, gender: 'M', longitude: 135 });
  const after = calculateSaju({ year: 2000, month: 2, day: 5, hour: 12, minute: 0, gender: 'M', longitude: 135 });
  eq('입춘 전 연주(己卯)', pillarStr(before.pillars.year), '己卯');
  eq('입춘 후 연주(庚辰)', pillarStr(after.pillars.year), '庚辰');
  eq('입춘 전 월주 丑월', before.pillars.month.branch.hanja, '丑');
  eq('입춘 후 월주 寅월', after.pillars.month.branch.hanja, '寅');

  // 입춘 시각이 실제 범위(2/3~2/5)인지
  const ip = new Date(ipchunUtc(2000) + 9 * 3600000);
  eq('2000년 입춘 월', ip.getUTCMonth() + 1, 2);
  const okDay = ip.getUTCDate() >= 3 && ip.getUTCDate() <= 5;
  eq('2000년 입춘 일자 3~5일', okDay, true);

  // 야자시(R3): 23:30 출생 → 자시, 날짜는 그대로 (경도 135로 보정 0)
  const yaja = calculateSaju({ year: 1992, month: 12, day: 16, hour: 23, minute: 30, gender: 'F', longitude: 135 });
  eq('야자시 시지=子', yaja.pillars.hour.branch.hanja, '子');
  eq('야자시 일주 유지(丙寅)', pillarStr(yaja.pillars.day), '丙寅');
  // 조자시: 00:30 → 자시, 그날 일주
  const joja = calculateSaju({ year: 1992, month: 12, day: 17, hour: 0, minute: 30, gender: 'F', longitude: 135 });
  eq('조자시 시지=子', joja.pillars.hour.branch.hanja, '子');
  eq('조자시 일주(丁卯)', pillarStr(joja.pillars.day), '丁卯');
}

// ---------------------------------------------------------------------------
// AC4: 시간 모름
// ---------------------------------------------------------------------------
{
  console.log('시간 모름 (AC4)');
  const c = calculateSaju({ year: 1992, month: 12, day: 16, gender: 'F', timeUnknown: true });
  eq('시주 없음', c.pillars.hour === undefined, true);
  eq('일주 정상', pillarStr(c.pillars.day), '丙寅');
  eq('오행 합=6', Object.values(c.elementCount).reduce((a, b) => a + b, 0), 6);
}

// ---------------------------------------------------------------------------
// 카피 린트 (AC3·AC5)
// ---------------------------------------------------------------------------
const lintResult = await runCopyLint();
pass += lintResult.pass;
fail += lintResult.fail;

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
if (fail > 0) process.exit(1);
