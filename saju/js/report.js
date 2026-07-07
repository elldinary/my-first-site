/**
 * 쉬운 사주 — 리포트 레이어 (report layer)
 *
 * 엔진(engine.js)의 구조화 데이터를 "초등학생도 이해하는 쉬운 말"로 바꾼다 (PRD §6, §8).
 *  - 해석 블록 선택은 전부 규칙 기반 (§6.2). 임의 생성 없음.
 *  - 사용자 노출 문장은 tests/copy-lint.mjs 검사를 통과해야 한다 (§8.5).
 *  - 부정 해석은 반드시 해결 팁과 짝 (P4).
 */
import { tenGodCategory, monthPillarOf } from './engine.js';

// ---------------------------------------------------------------------------
// 용어 치환 사전 (PRD §8.3) — 내부 용어는 화면에 그대로 내보내지 않는다
// ---------------------------------------------------------------------------
export const GLOSSARY = {
  일간: '나를 나타내는 기운',
  사주팔자: '내 기운 카드',
  명식: '내 기운 카드',
  오행: '다섯 가지 기운',
  십성: '내 안의 여러 역할',
  용신: '나에게 힘을 주는 것',
  희신: '나를 도와주는 것',
  기신: '나를 지치게 하는 것',
  신강: '기운이 센 편',
  신약: '기운이 약한 편',
  중화: '기운이 고른 편',
  비겁: '나와 친구들의 힘',
  식상: '재능을 밖으로 펼치는 힘',
  재성: '돈과 결과의 힘',
  관성: '책임과 규칙의 힘',
  인성: '배우고 도움받는 힘',
  십이운성: '지금 내 기운의 세기',
  신살: '특별한 성향 표시',
  역마: '돌아다니는 걸 좋아하는 성향',
  도화: '사람을 끄는 매력',
  화개: '혼자 깊이 생각하는 성향',
  반안: '차근차근 올라가는 성향',
  장성: '앞장서서 이끄는 성향',
  지살: '부지런히 움직이는 성향',
  천을귀인: '어려울 때 도와주는 사람 복',
  문창귀인: '공부와 글쓰기 재주',
  월덕귀인: '두루 아껴 주는 복',
};

// ---------------------------------------------------------------------------
// 오행 → 쉬운 말 + 색 + 충전 팁
// ---------------------------------------------------------------------------
export const ELEMENT_INFO = {
  목: {
    easy: '나무', emoji: '🌳', color: 'wood',
    feel: '쑥쑥 자라고 새로 시작하는 기운',
    boost: '초록색 물건, 식물 키우기, 산책이 좋아요.',
    drain: '나무 기운이 많으면 계획만 늘어날 수 있어요.',
    missing: { text: '새 일을 시작할 때 머뭇거릴 수 있어요.', tip: '아주 작은 첫걸음 하나만 정해 보세요.' },
    future: '무언가를 키우고 가르치는 일이 잘 어울려요.',
  },
  화: {
    easy: '불', emoji: '🔥', color: 'fire',
    feel: '밝게 빛나고 사람을 데워 주는 기운',
    boost: '빨간색 소품, 햇볕 쬐기, 신나는 운동이 좋아요.',
    drain: '불 기운이 많으면 마음이 급해질 수 있어요.',
    missing: { text: '기분이 쉽게 가라앉을 때가 있어요.', tip: '아침에 10분만 햇볕을 쬐어 보세요.' },
    future: '사람들 앞에서 빛나는 일이 잘 어울려요.',
  },
  토: {
    easy: '흙', emoji: '⛰️', color: 'earth',
    feel: '든든하게 받쳐 주고 지켜 주는 기운',
    boost: '노란색 소품, 흙 밟기, 정리 정돈이 좋아요.',
    drain: '흙 기운이 많으면 변화가 느려질 수 있어요.',
    missing: { text: '마음이 붕 뜨고 자리를 못 잡을 때가 있어요.', tip: '자는 시간과 먹는 시간을 일정하게 해 보세요.' },
    future: '사람들을 잇고 중심을 잡아 주는 일이 어울려요.',
  },
  금: {
    easy: '쇠', emoji: '🪙', color: 'metal',
    feel: '똑 부러지게 마무리하는 기운',
    boost: '흰색과 회색 소품, 방 정리, 음악 감상이 좋아요.',
    drain: '쇠 기운이 많으면 말이 날카로워질 수 있어요.',
    missing: { text: '끝맺음이 흐지부지될 때가 있어요.', tip: '끝나는 날짜를 달력에 크게 적어 보세요.' },
    future: '꼼꼼하게 다듬고 완성하는 일이 잘 어울려요.',
  },
  수: {
    easy: '물', emoji: '💧', color: 'water',
    feel: '지혜롭고 부드럽게 흐르는 기운',
    boost: '파란색 소품, 물 마시기, 책 읽기가 좋아요.',
    drain: '물 기운이 많으면 생각이 너무 깊어질 수 있어요.',
    missing: { text: '융통성 있게 돌아가기 어려울 때가 있어요.', tip: '정답이 여러 개일 수 있다고 소리 내 말해 보세요.' },
    future: '지혜를 나누고 흐름을 읽는 일이 잘 어울려요.',
  },
};

// ---------------------------------------------------------------------------
// 일간(나를 나타내는 기운) 10종 — 자연물 비유 (§6.2)
// ---------------------------------------------------------------------------
const DAY_MASTER_INFO = [
  { // 甲
    metaphor: '하늘로 쭉 뻗는 큰 나무',
    headline: '나는 하늘로 쭉 뻗는 큰 나무 같은 사람이에요.',
    strength: { title: '앞으로 나아가는 힘', body: '한번 목표를 정하면 곧게 밀고 나가요.' },
    caution: { text: '내 방식만 고집할 때가 있어요.', tip: '다른 사람 생각을 먼저 하나 물어보세요.' },
    style: '스스로 정한 일을 할 때 힘이 나요.',
  },
  { // 乙
    metaphor: '어디서든 피어나는 들꽃',
    headline: '나는 어디서든 피어나는 들꽃 같은 사람이에요.',
    strength: { title: '부드러운 적응력', body: '어떤 자리에서도 금방 어울리고 살아남아요.' },
    caution: { text: '남 눈치를 너무 볼 때가 있어요.', tip: '하루 한 번은 내가 원하는 걸 먼저 말해 보세요.' },
    style: '사람들과 부드럽게 어울릴 때 힘이 나요.',
  },
  { // 丙
    metaphor: '세상을 밝게 비추는 해',
    headline: '나는 세상을 밝게 비추는 해 같은 사람이에요.',
    strength: { title: '밝은 에너지', body: '내가 있으면 주변이 환해지고 분위기가 살아나요.' },
    caution: { text: '기분이 오르락내리락할 때가 있어요.', tip: '마음이 흐린 날엔 몸을 움직여 보세요.' },
    style: '사람들 앞에서 표현할 때 힘이 나요.',
  },
  { // 丁
    metaphor: '어둠을 밝히는 따뜻한 촛불',
    headline: '나는 어둠을 밝히는 따뜻한 촛불 같은 사람이에요.',
    strength: { title: '세심한 따뜻함', body: '남이 못 보는 작은 것까지 살피고 챙겨요.' },
    caution: { text: '혼자 마음을 태우며 걱정할 때가 있어요.', tip: '걱정을 종이에 적고 하나만 골라 해결해 보세요.' },
    style: '가까운 사람을 도울 때 힘이 나요.',
  },
  { // 戊
    metaphor: '듬직하게 서 있는 큰 산',
    headline: '나는 듬직하게 서 있는 큰 산 같은 사람이에요.',
    strength: { title: '흔들리지 않는 든든함', body: '주변이 흔들려도 중심을 잘 지켜요.' },
    caution: { text: '변화를 귀찮아할 때가 있어요.', tip: '한 달에 하나씩 새로운 걸 시도해 보세요.' },
    style: '내 자리와 내 순서가 있을 때 힘이 나요.',
  },
  { // 己
    metaphor: '씨앗을 키워 내는 포근한 밭',
    headline: '나는 씨앗을 키워 내는 포근한 밭 같은 사람이에요.',
    strength: { title: '보살피는 재주', body: '사람이든 일이든 맡으면 정성껏 키워 내요.' },
    caution: { text: '속마음을 잘 안 보여 줄 때가 있어요.', tip: '믿는 사람 한 명에게는 솔직하게 말해 보세요.' },
    style: '차근차근 쌓아 가는 일을 할 때 힘이 나요.',
  },
  { // 庚
    metaphor: '단단하고 씩씩한 바위',
    headline: '나는 단단하고 씩씩한 바위 같은 사람이에요.',
    strength: { title: '시원한 결단력', body: '해야 할 일은 미루지 않고 딱 잘라 해내요.' },
    caution: { text: '말이 너무 직설적일 때가 있어요.', tip: '말하기 전에 속으로 셋만 세어 보세요.' },
    style: '결과가 눈에 보이는 일을 할 때 힘이 나요.',
  },
  { // 辛
    metaphor: '반짝반짝 빛나는 보석',
    headline: '나는 반짝반짝 빛나는 보석 같은 사람이에요.',
    strength: { title: '섬세한 완성도', body: '작은 차이를 알아채고 멋지게 다듬어요.' },
    caution: { text: '나에게도 남에게도 너무 깐깐할 때가 있어요.', tip: '오늘 잘한 일 하나를 꼭 칭찬해 주세요.' },
    style: '깔끔하게 정리된 환경에서 힘이 나요.',
  },
  { // 壬
    metaphor: '넓고 깊은 바다',
    headline: '나는 넓고 깊은 바다 같은 사람이에요.',
    strength: { title: '큰 그림을 보는 눈', body: '멀리 보고 크게 생각하는 걸 잘해요.' },
    caution: { text: '이것저것 벌여 놓고 못 끝낼 때가 있어요.', tip: '지금 하는 일 하나만 끝내고 다음으로 가세요.' },
    style: '새로운 세상을 탐험할 때 힘이 나요.',
  },
  { // 癸
    metaphor: '조용히 땅을 적시는 단비',
    headline: '나는 조용히 땅을 적시는 단비 같은 사람이에요.',
    strength: { title: '조용한 지혜', body: '티 내지 않아도 필요한 곳에 스며들어 도와요.' },
    caution: { text: '생각이 너무 많아 밤에 뒤척일 때가 있어요.', tip: '자기 전에 생각을 세 줄로 적어 보세요.' },
    style: '조용한 곳에서 깊이 몰입할 때 힘이 나요.',
  },
];

// ---------------------------------------------------------------------------
// 내 안의 역할(십성 5분류) — 많을 때/없을 때/기본 설명
// ---------------------------------------------------------------------------
const CATEGORY_INFO = {
  비겁: {
    easy: '나와 친구들의 힘',
    main: '내 힘으로 해내려는 마음이 커요. 친구와 함께하면 더 세져요.',
    strength: { title: '꿋꿋한 뚝심', body: '한번 마음먹으면 쉽게 포기하지 않아요.' },
    excess: { text: '지기 싫은 마음이 너무 커질 때가 있어요.', tip: '이기는 것보다 배우는 걸 목표로 바꿔 보세요.' },
    missing: { text: '내 편이 없다고 느낄 때가 있어요.', tip: '고민을 나눌 단짝 한 명을 만들어 보세요.' },
    social: '친구들과 어깨동무하며 함께 가는 걸 좋아해요.',
  },
  식상: {
    easy: '재능을 밖으로 펼치는 힘',
    main: '말하고 만들고 보여 주는 재주가 있어요.',
    strength: { title: '표현하는 재주', body: '내 생각을 재미있게 말하고 만들어 내요.' },
    excess: { text: '하고 싶은 말이 앞서 나갈 때가 있어요.', tip: '상대 말이 끝나고 한 박자 쉬고 말해 보세요.' },
    missing: { text: '속마음을 겉으로 잘 안 보여 줘요.', tip: '가끔 "나 이거 잘해!"라고 말해 보세요.' },
    social: '내 이야기를 들어 주는 사람과 있을 때 즐거워요.',
  },
  재성: {
    easy: '돈과 결과의 힘',
    main: '눈에 보이는 결과를 만드는 감각이 있어요.',
    strength: { title: '야무진 현실 감각', body: '돈과 시간을 계획 있게 쓸 줄 알아요.' },
    excess: { text: '해야 할 일보다 욕심이 커질 때가 있어요.', tip: '갖고 싶은 것에 순서를 매겨 하나씩 이뤄 보세요.' },
    missing: { text: '내 것을 챙기는 데 서툴 때가 있어요.', tip: '용돈 기입장처럼 들어오고 나가는 걸 적어 보세요.' },
    social: '함께 무언가를 만들어 낼 때 사이가 깊어져요.',
  },
  관성: {
    easy: '책임과 규칙의 힘',
    main: '맡은 일을 끝까지 지키는 책임감이 있어요.',
    strength: { title: '믿음직한 책임감', body: '약속과 규칙을 잘 지켜 믿음을 얻어요.' },
    excess: { text: '해야 할 일을 너무 많이 떠안아요.', tip: '"이건 도와줄래?"라고 나누는 연습을 해 보세요.' },
    missing: { text: '꾸준히 지키는 규칙이 잘 안 생겨요.', tip: '아주 쉬운 규칙 하나만 한 달간 지켜 보세요.' },
    social: '서로 약속을 지키는 관계에서 마음이 편해요.',
  },
  인성: {
    easy: '배우고 도움받는 힘',
    main: '배우는 걸 좋아하고 어른들 도움을 잘 받아요.',
    strength: { title: '배우는 즐거움', body: '새로운 지식을 스펀지처럼 빨아들여요.' },
    excess: { text: '생각만 하다가 시작이 늦어질 때가 있어요.', tip: '30분만 알아보고 바로 시작해 보세요.' },
    missing: { text: '혼자 다 해내려다 지칠 때가 있어요.', tip: '모르면 물어봐도 괜찮아요. 도움도 실력이에요.' },
    social: '이야기를 나누며 배우는 관계를 좋아해요.',
  },
};

// ---------------------------------------------------------------------------
// 특별한 성향 표시(신살) — 리포트에 보여 줄 것만
// ---------------------------------------------------------------------------
const SINSAL_EASY = {
  역마: { title: '여행자 기질', body: '새로운 곳에 금방 적응하고 움직일수록 운이 트여요.' },
  도화: { title: '사람을 끄는 매력', body: '나도 모르게 눈길을 끄는 매력이 있어요.' },
  화개: { title: '깊은 생각 주머니', body: '혼자 조용히 생각하며 멋진 답을 찾아내요.' },
  반안: { title: '차근차근 오르는 힘', body: '한 계단씩 올라가 결국 높은 곳에 닿아요.' },
  장성: { title: '앞장서는 리더 기질', body: '여럿이 모이면 자연스럽게 앞에 서게 돼요.' },
  지살: { title: '부지런한 발걸음', body: '가만히 있기보다 움직이며 기회를 만들어요.' },
};

const NOBLEMAN_EASY = {
  천을귀인: '어려울 때 도와주는 사람이 잘 나타나요.',
  문창귀인: '공부와 글쓰기에 남다른 재주가 있어요.',
  월덕귀인: '주변 사람들이 나를 두루 아껴 줘요.',
};

// ---------------------------------------------------------------------------
// "지난 시간 이야기" — 과거형 콜드 리딩 문장 (전부 규칙 기반, §6.2)
// 무료 구간에서 신뢰를 만드는 스토리텔링 블록
// ---------------------------------------------------------------------------
const DAY_MASTER_PAST = [
  '한번 아니다 싶으면 잘 안 굽혔죠. 그래서 손해 본 적도 있고요.',            // 甲
  '싫은 자리에서도 웃으며 맞춰 준 날이 많았을 거예요.',                     // 乙
  '기분 좋으면 다 퍼줄 것처럼 굴다가, 돌아서서 후회한 적 있죠?',            // 丙
  '남 걱정을 내 걱정처럼 하다가 혼자 지친 밤이 있었죠.',                    // 丁
  '주변이 흔들릴 때, 결국 중심을 잡은 건 나였을 거예요.',                   // 戊
  '티 안 나게 챙겨 줬는데 몰라줘서 서운했던 적, 있었죠?',                   // 己
  '돌려 말하는 게 어려워서 오해를 산 적이 있었을 거예요.',                  // 庚
  '대충 한 결과물을 보면 참기 힘들었죠. 내 것이면 더요.',                   // 辛
  '시작은 크게 했는데 마무리 전에 마음이 떠난 적이 있죠?',                  // 壬
  '아무렇지 않은 척했지만, 속으로는 백 번쯤 생각했을 거예요.',              // 癸
];

const VERDICT_PAST = {
  신강: '남에게 맡기느니 내가 하는 게 빠르다고 느낀 적 많죠.',
  중화: '양쪽 다 이해가 돼서 중간에서 난처했던 적이 많았을 거예요.',
  신약: '밖에서는 씩씩한데, 집에 오면 기운이 쭉 빠지곤 했죠.',
};

const CATEGORY_PAST = {
  비겁: {
    excess: '지기 싫어서 혼자 끙끙대며 해낸 일이 유난히 많았죠.',
    missing: '중요한 결정을 늘 혼자 감당한다고 느꼈을 거예요.',
  },
  식상: {
    excess: '말이 먼저 나가서 아차 싶었던 순간, 있었죠?',
    missing: '하고 싶은 말을 삼키고 돌아서서 후회한 날이 많았을 거예요.',
  },
  재성: {
    excess: '결과가 눈에 안 보이면 금방 흥미가 식곤 했죠.',
    missing: '남 챙기느라 내 몫은 자꾸 뒤로 밀렸을 거예요.',
  },
  관성: {
    excess: '어릴 때부터 해야 할 일을 먼저 떠안는 쪽이었죠. 힘들다는 말은 잘 못 했고요.',
    missing: '정해진 틀 안에 있으면 답답해서 자꾸 벗어나고 싶었죠.',
  },
  인성: {
    excess: '오래 고민하다 시기를 놓친 적이 몇 번 있었을 거예요.',
    missing: '도와달라는 말이 어려워서 혼자 다 하다 지친 적 있죠?',
  },
};

const SINSAL_PAST = {
  역마: '사는 곳이나 다니는 곳이 자주 바뀌었죠. 그리고 생각보다 잘 적응해냈고요.',
  도화: '가만히 있어도 먼저 다가오는 사람이 꽤 있었을 거예요.',
  화개: '혼자 있는 시간이 없으면 이상하게 지치곤 했죠.',
  반안: '한 번에 크게 오르기보다 한 계단씩 올라온 길이었어요.',
  장성: '얼떨결에 반장이나 대표 같은 자리를 맡은 적이 있죠?',
  지살: '몸을 부지런히 움직여야 마음이 놓이는 편이었죠.',
};

const NOBLEMAN_PAST = {
  천을귀인: '정말 힘들던 순간, 이상하게 도와주는 사람이 나타나곤 했죠.',
  문창귀인: '글이나 공부로 칭찬받은 기억이 어릴 때부터 있었을 거예요.',
  월덕귀인: '크게 싸운 사람 없이 두루 잘 지내 온 편이었죠.',
};

const PAST_HOOK = '어떻게 알았냐고요? 다 이유가 있어요. 그 이유가 아래에 적혀 있어요.';
const PAST_SOFT = '다르게 느껴지는 것도 있을 수 있어요. 그것도 그대로 나예요.';

function buildPast(chart, counts, sinsalList, noblemanList) {
  const items = [];
  // 구체적인 것부터: 역할 쏠림 → 성향 표시 → 복 → 기운 세기 → 타고난 결
  for (const [cat, n] of Object.entries(counts)) {
    if (n >= 3) items.push(CATEGORY_PAST[cat].excess);
  }
  for (const [cat, n] of Object.entries(counts)) {
    if (n === 0) items.push(CATEGORY_PAST[cat].missing);
  }
  for (const s of sinsalList) {
    if (SINSAL_PAST[s]) items.push(SINSAL_PAST[s]);
  }
  for (const n of noblemanList) {
    if (NOBLEMAN_PAST[n]) items.push(NOBLEMAN_PAST[n]);
  }
  items.push(VERDICT_PAST[chart.strength.verdict]);
  items.push(DAY_MASTER_PAST[chart.dayMaster.idx]);
  return { items: [...new Set(items)].slice(0, 4), hook: PAST_HOOK, soft: PAST_SOFT };
}

const VERDICT_EASY = {
  신강: {
    label: '기운이 센 편',
    body: '내 기운이 씩씩하고 센 편이에요. 기운을 밖으로 잘 쓰면 크게 자라요.',
    strength: { title: '씩씩한 에너지', body: '어려운 일도 스스로 밀고 나갈 힘이 있어요.' },
    caution: { text: '내 뜻대로만 하고 싶을 때가 있어요.', tip: '결정 전에 한 사람에게만 의견을 물어보세요.' },
  },
  중화: {
    label: '기운이 고른 편',
    body: '기운이 한쪽으로 쏠리지 않고 고르게 균형 잡혀 있어요.',
    strength: { title: '균형 감각', body: '상황에 맞게 힘을 조절할 줄 알아요.' },
    caution: { text: '이도 저도 아니게 망설일 때가 있어요.', tip: '고민이 길어지면 동전 던지기로라도 정해 보세요.' },
  },
  신약: {
    label: '기운이 부드러운 편',
    body: '기운이 부드럽고 섬세한 편이에요. 나를 채워 주는 걸 곁에 두면 좋아요.',
    strength: { title: '섬세한 안테나', body: '분위기와 사람 마음을 빠르게 알아차려요.' },
    caution: { text: '이것저것 하다 보면 쉽게 지칠 수 있어요.', tip: '하루에 꼭 쉬는 시간을 미리 정해 두세요.' },
  },
};

const SEASON_NOTE = {
  겨울: '추운 계절에 태어나 따뜻한 기운이 보약이에요.',
  여름: '더운 계절에 태어나 시원한 기운이 보약이에요.',
};

// ---------------------------------------------------------------------------
// 도우미
// ---------------------------------------------------------------------------
function categoryCounts(chart) {
  const counts = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const posList = chart.meta.timeUnknown ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'hour'];
  for (const pos of posList) {
    const p = chart.pillars[pos];
    if (pos !== 'day') counts[tenGodCategory(p.tenGodStem)]++;
    counts[tenGodCategory(p.tenGodBranch)]++;
  }
  return counts;
}

function dominantElement(chart) {
  return Object.entries(chart.elementCount).sort((a, b) => b[1] - a[1])[0][0];
}

function collectSinsal(chart) {
  const seen = new Map();
  const posKor = { year: '태어난 해', month: '태어난 달', day: '태어난 날', hour: '태어난 시간' };
  for (const pos of ['year', 'month', 'day', 'hour']) {
    const p = chart.pillars[pos];
    if (!p) continue;
    for (const s of p.sinsal) {
      if (SINSAL_EASY[s] && !seen.has(s)) seen.set(s, posKor[pos]);
    }
  }
  return [...seen.keys()];
}

function collectNobleman(chart) {
  const set = new Set();
  for (const pos of ['year', 'month', 'day', 'hour']) {
    const p = chart.pillars[pos];
    if (!p) continue;
    p.nobleman.forEach((n) => set.add(n));
  }
  return [...set];
}

function easyElements(list) {
  return list.map((e) => `${ELEMENT_INFO[e].easy}${ELEMENT_INFO[e].emoji}`).join('와 ');
}

// ---------------------------------------------------------------------------
// 메인: 리포트 조립 (§6.1 목차 그대로)
// ---------------------------------------------------------------------------
export function buildReport(chart) {
  const dm = DAY_MASTER_INFO[chart.dayMaster.idx];
  const counts = categoryCounts(chart);
  const sortedCats = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const domCat = sortedCats[0][0];
  const domCatCount = sortedCats[0][1];
  const verdict = VERDICT_EASY[chart.strength.verdict];
  const sinsalList = collectSinsal(chart);
  const noblemanList = collectNobleman(chart);
  const domEl = dominantElement(chart);

  // --- 2-1 한마디로 나는? ---
  let seasonNote = '';
  if (chart.meta.isWinter) seasonNote = SEASON_NOTE.겨울;
  if (chart.meta.isSummer) seasonNote = SEASON_NOTE.여름;

  // --- 2-2 장점 3가지 (규칙 기반 후보 → 상위 3개) ---
  const strengths = [];
  strengths.push(dm.strength);
  if (domCatCount >= 2) strengths.push(CATEGORY_INFO[domCat].strength);
  strengths.push(verdict.strength);
  for (const n of noblemanList) {
    strengths.push({ title: GLOSSARY[n], body: NOBLEMAN_EASY[n] });
  }
  for (const s of sinsalList) {
    strengths.push(SINSAL_EASY[s]);
  }
  const strengthTop3 = dedupeBy(strengths, (s) => s.title).slice(0, 3);

  // --- 2-3 조심하면 좋은 점 3가지 (+ 팁, P4) ---
  const cautions = [];
  for (const [cat, n] of Object.entries(counts)) {
    if (n === 0) cautions.push({ ...CATEGORY_INFO[cat].missing, from: cat });
  }
  for (const [cat, n] of Object.entries(counts)) {
    if (n >= 3) cautions.push({ ...CATEGORY_INFO[cat].excess, from: cat });
  }
  for (const [el, n] of Object.entries(chart.elementCount)) {
    if (n === 0) cautions.push({ ...ELEMENT_INFO[el].missing, from: el });
  }
  cautions.push(verdict.caution);
  cautions.push(dm.caution);
  const cautionTop3 = dedupeBy(cautions, (c) => c.text).slice(0, 3);

  // --- 2-4 생활 스타일 ---
  const lifestyle = [dm.style, ELEMENT_INFO[domEl].boost];

  // --- 2-5 겉모습 vs 속마음 ---
  const outerCat = tenGodCategory(chart.pillars.month.tenGodStem);
  const innerCat = tenGodCategory(chart.pillars.day.tenGodBranch);
  const outerInner = {
    outer: `밖에서 나는 이렇게 보여요. ${CATEGORY_INFO[outerCat].main}`,
    inner: `속마음은 이래요. ${CATEGORY_INFO[innerCat].main}`,
    same: outerCat === innerCat,
    sameNote: '겉과 속이 비슷한, 한결같은 사람이에요.',
  };

  // --- 3장 다섯 기운 ---
  const use = chart.yongsin.use;
  const avoid = chart.yongsin.avoid;
  const elements = {
    counts: chart.elementCount,
    domEl,
    useEls: use,
    avoidEls: avoid,
    useText: `나에게 힘을 주는 건 ${easyElements(use)} 기운이에요. 배터리 충전 같은 거예요.`,
    useTips: use.map((e) => ELEMENT_INFO[e].boost),
    avoidText: avoid.length
      ? `${easyElements(avoid)} 기운이 지나치면 나를 지치게 해요. 힘 빠지는 날엔 충전 기운을 챙기면 돼요.`
      : '나를 크게 지치게 하는 기운은 없어요.',
    verdictLabel: verdict.label,
    verdictBody: verdict.body,
    score: chart.strength.score,
    futureText: ELEMENT_INFO[use[0]].future,
  };

  // --- 4장 내 안의 역할들 ---
  const roles = {
    mainCat: domCat,
    mainTitle: CATEGORY_INFO[domCat].easy,
    mainBody: CATEGORY_INFO[domCat].main,
    counts,
    catEasy: Object.fromEntries(Object.keys(counts).map((c) => [c, CATEGORY_INFO[c].easy])),
    socialText: CATEGORY_INFO[domCat].social,
  };

  // --- 5장 앞으로 3개월 (신호등) ---
  const months = buildThreeMonths(chart);

  return {
    headline: dm.headline,
    metaphor: dm.metaphor,
    seasonNote,
    past: buildPast(chart, counts, sinsalList, noblemanList),
    strengths: strengthTop3,
    cautions: cautionTop3,
    lifestyle,
    outerInner,
    elements,
    roles,
    months,
    specials: sinsalList.map((s) => SINSAL_EASY[s]),
    noblemen: noblemanList.map((n) => ({ title: GLOSSARY[n], body: NOBLEMAN_EASY[n] })),
    notes: buildNotes(chart),
  };
}

function dedupeBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter((x) => {
    const k = keyFn(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function buildNotes(chart) {
  const notes = [];
  if (chart.meta.timeUnknown) {
    notes.push('태어난 시간을 알면 결과가 더 자세해져요.');
  }
  if (!chart.meta.timeUnknown && chart.meta.hour >= 23) {
    notes.push('밤 11시 이후 출생은 그날의 늦은 밤 기운으로 봤어요.');
  }
  notes.push('풀이 기준에 따라 다른 곳과 결과가 조금 다를 수 있어요.');
  return notes;
}

const MONTH_ADVICE = {
  좋음: '밀어붙이기 좋은 달이에요. 미뤄 둔 일을 시작해 보세요.',
  보통: '무난하게 흘러가는 달이에요. 하던 일을 차분히 이어 가세요.',
  조심: '힘이 새기 쉬운 달이에요. 무리한 약속은 줄이고 푹 쉬어 주세요.',
};

function buildThreeMonths(chart, now = Date.now()) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    const t = now + i * 30.44 * 86400000;
    const mp = monthPillarOf(t);
    const d = new Date(t);
    const label = i === 0 ? '이번 달' : i === 1 ? '다음 달' : '그다음 달';
    const monthNum = new Date(t + 9 * 3600000).getUTCMonth() + 1;
    const els = [mp.stemElement, mp.branchElement];
    const goodHit = els.some((e) => chart.yongsin.use.includes(e));
    const badHit = els.some((e) => chart.yongsin.avoid.includes(e));
    let signal = '보통';
    if (goodHit && !badHit) signal = '좋음';
    else if (badHit && !goodHit) signal = '조심';
    out.push({ label, monthNum, signal, advice: MONTH_ADVICE[signal] });
  }
  return out;
}

// ---------------------------------------------------------------------------
// (옵션) 우리 둘 궁합 요약 — §6.1 6장, §7.4
// ---------------------------------------------------------------------------
const PRODUCES = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
const CONTROLS = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

export function buildCompat(me, partner) {
  const a = me.dayMaster.element;
  const b = partner.dayMaster.element;
  const aName = `${ELEMENT_INFO[a].easy}${ELEMENT_INFO[a].emoji}`;
  const bName = `${ELEMENT_INFO[b].easy}${ELEMENT_INFO[b].emoji}`;
  const lines = [];
  let score = 0;

  lines.push(`나는 ${aName} 기운, 상대는 ${bName} 기운을 가졌어요.`);

  if (a === b) {
    lines.push('둘은 닮은꼴이라 서로를 금방 알아봐요.');
    lines.push('비슷해서 편하지만 양보 연습은 필요해요.');
    score += 1;
  } else if (PRODUCES[a] === b) {
    lines.push('내가 상대에게 힘을 주는 사이예요.');
    lines.push('상대가 고맙다고 자주 말해 주면 더 좋아져요.');
    score += 2;
  } else if (PRODUCES[b] === a) {
    lines.push('상대가 나에게 힘을 주는 사이예요.');
    lines.push('받기만 하지 말고 마음을 표현해 주세요.');
    score += 2;
  } else if (CONTROLS[a] === b) {
    lines.push('내가 이끌고 상대가 따라오기 쉬운 사이예요.');
    lines.push('상대 속도에 맞춰 주면 훨씬 편해져요.');
  } else {
    lines.push('상대가 이끌고 내가 따라가기 쉬운 사이예요.');
    lines.push('힘들면 힘들다고 솔직하게 말해 주세요.');
  }

  // 서로의 충전 기운을 채워 주는지
  const bStrong = Object.entries(partner.elementCount).filter(([, n]) => n >= 2).map(([e]) => e);
  const aStrong = Object.entries(me.elementCount).filter(([, n]) => n >= 2).map(([e]) => e);
  const bFillsA = me.yongsin.use.some((e) => bStrong.includes(e));
  const aFillsB = partner.yongsin.use.some((e) => aStrong.includes(e));
  if (bFillsA) { lines.push('상대는 나에게 부족한 기운을 채워 주는 사람이에요.'); score += 2; }
  if (aFillsB) { lines.push('나도 상대에게 부족한 기운을 채워 줄 수 있어요.'); score += 2; }
  if (!bFillsA && !aFillsB) {
    lines.push('서로 부족한 걸 채워 주려면 대화가 열쇠예요.');
  }

  let signal = '보통';
  if (score >= 4) signal = '좋음';
  else if (score <= 0) signal = '조심';
  if (signal === '조심') lines.push('속도만 잘 맞추면 충분히 좋아질 수 있는 사이예요.');

  return { signal, lines };
}

// ---------------------------------------------------------------------------
// 카피 린트용: 이 모듈이 내보낼 수 있는 모든 정적 문장 수집 (§8.5)
// ---------------------------------------------------------------------------
export function collectStaticCopy() {
  const out = [];
  const push = (s) => { if (typeof s === 'string' && s.trim()) out.push(s); };
  Object.values(GLOSSARY).forEach(push);
  for (const info of Object.values(ELEMENT_INFO)) {
    push(info.feel); push(info.boost); push(info.drain);
    push(info.missing.text); push(info.missing.tip); push(info.future);
  }
  for (const dm of DAY_MASTER_INFO) {
    push(dm.headline); push(dm.metaphor);
    push(dm.strength.title); push(dm.strength.body);
    push(dm.caution.text); push(dm.caution.tip); push(dm.style);
  }
  for (const c of Object.values(CATEGORY_INFO)) {
    push(c.easy); push(c.main);
    push(c.strength.title); push(c.strength.body);
    push(c.excess.text); push(c.excess.tip);
    push(c.missing.text); push(c.missing.tip);
    push(c.social);
  }
  for (const s of Object.values(SINSAL_EASY)) { push(s.title); push(s.body); }
  Object.values(NOBLEMAN_EASY).forEach(push);
  for (const v of Object.values(VERDICT_EASY)) {
    push(v.label); push(v.body);
    push(v.strength.title); push(v.strength.body);
    push(v.caution.text); push(v.caution.tip);
  }
  Object.values(SEASON_NOTE).forEach(push);
  Object.values(MONTH_ADVICE).forEach(push);
  DAY_MASTER_PAST.forEach(push);
  Object.values(VERDICT_PAST).forEach(push);
  for (const c of Object.values(CATEGORY_PAST)) { push(c.excess); push(c.missing); }
  Object.values(SINSAL_PAST).forEach(push);
  Object.values(NOBLEMAN_PAST).forEach(push);
  push(PAST_HOOK); push(PAST_SOFT);
  return out;
}
