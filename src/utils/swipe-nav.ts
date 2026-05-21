// ====================================================================
// Mobile swipe-gesture navigation (v3.5.4)
// ====================================================================
// Listens for horizontal swipes on document and navigates between
// dashboard views via HA's standard `location-changed` event. Per-view
// nav targets are read from the lovelace config currently rendered.
//
// Activates when `dashboardConfig.swipe_nav === true`. Idempotent —
// safe to call multiple times.
//
// Heuristic: a swipe is a pointer-down → pointer-up with horizontal
// delta > 80px, vertical delta < 60px, and total duration < 500ms.
// Prevents accidental fires from scrolls.
// ====================================================================

let installed = false;
const SWIPE_THRESHOLD_PX = 80;
const VERTICAL_MAX_PX = 60;
const TIME_MAX_MS = 500;

interface SwipeState {
  x: number;
  y: number;
  t: number;
  active: boolean;
}

const state: SwipeState = { x: 0, y: 0, t: 0, active: false };

function navigate(direction: 'prev' | 'next'): void {
  if (typeof window === 'undefined') return;
  // Read the current dashboard's view list from HA's lovelace panel.
  // The DOM contains <hui-root> which exposes `lovelace.config.views`.
  const root = document.querySelector('home-assistant')?.shadowRoot
    ?.querySelector('home-assistant-main')?.shadowRoot
    ?.querySelector('ha-panel-lovelace')?.shadowRoot
    ?.querySelector('hui-root');
  const lovelace = (root as unknown as {
    lovelace?: { config?: { views?: Array<{ path?: string }> } };
  } | null)?.lovelace;
  const views = lovelace?.config?.views ?? [];
  if (views.length < 2) return;
  // Parse current path from URL: /lovelace/<dashboard>/<view-path>
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  const currentPath = parts[parts.length - 1] ?? '';
  let currentIndex = views.findIndex((v) => v.path === currentPath);
  if (currentIndex === -1) currentIndex = 0;
  const nextIndex =
    direction === 'next'
      ? (currentIndex + 1) % views.length
      : (currentIndex - 1 + views.length) % views.length;
  const target = views[nextIndex]?.path ?? '';
  // HA's pattern: pushState + dispatch `location-changed`.
  const newPath = parts.slice(0, -1).concat(target).join('/');
  window.history.pushState(null, '', '/' + newPath);
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
}

export function installSwipeNav(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  const onDown = (ev: PointerEvent): void => {
    state.x = ev.clientX;
    state.y = ev.clientY;
    state.t = performance.now();
    state.active = true;
  };
  const onUp = (ev: PointerEvent): void => {
    if (!state.active) return;
    state.active = false;
    const dx = ev.clientX - state.x;
    const dy = Math.abs(ev.clientY - state.y);
    const dt = performance.now() - state.t;
    if (dt > TIME_MAX_MS) return;
    if (dy > VERTICAL_MAX_PX) return;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    // Skip if the swipe started inside an interactive element — sliders,
    // text fields, etc. use horizontal drag for their own purposes.
    const target = ev.target as HTMLElement | null;
    if (target?.closest('input, textarea, ha-slider, paper-slider')) return;
    navigate(dx > 0 ? 'prev' : 'next');
  };
  // Pointer capture lives on document so swipes work over any element.
  document.addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerup', onUp, { passive: true });
}

/** Uninstall — called from tests, but mostly here for symmetry. */
export function uninstallSwipeNav(): void {
  installed = false;
}
