export function createNativeScrollDriver({
  steps = [],
  offset = 0.55,
  config = {},
  onEnter = () => {},
  onExit = () => {},
  onProgress = () => {},
  isLocked = () => false
} = {}) {
  let activeIndex = -1;
  let lastScrollY = window.scrollY;
  let observedScrollY = window.scrollY;
  let frame = null;
  let watchFrame = null;
  let watchInterval = null;
  let destroyed = false;

  const schedule = () => {
    if (destroyed || frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      update();
    });
  };

  const update = () => {
    if (destroyed || isLocked()) return;
    const direction = window.scrollY >= lastScrollY ? "down" : "up";
    lastScrollY = window.scrollY;

    const state = measureStepProgress(steps, offset, config);
    if (!state) return;

    if (state.index !== activeIndex) {
      if (activeIndex >= 0 && steps[activeIndex]) {
        onExit({
          element: steps[activeIndex],
          index: activeIndex,
          direction
        });
      }
      activeIndex = state.index;
      onEnter({
        element: steps[state.index],
        index: state.index,
        progress: state.progress,
        direction
      });
    }

    onProgress({
      element: steps[state.index],
      index: state.index,
      progress: state.progress,
      direction
    });
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  watchScrollPosition();
  watchInterval = window.setInterval(watchScrollPosition, 80);
  schedule();

  return {
    type: "native",
    resize: schedule,
    refresh: schedule,
    scrollToStep(index, options = {}) {
      const step = steps[index];
      if (!step) return null;
      const progress = clamp(options.progress ?? config.navigation?.progress ?? 0.98, 0, 1);
      return scrollToStepElement(step, {
        offset,
        progress,
        behavior: options.behavior || config.navigation?.behavior || "auto"
      });
    },
    destroy() {
      destroyed = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (watchFrame) window.cancelAnimationFrame(watchFrame);
      if (watchInterval) window.clearInterval(watchInterval);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    }
  };

  function watchScrollPosition() {
    if (destroyed) return;
    if (window.scrollY !== observedScrollY) {
      observedScrollY = window.scrollY;
      schedule();
    }
    if (!watchFrame) {
      watchFrame = window.requestAnimationFrame(() => {
        watchFrame = null;
        watchScrollPosition();
      });
    }
  }
}

export function scrollToStepElement(step, { offset = 0.55, progress = 0.98, behavior = "auto" } = {}) {
  const top = stepScrollTop(step, offset, progress);
  window.scrollTo({ top, behavior });
  return top;
}

export function measureStepProgress(steps, offset = 0.55, config = {}) {
  if (!steps.length) return null;

  const offsetPx = resolveOffset(offset);
  let index = 0;
  steps.forEach((step, stepIndex) => {
    const rect = step.getBoundingClientRect();
    if (rect.top <= offsetPx) index = stepIndex;
  });

  if (isAtDocumentBottom()) {
    return {
      index: steps.length - 1,
      progress: 1
    };
  }

  if (window.scrollY <= 0) {
    return {
      index: 0,
      progress: 0
    };
  }

  const rect = steps[index].getBoundingClientRect();
  const span = Math.max(1, rect.height);
  const raw = (offsetPx - rect.top) / span;
  return {
    index,
    progress: config.clamp === false ? raw : clamp(raw, 0, 1)
  };
}

function stepScrollTop(step, offset, progress) {
  const rect = step.getBoundingClientRect();
  const offsetPx = resolveOffset(offset);
  const pageHeight = Math.max(
    document.body?.scrollHeight || 0,
    document.documentElement?.scrollHeight || 0
  );
  const maxScroll = pageHeight - window.innerHeight;
  const top = window.scrollY + rect.top - offsetPx + rect.height * progress;
  return clamp(top, 0, Math.max(0, maxScroll));
}

function resolveOffset(offset) {
  if (typeof offset === "number") {
    return offset <= 1 ? window.innerHeight * offset : offset;
  }

  if (typeof offset === "string") {
    const value = Number.parseFloat(offset);
    if (offset.endsWith("px")) return Number.isFinite(value) ? value : window.innerHeight * 0.55;
    if (offset.endsWith("%")) return Number.isFinite(value) ? window.innerHeight * (value / 100) : window.innerHeight * 0.55;
  }

  return window.innerHeight * 0.55;
}

export function isAtDocumentBottom() {
  const scrollBottom = window.scrollY + window.innerHeight;
  const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  return scrollBottom >= height - 2;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
