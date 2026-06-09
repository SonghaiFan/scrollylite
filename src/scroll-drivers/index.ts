import { createNativeScrollDriver } from './native.js';

export interface ScrollConfig {
  progress?: string;
  start?: number | null;
  end?: number | null;
  clamp?: boolean;
  snap?: {
    enabled?: boolean;
    mode?: string;
    target?: string;
  };
  navigation?: {
    behavior?: string;
    lock?: boolean;
    progress?: number;
  };
}

export interface ScrollEvent {
  index: number;
  direction?: string;
  progress?: number;
  element?: Element;
}

export interface ScrollDriverOptions {
  config?: ScrollConfig | boolean | string;
  steps?: Element[];
  offset?: number;
  threshold?: number;
  onEnter?: (event: ScrollEvent) => void;
  onExit?: (event: ScrollEvent) => void;
  onProgress?: (event: ScrollEvent) => void;
  isLocked?: () => boolean;
  [key: string]: unknown;
}

export function createScrollDriver(options: ScrollDriverOptions = {}): unknown {
  const config = normalizeScrollDriverConfig(options.config || {});
  return createNativeScrollDriver({ ...options, config });
}

export function normalizeScrollDriverConfig(config: ScrollConfig | boolean | string = {}): ScrollConfig {
  if (config === true || typeof config === 'string') return defaultScrollDriverConfig();

  const defaults = defaultScrollDriverConfig();
  const cfg = config as ScrollConfig;
  return {
    ...defaults,
    ...cfg,
    snap: { ...defaults.snap, ...(cfg.snap || {}) },
    navigation: { ...defaults.navigation, ...(cfg.navigation || {}) }
  };
}

function defaultScrollDriverConfig(): Required<ScrollConfig> {
  return {
    progress: 'geometry',
    start: null,
    end: null,
    clamp: true,
    snap: { enabled: false, mode: 'after-idle', target: 'step' },
    navigation: { behavior: 'instant', lock: true, progress: 0.98 }
  };
}
