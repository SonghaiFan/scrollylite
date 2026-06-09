import { createScrollDriver } from "../scroll-drivers/index.js";
import { hasScrollAction } from "./actions.js";

export function setupScroll(spec, shell, renderer) {
  const driver = createScrollDriver({
    steps: shell.steps,
    offset: spec.layout.offset,
    threshold: spec.layout.threshold || 4,
    config: spec.layout.scroll,
    isLocked: () => isNavigationLocked(shell),
    onEnter: ({ index, direction }) => {
      if (!shouldAcceptScrollEvent(shell, index)) return;
      renderer.action({ type: "enter", step: index, direction });
    },
    onExit: ({ index, direction }) => {
      if (!shouldAcceptScrollEvent(shell, index)) return;
      renderer.action({ type: "exit", step: index, value: direction === "down" ? 1 : 0, direction });
    },
    onProgress: ({ index, progress, direction }) => {
      if (!shouldAcceptScrollEvent(shell, index)) return;
      renderer.action({ type: "progress", step: index, value: progress, direction });
    }
  });

  shell.story.dataset.scrollDriver = "native";
  shell.story.__scrollyLiteScrollDriver = driver;
  return driver;
}

export function setupNav(shell, renderer, scrollDriver) {
  shell.navButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      lockRenderStep(shell, renderer, scrollDriver, index);
    });
  });
}

export function setupResize(renderer, scrollDriver) {
  const resize = () => {
    renderer.resize();
    scrollDriver?.resize?.();
  };
  window.addEventListener("resize", resize);
  return () => window.removeEventListener("resize", resize);
}

export function restoreHashPosition(shell, renderer, scrollDriver) {
  if (!window.location.hash) return;
  window.requestAnimationFrame(() => {
    const target = document.querySelector(window.location.hash);
    if (!target) return;
    const index = Number((target as HTMLElement).dataset.stepIndex);
    if (Number.isFinite(index)) lockRenderStep(shell, renderer, scrollDriver, index, target);
  });
}

function shouldAcceptScrollEvent(shell, index) {
  const navTargetIndex = shell.story.dataset.navTargetIndex;
  return !navTargetIndex || Number(navTargetIndex) === index;
}

function lockRenderStep(shell, renderer, scrollDriver, index, targetStep = null) {
  const step = targetStep || shell.steps[index];
  if (!step || !shell.story) return;
  const token = beginNavigationLock(shell, renderer, index);
  let targetTop = null;
  if (scrollDriver?.scrollToStep) {
    targetTop = scrollDriver.scrollToStep(index);
  } else {
    step.scrollIntoView({ behavior: "instant", block: "center" });
  }
  renderer.action({ type: "click", step: index, ...navigationRenderOptions(step) });
  waitForNavigationScroll(shell, renderer, scrollDriver, index, token, targetTop, step);
}

function waitForNavigationScroll(shell, renderer, scrollDriver, index, token, targetTop, step) {
  const maxWait = 1800;
  const tolerance = 2;
  const start = performance.now();
  let frame = null;
  let cancelled = false;

  const finish = () => {
    if (cancelled || !isCurrentNavigation(shell, token)) return;
    if (hasScrollAction(step)) {
      renderer.action({ type: "click", step: index, ...navigationRenderOptions(step) });
    }
    endNavigationLock(shell, token);
    scrollDriver?.refresh?.();
  };

  const tick = () => {
    frame = null;
    if (cancelled || !isCurrentNavigation(shell, token)) return;

    const reached = Number.isFinite(targetTop)
      ? Math.abs(window.scrollY - targetTop) <= tolerance
      : true;
    const timedOut = performance.now() - start >= maxWait;

    if (reached || timedOut) {
      finish();
      return;
    }

    frame = window.requestAnimationFrame(tick);
  };

  addNavigationCleanup(shell, () => {
    cancelled = true;
    if (frame) window.cancelAnimationFrame(frame);
  });

  frame = window.requestAnimationFrame(tick);
}

function navigationRenderOptions(step) {
  return hasScrollAction(step)
    ? { force: true, scrollProgress: 1 }
    : { force: true };
}

function beginNavigationLock(shell, renderer, index) {
  clearNavigationTimers(shell);
  renderer.cancelScrollProgress?.();
  const token = String((Number(shell.story.dataset.navLockToken) || 0) + 1);
  shell.story.dataset.navLockToken = token;
  shell.story.dataset.navTargetIndex = String(index);
  return token;
}

function endNavigationLock(shell, token) {
  if (!isCurrentNavigation(shell, token)) return;
  delete shell.story.dataset.navTargetIndex;
  delete shell.story.dataset.navLockToken;
  clearNavigationTimers(shell);
}

function isNavigationLocked(shell) {
  return Boolean(shell.story?.dataset.navLockToken);
}

function isCurrentNavigation(shell, token) {
  return shell.story?.dataset.navLockToken === token;
}

function clearNavigationTimers(shell) {
  const timers = shell.story.__scrollyLiteNavTimers || [];
  timers.forEach((timer) => window.clearTimeout(timer));
  shell.story.__scrollyLiteNavTimers = [];
  const cleanups = shell.story.__scrollyLiteNavCleanups || [];
  cleanups.forEach((cleanup) => cleanup());
  shell.story.__scrollyLiteNavCleanups = [];
}

function addNavigationCleanup(shell, cleanup) {
  const cleanups = shell.story.__scrollyLiteNavCleanups || [];
  cleanups.push(cleanup);
  shell.story.__scrollyLiteNavCleanups = cleanups;
}
