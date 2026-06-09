import { createNativeScrollDriver } from './native.js';
export function createScrollDriver(options = {}) {
    const config = normalizeScrollDriverConfig(options.config || {});
    return createNativeScrollDriver({ ...options, config });
}
export function normalizeScrollDriverConfig(config = {}) {
    if (config === true || typeof config === 'string')
        return defaultScrollDriverConfig();
    const defaults = defaultScrollDriverConfig();
    const cfg = config;
    return {
        ...defaults,
        ...cfg,
        snap: { ...defaults.snap, ...(cfg.snap || {}) },
        navigation: { ...defaults.navigation, ...(cfg.navigation || {}) }
    };
}
function defaultScrollDriverConfig() {
    return {
        progress: 'geometry',
        start: null,
        end: null,
        clamp: true,
        snap: { enabled: false, mode: 'after-idle', target: 'step' },
        navigation: { behavior: 'instant', lock: true, progress: 0.98 }
    };
}
