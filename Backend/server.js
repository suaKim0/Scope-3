const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// 미들웨어
app.use(cors());
app.use(express.json());

// 정적 파일 제공 (프론트엔드 HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// SQLite 데이터베이스 설정
// ==========================================
const db = new sqlite3.Database('./power_data.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      current REAL,
      power REAL,
      carbon REAL,
      energy REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('[DB] SQLite 데이터베이스 준비 완료');
});

// ==========================================
// API 라우트
// ==========================================

// 1. 아두이노(Python 브리지)에서 데이터 받기 (POST)
app.post('/api/power', (req, res) => {
  const { current, power, carbon, energy } = req.body;

  if (power === undefined || carbon === undefined) {
    return res.status(400).json({ error: 'power와 carbon 값이 필요합니다' });
  }

  const stmt = db.prepare(
    'INSERT INTO logs (current, power, carbon, energy) VALUES (?, ?, ?, ?)'
  );

  stmt.run([current || 0, power, carbon, energy || 0], function(err) {
    if (err) {
      console.error('[DB] 저장 오류:', err);
      return res.status(500).json({ error: '데이터 저장 실패' });
    }
    res.json({ status: 'ok', id: this.lastID });
  });
  stmt.finalize();
});

// 2. 최신 데이터 조회 (프론트엔드 폴링용) (GET)
app.get('/api/power/latest', (req, res) => {
  db.get(
    'SELECT * FROM logs ORDER BY timestamp DESC LIMIT 1',
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.json({ current: 0, power: 0, carbon: 0, energy: 0, timestamp: null });
      }
      res.json(row);
    }
  );
});

// 3. 최근 N개 데이터 조회 (그래프용) (GET)
app.get('/api/power/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  db.all(
    'SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?',
    [limit],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows.reverse()); // 시간순으로 정렬해서 반환
    }
  );
});

// 4. 오늘 총절약량 (GET)
app.get('/api/power/today', (req, res) => {
  db.get(
    "SELECT SUM(carbon) as total_carbon, SUM(energy) as total_energy FROM logs WHERE DATE(timestamp) = DATE('now', 'localtime')",
    [],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({
        total_carbon: row.total_carbon || 0,
        total_energy: row.total_energy || 0
      });
    }
  );
});

// ==========================================
// 서버 시작
// ==========================================
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('  Scope:3 백엔드 서버 실행 중');
  console.log(`  http://localhost:${PORT}`);
  console.log('  (같은 WiFi에서는 휴태폰으로 IP:3000 접속 가능)');
  console.log('='.repeat(50));
});