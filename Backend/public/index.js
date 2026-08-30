// ==========================================
// Scope:3 프론트엔드 - 실시간 데이터 연동
// ==========================================

const API_BASE = ''; // 같은 origin 사용 (Node.js 정적 파일 제공)

// DOM 요소
const els = {
  power: document.getElementById('now_elec_w'),
  carbon: document.getElementById('now_co2_gph'),
  totalSav: document.getElementById('stat_sav'),
  charEmo: document.getElementById('char_emo'),
  statMain: document.getElementById('stat_main'),
  logList: document.getElementById('log_list') // 수정: 개별 log 대신 컨테이너 참조
};

/**
 * 게이지 풀스케일 값 (기기 사양에 맞게 조정 필요)
 */

/** @constant {number} MAX_POWER - 게이지가 100% 차는 기준 전력 (W) */
const MAX_POWER = 1000;

/** @constant {number} MAX_CARBON - 게이지가 100% 차는 기준 탄소량 (g/h) */
const MAX_CARBON = 500;

/** @constant {number} GAUGE_LENGTH - 반원 둘레 길이 (pi × 반지름 80) */
const GAUGE_LENGTH = 251.2;

const elecArc = document.getElementById('now_elec_arc');
const co2Arc = document.getElementById('now_co2_arc');

function setGauge(pathEl, value, max) {
  if (!pathEl) return;
  const percent = Math.min(Math.max(value / max, 0), 1);
  pathEl.style.strokeDashoffset = GAUGE_LENGTH * (1 - percent);
}

// 북극곰 상태 정의 (탄소량 기준 g)
const BEAR_STATES = [
  { max: 0.5,  emoji: '🐻‍❄️', text: '북극곰이 행복해요!', color: '#5d8bff' },
  { max: 2.0,  emoji: '🐻‍❄️', text: '북극곰 발바닥만큼 아꼈어요!', color: '#5d8bff' },
  { max: 5.0,  emoji: '😰',   text: '빙하가 조금 녹고 있어요...', color: '#ffaa5d' },
  { max: 10.0, emoji: '😭',   text: '북극곰이 위험해요!', color: '#ff5d5d' },
  { max: 9999, emoji: '💀',   text: '지구가 뜨거워요!', color: '#ff0505' }
];

function getBearState(carbonG) {
  for (const state of BEAR_STATES) {
    if (carbonG <= state.max) return state;
  }
  return BEAR_STATES[BEAR_STATES.length - 1];
}

// 실시간 데이터 가져오기
async function fetchLatest() {
  try {
    const res = await fetch(`${API_BASE}/api/power/latest`);
    if (!res.ok) throw new Error('서버 응답 오류');
    const data = await res.json();
    updateUI(data);
  } catch (e) {
    console.error('데이터 가져오기 실패:', e);
    if (els.power) els.power.textContent = '연결 중...';
    if (els.carbon) els.carbon.textContent = '--';
  }
}

// 오늘 총량 가져오기
async function fetchToday() {
  try {
    const res = await fetch(`${API_BASE}/api/power/today`);
    if (!res.ok) return;
    const data = await res.json();
    if (els.totalSav) {
      const g = data.total_carbon || 0;
      els.totalSav.textContent = g < 1000 
        ? `총 ${g.toFixed(1)}g` 
        : `총 ${(g/1000).toFixed(2)}kg`;
    }
  } catch (e) {
    console.error('오늘 총량 가져오기 실패:', e);
  }
}

// UI 업데이트
function updateUI(data) {
  const power = data.power || 0;
  const carbon = data.carbon || 0;

  // 실시간 전력
  if (els.power) {
    els.power.textContent = power > 0 
      ? `${power.toFixed(3)} W` 
      : '0.000 W';
  }

  // 실시간 탄소
  if (els.carbon) {
    els.carbon.textContent = carbon > 0 
      ? `${carbon.toFixed(2)} g` 
      : '0.00 g';
  }

  // 게이지 그래프 업데이트
  setGauge(elecArc, power, MAX_POWER);
  setGauge(co2Arc, carbon, MAX_CARBON);

  // 북극곰 상태
  const state = getBearState(carbon);
  if (els.charEmo) els.charEmo.textContent = state.emoji;
  if (els.statMain) {
    els.statMain.innerHTML = `<span>${state.text}</span>`;
    const span = els.statMain.querySelector('span');
    if (span) {
      span.style.color = '#fff';
    }
  }
}

// limit=10 대신 개수를 조절하거나, 가장 최근 1개부터 시작
async function fetchHistory() {
  try {
    // 최근 1개(또는 원하시는 시작 개수)만 요청
    const res = await fetch(`${API_BASE}/api/power/history?limit=1`);
    if (!res.ok) return;
    const rows = await res.json();
    updateLogs(rows);
  } catch (e) {
    console.error('히스토리 가져오기 실패:', e);
  }
}

function updateLogs(rows) {
  if (!els.logList) return;

  // 기존 생성되어 있던 로그 목록 초기화
  els.logList.innerHTML = '';

  // 가져온 전체 히스토리 데이터를 순회하며 바(Bar) 생성
  rows.forEach(row => {
    const timeStr = row.timestamp 
      ? new Date(row.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
      : '--:--';
    
    const carbonVal = row.carbon ? `${row.carbon.toFixed(2)}g CO₂` : '0.00g CO₂';

    // 수치에 따라 색상 분기 (예: 2.0g 초과 시 빨간색, 이하는 파란색)
    const bgColor = (row.carbon > 2.0) ? '#FF0505' : '#0144EE';

    // 새로운 log 엘리먼트 생성
    const logItem = document.createElement('div');
    logItem.className = 'sav_log';
    logItem.style.backgroundColor = bgColor;
    
    logItem.innerHTML = `
      <i></i>
      <span class="log_text">${timeStr}</span>
      <span class="log_sav">${carbonVal}</span>
    `;

    // 생성된 바를 목록에 추가
    els.logList.appendChild(logItem);
  });
}

// ==========================================
// 초기화
// ==========================================
function init() {
  console.log('Scope:3 프론트엔드 초기화');

  // 1초마다 최신 데이터 갱신
  fetchLatest();
  setInterval(fetchLatest, 1000);

  // 5초마다 오늘 총량 갱신
  fetchToday();
  setInterval(fetchToday, 5000);

  // 10초마다 히스토리 갱신
  fetchHistory();
  setInterval(fetchHistory, 10000);
}

// 페이지 로드 완료 후 실행
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}