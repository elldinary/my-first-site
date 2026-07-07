/**
 * 쉬운 사주 — 계산 엔진 (engine layer)
 *
 * PRD §4 요구사항 구현:
 *  - R1 절기 기준 월주: 태양 황경(astronomical solar longitude)으로 절입을 직접 판정
 *  - R2 태양시 보정: 출생지 경도 기준 (기준 자오선 대비 분 단위 보정)
 *  - R3 자시 처리: "야자시" 기준으로 고정 (23:00~24:00 = 당일의 자시, 날짜 유지)
 *  - R4 입춘 기준 연주
 *  - R5 양력 입력
 *
 * 정확도 근거: 태양 황경은 Meeus 저정밀 태양 위치 공식(오차 약 0.01° ≈ 시간상 약 15분)을
 * 사용하며, PRD §9.4 레퍼런스 명식 2건으로 회귀 테스트한다(tests/run-tests.mjs).
 *
 * 이 파일은 "계산"만 담당한다. 사용자에게 보이는 문장은 report.js가 만든다(P3).
 */

// ---------------------------------------------------------------------------
// 기초 데이터
// ---------------------------------------------------------------------------

export const STEMS = [
  { hanja: '甲', kor: '갑', element: '목', yin: false },
  { hanja: '乙', kor: '을', element: '목', yin: true },
  { hanja: '丙', kor: '병', element: '화', yin: false },
  { hanja: '丁', kor: '정', element: '화', yin: true },
  { hanja: '戊', kor: '무', element: '토', yin: false },
  { hanja: '己', kor: '기', element: '토', yin: true },
  { hanja: '庚', kor: '경', element: '금', yin: false },
  { hanja: '辛', kor: '신', element: '금', yin: true },
  { hanja: '壬', kor: '임', element: '수', yin: false },
  { hanja: '癸', kor: '계', element: '수', yin: true },
];

export const BRANCHES = [
  { hanja: '子', kor: '자', element: '수', animal: '쥐' },
  { hanja: '丑', kor: '축', element: '토', animal: '소' },
  { hanja: '寅', kor: '인', element: '목', animal: '호랑이' },
  { hanja: '卯', kor: '묘', element: '목', animal: '토끼' },
  { hanja: '辰', kor: '진', element: '토', animal: '용' },
  { hanja: '巳', kor: '사', element: '화', animal: '뱀' },
  { hanja: '午', kor: '오', element: '화', animal: '말' },
  { hanja: '未', kor: '미', element: '토', animal: '양' },
  { hanja: '申', kor: '신', element: '금', animal: '원숭이' },
  { hanja: '酉', kor: '유', element: '금', animal: '닭' },
  { hanja: '戌', kor: '술', element: '토', animal: '개' },
  { hanja: '亥', kor: '해', element: '수', animal: '돼지' },
];

// 지지의 본기(정기) 지장간 — 십성/오행 판정은 본기 기준 (PRD §4.4)
const BRANCH_MAIN_STEM = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];

const ELEMENTS = ['목', '화', '토', '금', '수'];
// 생(生) 순환: 목→화→토→금→수→목
const PRODUCES = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
// 극(剋): 목→토, 토→수, 수→화, 화→금, 금→목
const CONTROLS = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

const LIFE_STAGES = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
// 일간별 장생 지지 (양간 순행 / 음간 역행)
const LIFE_STAGE_START = { 0: 11, 1: 6, 2: 2, 3: 9, 4: 2, 5: 9, 6: 5, 7: 0, 8: 8, 9: 3 };

// 12신살: 일지 삼합 기준(레퍼런스 명식 §9.4와 일치하는 기준), 겁살부터 순서대로
const SINSAL_ORDER = ['겁살', '재살', '천살', '지살', '도화', '월살', '망신', '장성', '반안', '역마', '육해', '화개'];
// 삼합 그룹(일지가 속한 국)별 겁살 시작 지지
const SINSAL_START = { 수: 5, 목: 8, 화: 11, 금: 2 }; // 申子辰→巳, 亥卯未→申, 寅午戌→亥, 巳酉丑→寅
// 지지별 삼합국: 子수 丑금 寅화 卯목 辰수 巳금 午화 未목 申수 酉금 戌화 亥목
const TRINE_OF_BRANCH = ['수', '금', '화', '목', '수', '금', '화', '목', '수', '금', '화', '목'];

// 천을귀인 (일간 → 지지들)
const CHEONEUL = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 8: [5, 3], 9: [5, 3], 7: [6, 2] };
// 문창귀인 (일간 → 지지)
const MUNCHANG = { 0: 5, 1: 6, 2: 8, 3: 9, 4: 8, 5: 9, 6: 11, 7: 0, 8: 2, 9: 3 };
// 월덕귀인 (월지 삼합국 → 천간)
const WOLDEOK = { 화: 2, 수: 8, 목: 0, 금: 6 };

// ---------------------------------------------------------------------------
// 천문 계산: 태양 황경 (Meeus, low precision)
// ---------------------------------------------------------------------------

const RAD = Math.PI / 180;

function julianDay(utcMillis) {
  return utcMillis / 86400000 + 2440587.5;
}

function sunLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * RAD) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * RAD) +
    0.000289 * Math.sin(3 * M * RAD);
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  return ((lambda % 360) + 360) % 360;
}

/** 해당 연도의 입춘(황경 315°) 순간을 UTC millis로 반환 */
export function ipchunUtc(year) {
  // 입춘은 매년 2/3~2/5 부근: 1/28~2/12 구간에서 이분 탐색
  let lo = Date.UTC(year, 0, 28);
  let hi = Date.UTC(year, 1, 12);
  const target = 315;
  const dist = (ms) => {
    // 315° 기준 부호 있는 거리 (겨울~봄 구간이므로 270~360°/0° 범위)
    let l = sunLongitude(julianDay(ms));
    if (l < 90) l += 360; // 315° 근처 연속화
    return l - target;
  };
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (dist(mid) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ---------------------------------------------------------------------------
// 시간 처리
// ---------------------------------------------------------------------------

/** 한국 표준시의 기준 자오선(도). 1954-03-21 ~ 1961-08-09는 127.5°(UTC+8:30). */
function standardMeridian(y, m, d) {
  const v = y * 10000 + m * 100 + d;
  if (v >= 19540321 && v <= 19610809) return 127.5;
  return 135;
}

/** 표준시 → UTC millis */
function kstToUtc(y, m, d, hh, mm) {
  const meridian = standardMeridian(y, m, d);
  const offsetMin = meridian * 4; // 135° → 540분(+9h)
  return Date.UTC(y, m - 1, d, hh, mm) - offsetMin * 60000;
}

// ---------------------------------------------------------------------------
// 기둥 계산
// ---------------------------------------------------------------------------

function jdnFromDate(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function sexagenary(idx) {
  const i = ((idx % 60) + 60) % 60;
  return { stem: i % 10, branch: i % 12 };
}

function tenGod(dayStemIdx, targetStemIdx) {
  const me = STEMS[dayStemIdx];
  const it = STEMS[targetStemIdx];
  const samePolarity = me.yin === it.yin;
  if (me.element === it.element) return samePolarity ? '비견' : '겁재';
  if (PRODUCES[me.element] === it.element) return samePolarity ? '식신' : '상관';
  if (CONTROLS[me.element] === it.element) return samePolarity ? '편재' : '정재';
  if (CONTROLS[it.element] === me.element) return samePolarity ? '편관' : '정관';
  return samePolarity ? '편인' : '정인';
}

export function tenGodCategory(name) {
  if (name === '비견' || name === '겁재') return '비겁';
  if (name === '식신' || name === '상관') return '식상';
  if (name === '편재' || name === '정재') return '재성';
  if (name === '편관' || name === '정관') return '관성';
  return '인성';
}

function lifeStage(dayStemIdx, branchIdx) {
  const start = LIFE_STAGE_START[dayStemIdx];
  const dir = STEMS[dayStemIdx].yin ? -1 : 1;
  const steps = ((branchIdx - start) * dir + 144) % 12;
  return LIFE_STAGES[steps];
}

function sinsalOf(dayBranchIdx, targetBranchIdx) {
  const group = TRINE_OF_BRANCH[dayBranchIdx];
  const start = SINSAL_START[group];
  const pos = ((targetBranchIdx - start) + 24) % 12;
  return SINSAL_ORDER[pos];
}

// ---------------------------------------------------------------------------
// 메인: 사주 계산
// ---------------------------------------------------------------------------

/**
 * @param {object} input
 *  year, month, day: 양력
 *  hour, minute: 표준시 기준 (timeUnknown이면 무시)
 *  gender: 'M' | 'F'
 *  longitude: 출생지 경도 (기본 126.98 = 서울)
 *  timeUnknown: boolean
 * @returns SajuChart (PRD §5)
 */
export function calculateSaju(input) {
  const { year, month, day, gender } = input;
  const timeUnknown = !!input.timeUnknown;
  const hour = timeUnknown ? 12 : input.hour;
  const minute = timeUnknown ? 0 : (input.minute || 0);
  const longitude = input.longitude ?? 126.98;

  if (year < 1900 || year > 2050) {
    throw new Error('UNSUPPORTED_YEAR');
  }

  // --- 태양시 보정 (R2): 기준 자오선 대비 경도 차 × 4분/도 ---
  const meridian = standardMeridian(year, month, day);
  const solarCorrectionMin = timeUnknown ? 0 : Math.round((longitude - meridian) * 4);

  // 절입 판정용 실제 출생 순간(UTC) — 태양시 보정 없이 표준시 그대로
  const birthUtc = kstToUtc(year, month, day, hour, minute);

  // 시주/일주 판정용 진태양시
  const solarDate = new Date(Date.UTC(year, month - 1, day, hour, minute) + solarCorrectionMin * 60000);
  const sy = solarDate.getUTCFullYear();
  const sm = solarDate.getUTCMonth() + 1;
  const sd = solarDate.getUTCDate();
  const sh = solarDate.getUTCHours();
  const smin = solarDate.getUTCMinutes();

  // --- 연주 (R4: 입춘 기준) ---
  let sajuYear = year;
  if (birthUtc < ipchunUtc(year)) sajuYear = year - 1;
  const yearStem = ((sajuYear - 4) % 10 + 10) % 10;
  const yearBranch = ((sajuYear - 4) % 12 + 12) % 12;

  // --- 월주 (R1: 절기 기준, 태양 황경으로 직접 판정) ---
  const lambda = sunLongitude(julianDay(birthUtc));
  const monthIdx = Math.floor((((lambda - 315) % 360) + 360) % 360 / 30); // 0=寅월
  const monthBranch = (monthIdx + 2) % 12;
  const monthStem = ((yearStem % 5) * 2 + 2 + monthIdx) % 10;

  // --- 일주 (R3: 야자시 기준 — 23시 이후에도 진태양시 날짜 그대로) ---
  const jdn = jdnFromDate(sy, sm, sd);
  const daySex = sexagenary(jdn + 49);
  const dayStem = daySex.stem;
  const dayBranch = daySex.branch;

  // --- 시주 ---
  let hourStem = null;
  let hourBranch = null;
  if (!timeUnknown) {
    hourBranch = Math.floor(((sh * 60 + smin + 60) % 1440) / 120);
    hourStem = ((dayStem % 5) * 2 + hourBranch) % 10;
  }

  // --- 기둥 조립 ---
  const buildPillar = (stemIdx, branchIdx) => {
    const mainStem = BRANCH_MAIN_STEM[branchIdx];
    return {
      stemIdx, branchIdx,
      stem: { ...STEMS[stemIdx] },
      branch: { hanja: BRANCHES[branchIdx].hanja, kor: BRANCHES[branchIdx].kor, element: BRANCHES[branchIdx].element, animal: BRANCHES[branchIdx].animal },
      tenGodStem: tenGod(dayStem, stemIdx),
      tenGodBranch: tenGod(dayStem, mainStem),
      lifeStage: lifeStage(dayStem, branchIdx),
      sinsal: [sinsalOf(dayBranch, branchIdx)],
      nobleman: [],
    };
  };

  const pillars = {
    year: buildPillar(yearStem, yearBranch),
    month: buildPillar(monthStem, monthBranch),
    day: buildPillar(dayStem, dayBranch),
  };
  if (!timeUnknown) pillars.hour = buildPillar(hourStem, hourBranch);
  pillars.day.tenGodStem = '일간'; // 일간 자신은 십성 없음(내부 표기)

  // --- 귀인 ---
  const posList = timeUnknown ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'hour'];
  for (const pos of posList) {
    const p = pillars[pos];
    if (CHEONEUL[dayStem].includes(p.branchIdx)) p.nobleman.push('천을귀인');
    if (MUNCHANG[dayStem] === p.branchIdx) p.nobleman.push('문창귀인');
    if (WOLDEOK[TRINE_OF_BRANCH[monthBranch]] === p.stemIdx) p.nobleman.push('월덕귀인');
  }

  // --- 오행 분포 (본기 기준, 8자/6자) ---
  const elementCount = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const pos of posList) {
    elementCount[pillars[pos].stem.element]++;
    elementCount[pillars[pos].branch.element]++;
  }

  // --- 신강/신약 (억부 가중 점수) ---
  // 위치별 가중치(월지가 가장 큼). 시간 미상이면 남은 가중치로 정규화.
  const weights = [
    ['year', 'stem', 5], ['year', 'branch', 8],
    ['month', 'stem', 10], ['month', 'branch', 45],
    ['day', 'branch', 15],
    ['hour', 'stem', 7], ['hour', 'branch', 10],
  ];
  let total = 0;
  let support = 0;
  const reasons = [];
  for (const [pos, part, w] of weights) {
    const p = pillars[pos];
    if (!p) continue;
    total += w;
    const god = part === 'stem' ? p.tenGodStem : p.tenGodBranch;
    const cat = tenGodCategory(god);
    if (cat === '비겁' || cat === '인성') {
      support += w;
      if (part === 'branch' && pos === 'month') reasons.push('월지득지');
    }
  }
  const score = Math.round((support / total) * 100);
  let verdict;
  if (score >= 50) verdict = '신강';
  else if (score > 35) verdict = '중화';
  else verdict = '신약';
  reasons.push(`지지·천간 가중 점수 ${score}/100`);

  // --- 용신/희신/기신 (억부 + 조후 하이브리드, PRD §4.4) ---
  const dayEl = STEMS[dayStem].element;
  const inseongEl = ELEMENTS.find((e) => PRODUCES[e] === dayEl);
  const siksangEl = PRODUCES[dayEl];
  const jaeEl = CONTROLS[dayEl];
  const gwanEl = ELEMENTS.find((e) => CONTROLS[e] === dayEl);

  const isWinter = [11, 0, 1].includes(monthBranch); // 亥子丑월
  const isSummer = [5, 6, 7].includes(monthBranch);  // 巳午未월
  const johuBonus = (el) => (isWinter && el === '화') || (isSummer && el === '수') ? 2 : 0;

  const yongsinReasons = [];
  let candidates;
  if (verdict === '신약') {
    candidates = [inseongEl, dayEl];
    yongsinReasons.push('기운이 약한 쪽이라 나를 돕는 기운을 씀');
  } else if (verdict === '신강') {
    candidates = [siksangEl, jaeEl, gwanEl];
    yongsinReasons.push('기운이 센 쪽이라 힘을 흘려보내는 기운을 씀');
  } else {
    candidates = ELEMENTS.filter((e) => elementCount[e] === 0);
    if (candidates.length === 0) candidates = [siksangEl, jaeEl];
    yongsinReasons.push('기운이 고른 편이라 모자란 기운을 채움');
  }
  if (isWinter) yongsinReasons.push('겨울에 태어나 따뜻한 기운을 먼저 챙김');
  if (isSummer) yongsinReasons.push('여름에 태어나 시원한 기운을 먼저 챙김');

  // 조후 가점 우선, 그다음 사주에 부족한 것 우선
  candidates = [...new Set(candidates)].sort(
    (a, b) => (johuBonus(b) - johuBonus(a)) || (elementCount[a] - elementCount[b])
  );
  const use = candidates.slice(0, 2);
  const help = candidates.length > 2 ? [candidates[2]] : [ELEMENTS.find((e) => PRODUCES[e] === use[0])];

  let avoidPool;
  if (verdict === '신약') avoidPool = [siksangEl, jaeEl, gwanEl];
  else avoidPool = [dayEl, inseongEl];
  const avoid = avoidPool
    .filter((e) => !use.includes(e))
    .sort((a, b) => elementCount[b] - elementCount[a])
    .slice(0, 2);

  return {
    meta: {
      year, month, day,
      hour: timeUnknown ? undefined : hour,
      minute: timeUnknown ? undefined : minute,
      gender, longitude, timeUnknown,
      solarCorrectionMin,
      isWinter, isSummer,
    },
    pillars,
    dayMaster: { ...STEMS[dayStem], idx: dayStem },
    elementCount,
    strength: { verdict, score, reasons },
    yongsin: { use, help, avoid, reasons: yongsinReasons },
  };
}

/**
 * 특정 날짜가 속한 달의 월주(연간 흐름용) — 3개월 흐름(§6.1 5장)에 사용
 */
export function monthPillarOf(dateUtcMillis) {
  const d = new Date(dateUtcMillis);
  const y = d.getUTCFullYear();
  let sajuYear = y;
  if (dateUtcMillis < ipchunUtc(y)) sajuYear = y - 1;
  const yearStem = ((sajuYear - 4) % 10 + 10) % 10;
  const lambda = sunLongitude(julianDay(dateUtcMillis));
  const monthIdx = Math.floor((((lambda - 315) % 360) + 360) % 360 / 30);
  const monthBranch = (monthIdx + 2) % 12;
  const monthStem = ((yearStem % 5) * 2 + 2 + monthIdx) % 10;
  return {
    stem: { ...STEMS[monthStem] },
    branch: { ...BRANCHES[monthBranch] },
    stemElement: STEMS[monthStem].element,
    branchElement: BRANCHES[monthBranch].element,
  };
}
