export class Router {
  constructor() {
    this.routes = new Map();
    this.notFound = null;
    window.addEventListener("hashchange", () => this._dispatch());
  }
  on(pattern, handler) {
    this.routes.set(pattern, handler);
    return this;
  }
  setNotFound(handler) { this.notFound = handler; return this; }
  start() { this._dispatch(); }
  go(hash) { window.location.hash = hash; }

  _dispatch() {
    const hash = window.location.hash || "#/today";
    for (const [pattern, handler] of this.routes) {
      const params = match(pattern, hash);
      if (params) { handler(params); return; }
    }
    if (this.notFound) this.notFound(hash);
  }
}

export function match(pattern, hash) {
  const pp = pattern.replace(/^#/, "").split("/").filter(Boolean);
  const hp = hash.replace(/^#/, "").split("/").filter(Boolean);
  if (pp.length !== hp.length) return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) params[pp[i].slice(1)] = decodeURIComponent(hp[i]);
    else if (pp[i] !== hp[i]) return null;
  }
  return params;
}
