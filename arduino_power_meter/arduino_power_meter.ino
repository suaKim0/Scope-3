#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// LCD 설정 (주소 0x27 또는 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// 핀 설정
const int ACS712_PIN = A0;

// ACS712-5A 감도 (V/A)
const float SENSITIVITY = 0.185;

// 테스트용 5V 전원 (보고서대로 저전압 측정)
const float VOLTAGE = 5.0;

// 환경부 탄소배출계수 (kgCO2/kWh)
const float CARBON_FACTOR = 0.4647;

// 누적 변수
float totalEnergyWh = 0.0;
float totalCarbonG = 0.0;
unsigned long lastTime = 0;

// 0A 보정 기준점
float zeroPoint = 2.5;

void setup() {
  Serial.begin(9600);

  // LCD 초기화
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Scope:3 Power");
  lcd.setCursor(0, 1);
  lcd.print("Calibrating...");

  // ==========================================
  // 0A 보정: IP+/IP-에 아무것도 연결 안 된 상태에서
  // 1000회 샘플링으로 실제 0A 기준점 찾기
  // ==========================================
  delay(1000); // 안정화 대기

  long sum = 0;
  for (int i = 0; i < 1000; i++) {
    sum += analogRead(ACS712_PIN);
    delayMicroseconds(100);
  }
  float avgRaw = sum / 1000.0;
  zeroPoint = (avgRaw / 1024.0) * 5.0;

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Zero:");
  lcd.print(zeroPoint, 3);
  lcd.print("V");

  Serial.print("Zero Point Calibrated: ");
  Serial.println(zeroPoint, 4);

  delay(2000);
  lastTime = millis();
}

void loop() {
  // 보고서대로 500회 이상 고주파 샘플링 + 이동평균 필터
  long sum = 0;
  for (int i = 0; i < 500; i++) {
    sum += analogRead(ACS712_PIN);
    delayMicroseconds(200);
  }
  float avgRaw = sum / 500.0;

  // 전압 변환 (5V 기준, 10bit ADC)
  float voltage = (avgRaw / 1024.0) * 5.0;

  // ==========================================
  // 전류 계산 (보정된 0A 기준점 사용)
  // ==========================================
  float current = (voltage - zeroPoint) / SENSITIVITY;

  // 노이즈 제거 (작은 값은 0으로)
  if (abs(current) < 0.02) current = 0;
  current = abs(current);

  // 전력 계산 (P = I * V)
  float power = current * VOLTAGE;

  // 누적 에너지 (Wh)
  unsigned long now = millis();
  float deltaTime = (now - lastTime) / 1000.0;
  lastTime = now;

  float energyThisCycle = power * (deltaTime / 3600.0);
  totalEnergyWh += energyThisCycle;

  // 탄소배출량 계산 (g CO2)
  float carbonThisCycle = (energyThisCycle / 1000.0) * (CARBON_FACTOR * 1000.0);
  totalCarbonG += carbonThisCycle;

  // LCD 출력 (2줄)
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("P:");
  lcd.print(power, 3);
  lcd.print("W");

  lcd.setCursor(0, 1);
  lcd.print("CO2:");
  if (totalCarbonG < 1000) {
    lcd.print(totalCarbonG, 6);
    lcd.print("g");
  } else {
    lcd.print(totalCarbonG / 1000.0, 3);
    lcd.print("kg");
  }

  // 1초마다 시리얼 전송 (Python이 파싱)
  Serial.print("CURRENT:");
  Serial.print(current, 4);
  Serial.print(",POWER:");
  Serial.print(power, 4);
  Serial.print(",CARBON:");
  Serial.print(totalCarbonG, 6);
  Serial.print(",ENERGY:");
  Serial.println(totalEnergyWh, 6);

  delay(1000);
}