interface ScrollConfig {
  clamp?: boolean;
  navigation?: { behavior?: string; lock?: boolean; progress?: number };
}

interface StepProgressState {
  index: number;
  progress: number;
}

interface ScrollDriverEvent {
  element: Element;
  index: number;
  direction?: string;
  progress?: number;
}

interface NativeScrollDriver {
  type: 'native';
  resize(): void;
  refresh(): void;
  scrollToStep(index: number, options?: { progress?: number; behavior?: string }): number | null;
  destroy(): void;
}

interface ScrollDriverOptions {
  steps?: Element[];
  offset?: number;
  config?: ScrollConfig;
  onEnter?: (event: ScrollDriverEvent) => void;
  onExit?: (event: ScrollDriverEvent) => void;
  onProgress?: (event: ScrollDriverEvent & { progress: number }) => void;
  isLocked?: () => boolean;
}

export function createNativeScrollDriver({
  steps = [],
  offset = 0.55,
  config = {},
  onEnter = () => {},
  onExit = () => {},
  onProgress = () => {},
  isLocked = () => false
}: ScrollDriverOptions = {}): NativeScrollDriver {
  let activeIndex = -1;
  let lastScrollY = window.scrollY;
  let observedScrollY = window.scrollY;
  let frame: number | null = null;
  let watchFrame: number | null = null;
  let watchInterval: number | null = null;
  let destroyed = false;

  const schedule = (): void => {
    if (destroyed || frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      update();
    });
  };

  const update = (): void => {
    if (destroyed || isLocked()) return;
    const direction = window.scrollY >= lastScrollY ? 'down' : 'up';
    lastScrollY = window.scrollY;

    const state = measureStepProgress(steps, offset, config);
    if (!state) return;

    if (state.index !== activeIndex) {
      if (activeIndex >= 0 && steps[activeIndex]) {
        onExit({ element: steps[activeIndex], index: activeIndex, direction });
      }
      activeIndex = state.index;
      onEnter({ element: steps[state.index], index: state.index, direction });
    }

    onProgress({ element: steps[state.index], index: state.index, progress: state.progress, direction });
  };

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  watchScrollPosition();
  watchInterval = window.setInterval(watchScrollPosition, 80);
  schedule();

  return {
    type: 'native',
    resize: schedule,
    refresh: schedule,
    scrollToStep(index: number, options: { progress?: number; behavior?: string } = {}): number | null {
      const step = steps[index];
      if (!step) return null;
      const progress = clamp(options.progress ?? config.navigation?.progress ?? 0.98, 0, 1);
      return scrollToStepElement(step, {
        offset,
        progress,
        behavior: options.behavior || config.navigation?.behavior || 'instant'
      });
    },
    destroy(): void {
      destroyed = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (watchFrame) window.cancelAnimationFrame(watchFrame);
      if (watchInterval) window.clearInterval(watchInterval);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    }
  };

  function watchScrollPosition(): void {
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

export function scrollToStepElement(
  step: Element,
  { offset = 0.55, progress = 0.98, behavior = 'instant' }: { offset?: number; progress?: number; behavior?: string } = {}
): number {
  const top = stepScrollTop(step, offset, progress);
  window.scrollTo({ top, behavior: behavior as ScrollBehavior });
  return top;
}

export function measureStepProgress(
  steps: Element[],
  offset = 0.55,
  config: ScrollConfig = {}
): StepProgressState | null {
  if (!steps.length) return null;

  const offsetPx = resolveOffset(offset);
  let index = 0;
  steps.forEach((step, stepIndex) => {
    if (step.getBoundingClientRect().top <= offsetPx) index = stepIndex;
  });

  if (isAtDocumentBottom()) return { index: steps.length - 1, progress: 1 };
  if (window.scrollY <= 0) return { index: 0, progress: 0 };

  const rect = steps[index].getBoundingClientRect();
  const span = Math.max(1, rect.height);
  const raw = (offsetPx - rect.top) / span;
  return { index, progress: config.clamp === false ? raw : clamp(raw, 0, 1) };
}

function stepScrollTop(step: Element, offset: number, progress: number): number {
  const rect = step.getBoundingClientRect();
  const offsetPx = resolveOffset(offset);
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const top = window.scrollY + rect.top - offsetPx + rect.height * progress;
  return clamp(top, 0, Math.max(0, maxScroll));
}

function resolveOffset(offset: number | string): number {
  if (typeof offset === 'number') {
    return offset <= 1 ? window.innerHeight * offset : offset;
  }
  if (typeof offset === 'string') {
    const value = Number.parseFloat(offset);
    if (offset.endsWith('px')) return Number.isFinite(value) ? value : window.innerHeight * 0.55;
    if (offset.endsWith('%')) return Number.isFinite(value) ? window.innerHeight * (value / 100) : window.innerHeight * 0.55;
  }
  return window.innerHeight * 0.55;
}

export function isAtDocumentBottom(): boolean {
  const scrollBottom = window.scrollY + window.innerHeight;
  const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  return scrollBottom >= height - 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
