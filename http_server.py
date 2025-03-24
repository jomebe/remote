import http.server
import socketserver

PORT = 8000

Handler = http.server.SimpleHTTPRequestHandler
httpd = socketserver.TCPServer(("", PORT), Handler)

print(f"HTTP 서버가 포트 {PORT}에서 실행 중입니다.")
print(f"브라우저에서 http://localhost:{PORT}/ 로 접속하세요.")
httpd.serve_forever() 