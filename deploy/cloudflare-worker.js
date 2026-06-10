// Cloudflare Worker：坚果云 WebDAV CORS 代理
// 把它部署到 https://你的-worker-name.your-subdomain.workers.dev
// 然后在课程「同步设置页」的 WebDAV 代理地址里填这个 URL
//
// 部署步骤见同目录 DEPLOY.md
//
// 工作原理：
//   1. 浏览器请求 https://YOUR-WORKER.workers.dev/dav/camera-3a/sync.json
//   2. Worker 把请求转发到 https://dav.jianguoyun.com/dav/camera-3a/sync.json
//   3. 加 CORS 头，剥掉 WWW-Authenticate（防止浏览器弹原生登录窗）
//   4. 返回给浏览器

const UPSTREAM = "https://dav.jianguoyun.com";

// 允许从这些来源访问。建议改成你 GitHub Pages 的固定域名增强安全。
// 设为 ["*"] 表示允许任何来源（最方便但任何站点都能用你的代理）
const ALLOWED_ORIGINS = ["*"];

const ALLOWED_METHODS = "GET,POST,PUT,DELETE,PROPFIND,MKCOL,MOVE,COPY,OPTIONS,HEAD";
const ALLOWED_HEADERS = "Authorization,Content-Type,Depth,Destination,If,Lock-Token,Overwrite,Timeout";

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin)
    ? (origin || "*")
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Expose-Headers": "Content-Length,Content-Type,ETag,Last-Modified",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    // 健康检查 / 首页
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(
        "Camera 3A WebDAV proxy. Forwarding to dav.jianguoyun.com.\nUsage: " + url.origin + "/dav/...",
        { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    // CORS 预检
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // 转发请求
    const upstreamUrl = UPSTREAM + url.pathname + url.search;

    // 复制需要的头（Authorization / Depth / Content-Type 等）
    const fwdHeaders = new Headers();
    for (const [k, v] of request.headers.entries()) {
      const kl = k.toLowerCase();
      if (kl === "host" || kl === "origin" || kl === "referer") continue;
      if (kl.startsWith("cf-") || kl === "x-real-ip" || kl === "x-forwarded-for") continue;
      fwdHeaders.set(k, v);
    }
    fwdHeaders.set("Host", "dav.jianguoyun.com");

    // 决定是否需要带 body：
    //   - GET / HEAD / OPTIONS / DELETE / PROPFIND（depth=0）通常没 body
    //   - 只有当 Content-Length > 0 或 Transfer-Encoding 时才转发 body
    //   - 这避免「method 看起来要 body 但 body 是 null」让 Cloudflare upstream 报 520
    const noBodyMethods = new Set(["GET", "HEAD", "OPTIONS", "DELETE", "MKCOL", "MOVE", "COPY"]);
    const cl = request.headers.get("content-length");
    const te = request.headers.get("transfer-encoding");
    const hasBody = !noBodyMethods.has(request.method) && (
      (cl && cl !== "0") || !!te
    );

    // 诊断模式：?debug=1 时返回上游详细信息（含错误）
    const isDebug = url.searchParams.get("debug") === "1";

    // 强制 Worker fetch 用更标准的 User-Agent + 关闭 Cloudflare 缓存优化
    // 防止某些 Cloudflare 节点（如 AMS）路由到坚果云时被误判为攻击源 IP 返回 520
    if (!fwdHeaders.has("User-Agent")) {
      fwdHeaders.set("User-Agent", "Camera3A-Sync-Proxy/1.0 (WebDAV)");
    }

    let upstreamResp;
    try {
      upstreamResp = await fetch(upstreamUrl, {
        method: request.method,
        headers: fwdHeaders,
        body: hasBody ? request.body : undefined,
        redirect: "manual",
        cf: {
          // 不让 Cloudflare 边缘缓存这个 fetch 的结果
          cacheTtl: 0,
          cacheEverything: false,
          // 不要让 Cloudflare 改写或注入额外的 headers
          scrapeShield: false,
          apps: false,
          minify: { javascript: false, css: false, html: false },
        },
      });
    } catch (e) {
      return new Response(`Upstream fetch threw: ${e.name}: ${e.message}\nstack: ${e.stack}`, {
        status: 502,
        headers: { ...corsHeaders(origin), "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (isDebug) {
      const debugBody = await upstreamResp.text();
      const debugHeaders = {};
      upstreamResp.headers.forEach((v, k) => { debugHeaders[k] = v; });
      return new Response(JSON.stringify({
        upstreamUrl,
        method: request.method,
        hasBody,
        upstreamStatus: upstreamResp.status,
        upstreamStatusText: upstreamResp.statusText,
        upstreamHeaders: debugHeaders,
        upstreamBodyPreview: debugBody.slice(0, 500),
      }, null, 2), {
        status: 200,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
      });
    }

    // 复制响应头，剥掉 WWW-Authenticate / 上游的 CORS / Set-Cookie
    const respHeaders = new Headers();
    for (const [k, v] of upstreamResp.headers.entries()) {
      const kl = k.toLowerCase();
      if (kl === "www-authenticate") continue;
      if (kl.startsWith("access-control-")) continue;
      if (kl === "set-cookie") continue;
      if (kl === "transfer-encoding" || kl === "connection") continue;
      respHeaders.set(k, v);
    }
    // 加上自家 CORS 头
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      respHeaders.set(k, v);
    }

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      statusText: upstreamResp.statusText,
      headers: respHeaders,
    });
  },
};
