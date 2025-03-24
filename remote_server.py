import asyncio
import websockets
import json
import pyautogui
import base64
import io
from PIL import ImageGrab
import sys
import os
import ssl

# 화면 캡처 및 인코딩 함수
async def capture_screen():
    screenshot = ImageGrab.grab()
    buffer = io.BytesIO()
    screenshot.save(buffer, format='JPEG', quality=30)
    img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
    return img_str

# 마우스 제어 함수
async def control_mouse(x, y, action):
    screen_width, screen_height = pyautogui.size()
    
    # 상대적 위치를 절대적 위치로 변환
    abs_x = int(x * screen_width)
    abs_y = int(y * screen_height)
    
    if action == "move":
        pyautogui.moveTo(abs_x, abs_y)
    elif action == "click":
        pyautogui.click(abs_x, abs_y)
    elif action == "double_click":
        pyautogui.doubleClick(abs_x, abs_y)
    elif action == "right_click":
        pyautogui.rightClick(abs_x, abs_y)

# 키보드 제어 함수
async def control_keyboard(key):
    pyautogui.press(key)

# 클라이언트 연결 처리
async def handle_client(websocket, path):
    try:
        print("클라이언트가 연결되었습니다!")
        
        # 초기 화면 전송
        screen = await capture_screen()
        await websocket.send(json.dumps({"type": "screen", "data": screen}))
        
        # 클라이언트로부터 메시지 수신 및 처리
        async for message in websocket:
            data = json.loads(message)
            
            if data["type"] == "mouse":
                await control_mouse(data["x"], data["y"], data["action"])
            elif data["type"] == "keyboard":
                await control_keyboard(data["key"])
            elif data["type"] == "request_screen":
                screen = await capture_screen()
                await websocket.send(json.dumps({"type": "screen", "data": screen}))
    
    except websockets.exceptions.ConnectionClosed:
        print("클라이언트 연결이 종료되었습니다.")
    except Exception as e:
        print(f"오류 발생: {e}")

# 메인 함수
async def main():
    host = "0.0.0.0"  # 모든 네트워크 인터페이스에서 수신
    port = 8765
    
    # SSL 컨텍스트 생성
    ssl_context = None
    cert_file = "cert.pem"
    key_file = "key.pem"
    
    if os.path.exists(cert_file) and os.path.exists(key_file):
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(cert_file, key_file)
        print("SSL 인증서를 로드했습니다. WSS 연결이 가능합니다.")
    else:
        print("SSL 인증서가 없습니다. WS 연결만 가능합니다.")
        print("HTTPS 페이지에서 접속하려면 SSL 인증서가 필요합니다.")
    
    server = await websockets.serve(handle_client, host, port, ssl=ssl_context)
    protocol = "https" if ssl_context else "http"
    print(f"서버가 시작되었습니다. {protocol}://{host}:{port}")
    
    # 로컬 IP 주소 출력
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"로컬 IP 주소: {protocol}://{local_ip}:{port}")
    
    await server.wait_closed()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("서버가 종료되었습니다.")
        sys.exit(0) 