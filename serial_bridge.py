import serial
import serial.tools.list_ports
import requests
import time
import sys

# ==========================================
#  설정
# ==========================================
# 아두이노 포트 자동 탐지 또는 수동 설정
# Windows: COM3, COM4 등
# Mac: /dev/tty.usbmodemxxx 또는 /dev/cu.usbmodemxxx
# Linux: /dev/ttyACM0 또는 /dev/ttyUSB0

BAUD_RATE = 9600
NODE_SERVER = "http://localhost:3000/api/power"


def find_arduino_port():
    """연결된 아두이노 포트 자동 찾기"""
    ports = serial.tools.list_ports.comports()
    for port in ports:
        # 아두이노 관련 키워드 확인
        if any(keyword in port.description.lower() for keyword in 
               ['arduino', 'ch340', 'cp210x', 'usb-serial']):
            print(f"[+] 아두이노 발견: {port.device} ({port.description})")
            return port.device
    return None


def main():
    # 포트 설정
    port_name = find_arduino_port()
    if not port_name:
        print("[-] 아두이노를 자동으로 찾지 못했습니다.")
        print("    아래 목록에서 직접 포트를 확인하세요:")
        for p in serial.tools.list_ports.comports():
            print(f"      {p.device} - {p.description}")
        port_name = input("\n포트 이름을 직접 입력하세요 (예: COM3): ").strip()

    print(f"\n[*] {port_name} 포트로 연결 시도 중...")

    try:
        ser = serial.Serial(port_name, BAUD_RATE, timeout=2)
        time.sleep(2)  # 아두이노 리셋 대기
        print("[+] 아두이노 연결 성공! 데이터 수신 대기 중...\n")
    except Exception as e:
        print(f"[-] 연결 실패: {e}")
        sys.exit(1)

    # Node.js 서버 연결 확인
    try:
        r = requests.get("http://localhost:3000/api/power/latest", timeout=2)
        print("[+] Node.js 서버 연결 확인 완료\n")
    except:
        print("[!] 경고: Node.js 서버가 켜져있는지 확인하세요 (node server.js)")
        print("    일단 데이터는 계속 읽습니다.\n")

    # 데이터 수신 루프
    while True:
        try:
            line = ser.readline().decode('utf-8').strip()
            if not line:
                continue

            # 보고서 포맷 파싱: CURRENT:xx,POWER:xx,CARBON:xx,ENERGY:xx
            if line.startswith("CURRENT:"):
                parts = line.split(',')
                data = {}
                for part in parts:
                    if ':' in part:
                        key, value = part.split(':', 1)
                        data[key] = float(value)

                print(f"[아두이노] 전류: {data.get('CURRENT', 0):.4f}A | "
                      f"전력: {data.get('POWER', 0):.4f}W | "
                      f"탄소: {data.get('CARBON', 0):.4f}g")

                # Node.js 서버로 전송
                payload = {
                    "current": data.get('CURRENT', 0),
                    "power": data.get('POWER', 0),
                    "carbon": data.get('CARBON', 0),
                    "energy": data.get('ENERGY', 0)
                }

                try:
                    res = requests.post(NODE_SERVER, json=payload, timeout=2)
                    if res.status_code == 200:
                        print(f"  → 서버 전송 완료")
                    else:
                        print(f"  → 서버 응답 오류: {res.status_code}")
                except requests.exceptions.ConnectionError:
                    print(f"  → 서버 연결 실패 (Node.js가 켜져있나요?)")
                except Exception as e:
                    print(f"  → 전송 오류: {e}")

            else:
                # 기타 시리얼 출력 (디버그용)
                print(f"[시리얼] {line}")

        except KeyboardInterrupt:
            print("\n[*] 종료합니다.")
            ser.close()
            break
        except Exception as e:
            print(f"[-] 오류: {e}")
            time.sleep(1)


if __name__ == "__main__":
    print("=" * 50)
    print("  Scope:3 아두이노 시리얼 브리지")
    print("  (아두이노 → Python → Node.js)")
    print("=" * 50)
    main()
