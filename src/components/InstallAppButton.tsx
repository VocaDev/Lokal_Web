'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

// Chrome / Edge / Samsung Internet fire `beforeinstallprompt` with this event
// shape. The type isn't in lib.dom yet, so we declare a minimal local one.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'lokalweb-pwa-install-dismissed';

// Custom Install App button. Renders only when:
//   1. The browser fired `beforeinstallprompt` (PWA install criteria met,
//      not already installed, not on iOS Safari).
//   2. The user hasn't dismissed this banner before.
// On iOS Safari, no prompt event fires — installation goes through Share →
// Add to Home Screen, which we don't trigger programmatically.
export default function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(DISMISS_KEY) === '1') {
      setDismissed(true);
      return;
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, '1');
    }
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <Download className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
      <span className="text-foreground">Install LokalWeb as an app</span>
      <button
        type="button"
        onClick={handleInstall}
        className="ml-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 min-h-[36px]"
      >
        Install
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-xs text-muted-foreground hover:text-foreground px-2 min-h-[36px]"
        aria-label="Dismiss install prompt"
      >
        ×
      </button>
    </div>
  );
}
