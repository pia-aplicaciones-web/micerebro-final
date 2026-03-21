type TouchGateState = {
  time: number;
  count: number;
};

const TAP_WINDOW_MS = 1000;
const REQUIRED_TAPS = 3;
const touchGate = new WeakMap<HTMLElement, TouchGateState>();

function isMobilePhoneTouchContext(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!hasTouch) return false;
  const maxMobileWidth = 768;
  return window.innerWidth <= maxMobileWidth;
}

export function shouldAllowTouchEdit(target: HTMLElement): boolean {
  // Solo exigir 3 toques en celular.
  if (!isMobilePhoneTouchContext()) return true;

  const now = Date.now();
  const last = touchGate.get(target);
  const withinWindow = !!last && (now - last.time) < TAP_WINDOW_MS;
  const nextCount = withinWindow ? last!.count + 1 : 1;

  if (nextCount < REQUIRED_TAPS) {
    touchGate.set(target, { time: now, count: nextCount });
    return false;
  }

  touchGate.delete(target);
  return true;
}
