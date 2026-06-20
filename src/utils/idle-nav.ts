// ====================================================================
// Idle-nav: auto-return to home after N minutes (v4.2.0)
// ====================================================================
// Watches document-level user activity (pointer / key / wheel / touch
// events) and navigates back to the dashboard's home view after a
// configurable idle window.
//
// Activates when `dashboardConfig.idle_return_to_home_after_minutes`
// is a positive number. Idempotent — safe to install multiple times.
//
// Different from `panel_screensaver_after_minutes`: the screensaver
// covers the dashboard with a clock overlay; idle-nav actively
// navigates back to `/home`. Useful when you want the user to land on
// the overview after walking away mid-task, without going kiosk-mode.
// ====================================================================

let installed = false;
let timer: number | undefined;
let idleMs = 0;
let onActivityRef: ((ev: Event) => void) | undefined;

function clearTimer(): void {
  if (timer !== undefined) {
    window.clearTimeout(timer);
    timer = undefined;
  }
}

function navigateHome(): void {
  if (typeof window === 'undefined') return;
  const newPath = homePathFor(window.location.pathname);
  // Already on the overview → skip the history push + re-render.
  if (newPath === window.location.pathname) return;
  window.history.pushState(null, '', newPath);
  window.dispatchEvent(
    new CustomEvent('location-changed', { detail: { replace: false } }),
  );
}

/**
 * The overview path for the dashboard the given pathname belongs to: the
 * dashboard ROOT segment + `home` (Oriel emits the overview at path `home`).
 *
 * Anchoring to `parts[0]` (not swapping the last segment) keeps the dashboard
 * for `/<dashboard>` (1-segment) and deeper paths alike — swapping the last
 * segment dropped the dashboard on a 1-segment path (→ `/home`) and mis-nested
 * on a 3-segment one. For the standard `/<dashboard>/<view>` both agree.
 */
export function homePathFor(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  return parts.length > 0 ? `/${parts[0]}/home` : '/home';
}

function arm(): void {
  clearTimer();
  timer = window.setTimeout(navigateHome, idleMs);
}

function onActivity(): void {
  arm();
}

/**
 * Install the idle listener with the given minutes-until-return.
 * Re-calling with a different value updates the timer. Call with
 * a non-positive value to uninstall.
 */
export function installIdleNav(minutes: number): void {
  if (typeof document === 'undefined') return;
  if (!Number.isFinite(minutes) || minutes <= 0) {
    uninstallIdleNav();
    return;
  }
  idleMs = minutes * 60 * 1000;
  if (installed) {
    arm(); // already installed; just re-arm with the new interval
    return;
  }
  installed = true;
  onActivityRef = onActivity;
  // Same event surface ScreensaverCard listens to — covers desktop +
  // touch + scroll-wheel interactions.
  document.addEventListener('pointerdown', onActivityRef, { passive: true });
  document.addEventListener('keydown', onActivityRef, { passive: true });
  document.addEventListener('wheel', onActivityRef, { passive: true });
  document.addEventListener('touchstart', onActivityRef, { passive: true });
  arm();
}

export function uninstallIdleNav(): void {
  if (!installed) return;
  installed = false;
  clearTimer();
  if (onActivityRef && typeof document !== 'undefined') {
    document.removeEventListener('pointerdown', onActivityRef);
    document.removeEventListener('keydown', onActivityRef);
    document.removeEventListener('wheel', onActivityRef);
    document.removeEventListener('touchstart', onActivityRef);
  }
  onActivityRef = undefined;
}
