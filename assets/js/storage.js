const PREFIX = "camera3a:";

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
    this.backend.setItem(this._key(name), JSON.stringify(value));
  }

  remove(name) {
    this.backend.removeItem(this._key(name));
  }
}

export const storage = new Storage();
