#!/usr/bin/env python3
"""
Camera 3A 课程本地服务器（含坚果云 WebDAV 代理）

替代 `python3 -m http.server 8080`：除了静态托管外，路由 /dav-proxy/* 转发到
坚果云 dav.jianguoyun.com，绕开浏览器 CORS 限制。

启动：python3 server.py [port]
默认端口 8080，浏览器打开 http://localhost:8080/

无第三方依赖，只用 Python 标准库。Mac/Win 自带 Python 3.8+ 都能跑。
"""

import sys
import os
import http.server
import urllib.request
import urllib.error
from urllib.parse import urlsplit

# 坚果云 WebDAV 服务地址
DAV_HOST = "dav.jianguoyun.com"
DAV_BASE = f"https://{DAV_HOST}"

# 允许通过代理转发的请求头（Authorization 是关键）
ALLOWED_REQ_HEADERS = {
    "authorization",
    "content-type",
    "content-length",
    "depth",
    "destination",
    "if",
    "lock-token",
    "overwrite",
    "timeout",
}

# 注入到响应里的 CORS 头，让浏览器可以读到
def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PROPFIND,MKCOL,MOVE,COPY,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type,Depth,Destination,If,Lock-Token,Overwrite,Timeout",
        "Access-Control-Expose-Headers": "Content-Length,Content-Type,ETag,Last-Modified",
        "Access-Control-Max-Age": "86400",
    }


class CourseHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 给所有静态资源加 no-cache 头，强制每次验证（避免动态 import 命中旧缓存）
        # 注：这只对走父类 SimpleHTTPRequestHandler 的请求生效（_serve_index_with_version 自己控制）
        path_only = (self.path or "/").split("?", 1)[0]
        is_static = not path_only.startswith("/dav-proxy/")
        if is_static:
            self.send_header("Cache-Control", "no-cache, must-revalidate")
            self.send_header("Pragma", "no-cache")
        super().end_headers()

    # 处理所有 WebDAV 方法
    def do_GET(self):       self._dispatch()
    def do_HEAD(self):      self._dispatch()
    def do_POST(self):      self._dispatch()
    def do_PUT(self):       self._dispatch()
    def do_DELETE(self):    self._dispatch()
    def do_PROPFIND(self):  self._dispatch()
    def do_MKCOL(self):     self._dispatch()
    def do_MOVE(self):      self._dispatch()
    def do_COPY(self):      self._dispatch()
    def do_OPTIONS(self):
        # 浏览器预检请求 → 直接返回 CORS 头
        self.send_response(200)
        for k, v in cors_headers().items():
            self.send_header(k, v)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _dispatch(self):
        if self.path.startswith("/dav-proxy/"):
            self._proxy_dav()
            return
        # 解析 path 去掉 query 再判断（self.path 含 query string）
        path_only = self.path.split("?", 1)[0].split("#", 1)[0]
        if self.command == "GET" and (path_only == "/" or path_only == "/index.html"):
            # 给 HTML 注入当前 .version 替换 ?v=XX 占位，避免 css/js 缓存
            self._serve_index_with_version()
            return
        # 静态文件
        super().do_GET() if self.command == "GET" else super().do_HEAD()

    def _serve_index_with_version(self):
        try:
            with open("index.html", "rb") as f:
                content = f.read()
        except OSError as e:
            self.send_error(404, str(e))
            return
        # 读 .version
        try:
            with open(".version", "r", encoding="utf-8") as f:
                version = f.read().strip()
        except OSError:
            version = "dev"
        # 把所有 ?v=XX 替换成 ?v=<version>
        import re
        content_str = content.decode("utf-8", errors="replace")
        content_str = re.sub(r"\?v=[\w.-]+", f"?v={version}", content_str)
        body = content_str.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

    def _proxy_dav(self):
        # /dav-proxy/<dav-path>  →  https://dav.jianguoyun.com/<dav-path>
        sub_path = self.path[len("/dav-proxy"):]
        if not sub_path.startswith("/"):
            sub_path = "/" + sub_path
        upstream_url = DAV_BASE + sub_path

        # 复制允许的请求头
        headers = {}
        for k, v in self.headers.items():
            if k.lower() in ALLOWED_REQ_HEADERS:
                headers[k] = v

        # 读 body（如果有）
        body = None
        clen = self.headers.get("Content-Length")
        if clen and int(clen) > 0:
            body = self.rfile.read(int(clen))

        # 构造上游请求
        req = urllib.request.Request(
            upstream_url,
            data=body,
            method=self.command,
            headers=headers,
        )

        try:
            resp = urllib.request.urlopen(req, timeout=30)
            status = resp.status
            resp_body = resp.read()
            resp_headers = list(resp.headers.items())
        except urllib.error.HTTPError as e:
            status = e.code
            resp_body = e.read() or b""
            resp_headers = list(e.headers.items()) if e.headers else []
        except urllib.error.URLError as e:
            self.send_response(502)
            for k, v in cors_headers().items():
                self.send_header(k, v)
            msg = f"WebDAV upstream error: {e.reason}".encode("utf-8")
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)
            return

        # 转发响应
        self.send_response(status)
        for k, v in resp_headers:
            kl = k.lower()
            # 不要把上游的 transfer-encoding 等传过来，避免分块冲突
            if kl in ("transfer-encoding", "content-encoding", "connection"):
                continue
            # 上游的 cors 也不要原封不动转，自己加
            if kl.startswith("access-control-"):
                continue
            # 剥掉 WWW-Authenticate：否则 401 时浏览器会弹原生 Basic Auth 登录框
            if kl == "www-authenticate":
                continue
            self.send_header(k, v)
        for k, v in cors_headers().items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(resp_body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(resp_body)


def main():
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}", file=sys.stderr)
            sys.exit(1)

    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    addr = ("0.0.0.0", port)
    httpd = http.server.ThreadingHTTPServer(addr, CourseHandler)
    print(f"Camera 3A course server")
    print(f"  Static  → http://localhost:{port}/")
    print(f"  WebDAV  → http://localhost:{port}/dav-proxy/* → {DAV_BASE}/*")
    print(f"  Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        httpd.shutdown()


if __name__ == "__main__":
    main()
