'use client';

/**
 * All Liki-specific CSS, scoped under `.lokalweb-liki`. Surfaces and text
 * adapt to LokalWeb's light/dark theme tokens (--background, --card,
 * --border, --foreground, --muted-foreground, --secondary, --destructive,
 * --success). The Liki signature gradient (violet → pink → orange) stays
 * vivid across both modes — it's Liki's identity, not a theme variant.
 *
 * Pattern matches WizardStyles in the legacy Wizard.tsx (styled-jsx global
 * scoped under a single root class).
 */

export function LikiStyles() {
  return (
    <style jsx global>{`
      .lokalweb-liki {
        --liki-grad: linear-gradient(135deg, #8b5cf6 0%, #ec4899 55%, #f97316 100%);
        --liki-violet: #8b5cf6;
        --liki-pink: #ec4899;
        --liki-orange: #f97316;
        --liki-violet-tint: rgba(139, 92, 246, 0.12);
        --liki-violet-tint-strong: rgba(139, 92, 246, 0.18);
        --liki-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
        --liki-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

        position: fixed;
        inset: 0;
        background: hsl(var(--background));
        color: hsl(var(--foreground));
        overflow-y: auto;
        overflow-x: hidden;
        font-family: var(--font-sans);
      }

      .lokalweb-liki::before {
        content: '';
        position: fixed;
        inset: 0;
        background-image:
          radial-gradient(ellipse 800px 600px at 50% -5%, rgba(139, 92, 246, 0.08), transparent 60%),
          radial-gradient(ellipse 600px 500px at 90% 100%, rgba(249, 115, 22, 0.05), transparent 55%),
          radial-gradient(ellipse 500px 500px at 5% 90%, rgba(79, 142, 247, 0.05), transparent 55%);
        pointer-events: none;
        z-index: 0;
      }

      /* ============ Topbar ============ */
      .lokalweb-liki .li-topbar {
        position: fixed;
        top: 0; left: 0; right: 0;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 18px 28px;
        background: hsl(var(--background) / 0.72);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border-bottom: 1px solid hsl(var(--border));
      }

      .lokalweb-liki .li-topbar-left {
        display: flex;
        align-items: center;
        gap: 11px;
      }

      .lokalweb-liki .li-tb-avatar {
        width: 34px; height: 34px;
        border-radius: 10px;
        background: var(--liki-grad);
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 3px 14px rgba(139, 92, 246, 0.3);
      }
      .lokalweb-liki .li-tb-avatar::before {
        content: '';
        width: 12px; height: 12px;
        border-radius: 50%;
        background: rgba(255,255,255,0.95);
        box-shadow: 0 0 8px rgba(255,255,255,0.5);
      }

      .lokalweb-liki .li-tb-name {
        font-weight: 700;
        font-size: 14px;
        letter-spacing: -0.01em;
        color: hsl(var(--foreground));
      }

      .lokalweb-liki .li-progress-area {
        flex: 1;
        max-width: 380px;
        margin: 0 28px;
      }
      .lokalweb-liki .li-progress-meta {
        display: flex; justify-content: space-between;
        font-size: 10.5px;
        color: hsl(var(--muted-foreground));
        font-family: var(--font-mono);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 6px;
      }
      .lokalweb-liki .li-progress-track {
        height: 3px;
        background: hsl(var(--secondary));
        border-radius: 999px;
        overflow: hidden;
      }
      .lokalweb-liki .li-progress-fill {
        height: 100%;
        background: var(--liki-grad);
        width: 0%;
        border-radius: 999px;
        transition: width 0.6s var(--liki-ease-out);
      }

      .lokalweb-liki .li-back-btn,
      .lokalweb-liki .li-restart-btn {
        background: transparent;
        border: 1px solid hsl(var(--border));
        color: hsl(var(--muted-foreground));
        height: 34px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s var(--liki-ease-out);
        font-family: inherit;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .lokalweb-liki .li-back-btn { width: 34px; font-size: 15px; }
      .lokalweb-liki .li-restart-btn {
        padding: 0 12px;
        font-size: 12px;
        font-weight: 500;
        margin-right: 8px;
      }
      .lokalweb-liki .li-back-btn:hover:not(:disabled),
      .lokalweb-liki .li-restart-btn:hover {
        background: hsl(var(--secondary));
        color: hsl(var(--foreground));
      }
      .lokalweb-liki .li-back-btn:disabled { opacity: 0.3; cursor: not-allowed; }

      .lokalweb-liki .li-topbar-right { display: flex; align-items: center; }

      /* ============ Stage ============ */
      .lokalweb-liki .li-stage {
        position: relative;
        z-index: 1;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 110px 24px 70px;
      }

      .lokalweb-liki .li-screen {
        width: 100%;
        max-width: 600px;
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: liScreenIn 0.55s var(--liki-ease-bounce) both;
      }
      .lokalweb-liki .li-screen.li-exiting {
        animation: liScreenOut 0.3s var(--liki-ease-out) both;
      }

      /* ============ Liki bubble (chat phase) ============ */
      .lokalweb-liki .li-bubble {
        position: relative;
        width: 100%;
        background: linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
        border: 1px solid hsl(var(--border));
        border-radius: 26px;
        border-top-left-radius: 8px;
        padding: 32px 34px 30px;
        margin-top: 26px;
        box-shadow:
          0 1px 0 hsl(var(--foreground) / 0.03) inset,
          0 24px 60px -20px rgba(139, 92, 246, 0.18),
          0 8px 24px -12px hsl(var(--foreground) / 0.08);
        animation: liBubbleIn 0.65s var(--liki-ease-bounce) both;
      }

      .lokalweb-liki .li-tab {
        position: absolute;
        top: -22px;
        left: 26px;
        display: flex;
        align-items: center;
        gap: 9px;
        background: hsl(var(--background));
        border: 1px solid hsl(var(--border));
        padding: 6px 14px 6px 7px;
        border-radius: 999px;
        box-shadow: 0 8px 20px -8px hsl(var(--foreground) / 0.2);
        animation: liTabIn 0.6s 0.15s var(--liki-ease-bounce) both;
      }
      .lokalweb-liki .li-tab-dot {
        width: 26px; height: 26px;
        border-radius: 8px;
        background: var(--liki-grad);
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .lokalweb-liki .li-tab-dot::before {
        content: '';
        width: 10px; height: 10px;
        border-radius: 50%;
        background: rgba(255,255,255,0.95);
        transition: transform 0.4s var(--liki-ease-bounce);
      }
      .lokalweb-liki .li-tab.li-thinking .li-tab-dot::before {
        animation: liPulse 1s ease-in-out infinite;
      }
      .lokalweb-liki .li-tab-name {
        font-size: 12.5px;
        font-weight: 700;
        color: hsl(var(--foreground));
        letter-spacing: -0.01em;
      }

      .lokalweb-liki .li-line {
        font-size: 15px;
        line-height: 1.6;
        color: hsl(var(--muted-foreground));
        margin: 0 0 18px;
        animation: liFadeUp 0.6s 0.2s var(--liki-ease-out) both;
      }
      .lokalweb-liki .li-line .accent {
        background: var(--liki-grad);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
        font-weight: 600;
      }
      .lokalweb-liki .li-line strong {
        color: hsl(var(--foreground));
        font-weight: 600;
      }

      .lokalweb-liki .li-question {
        font-family: 'Instrument Serif', Georgia, serif;
        font-size: clamp(30px, 4.6vw, 46px);
        font-weight: 400;
        line-height: 1.12;
        letter-spacing: -0.02em;
        color: hsl(var(--foreground));
        margin: 0;
        animation: liFadeUp 0.6s 0.28s var(--liki-ease-out) both;
      }
      .lokalweb-liki .li-question .accent {
        font-style: italic;
        background: var(--liki-grad);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
      }

      .lokalweb-liki .li-connector {
        width: 2px;
        height: 26px;
        background: linear-gradient(180deg, hsl(var(--border)), transparent);
        animation: liFadeUp 0.5s 0.35s var(--liki-ease-out) both;
      }

      /* ============ Reply zone (input shell) ============ */
      .lokalweb-liki .li-reply-zone {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: liFadeUp 0.6s 0.4s var(--liki-ease-out) both;
      }

      .lokalweb-liki .li-input-shell {
        width: 100%;
        display: flex;
        align-items: flex-end;
        gap: 10px;
        background: hsl(var(--card));
        border: 1.5px solid hsl(var(--border));
        border-radius: 18px;
        padding: 8px 8px 8px 20px;
        transition: all 0.25s var(--liki-ease-out);
      }
      .lokalweb-liki .li-input-shell:focus-within {
        border-color: var(--liki-violet);
        box-shadow: 0 0 0 4px var(--liki-violet-tint);
      }

      .lokalweb-liki .li-text-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: hsl(var(--foreground));
        font-family: inherit;
        font-size: 17px;
        padding: 13px 0;
        resize: none;
        max-height: 160px;
        line-height: 1.5;
        width: 100%;
      }
      .lokalweb-liki .li-text-input::placeholder {
        color: hsl(var(--muted-foreground) / 0.6);
      }

      .lokalweb-liki .li-send-btn {
        width: 44px; height: 44px;
        border-radius: 13px;
        border: none;
        background: var(--liki-grad);
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        transition: all 0.2s var(--liki-ease-bounce);
      }
      .lokalweb-liki .li-send-btn:hover:not(:disabled) { transform: scale(1.08); }
      .lokalweb-liki .li-send-btn:active:not(:disabled) { transform: scale(0.92); }
      .lokalweb-liki .li-send-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
        transform: none;
      }
      .lokalweb-liki .li-send-btn svg { width: 19px; height: 19px; }

      .lokalweb-liki .li-reply-meta {
        width: 100%;
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-top: 12px;
        font-size: 12.5px;
        color: hsl(var(--muted-foreground));
        font-family: var(--font-mono);
      }
      .lokalweb-liki .li-word-count.li-good { color: hsl(var(--success)); }

      .lokalweb-liki .li-nudge {
        width: 100%;
        margin-top: 12px;
        padding: 11px 14px;
        background: var(--liki-violet-tint);
        border: 1px solid var(--liki-violet-tint-strong);
        border-radius: 12px;
        font-size: 13px;
        color: hsl(var(--foreground));
        display: flex;
        align-items: flex-start;
        gap: 9px;
        line-height: 1.5;
        animation: liFadeUp 0.4s var(--liki-ease-out) both;
      }
      .lokalweb-liki .li-nudge-icon {
        flex-shrink: 0;
        font-size: 14px;
        line-height: 1.4;
      }

      /* ============ Suggestion chip ============ */
      .lokalweb-liki .li-suggestion {
        width: 100%;
        margin-top: 16px;
        animation: liFadeUp 0.6s 0.48s var(--liki-ease-out) both;
      }
      .lokalweb-liki .li-suggestion-chip {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        width: 100%;
        background: var(--liki-violet-tint);
        border: 1px dashed var(--liki-violet-tint-strong);
        color: hsl(var(--muted-foreground));
        font-size: 13.5px;
        padding: 13px 18px;
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.25s var(--liki-ease-out);
        font-family: inherit;
        text-align: left;
        line-height: 1.45;
      }
      .lokalweb-liki .li-suggestion-chip:hover {
        background: var(--liki-violet-tint-strong);
        border-color: var(--liki-violet);
        border-style: solid;
        color: hsl(var(--foreground));
      }
      .lokalweb-liki .li-suggestion-chip[data-used='true'] {
        opacity: 0.45;
        pointer-events: none;
      }
      .lokalweb-liki .li-suggestion-bulb { flex-shrink: 0; }

      /* Type suggestion chips row (Q2) */
      .lokalweb-liki .li-chip-row {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
        animation: liFadeUp 0.6s 0.5s var(--liki-ease-out) both;
      }
      .lokalweb-liki .li-type-chip {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        color: hsl(var(--muted-foreground));
        font-size: 13px;
        padding: 8px 14px;
        border-radius: 999px;
        cursor: pointer;
        transition: all 0.2s var(--liki-ease-out);
        font-family: inherit;
      }
      .lokalweb-liki .li-type-chip:hover {
        background: var(--liki-violet-tint);
        border-color: var(--liki-violet);
        color: hsl(var(--foreground));
      }

      /* ============ Footer actions ============ */
      .lokalweb-liki .li-actions {
        width: 100%;
        margin-top: 22px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: liFadeUp 0.6s 0.55s var(--liki-ease-out) both;
      }
      .lokalweb-liki .li-mini-btn {
        background: transparent;
        border: 1px solid hsl(var(--border));
        color: hsl(var(--muted-foreground));
        font-size: 12.5px;
        padding: 8px 16px;
        border-radius: 999px;
        cursor: pointer;
        transition: all 0.2s var(--liki-ease-out);
        font-family: inherit;
        font-weight: 500;
      }
      .lokalweb-liki .li-mini-btn:hover {
        border-color: hsl(var(--foreground) / 0.3);
        color: hsl(var(--foreground));
      }

      .lokalweb-liki .li-kbd-hint {
        margin-left: auto;
        font-size: 12px;
        color: hsl(var(--muted-foreground));
        font-family: var(--font-mono);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .lokalweb-liki .li-kbd {
        background: hsl(var(--secondary));
        border: 1px solid hsl(var(--border));
        border-radius: 4px;
        padding: 2px 7px;
        font-size: 11px;
      }

      /* ============ Transition overlay ============ */
      .lokalweb-liki .li-transition {
        position: fixed;
        inset: 0;
        background: hsl(var(--background));
        z-index: 150;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        padding: 40px;
        text-align: center;
      }
      .lokalweb-liki .li-t-card {
        animation: liDropIn 0.85s var(--liki-ease-bounce) both;
        max-width: 470px;
        width: 100%;
      }
      .lokalweb-liki .li-t-avatar {
        width: 66px; height: 66px;
        border-radius: 20px;
        background: var(--liki-grad);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 24px;
        box-shadow: 0 12px 40px rgba(139, 92, 246, 0.4);
        animation: liFloaty 3s ease-in-out infinite;
      }
      .lokalweb-liki .li-t-avatar::before {
        content: '';
        width: 22px; height: 22px;
        border-radius: 50%;
        background: rgba(255,255,255,0.95);
      }

      .lokalweb-liki .li-t-title {
        font-family: 'Instrument Serif', Georgia, serif;
        font-size: clamp(30px, 5vw, 44px);
        line-height: 1.1;
        margin: 0 0 12px;
        color: hsl(var(--foreground));
        font-weight: 400;
      }
      .lokalweb-liki .li-t-title em {
        font-style: italic;
        background: var(--liki-grad);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
      }

      .lokalweb-liki .li-t-sub {
        color: hsl(var(--muted-foreground));
        font-size: 15px;
        margin: 0 0 28px;
        line-height: 1.6;
      }

      .lokalweb-liki .li-t-summary {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: 16px;
        padding: 8px;
        margin: 0 0 26px;
        text-align: left;
      }
      .lokalweb-liki .li-ts-row {
        display: flex;
        gap: 14px;
        padding: 11px 16px;
        align-items: baseline;
      }
      .lokalweb-liki .li-ts-row + .li-ts-row {
        border-top: 1px solid hsl(var(--border));
      }
      .lokalweb-liki .li-ts-label {
        font-family: var(--font-mono);
        font-size: 10px;
        color: hsl(var(--muted-foreground));
        text-transform: uppercase;
        letter-spacing: 0.06em;
        width: 96px;
        flex-shrink: 0;
      }
      .lokalweb-liki .li-ts-value {
        font-size: 13.5px;
        color: hsl(var(--foreground));
        line-height: 1.45;
        word-break: break-word;
      }
      .lokalweb-liki .li-ts-value em {
        color: hsl(var(--muted-foreground));
        font-style: italic;
      }
      .lokalweb-liki .li-ts-row.li-editable { cursor: pointer; transition: background 0.15s var(--liki-ease-out); }
      .lokalweb-liki .li-ts-row.li-editable:hover { background: var(--liki-violet-tint); }
      .lokalweb-liki .li-ts-row.li-missing .li-ts-value { color: hsl(var(--destructive)); }

      /* ============ Buttons ============ */
      .lokalweb-liki .li-btn-primary {
        background: var(--liki-grad);
        color: white;
        border: none;
        border-radius: 13px;
        padding: 15px 30px;
        font-size: 15px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s var(--liki-ease-bounce);
      }
      .lokalweb-liki .li-btn-primary:hover:not(:disabled) { transform: scale(1.04); }
      .lokalweb-liki .li-btn-primary:active:not(:disabled) { transform: scale(0.97); }
      .lokalweb-liki .li-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .lokalweb-liki .li-btn-ghost {
        background: transparent;
        color: hsl(var(--muted-foreground));
        border: 1px solid hsl(var(--border));
        border-radius: 13px;
        padding: 15px 24px;
        font-size: 14px;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        margin-left: 10px;
        transition: all 0.2s var(--liki-ease-out);
      }
      .lokalweb-liki .li-btn-ghost:hover {
        color: hsl(var(--foreground));
        border-color: hsl(var(--foreground) / 0.3);
      }

      /* ============ Card grid (form phase) ============ */
      .lokalweb-liki .li-card-grid {
        width: 100%;
        display: grid;
        gap: 12px;
        margin-top: 26px;
      }
      .lokalweb-liki .li-card-grid.li-grid-2 {
        grid-template-columns: 1fr 1fr;
      }
      .lokalweb-liki .li-card-grid.li-grid-3 {
        grid-template-columns: repeat(3, 1fr);
      }
      .lokalweb-liki .li-card-grid.li-grid-4 {
        grid-template-columns: repeat(2, 1fr);
      }

      .lokalweb-liki .li-card {
        background: hsl(var(--card));
        border: 1.5px solid hsl(var(--border));
        border-radius: 16px;
        padding: 18px;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        color: hsl(var(--foreground));
        transition: all 0.2s var(--liki-ease-out);
        display: flex;
        flex-direction: column;
        gap: 6px;
        position: relative;
      }
      .lokalweb-liki .li-card:hover {
        border-color: var(--liki-violet);
        background: var(--liki-violet-tint);
        transform: translateY(-1px);
      }
      .lokalweb-liki .li-card.li-selected {
        border-color: var(--liki-violet);
        background: var(--liki-violet-tint);
        box-shadow: 0 0 0 4px var(--liki-violet-tint);
      }

      .lokalweb-liki .li-card-preview {
        width: 100%;
        height: 64px;
        border-radius: 10px;
        margin-bottom: 8px;
      }
      .lokalweb-liki .li-card-label {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.2;
      }
      .lokalweb-liki .li-card-desc {
        font-size: 12.5px;
        color: hsl(var(--muted-foreground));
        line-height: 1.45;
      }
      .lokalweb-liki .li-card-flag { font-size: 30px; margin-bottom: 2px; }

      /* ============ Restore prompt modal ============ */
      .lokalweb-liki .li-modal-backdrop {
        position: fixed;
        inset: 0;
        background: hsl(var(--background) / 0.85);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 200;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      .lokalweb-liki .li-modal {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: 20px;
        padding: 32px 28px 24px;
        max-width: 420px;
        width: 100%;
        text-align: center;
        box-shadow: 0 24px 60px -20px rgba(139, 92, 246, 0.25);
        animation: liBubbleIn 0.5s var(--liki-ease-bounce) both;
      }
      .lokalweb-liki .li-modal-avatar {
        width: 56px; height: 56px;
        border-radius: 16px;
        background: var(--liki-grad);
        margin: 0 auto 16px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
      }
      .lokalweb-liki .li-modal-avatar::before {
        content: '';
        width: 18px; height: 18px;
        border-radius: 50%;
        background: rgba(255,255,255,0.95);
      }
      .lokalweb-liki .li-modal-title {
        font-family: 'Instrument Serif', Georgia, serif;
        font-size: 26px;
        margin: 0 0 8px;
        color: hsl(var(--foreground));
        font-weight: 400;
      }
      .lokalweb-liki .li-modal-body {
        color: hsl(var(--muted-foreground));
        font-size: 14px;
        line-height: 1.55;
        margin: 0 0 22px;
      }
      .lokalweb-liki .li-modal-actions {
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
      }

      /* ============ Generating overlay ============ */
      .lokalweb-liki .li-gen {
        width: 100%;
        max-width: 540px;
        background: linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
        border: 1px solid hsl(var(--border));
        border-radius: 22px;
        padding: 36px 32px;
        margin-top: 26px;
      }
      .lokalweb-liki .li-gen-tab {
        margin-bottom: 18px;
      }
      .lokalweb-liki .li-gen-title {
        font-family: 'Instrument Serif', Georgia, serif;
        font-size: 28px;
        color: hsl(var(--foreground));
        margin: 0 0 6px;
        font-weight: 400;
      }
      .lokalweb-liki .li-gen-sub {
        color: hsl(var(--muted-foreground));
        font-size: 14px;
        margin: 0 0 28px;
        line-height: 1.55;
      }
      .lokalweb-liki .li-gen-substeps {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .lokalweb-liki .li-gen-row {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        color: hsl(var(--muted-foreground));
        transition: color 0.3s var(--liki-ease-out);
      }
      .lokalweb-liki .li-gen-row.li-active { color: hsl(var(--foreground)); font-weight: 500; }
      .lokalweb-liki .li-gen-row.li-done { color: hsl(var(--muted-foreground) / 0.75); }
      .lokalweb-liki .li-gen-dot {
        width: 18px; height: 18px;
        border-radius: 50%;
        border: 1.5px solid hsl(var(--border));
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s var(--liki-ease-out);
      }
      .lokalweb-liki .li-gen-row.li-active .li-gen-dot {
        border-color: var(--liki-violet);
        background: var(--liki-violet-tint);
        animation: liPulse 1.2s ease-in-out infinite;
      }
      .lokalweb-liki .li-gen-row.li-done .li-gen-dot {
        background: var(--liki-grad);
        border-color: transparent;
      }
      .lokalweb-liki .li-gen-row.li-done .li-gen-dot::before {
        content: '✓';
        color: white;
        font-size: 11px;
        font-weight: 700;
      }
      .lokalweb-liki .li-gen-err {
        margin-top: 18px;
        padding: 12px 14px;
        border-radius: 12px;
        background: hsl(var(--destructive) / 0.1);
        border: 1px solid hsl(var(--destructive) / 0.3);
        color: hsl(var(--destructive));
        font-size: 13px;
      }
      .lokalweb-liki .li-gen-err-actions {
        margin-top: 14px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      /* ============ Animations ============ */
      @keyframes liScreenIn {
        0% { opacity: 0; transform: translateY(28px) scale(0.97); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes liScreenOut {
        0% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-22px) scale(0.97); }
      }
      @keyframes liBubbleIn {
        0% { opacity: 0; transform: translateY(20px) scale(0.95); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes liTabIn {
        0% { opacity: 0; transform: translateY(-8px) scale(0.7); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes liFadeUp {
        0% { opacity: 0; transform: translateY(14px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes liDropIn {
        0% { opacity: 0; transform: translateY(-90px) scale(0.75) rotate(-4deg); }
        55% { opacity: 1; }
        100% { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
      }
      @keyframes liFloaty {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-9px); }
      }
      @keyframes liPulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(0.6); opacity: 0.5; }
      }

      /* ============ Follow-up bubble (Phase 2) ============ */
      .lokalweb-liki .li-followup {
        width: 100%;
        margin-top: 14px;
        padding: 13px 16px;
        background: var(--liki-violet-tint);
        border: 1px solid var(--liki-violet-tint-strong);
        border-radius: 14px;
        font-size: 14px;
        color: hsl(var(--foreground));
        display: flex;
        align-items: flex-start;
        gap: 10px;
        line-height: 1.55;
        animation: liFadeUp 0.45s var(--liki-ease-out) both;
      }
      .lokalweb-liki .li-followup-icon {
        flex-shrink: 0;
        font-size: 15px;
        line-height: 1.4;
      }

      /* ============ Choices picker (Phase 4 — Mjeti 2) ============ */
      .lokalweb-liki .li-choices {
        width: 100%;
        margin-top: 16px;
        animation: liFadeUp 0.5s var(--liki-ease-out) both;
      }
      .lokalweb-liki .li-choices-intro {
        font-size: 13.5px;
        color: hsl(var(--muted-foreground));
        margin: 0 0 10px;
        line-height: 1.5;
      }
      .lokalweb-liki .li-choices-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .lokalweb-liki .li-choice {
        background: hsl(var(--card));
        border: 1.5px solid hsl(var(--border));
        color: hsl(var(--foreground));
        font-family: inherit;
        font-size: 13.5px;
        padding: 12px 14px;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s var(--liki-ease-out);
        text-align: left;
        line-height: 1.4;
      }
      .lokalweb-liki .li-choice:hover {
        border-color: var(--liki-violet);
        background: var(--liki-violet-tint);
      }
      .lokalweb-liki .li-choice-custom {
        grid-column: 1 / -1;
        border-style: dashed;
        color: hsl(var(--muted-foreground));
        font-weight: 500;
      }
      .lokalweb-liki .li-choice-custom:hover {
        border-style: solid;
        color: hsl(var(--foreground));
      }

      /* ============ Suggestion badge (Phase 3) ============ */
      .lokalweb-liki .li-card-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        background: var(--liki-grad);
        color: white;
        font-size: 10.5px;
        font-weight: 600;
        padding: 4px 9px;
        border-radius: 999px;
        letter-spacing: 0.01em;
        box-shadow: 0 4px 12px -4px rgba(139, 92, 246, 0.5);
        animation: liFadeUp 0.5s var(--liki-ease-out) both;
      }

      /* ============ Spinner for Send button while evaluating ============ */
      .lokalweb-liki .li-send-spinner {
        display: inline-block;
        width: 18px;
        height: 18px;
        border: 2px solid rgba(255, 255, 255, 0.5);
        border-right-color: white;
        border-radius: 50%;
        animation: liSpin 0.7s linear infinite;
      }

      /* ============ Preview screen ============ */
      .lokalweb-liki .li-preview-host {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 110px 24px 40px;
      }
      .lokalweb-liki .li-preview-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      .lokalweb-liki .li-preview-title {
        font-family: 'Instrument Serif', Georgia, serif;
        font-size: clamp(24px, 3vw, 34px);
        margin: 0;
        color: hsl(var(--foreground));
        font-weight: 400;
      }
      .lokalweb-liki .li-preview-title em {
        font-style: italic;
        background: var(--liki-grad);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
      }
      .lokalweb-liki .li-preview-actions {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }
      .lokalweb-liki .li-preview-error {
        margin-bottom: 16px;
        padding: 12px 14px;
        border-radius: 12px;
        background: hsl(var(--destructive) / 0.1);
        border: 1px solid hsl(var(--destructive) / 0.3);
        color: hsl(var(--destructive));
        font-size: 13px;
      }
      .lokalweb-liki .li-preview-frame {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 24px 60px -20px hsl(var(--foreground) / 0.10);
      }
      .lokalweb-liki .li-preview-urlbar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 16px;
        background: hsl(var(--secondary));
        border-bottom: 1px solid hsl(var(--border));
        font-family: var(--font-mono);
        font-size: 13px;
      }
      .lokalweb-liki .li-preview-dot {
        width: 11px; height: 11px;
        border-radius: 50%;
        background: hsl(var(--muted-foreground) / 0.3);
      }
      .lokalweb-liki .li-preview-url {
        margin-left: 8px;
        color: hsl(var(--muted-foreground));
      }
      .lokalweb-liki .li-preview-viewport {
        background: white;
        min-height: 70vh;
      }
      .lokalweb-liki .li-applying-spinner {
        display: inline-block;
        width: 14px; height: 14px;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: liSpin 0.8s linear infinite;
        margin-right: 8px;
        vertical-align: -2px;
      }
      @keyframes liSpin { to { transform: rotate(360deg); } }

      /* ============ Mobile ============ */
      @media (max-width: 640px) {
        .lokalweb-liki .li-topbar { padding: 14px 16px; }
        .lokalweb-liki .li-progress-area { margin: 0 12px; }
        .lokalweb-liki .li-stage { padding: 96px 16px 50px; }
        .lokalweb-liki .li-bubble { padding: 28px 22px 26px; }
        .lokalweb-liki .li-question { font-size: 28px; }
        .lokalweb-liki .li-card-grid.li-grid-3 { grid-template-columns: 1fr 1fr; }
        .lokalweb-liki .li-card-grid.li-grid-4 { grid-template-columns: 1fr; }
        .lokalweb-liki .li-kbd-hint { display: none; }
        .lokalweb-liki .li-btn-ghost { margin-left: 0; margin-top: 8px; }
        .lokalweb-liki .li-modal-actions { flex-direction: column; }
        .lokalweb-liki .li-restart-btn span { display: none; }
        .lokalweb-liki .li-restart-btn::before { content: '↻'; }
        .lokalweb-liki .li-preview-host { padding: 96px 14px 30px; }
        .lokalweb-liki .li-choices-grid { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
