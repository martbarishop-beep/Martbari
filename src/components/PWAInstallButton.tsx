import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) return null;

  if (isInstallable(deferredPrompt) || isInstallable(deferredPrompt as any)) {
    return (
      <button
        onClick={() => void install()}
        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[12px] bg-[#F47125] px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-[#e05e13] transition-colors whitespace-nowrap cursor-pointer"
        title="Install MartBari App"
      >
        <Download className="h-4 w-4" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[12px] border border-white/20 bg-white/10 px-3.5 text-xs font-semibold text-white hover:bg-white/15 transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F1A2C]/65 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-[#0F1A2C] space-y-3">
              <h3 className="text-base font-bold">Install MartBari on iOS</h3>
              <p className="text-xs text-[#5B6577] leading-relaxed">
                1. Tap the <strong>Share</strong> button in Safari toolbar below.<br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-[#17263E] py-2 text-xs font-bold text-white hover:bg-[#233857] cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

function isInstallable(prompt: BeforeInstallPromptEvent | null): boolean {
  return !!prompt;
}
