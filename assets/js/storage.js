// 访客模式：URL 含 ?guest=1 → 数据存到 camera3a-guest:* 前缀，与主人完全隔离
// 一旦判定为访客，会写一个 sessionStorage 标志，防止刷新后丢失
//   （sessionStorage 关闭标签页就清，不会污染主人后续访问）

const HOST_PREFIX = "camera3a:";
const GUEST_PREFIX = "camera3a-guest:";
const GUEST_FLAG = "camera3a:isGuestSession";

function detectGuest() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("guest") === "1") {
      sessionStorage.setItem(GUEST_FLAG, "1");
      return true;
    }
  } catch {}
  try {
    return sessionStorage.getItem(GUEST_FLAG) === "1";
  } catch {
    return false;
  }
}

const _isGuest = detectGuest();
const PREFIX = _isGuest ? GUEST_PREFIX : HOST_PREFIX;

export function isGuest() { return _isGuest; }

export function activePrefix() { return PREFIX; }

export class Storage {
  constructor(backend = globalThis.localStorage) {
    this.backend = backend;
  }

  _key(name) { return PREFIX + name; }

  get(name, defaultValue = null) {
    const raw = this.backend.getItem(this._key(name));
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  set(name, value) {
    try {
      this.backend.setItem(this._key(name), JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`Storage.set("${name}") failed:`, e);
      return false;
    }
  }

  remove(name) {
    this.backend.removeItem(this._key(name));
  }
}

export const storage = new Storage();
