'use client';

import { Share, Smartphone, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Result, ResultAsync, ok, err } from 'neverthrow';

// Helper to safely interact with sessionStorage
const safeGetSessionStorage = (key: string): Result<string | null, Error> =>
  Result.fromThrowable(
    () => sessionStorage.getItem(key),
    error => new Error(`Storage access error: ${error}`)
  )();

const safeSetSessionStorage = (key: string, value: string): Result<void, Error> =>
  Result.fromThrowable(
    () => sessionStorage.setItem(key, value),
    error => new Error(`Storage write error: ${error}`)
  )();

export default function InstallPrompt() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState(true);

  useEffect(() => {
    safeGetSessionStorage('installPromptDismissed')
      .map(val => val === 'true') // Transform string|null to boolean
      .andThen(dismissed =>
        // If it's already dismissed, return an err to stop the chain.
        // If not dismissed, return ok to continue to the next step.
        dismissed ? err('Banner already dismissed this session') : ok('Show banner')
      )
      .map(() => {
        // This only runs if the result is `ok` (not dismissed)
        setIsDismissed(false);
      })
      .mapErr(reason => {
        // Optional: log the reason it was skipped
        console.debug(reason);
      });

    const userAgent = navigator.userAgent;
    const standalone = window.matchMedia('(display-mode: standalone)').matches;

    setIsIOS(/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream);
    setIsStandalone(standalone);

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default mini-infobar from appearing
      e.preventDefault();
      // Save the event so it can be triggered later
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    ResultAsync.fromPromise(
      (async () => {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        return outcome;
      })(),
      error => new Error(`Prompt failure: ${error}`)
    )
      .map(outcome => {
        // Transform: log the raw outcome and pass it down
        console.log(`User raw response: ${outcome}`);
        return outcome;
      })
      .andThen(outcome => {
        // Chain: Decide if it was a success or failure state based on the string
        return outcome === 'accepted'
          ? ok('User successfully installed the app')
          : err(new Error('User declined the installation'));
      })
      .match(
        successMessage => {
          console.log(successMessage);
          setDeferredPrompt(null);
        },
        errorMessage => {
          console.log(errorMessage.message);
          setDeferredPrompt(null);
        }
      );
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    safeSetSessionStorage('installPromptDismissed', 'true').mapErr(e =>
      console.error('Could not save dismissal state:', e)
    );
  };

  // Don't show if already installed
  if (isStandalone || isDismissed) {
    return null;
  }

  // Don't show if no install capability detected
  if (!isIOS && !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 pb-safe z-50">
      <div className="max-w-md mx-auto px-4 py-4 sm:py-5">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone size={20} className="text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800 tracking-tight">Install App</h3>
          </div>

          {/* Android/Chrome - Native Install Button */}
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 shadow-sm"
            >
              Add to Home Screen
            </button>
          )}

          {/* iOS - Manual Instructions */}
          {isIOS && (
            <div className="flex flex-col items-center space-y-2">
              <p className="text-sm text-gray-600 text-center px-2 leading-relaxed">
                To install this app, tap the share button
                <span role="img" aria-label="share icon" className="mx-1 inline-block align-middle">
                  <Share size={16} className="inline" />
                </span>
                and then select <span className="font-semibold">"Add to Home Screen"</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
