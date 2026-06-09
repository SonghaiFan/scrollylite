import { createScrollDriver } from '../scroll-drivers/index.js';
import type { ScrollConfig, ScrollEvent } from '../scroll-drivers/index.js';
import { hasScrollAction } from './actions.js';

interface ShellStoryElement extends HTMLElement {
  __scrollyLiteScrollDriver?: ScrollDriver;
  __scrollyLiteNavTimers?: ReturnType<typeof setTimeout>[];
  __scrollyLiteNavCleanups?: (() => void)[];
}

interface Shell {
  story: ShellStoryElement;
  steps: HTMLElement[];
  navButtons: HTMLElement[];
}

interface Renderer {
  action(event: Record<string, unknown>): void;
  resize(): void;
  cancelScrollProgress?(): void;
}

interface ScrollDriver {
  resize?(): void;
  scrollToStep?(index: number): number | null;
  refresh?(): void;
}

export function setupScroll(
  spec: { layout: { offset?: number; threshold?: number; scroll?: unknown } },
  shell: Shell,
  renderer: Renderer
): ScrollDriver {
  const driver = createScrollDriver({
    steps: shell.steps,
    offset: spec.layout.offset,
    threshold: spec.layout.threshold || 4,
    config: spec.layout.scroll as ScrollConfig | boolean | string,
    isLocked: () => isNavigationLocked(shell),
    onEnter: ({ index, direction }: ScrollEvent) => {
      if (!shouldAcceptScrollEvent(shell, index)) return;
      const stepEl = shell.steps[index];
      const action = hasScrollAction(stepEl) ? 'scroller' : 'stepper';
      renderer.action({ type: 'enter', step: index, direction, action });
    },
    onExit: ({ index, direction }: ScrollEvent) => {
      if (!shouldAcceptScrollEvent(shell, index)) return;
      const stepEl = shell.steps[index];
      // Stepper steps: exit is silent — the adjacent step's onEnter drives the next transition.
      // Scroller steps: snap transition progress to its terminal value (1 going down, 0 going up).
      if (!hasScrollAction(stepEl)) return;
      renderer.action({ type: 'exit', step: index, value: direction === 'down' ? 1 : 0, direction, action: 'scroller' });
    },
    onProgress: ({ index, progress, direction }: ScrollEvent) => {
      if (!shouldAcceptScrollEvent(shell, index)) return;
      // Stepper steps are driven by enter/exit events, not scroll position.
      // Only route progress events for scroll-bound steps.
      if (!hasScrollAction(shell.steps[index])) return;
      renderer.action({ type: 'progress', step: index, value: progress, direction, action: 'scroller' });
    }
  }) as ScrollDriver;

  shell.story.dataset.scrollDriver = 'native';
  shell.story.__scrollyLiteScrollDriver = driver;
  return driver;
}

export function setupNav(
  shell: Shell,
  renderer: Renderer,
  scrollDriver: ScrollDriver
): void {
  shell.navButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      lockRenderStep(shell, renderer, scrollDriver, index);
    });
  });
}

export function setupResize(renderer: Renderer, scrollDriver: ScrollDriver): () => void {
  const resize = () => {
    renderer.resize();
    scrollDriver?.resize?.();
  };
  window.addEventListener('resize', resize);
  return () => window.removeEventListener('resize', resize);
}

export function restoreHashPosition(
  shell: Shell,
  renderer: Renderer,
  scrollDriver: ScrollDriver
): void {
  if (!window.location.hash) return;
  window.requestAnimationFrame(() => {
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    const index = Number((target as HTMLElement).dataset.stepIndex);
    if (Number.isFinite(index)) lockRenderStep(shell, renderer, scrollDriver, index, target as HTMLElement);
  });
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function shouldAcceptScrollEvent(shell: Shell, index: number): boolean {
  const navTargetIndex = shell.story.dataset.navTargetIndex;
  return !navTargetIndex || Number(navTargetIndex) === index;
}

function lockRenderStep(
  shell: Shell,
  renderer: Renderer,
  scrollDriver: ScrollDriver,
  index: number,
  targetStep: HTMLElement | null = null
): void {
  const step = targetStep || shell.steps[index];
  if (!step || !shell.story) return;
  const token = beginNavigationLock(shell, renderer, index);
  let targetTop: number | null = null;
  if (scrollDriver?.scrollToStep) {
    targetTop = scrollDriver.scrollToStep(index);
  } else {
    step.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
  }
  renderer.action({ type: 'click', step: index, ...navigationRenderOptions(step) });
  waitForNavigationScroll(shell, renderer, scrollDriver, index, token, targetTop, step);
}

function waitForNavigationScroll(
  shell: Shell,
  renderer: Renderer,
  scrollDriver: ScrollDriver,
  index: number,
  token: string,
  targetTop: number | null,
  step: HTMLElement
): void {
  const maxWait = 1800;
  const tolerance = 2;
  const start = performance.now();
  let frame: number | null = null;
  let cancelled = false;

  const finish = () => {
    if (cancelled || !isCurrentNavigation(shell, token)) return;
    if (hasScrollAction(step)) {
      renderer.action({ type: 'click', step: index, ...navigationRenderOptions(step) });
    }
    endNavigationLock(shell, token);
    scrollDriver?.refresh?.();
  };

  const tick = () => {
    frame = null;
    if (cancelled || !isCurrentNavigation(shell, token)) return;
    const reached = Number.isFinite(targetTop)
      ? Math.abs(window.scrollY - (targetTop as number)) <= tolerance
      : true;
    const timedOut = performance.now() - start >= maxWait;
    if (reached || timedOut) { finish(); return; }
    frame = window.requestAnimationFrame(tick);
  };

  addNavigationCleanup(shell, () => {
    cancelled = true;
    if (frame !== null) window.cancelAnimationFrame(frame);
  });

  frame = window.requestAnimationFrame(tick);
}

function navigationRenderOptions(step: HTMLElement): Record<string, unknown> {
  return hasScrollAction(step) ? { force: true, scrollProgress: 1 } : { force: true };
}

function beginNavigationLock(shell: Shell, renderer: Renderer, index: number): string {
  clearNavigationTimers(shell);
  renderer.cancelScrollProgress?.();
  const token = String((Number(shell.story.dataset.navLockToken) || 0) + 1);
  shell.story.dataset.navLockToken = token;
  shell.story.dataset.navTargetIndex = String(index);
  return token;
}

function endNavigationLock(shell: Shell, token: string): void {
  if (!isCurrentNavigation(shell, token)) return;
  delete shell.story.dataset.navTargetIndex;
  delete shell.story.dataset.navLockToken;
  clearNavigationTimers(shell);
}

function isNavigationLocked(shell: Shell): boolean {
  return Boolean(shell.story?.dataset.navLockToken);
}

function isCurrentNavigation(shell: Shell, token: string): boolean {
  return shell.story?.dataset.navLockToken === token;
}

function clearNavigationTimers(shell: Shell): void {
  const timers = shell.story.__scrollyLiteNavTimers ?? [];
  timers.forEach((t) => window.clearTimeout(t));
  shell.story.__scrollyLiteNavTimers = [];
  const cleanups = shell.story.__scrollyLiteNavCleanups ?? [];
  cleanups.forEach((c) => c());
  shell.story.__scrollyLiteNavCleanups = [];
}

function addNavigationCleanup(shell: Shell, cleanup: () => void): void {
  const cleanups = shell.story.__scrollyLiteNavCleanups ?? [];
  cleanups.push(cleanup);
  shell.story.__scrollyLiteNavCleanups = cleanups;
}
