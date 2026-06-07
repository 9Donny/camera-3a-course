// TTS：基于浏览器 Web Speech API 的轻量语音播报
// 不依赖外部网络。Mac/Win 系统自带的中文语音都能用。

import { storage } from "./storage.js";

const PREFS_KEY = "ttsPrefs";

function getPrefs() {
  return storage.get(PREFS_KEY, { rate: 1.0, voice: null });
}

function savePrefs(prefs) {
  storage.set(PREFS_KEY, prefs);
}

// 把 Markdown 文本转成适合朗读的纯文本：
// - 去除代码块（# 标题保留文字）
// - 去除粗体/斜体标记
// - 表格转成简单逐行
// - URL 跳过
function markdownToSpeech(md) {
  if (!md) return "";
  return md
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
    .replace(/\n{2,}/g, "。\n")
    .replace(/\s+/g, " ")
    .trim();
}

class TTSController {
  constructor() {
    this.utter = null;
    this.queue = [];
    this.currentIdx = 0;
    this.onStateChange = null;
    this.state = "idle"; // idle | playing | paused
  }

  // 寻找最合适的中文语音（优先 zh-CN，回落 zh-*）
  _pickVoice() {
    if (typeof window === "undefined") return null;
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

  isSupported() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  // 播放一段文本（自动停止之前的）
  play(text) {
    if (!this.isSupported()) return false;
    this.stop();
    const speech = window.speechSynthesis;
    this.queue = [text];
    this.currentIdx = 0;
    this._speakNext();
    return true;
  }

  // 多段排队播放（每段播放完自动播下一段）
  playSequence(texts) {
    if (!this.isSupported()) return false;
    this.stop();
    this.queue = texts.filter(t => t && t.trim());
    this.currentIdx = 0;
    this._speakNext();
    return true;
  }

  _speakNext() {
    const speech = window.speechSynthesis;
    if (this.currentIdx >= this.queue.length) {
      this.state = "idle";
      this.utter = null;
      this._notify();
      return;
    }
    const text = this.queue[this.currentIdx];
    const u = new SpeechSynthesisUtterance(text);
    const prefs = getPrefs();
    u.rate = prefs.rate || 1.0;
    u.pitch = 1.0;
    u.lang = "zh-CN";
    const voice = this._pickVoice();
    if (voice) u.voice = voice;
    u.onend = () => {
      this.currentIdx += 1;
      this._speakNext();
    };
    u.onerror = (e) => {
      console.warn("TTS error:", e);
      this.state = "idle";
      this._notify();
    };
    this.utter = u;
    this.state = "playing";
    this._notify();
    speech.speak(u);
  }

  pause() {
    if (!this.isSupported()) return;
    window.speechSynthesis.pause();
    this.state = "paused";
    this._notify();
  }

  resume() {
    if (!this.isSupported()) return;
    window.speechSynthesis.resume();
    this.state = "playing";
    this._notify();
  }

  stop() {
    if (!this.isSupported()) return;
    window.speechSynthesis.cancel();
    this.queue = [];
    this.currentIdx = 0;
    this.utter = null;
    this.state = "idle";
    this._notify();
  }

  setRate(rate) {
    const prefs = getPrefs();
    prefs.rate = Math.max(0.5, Math.min(2.0, rate));
    savePrefs(prefs);
    // 当前正在播放的句子无法实时变速；下一段才会生效
    // 但我们可以重启当前句子从头
    if (this.state === "playing" && this.utter && this.queue.length > 0) {
      const remaining = this.queue.slice(this.currentIdx);
      this.stop();
      this.queue = remaining;
      this.currentIdx = 0;
      this._speakNext();
    }
  }

  getRate() {
    return getPrefs().rate || 1.0;
  }

  _notify() {
    if (this.onStateChange) this.onStateChange(this.state);
  }
}

export const tts = new TTSController();
export { markdownToSpeech };
