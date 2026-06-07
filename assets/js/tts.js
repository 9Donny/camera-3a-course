// TTS：基于浏览器 Web Speech API 的轻量语音播报
// 设计：把整段文本拆成短句逐句朗读；Pause/Resume 通过 stop + 记录位置 + 重续 实现，
// 绕过 Chrome 在 Mac 下中文语音 pause()/resume() 不可靠的已知问题。
// Stop 调用 cancel() 强制停止，并清空所有内部状态。

import { storage } from "./storage.js";

const PREFS_KEY = "ttsPrefs";

function getPrefs() {
  return storage.get(PREFS_KEY, { rate: 1.0, voice: null });
}
function savePrefs(prefs) {
  storage.set(PREFS_KEY, prefs);
}

// 把 Markdown 文本转成适合朗读的纯文本
export function markdownToSpeech(md) {
  if (!md) return "";
  return md
    .replace(/<figure[\s\S]*?<\/figure>/g, "（此处有一张配图，已跳过）")
    .replace(/```[\s\S]*?```/g, "（此处有一段示意图，已跳过）")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\|/g, "，")
    .replace(/---+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// 把长文按句子（。！？.!?换行）切成短段，方便精细控制位置
function splitToSentences(text) {
  if (!text) return [];
  return text
    .split(/(?<=[。！？.!?\n])\s*/)
    .map(s => s.trim())
    .filter(Boolean);
}

class TTSController {
  constructor() {
    this.sentences = [];   // 全部待朗读的句子（已扁平化）
    this.cursor = 0;       // 当前应朗读到的索引
    this.state = "idle";   // idle | playing | paused
    this.onStateChange = null;
    this._currentUtter = null;
    // SpeechSynthesis 在内存压力下偶尔卡住，需要一个看门狗
    this._watchdog = null;
  }

  isSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  _pickVoice() {
    if (!this.isSupported()) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    const prefs = getPrefs();
    if (prefs.voice) {
      const found = voices.find(v => v.name === prefs.voice);
      if (found) return found;
    }
    return (
      voices.find(v => v.lang === "zh-CN") ||
      voices.find(v => v.lang && v.lang.startsWith("zh")) ||
      voices.find(v => v.default) ||
      voices[0]
    );
  }

  _setState(s) {
    this.state = s;
    if (this.onStateChange) {
      try { this.onStateChange(s); } catch (e) { console.warn("onStateChange threw", e); }
    }
  }

  // 公开：朗读单段文本（覆盖之前的）
  play(text) {
    if (!this.isSupported()) return false;
    this._cancelImmediate();
    this.sentences = splitToSentences(text);
    this.cursor = 0;
    this._setState("playing");
    this._speakAtCursor();
    return true;
  }

  // 公开：依次朗读多段（每段会先 split 成句子）
  playSequence(texts) {
    if (!this.isSupported()) return false;
    this._cancelImmediate();
    this.sentences = texts.flatMap(t => splitToSentences(t));
    this.cursor = 0;
    this._setState("playing");
    this._speakAtCursor();
    return true;
  }

  // 公开：暂停（实际是 stop，但保留 cursor 和 sentences）
  pause() {
    if (!this.isSupported()) return;
    if (this.state !== "playing") return;
    this._cancelImmediate(/* keepQueue */ true);
    this._setState("paused");
  }

  // 公开：从暂停处继续
  resume() {
    if (!this.isSupported()) return;
    if (this.state !== "paused") return;
    if (this.cursor >= this.sentences.length) {
      this._setState("idle");
      return;
    }
    this._setState("playing");
    this._speakAtCursor();
  }

  // 公开：完全停止
  stop() {
    if (!this.isSupported()) return;
    this._cancelImmediate();
    this._setState("idle");
  }

  // 公开：调节速度
  setRate(rate) {
    const prefs = getPrefs();
    prefs.rate = Math.max(0.5, Math.min(2.0, rate));
    savePrefs(prefs);
    if (this.state === "playing") {
      // 重启当前句子让新速度生效
      this._cancelImmediate(/* keepQueue */ true);
      this._setState("playing");
      this._speakAtCursor();
    }
  }

  getRate() {
    return getPrefs().rate || 1.0;
  }

  // ==================== 内部 ====================

  _cancelImmediate(keepQueue = false) {
    if (this._watchdog) {
      clearTimeout(this._watchdog);
      this._watchdog = null;
    }
    if (this._currentUtter) {
      // 清掉 onend 防止 cancel 后还触发推进
      this._currentUtter.onend = null;
      this._currentUtter.onerror = null;
      this._currentUtter = null;
    }
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    if (!keepQueue) {
      this.sentences = [];
      this.cursor = 0;
    }
  }

  _speakAtCursor() {
    if (this.state !== "playing") return;
    if (this.cursor >= this.sentences.length) {
      this._setState("idle");
      return;
    }
    const text = this.sentences[this.cursor];
    if (!text) {
      this.cursor += 1;
      this._speakAtCursor();
      return;
    }

    const u = new SpeechSynthesisUtterance(text);
    const prefs = getPrefs();
    u.rate = prefs.rate || 1.0;
    u.pitch = 1.0;
    u.lang = "zh-CN";
    const voice = this._pickVoice();
    if (voice) u.voice = voice;

    u.onend = () => {
      if (this._currentUtter !== u) return; // 已被取消
      this.cursor += 1;
      this._speakAtCursor();
    };
    u.onerror = (e) => {
      if (this._currentUtter !== u) return;
      // 静默错误（cancel 触发的 interrupted 不是真错误）
      if (e.error && e.error !== "canceled" && e.error !== "interrupted") {
        console.warn("TTS error:", e.error);
      }
    };

    this._currentUtter = u;
    try {
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn("speak() threw:", e);
      this._setState("idle");
    }
  }
}

export const tts = new TTSController();
