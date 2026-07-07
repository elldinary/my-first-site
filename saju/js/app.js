/**
 * 쉬운 사주 — 화면 레이어 (§7) + 비즈니스 모델
 *
 * 흐름: 입력 → 무료 리포트(이야기는 다 보여 주되 핵심 단어는 가림) → 결제(19,000원) → 전체 공개
 *
 * 무료 구간 전략:
 *  - "지난 시간 이야기"(과거형 콜드 리딩)와 장점/조심할 점 본문은 전부 공개해 신뢰를 만들고,
 *  - 해결 팁·충전법·기운 이름·미래 그림·다음 두 달 신호등 같은 "정답"만 블러 처리한다.
 *  - 블러를 누르면 결제 모달이 열린다.
 *
 * 결제는 현재 "체험 결제"(PG 연동 전 데모)로 동작한다. 실제 연동 시
 * startCheckout()에서 토스페이먼츠/카카오페이 SDK 호출로 교체하면 된다.
 */
import { calculateSaju } from './engine.js';
import { buildReport, buildCompat, ELEMENT_INFO } from './report.js';

const PRICE = 19000;
const LIST_PRICE = 39000;

const $ = (sel, el = document) => el.querySelector(sel);

// ---------------------------------------------------------------------------
// 상태
// ---------------------------------------------------------------------------
let currentChart = null;
let currentReport = null;
let currentParams = null;

function paidKey(params) {
  return 'saju_paid_' + [params.y, params.m, params.d, params.tu ? 'x' : params.hh + ':' + params.mm, params.g].join('-');
}
function isPaid(params) {
  try { return localStorage.getItem(paidKey(params)) === '1'; } catch { return false; }
}
function markPaid(params) {
  try { localStorage.setItem(paidKey(params), '1'); } catch { /* 사생활 보호 모드 등 */ }
}

// ---------------------------------------------------------------------------
// 입력 폼 (§7.2)
// ---------------------------------------------------------------------------
const form = $('#saju-form');
const timeInput = $('#birth-time');
const timeUnknown = $('#time-unknown');
const errorBox = $('#form-error');

timeUnknown.addEventListener('change', () => {
  timeInput.disabled = timeUnknown.checked;
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  errorBox.hidden = true;

  const dateVal = $('#birth-date').value;
  if (!dateVal) return showError('태어난 날을 골라 주세요.');
  const [y, m, d] = dateVal.split('-').map(Number);

  const today = new Date();
  const birth = new Date(y, m - 1, d);
  if (birth > today) return showError('앗, 미래 날짜예요. 다시 골라 주세요.');
  if (y < 1900 || y > 2050) return showError('1900년부터 2050년 사이만 볼 수 있어요.');

  let hh = 12, mm = 0;
  const tu = timeUnknown.checked;
  if (!tu) {
    const t = timeInput.value;
    if (!t) return showError('태어난 시간을 적거나 "몰라요"를 눌러 주세요.');
    [hh, mm] = t.split(':').map(Number);
  }
  const g = new FormData(form).get('gender');
  const lon = parseFloat($('#birth-city').value);

  const params = { y, m, d, hh, mm, tu, g, lon };
  const url = new URL(location.href);
  url.search = new URLSearchParams({
    y, m, d, g, lon,
    ...(tu ? { tu: 1 } : { hh, mm }),
  }).toString();
  history.pushState(params, '', url);
  showReport(params);
});

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

// URL로 바로 들어온 경우 (§3.3: URL 쿼리 상태)
function tryLoadFromUrl() {
  const q = new URLSearchParams(location.search);
  if (!q.has('y')) return;
  const params = {
    y: +q.get('y'), m: +q.get('m'), d: +q.get('d'),
    hh: +(q.get('hh') ?? 12), mm: +(q.get('mm') ?? 0),
    tu: q.has('tu'), g: q.get('g') || 'F', lon: +(q.get('lon') || 126.98),
  };
  if (params.y && params.m && params.d) showReport(params);
}
window.addEventListener('popstate', () => {
  if (!location.search) backToInput();
  else tryLoadFromUrl();
});

function backToInput() {
  $('#screen-report').hidden = true;
  $('#screen-input').hidden = false;
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// 리포트 렌더 (§7.3, §6.1 목차 순서)
// ---------------------------------------------------------------------------
function showReport(params) {
  let chart;
  try {
    chart = calculateSaju({
      year: params.y, month: params.m, day: params.d,
      hour: params.hh, minute: params.mm,
      gender: params.g, longitude: params.lon, timeUnknown: params.tu,
    });
  } catch (err) {
    showError('이 날짜는 아직 계산할 수 없어요. 1900~2050년 사이로 적어 주세요.');
    return;
  }

  currentChart = chart;
  currentReport = buildReport(chart);
  currentParams = params;

  $('#screen-input').hidden = true;
  const screen = $('#screen-report');
  screen.hidden = false;
  renderReport(isPaid(params));
  window.scrollTo(0, 0);
}

/** 핵심 단어 가림: 무료면 블러 처리(누르면 결제 모달), 유료면 그대로 */
function mask(s, unlocked) {
  return unlocked ? s : `<span class="masked" role="button" aria-label="상세 리포트에서 열려요">${s}</span>`;
}

function easyEls(list) {
  return list.map((e) => `${ELEMENT_INFO[e].easy}${ELEMENT_INFO[e].emoji}`).join('와 ');
}

function renderReport(unlocked) {
  const c = currentChart;
  const r = currentReport;
  const root = $('#report-root');

  root.innerHTML = `
    <button class="back-link" id="back-btn">← 다시 입력하기</button>

    ${sectionCard('1장', '내 기운 카드', renderPillarCards(c))}

    <section class="report-sec">
      <p class="sec-kicker">2장 · 나는 어떤 사람일까</p>
      <div class="headline-card">
        <p class="headline-emoji">${ELEMENT_INFO[c.dayMaster.element].emoji}</p>
        <h2>${r.headline}</h2>
        ${r.seasonNote ? `<p class="season-note">${r.seasonNote}</p>` : ''}
      </div>
    </section>

    ${renderPastSection(r)}

    ${sectionCard('3장', '나의 다섯 기운', renderElementChart(c))}

    ${unlocked ? '' : `<p class="mask-hint">🔒 뿌옇게 가려진 글자는 상세 리포트에서 열려요. 궁금하면 살짝 눌러 보세요.</p>`}

    ${renderStorySections(r, unlocked)}

    ${unlocked ? renderPaidTail() : renderPaywall()}

    <section class="report-sec notes">
      ${r.notes.map((n) => `<p>· ${n}</p>`).join('')}
    </section>
  `;

  $('#back-btn').addEventListener('click', () => {
    history.pushState(null, '', location.pathname);
    backToInput();
  });

  if (!unlocked) {
    $('#unlock-btn').addEventListener('click', openPayModal);
    const sticky = $('#sticky-cta');
    if (sticky) sticky.addEventListener('click', openPayModal);
    root.addEventListener('click', (e) => {
      if (e.target.closest('.masked')) openPayModal();
    });
  } else {
    bindCompatForm();
  }
}

function sectionCard(kicker, title, inner) {
  return `
    <section class="report-sec">
      <p class="sec-kicker">${kicker}</p>
      <h2 class="sec-title">${title}</h2>
      ${inner}
    </section>`;
}

// --- 지난 시간 이야기 (무료 공개 — 신뢰를 만드는 콜드 리딩) ---
function renderPastSection(r) {
  return `
    <section class="report-sec">
      <p class="sec-kicker">혹시… 이랬던 적 있나요?</p>
      <h2 class="sec-title">지난 시간 이야기 🕰️</h2>
      <div class="past-card">
        ${r.past.items.map((t) => `<p class="past-line">“${t}”</p>`).join('')}
        <p class="past-hook">${r.past.hook}</p>
        <p class="past-soft">${r.past.soft}</p>
      </div>
    </section>`;
}

// --- 1장: 사주 카드 ---
function renderPillarCards(c) {
  const order = [
    ['year', '태어난 해'],
    ['month', '태어난 달'],
    ['day', '태어난 날'],
    ['hour', '태어난 시간'],
  ];
  const cells = order.map(([pos, label]) => {
    const p = c.pillars[pos];
    if (!p) {
      return `<div class="pillar unknown"><p class="pillar-label">${label}</p>
        <div class="tile empty">?</div><div class="tile empty">?</div>
        <p class="pillar-sub">몰라요</p></div>`;
    }
    const extra = pos === 'year' ? `<p class="pillar-sub">${p.branch.animal}띠</p>` : '';
    const marker = pos === 'day' ? `<p class="pillar-sub me">⭐ 나</p>` : extra;
    return `
      <div class="pillar">
        <p class="pillar-label">${label}</p>
        <div class="tile el-${ELEMENT_INFO[p.stem.element].color}">
          <span class="hanja">${p.stem.hanja}</span>
          <span class="reading">${p.stem.kor} · ${ELEMENT_INFO[p.stem.element].easy}</span>
        </div>
        <div class="tile el-${ELEMENT_INFO[p.branch.element].color}">
          <span class="hanja">${p.branch.hanja}</span>
          <span class="reading">${p.branch.kor} · ${ELEMENT_INFO[p.branch.element].easy}</span>
        </div>
        ${marker}
      </div>`;
  }).join('');
  return `
    <div class="pillar-grid">${cells}</div>
    <p class="pillar-caption">색깔은 다섯 가지 기운이에요:
      <span class="chip el-wood">나무</span><span class="chip el-fire">불</span><span class="chip el-earth">흙</span><span class="chip el-metal">쇠</span><span class="chip el-water">물</span>
    </p>`;
}

// --- 3-1: 오행 그래프 (직접 라벨 + 값 라벨, 색은 보조 표현) ---
function renderElementChart(c) {
  const total = Object.values(c.elementCount).reduce((a, b) => a + b, 0);
  const max = Math.max(...Object.values(c.elementCount), 1);
  const bars = Object.entries(c.elementCount).map(([el, n]) => {
    const info = ELEMENT_INFO[el];
    const h = n === 0 ? 4 : Math.round((n / max) * 120);
    return `
      <div class="bar-col" role="img" aria-label="${info.easy} 기운 ${n}개">
        <span class="bar-val">${n}</span>
        <div class="bar el-${info.color}" style="height:${h}px"></div>
        <span class="bar-name">${info.emoji}<br />${info.easy}</span>
      </div>`;
  }).join('');
  const domEl = Object.entries(c.elementCount).sort((a, b) => b[1] - a[1])[0][0];
  const zero = Object.entries(c.elementCount).filter(([, n]) => n === 0).map(([el]) => ELEMENT_INFO[el].easy);
  return `
    <div class="chart">${bars}</div>
    <p class="chart-note">내 여덟 글자 중 ${total}개를 다섯 기운으로 나눠 봤어요.</p>
    <p class="chart-note">지금 나는 <b>${ELEMENT_INFO[domEl].easy}${ELEMENT_INFO[domEl].emoji}</b> 기운이 가장 많아요.${zero.length ? ` <b>${zero.join('·')}</b> 기운은 비어 있어요.` : ''}</p>`;
}

// --- 본문 이야기: 무료/유료 공통 레이아웃, 핵심 단어만 가림 ---
function renderStorySections(r, u) {
  const oi = r.outerInner;
  const useNames = easyEls(r.elements.useEls);
  const avoidNames = r.elements.avoidEls.length ? easyEls(r.elements.avoidEls) : '';
  return `
    <section class="report-sec">
      <p class="sec-kicker">2장 계속</p>
      <h2 class="sec-title">나의 장점 3가지 🌟</h2>
      <div class="block-grid">
        ${r.strengths.map((s) => `<div class="block-card"><h3>${s.title}</h3><p>${s.body}</p></div>`).join('')}
      </div>

      <h2 class="sec-title">조심하면 좋은 점 3가지 🛡️</h2>
      <div class="block-grid">
        ${r.cautions.map((cn) => `
          <div class="block-card caution">
            <p>${cn.text}</p>
            <p class="tip">💡 ${mask(cn.tip, u)}</p>
          </div>`).join('')}
      </div>

      <h2 class="sec-title">나의 생활 스타일 🏡</h2>
      <div class="block-card">
        <p>${r.lifestyle[0]}</p>
        <p>${mask(r.lifestyle[1], u)}</p>
      </div>

      <h2 class="sec-title">겉모습 vs 속마음 🎭</h2>
      <div class="block-grid two">
        <div class="block-card"><h3>겉모습</h3><p>${oi.outer}</p></div>
        <div class="block-card"><h3>속마음</h3><p>${mask(oi.inner, u)}</p></div>
      </div>
      ${oi.same && u ? `<p class="chart-note">${oi.sameNote}</p>` : ''}
    </section>

    <section class="report-sec">
      <p class="sec-kicker">3장 계속 · 나의 다섯 기운</p>
      <h2 class="sec-title">나에게 힘을 주는 것 🔋</h2>
      <div class="block-card good">
        <p>나에게 힘을 주는 건 ${mask(useNames, u)} 기운이에요. 배터리 충전 같은 거예요.</p>
        ${r.elements.useTips.map((t) => `<p class="tip">💡 ${mask(t, u)}</p>`).join('')}
      </div>
      <h2 class="sec-title">나를 지치게 하는 것 🪫</h2>
      <div class="block-card caution">
        <p>${avoidNames
          ? `${mask(avoidNames, u)} 기운이 지나치면 나를 지치게 해요. 힘 빠지는 날엔 충전 기운을 챙기면 돼요.`
          : r.elements.avoidText}</p>
      </div>
      <h2 class="sec-title">내 기운은 센 편? 약한 편? 💪</h2>
      <div class="block-card">
        <p><b>${mask(r.elements.verdictLabel, u)}</b>이에요.</p>
        <p>${mask(r.elements.verdictBody, u)}</p>
        <div class="meter"><div class="meter-fill" style="width:${r.elements.score}%"></div></div>
        <p class="meter-cap">기운 점수 ${r.elements.score}점 / 100점</p>
      </div>
      <h2 class="sec-title">내가 그리는 미래 그림 🖼️</h2>
      <div class="block-card"><p>${mask(r.elements.futureText, u)}</p></div>
    </section>

    <section class="report-sec">
      <p class="sec-kicker">4장 · 내 안의 역할들</p>
      <h2 class="sec-title">나를 움직이는 힘 🧭</h2>
      <div class="block-card">
        <h3>${mask(r.roles.mainTitle, u)}</h3>
        <p>${r.roles.mainBody}</p>
      </div>
      <h2 class="sec-title">사람들과 어울리는 방식 🫶</h2>
      <div class="block-card"><p>${r.roles.socialText}</p></div>
      ${r.specials.length ? `
        <h2 class="sec-title">나만의 특별한 성향 ✨</h2>
        <div class="block-grid">
          ${r.specials.map((s) => `<div class="block-card"><h3>${s.title}</h3><p>${s.body}</p></div>`).join('')}
        </div>` : ''}
      ${r.noblemen.length ? `
        <h2 class="sec-title">나를 지켜 주는 복 🍀</h2>
        <div class="block-grid">
          ${r.noblemen.map((n) => `<div class="block-card good"><h3>${n.title}</h3><p>${n.body}</p></div>`).join('')}
        </div>` : ''}
    </section>

    <section class="report-sec">
      <p class="sec-kicker">5장 · 앞으로 3개월</p>
      <h2 class="sec-title">다가올 석 달 신호등 🚦</h2>
      <div class="month-grid">
        ${r.months.map((mo, i) => {
          const open = u || i === 0;
          const light = mo.signal === '좋음' ? '🟢' : mo.signal === '보통' ? '🟡' : '🔴';
          return `
          <div class="month-card ${open ? `sig-${mo.signal}` : 'sig-locked'}">
            <p class="month-label">${mo.label} (${mo.monthNum}월)</p>
            <p class="month-sig">${open ? `${light} ${mo.signal}` : `🔒 ${mask(mo.signal, u)}`}</p>
            <p class="month-adv">${open ? mo.advice : mask(mo.advice, u)}</p>
          </div>`;
        }).join('')}
      </div>
      ${u ? '' : '<p class="chart-note">이번 달은 열어 뒀어요. 다음 두 달은 상세 리포트에서 열려요.</p>'}
    </section>`;
}

// --- 무료: 페이월 (비즈니스 모델) ---
function renderPaywall() {
  return `
    <section class="report-sec">
      <div class="paywall-card">
        <p class="pay-ribbon">출시 기념 · 오늘만 51% 할인</p>
        <h2>가려진 글자, 전부 열어 볼까요?</h2>
        <p class="pay-price"><s>${LIST_PRICE.toLocaleString()}원</s> <b>${PRICE.toLocaleString()}원</b></p>
        <ul class="pay-benefits">
          <li>조심할 점의 해결 방법 전부</li>
          <li>나를 충전하는 법 (색·활동·습관)</li>
          <li>속마음 이야기와 미래 그림</li>
          <li>다음 두 달 신호등과 조언</li>
          <li>우리 둘 궁합 보기 포함 💞</li>
          <li>7일 안에 마음에 안 들면 전액 환불</li>
        </ul>
        <button class="btn-big" id="unlock-btn">19,000원으로 전부 보기 🔓</button>
        <p class="pay-small">한 번 결제하면 이 사주는 계속 다시 볼 수 있어요.</p>
      </div>
    </section>

    <div class="sticky-bar" id="sticky-cta">
      <span>가려진 글자 열기 <s>${LIST_PRICE.toLocaleString()}원</s> <b>${PRICE.toLocaleString()}원</b></span>
      <span class="sticky-btn">전부 보기 🔓</span>
    </div>`;
}

// --- 유료: 궁합 + 안내 ---
function renderPaidTail() {
  return `
    <section class="report-sec" id="compat-sec">
      <p class="sec-kicker">6장 · 우리 둘 궁합</p>
      <h2 class="sec-title">좋아하는 사람과의 케미 💞</h2>
      <div class="block-card">
        <p>상대가 태어난 날을 알려 주면 둘 사이를 봐 드려요.</p>
        <form id="compat-form" class="compat-form">
          <input type="date" id="compat-date" required min="1900-01-01" max="2050-12-31" />
          <div class="seg small" role="radiogroup">
            <label class="seg-item"><input type="radio" name="cgender" value="F" checked />여자</label>
            <label class="seg-item"><input type="radio" name="cgender" value="M" />남자</label>
          </div>
          <button type="submit" class="btn-mid">궁합 보기</button>
        </form>
        <div id="compat-result"></div>
      </div>
    </section>

    <section class="report-sec paid-badge">
      <p>✅ 상세 리포트를 보고 있어요. 이 사주는 언제든 다시 열 수 있어요.</p>
    </section>`;
}

// ---------------------------------------------------------------------------
// 궁합 (§7.4)
// ---------------------------------------------------------------------------
function bindCompatForm() {
  const f = $('#compat-form');
  if (!f) return;
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#compat-date').value;
    if (!v) return;
    const [y, m, d] = v.split('-').map(Number);
    let partner;
    try {
      partner = calculateSaju({ year: y, month: m, day: d, gender: new FormData(f).get('cgender'), timeUnknown: true });
    } catch {
      $('#compat-result').innerHTML = '<p class="form-error">이 날짜는 계산할 수 없어요. 다시 확인해 주세요.</p>';
      return;
    }
    const compat = buildCompat(currentChart, partner);
    const sig = compat.signal === '좋음' ? '🟢 아주 좋아요' : compat.signal === '보통' ? '🟡 나쁘지 않아요' : '🔴 노력이 필요해요';
    $('#compat-result').innerHTML = `
      <div class="compat-box sig-${compat.signal}">
        <p class="month-sig">${sig}</p>
        ${compat.lines.map((l) => `<p>${l}</p>`).join('')}
      </div>`;
  });
}

// ---------------------------------------------------------------------------
// 결제 (비즈니스 레이어) — PG 연동 전 체험 결제
// ---------------------------------------------------------------------------
function openPayModal() {
  const modal = $('#pay-modal');
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  renderPayStep1();
}

function closePayModal() {
  $('#pay-modal').hidden = true;
  document.body.style.overflow = '';
}

function renderPayStep1() {
  $('#pay-body').innerHTML = `
    <h2 class="pay-title">상세 리포트 결제</h2>
    <div class="pay-summary">
      <div class="pay-row"><span>쉬운 사주 상세 리포트</span><span><s>${LIST_PRICE.toLocaleString()}원</s></span></div>
      <div class="pay-row"><span>출시 기념 할인</span><span>-${(LIST_PRICE - PRICE).toLocaleString()}원</span></div>
      <div class="pay-row total"><span>결제 금액</span><span>${PRICE.toLocaleString()}원</span></div>
    </div>
    <p class="pay-method-label">결제 수단 고르기</p>
    <div class="pay-methods">
      <label class="pay-method"><input type="radio" name="paym" value="kakao" checked /><span>💛 카카오페이</span></label>
      <label class="pay-method"><input type="radio" name="paym" value="toss" /><span>💙 토스페이</span></label>
      <label class="pay-method"><input type="radio" name="paym" value="card" /><span>💳 카드 결제</span></label>
    </div>
    <button class="btn-big" id="pay-go">${PRICE.toLocaleString()}원 결제하기</button>
    <p class="pay-small">지금은 문 열기 전 시험 기간이라, 실제 돈은 나가지 않아요.</p>
    <p class="pay-small">결제 후 7일 안에 말해 주면 전액 돌려드려요.</p>
  `;
  $('#pay-go').addEventListener('click', startCheckout);
}

function startCheckout() {
  // TODO(PG 연동): 여기서 토스페이먼츠/카카오페이 결제창 호출로 교체
  $('#pay-body').innerHTML = `
    <div class="pay-loading">
      <div class="spinner"></div>
      <p>결제를 확인하고 있어요…</p>
    </div>`;
  setTimeout(() => {
    markPaid(currentParams);
    $('#pay-body').innerHTML = `
      <div class="pay-done">
        <p class="pay-done-emoji">🎉</p>
        <h2>결제 완료!</h2>
        <p>이제 가려진 글자가 전부 열렸어요.</p>
        <button class="btn-big" id="pay-open">상세 리포트 열기</button>
      </div>`;
    $('#pay-open').addEventListener('click', () => {
      closePayModal();
      renderReport(true);
      window.scrollTo(0, 0);
    });
  }, 1400);
}

$('#pay-close').addEventListener('click', closePayModal);
$('#pay-modal').addEventListener('click', (e) => {
  if (e.target === $('#pay-modal')) closePayModal();
});

// ---------------------------------------------------------------------------
tryLoadFromUrl();
