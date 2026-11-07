// Web Speech API (TTS) Chinese Narration Engine for CubeLab 3D Coach Commentary

export function formatCubeCommentaryForSpeech(rawText: string): string {
  if (!rawText) return '';

  return (
    rawText
      // Remove decorative leading/inline emojis & variation selectors so TTS doesn't read emoji descriptions
      .replace(/[🎉🎙️⚡💡⚠️✅✓⏱️🎲🎬🎮📚🧊📖🔊🔇🎯✨\uFE0F]/gu, '')
      // Replace arrows with natural pauses
      .replace(/[→↔]/g, '，')
      // Replace degree symbols
      .replace(/(\d+)\s*°/g, ' $1度 ')
      .replace(/°/g, '度')
      // Replace tilde ranges (e.g. 1~3 次 -> 1到3 次)
      .replace(/(\d+)\s*[~～]\s*(\d+)/g, '$1到$2')
      // Convert double-turn notation tokens (e.g. R2, U2, M2, R2', u2) into natural Chinese speech
      .replace(/(?<![A-Za-z0-9_])([RLUDFBrludfbMESxyz])2['’]?(?![A-Za-z0-9_])/g, '$1二')
      // Convert prime/counter-clockwise notation tokens (e.g. R', U', F', r') into natural Chinese speech
      .replace(/(?<![A-Za-z0-9_])([RLUDFBrludfbMESxyz])['’]/g, '$1撇')
      // Replace hyphens between Chinese characters or notation tokens so TTS doesn't read "减"
      .replace(/([\u4e00-\u9fa5])\s*-\s*(?=[\u4e00-\u9fa5])/g, '$1、')
      .replace(/([A-Za-z0-9二撇])\s*-\s*(?=[A-Za-z0-9\u4e00-\u9fa5])/g, '$1 ')
      // Clean up whitespace for smoother prosody
      .replace(/\s+/g, ' ')
      .trim()
  );
}

type NarrationListener = (speaking: boolean, text: string) => void;

class NarrationEngine {
  private enabled = true;
  private speaking = false;
  private currentText = '';
  private listeners = new Set<NarrationListener>();
  private fallbackTimer: number | null = null;
  private activeSessionId = 0;

  public setEnabled(val: boolean): void {
    this.enabled = val;
    if (!val) {
      this.stop();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  public getCurrentText(): string {
    return this.currentText;
  }

  public subscribe(listener: NarrationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.speaking, this.currentText);
    }
  }

  private clearTimer(): void {
    if (this.fallbackTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  public stop(): void {
    this.activeSessionId++;
    this.clearTimer();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore speechSynthesis errors in restricted contexts
      }
    }
    if (this.speaking || this.currentText) {
      this.speaking = false;
      this.currentText = '';
      this.notify();
    }
  }

  private pickChineseVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return null;
    }
    try {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return null;

      // Prefer Mainland Chinese natural voices first (e.g., Tingting, Google 普通话, Microsoft Xiaoxiao)
      const zhCN = voices.filter((v) =>
        v.lang.toLowerCase().replace('_', '-').startsWith('zh-cn')
      );
      if (zhCN.length > 0) {
        const preferred = zhCN.find(
          (v) =>
            v.name.includes('Tingting') ||
            v.name.includes('Xiaoxiao') ||
            v.name.includes('Yunxi') ||
            v.name.includes('Google') ||
            v.localService
        );
        return preferred ?? zhCN[0];
      }

      // Fallback to any Chinese voice (zh-TW, zh-HK, zh)
      const anyZh = voices.find((v) => v.lang.toLowerCase().startsWith('zh'));
      return anyZh ?? null;
    } catch {
      return null;
    }
  }

  public speak(
    rawText: string,
    options?: {
      force?: boolean;
      rate?: number;
      minHoldMs?: number;
      onEnd?: () => void;
    }
  ): void {
    const force = options?.force ?? false;
    if (!this.enabled && !force) {
      options?.onEnd?.();
      return;
    }

    const spokenText = formatCubeCommentaryForSpeech(rawText);
    if (!spokenText) {
      options?.onEnd?.();
      return;
    }

    this.stop();
    const sessionId = ++this.activeSessionId;
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.speaking = true;
    this.currentText = rawText;
    this.notify();

    let finished = false;
    const finishOnce = () => {
      if (finished || sessionId !== this.activeSessionId) return;
      finished = true;
      this.clearTimer();
      this.speaking = false;
      this.currentText = '';
      this.notify();
      options?.onEnd?.();
    };

    const rate = Math.max(0.85, Math.min(1.5, options?.rate ?? 1.1));
    // Minimum reading cadence when browser speechSynthesis stub-ends in 0ms
    const defaultMinHold = force
      ? Math.min(2200, Math.max(950, Math.round(spokenText.length * 38)))
      : 650;
    const minHoldMs = options?.minHoldMs ?? defaultMinHold;

    // Max safety timeout in case browser TTS hangs without firing onend
    const maxTimeoutMs = Math.min(
      12000,
      Math.max(1800, Math.round((spokenText.length * 210) / rate))
    );

    const handleSpeechEndOrError = () => {
      if (finished || sessionId !== this.activeSessionId) return;
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const elapsed = now - startTime;
      // If speechSynthesis fired onend/onerror before minHoldMs (e.g. muted/headless browser speech stub),
      // hold the speaking state for minHoldMs so narrated walkthroughs & UI indicators pace naturally.
      if (minHoldMs > elapsed && typeof window !== 'undefined') {
        this.clearTimer();
        this.fallbackTimer = window.setTimeout(finishOnce, Math.round(minHoldMs - elapsed));
      } else {
        finishOnce();
      }
    };

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    ) {
      try {
        const utterance = new SpeechSynthesisUtterance(spokenText);
        utterance.lang = 'zh-CN';
        utterance.rate = rate;
        utterance.pitch = 1.02;

        const zhVoice = this.pickChineseVoice();
        if (zhVoice) {
          utterance.voice = zhVoice;
        }

        utterance.onend = handleSpeechEndOrError;
        utterance.onerror = handleSpeechEndOrError;

        window.speechSynthesis.speak(utterance);
        this.fallbackTimer = window.setTimeout(finishOnce, maxTimeoutMs);
        return;
      } catch {
        // Fallback to simulated timer below
      }
    }

    // Fallback when Web Speech API is unavailable
    if (typeof window !== 'undefined') {
      this.fallbackTimer = window.setTimeout(finishOnce, minHoldMs);
    } else {
      finishOnce();
    }
  }
}

export const narrationEngine = new NarrationEngine();
