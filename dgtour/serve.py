# -*- coding: utf-8 -*-
"""시안 홈페이지·APK를 사내망에 띄우는 정적 서버.

    python serve.py            → 8080 포트
    python serve.py 9000       → 포트 지정

휴대폰에서 아래 주소로 접속하면 시안 앱 다운로드 페이지가 열린다.
    http://<이 PC의 IP>:8080/download.html
"""
import http.server
import os
import socket
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.abspath(__file__))

# 윈도우 기본 콘솔(cp949)에서 한글·기호 출력이 깨지거나 오류나지 않도록 UTF-8로 맞춘다.
for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        # 시안을 고치면 앱·브라우저에서 바로 보이도록 캐시를 막는다.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        # APK 다운로드와 알림 조회만 눈에 보이게 남긴다.
        msg = fmt % args
        if ".apk" in msg or "notices.json" in msg or "version.json" in msg:
            sys.stderr.write(f"  {msg}\n")


Handler.extensions_map.update({".apk": "application/vnd.android.package-archive"})


def local_ips():
    ips = []
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.append(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if ip not in ips and not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass
    return ips


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    ips = local_ips()
    print(f"\n  시안 서버 실행 중 (포트 {PORT})  (중지: Ctrl+C)")
    print(f"  루트: {ROOT}\n")
    print("  휴대폰에서 접속할 주소")
    for ip in ips or ["<PC의 IP를 확인하세요>"]:
        print(f"    http://{ip}:{PORT}/download.html      ← 시안별 앱 다운로드")
    print(f"    http://localhost:{PORT}/admin-push.html   ← 앱 푸시 관리(관리자)")
    print(f"    http://localhost:{PORT}/sites.html        ← 시안 홈페이지 6종\n")
    print("  ※ 앱에 입력할 서버 주소는 위 http://IP:포트/ 까지입니다.")
    print("  ※ 휴대폰이 같은 공유기(사내망)에 연결되어 있어야 하며,")
    print("     접속되지 않으면 PC 방화벽에서 해당 포트를 허용해 주세요.\n")
    with Server(("0.0.0.0", PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  중지했습니다.\n")
