/**
 * Reference-counted body scroll lock manager so nested drawers/modals,
 * unmount transitions, and browser back navigation never strand `overflow: hidden`
 * on <body> or lock mobile vertical scrolling.
 */

let activeLocks = 0;
let savedOverflow = '';
let savedPaddingRight = '';
let popstateListenerAttached = false;

function restoreBodyStyles(): void {
  if (typeof document === 'undefined') return;
  document.body.style.overflow = savedOverflow;
  document.body.style.paddingRight = savedPaddingRight;
  savedOverflow = '';
  savedPaddingRight = '';
}

function handlePopStateReset(): void {
  resetAllBodyScrollLocks();
}

export function acquireBodyScrollLock(): () => void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => {};
  }

  let released = false;

  if (activeLocks === 0) {
    savedOverflow = document.body.style.overflow;
    savedPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      const currentPadding = parseFloat(window.getComputedStyle(document.body).paddingRight || '0') || 0;
      document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';

    if (!popstateListenerAttached) {
      window.addEventListener('popstate', handlePopStateReset, { passive: true });
      popstateListenerAttached = true;
    }
  }

  activeLocks += 1;

  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
      restoreBodyStyles();
    }
  };
}

export function resetAllBodyScrollLocks(): void {
  if (typeof document === 'undefined') return;
  activeLocks = 0;
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  savedOverflow = '';
  savedPaddingRight = '';
}
