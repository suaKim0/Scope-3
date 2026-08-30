# Scope:3 - 가정용 전력 소비 실시간 탄소배출량 측정 시스템

아두이노(Arduino Uno) + ACS712 전류센서를 활용해 가전제품의 전력 소비량을 실시간으로 측정하고, 이를 탄소배출량(gCO₂)으로 환산하여 LCD 및 휴태폰 웹 대시보드에 시각화하는 시스템입니다.

---

## 프로젝트 구조

```
Scope3/
├── arduino/
│   └── arduino_power_meter.ino    # 아두이노 펌웨어
├── backend/
│   ├── server.js                  # Node.js 백엔드 (Express + SQLite)
│   ├── package.json               # Node.js 의존성
│   └── public/                    # 프론트엔드 정적 파일
│       ├── index.html
│       ├── style.css
│       ├── fonts.css
│       └── index.js
├── python/
│   └── serial_bridge.py           # 아두이노 ↔ Node.js 중계 브리지
└── README.md                      # 이 파일
```

---

## 필요한 환경

| 도구 | 버전 | 설치 방법 |
|------|------|-----------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **Python** | 3.8+ | [python.org](https://python.org) 또는 Microsoft Store |
| **Arduino IDE** | 2.x | [arduino.cc](https://arduino.cc) |
| **Git** | - | [git-scm.com](https://git-scm.com) (선택) |

### Python 라이브러리

```bash
python -m pip install pyserial requests
```

### Node.js 의존성

```bash
cd backend
npm install
```

---

## 하드웨어 연결

### 부품 목록

| 부품 | 수량 |
|------|------|
| Arduino Uno | 1 |
| ACS712-5A 전류센서 | 1 |
| I2C LCD 16x2 | 1 |
| 브레드보드 | 1 |
| 220Ω 저항 | 1 |
| 점퍼선 (암-수, 수-수) | 여러 개 |

### 회로도

```
[Arduino Uno]
   5V ────────┬────────► [브레드보드 빨강(+) 레일]
              │              ├──► ACS712 VCC
              │              └──► LCD VCC
   GND ───────┼────────► [브레드보드 파랑(-) 레일]
              │              ├──► ACS712 GND
              │              └──► LCD GND
   A0/A1 ◄────┴──────── ACS712 OUT
   A4 ────────────────► LCD SDA
   A5 ────────────────► LCD SCL

[ACS712 초록단자]
   IP+ (위쪽) ◄── 5V 테스트 회로 (+)
   IP- (아래쪽) ──► 220Ω 저항 ──► GND
```

> **안전 주의**: 본 프로젝트는 5V DC 저전압 테스트 환경으로 설계되었습니다. 실제 220V 가정용 전원에 직접 연결하지 마세요.

---

## 실행 방법

### 터미널 두 개를 동시에 사용합니다

#### 터미널 1: Node.js 백엔드 서버

```bash
cd backend
npm install        # 처음 한 번만
node server.js
```

실행 확인:
```
[DB] SQLite 데이터베이스 준비 완료
==================================================
  Scope:3 백엔드 서버 실행 중
  http://localhost:3000
==================================================
```

**이 창은 끄지 말고 그대로 두세요!**

---

#### 터미널 2: Python 아두이노 브리지

VSCode에서 `Ctrl + Shift + `` (백틱)` 또는 터미널 탭 옆 **+ 버튼** 클릭으로 새 터미널을 엽니다.

```bash
cd python
python serial_bridge.py
```

포트 입력:
```
포트 이름을 직접 입력하세요 (예: COM3): COM3
```

실행 확인:
```
[+] 아두이노 연결 성공! 데이터 수신 대기 중...
[아두이노] 전류: 0.0482A | 전력: 0.2411W | 탄소: 0.000133g
  → 서버 전송 완료
```

**이 창도 끄지 말고 그대로 두세요!**

---

### 웹 대시보드 접속

| 기기 | 주소 |
|------|------|
| PC (같은 컴퓨터) | http://localhost:3000 |
| 휴태폰 (같은 WiFi) | http://(PC_IP주소):3000 |

> PC의 IP 주소 확인: `cmd` → `ipconfig` → IPv4 주소

---

## GitHub에 올리기

### 1. 레포지토리 생성

1. [github.com](https://github.com) 접속 → 로그인
2. 우측 상단 **+** → **New repository**
3. Repository name: `scope3`
4. **Public** 선택 → **Create repository**

### 2. 로컬 프로젝트 연결

```bash
# 프로젝트 최상위 폴터로 이동
cd Scope3

# Git 초기화
git init

# 파일 추가
git add .

# 커밋
git commit -m "Initial commit"

# GitHub 원격 저장소 연결 (본인 아이디로 변경)
git remote add origin https://github.com/본인아이디/scope3.git

# 업로드
git push -u origin main
```

> `main`이 안 되면 `master`로 시도: `git push -u origin master`

### 3. GitHub 웹에서 직접 올리기 (Git 없이)

Git 명령어가 안 될 경우:
1. GitHub 레포 접속 → **Add file** → **Upload files**
2. `backend/`, `arduino/`, `python/` 폴터를 **ZIP으로 압축** 후 업로드
3. 또는 파일을 직접 드래그앤드롭

---

## 문제 해결

| 문제 | 원인 | 해결 |
|------|------|------|
| `LiquidCrystal_I2C.h` 오류 | 라이브러리 미설치 | Arduino IDE → 라이브러리 관리 → "LiquidCrystal I2C" 설치 |
| LCD 주소 못 찾음 | I2C 주소 불일치 | `0x27` 또는 `0x3F` 둘 다 시도 |
| Python `pip` 오류 | PATH 미등록 | `python -m pip install ...` 사용 |
| `PermissionError(13)` | COM 포트 점유 중 | Arduino IDE 시리얼 모니터 닫기 |
| 서버 연결 실패 | Node.js 서버 꺼짐 | 터미널 1에서 `node server.js` 재실행 |
| 휴태폰 접속 불가 | 방화벽 or 다른 네트워크 | PC와 휴태폰이 **같은 WiFi**에 연결되어야 함 |

---

## 라이선스

본 프로젝트는 XSME 제16회 전국학생설계경진대회(2026) 출품작입니다.

---

## 팀원

| 이름 | 역할 |
|------|------|
| 김수아 | 팀장, 하드웨어/펌웨어 |
| 박희건 | 프론트엔드 |
| 고이욱 | 프론트엔드 |
