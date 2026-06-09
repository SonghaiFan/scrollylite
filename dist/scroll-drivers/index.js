import { createNativeScrollDriver } from "./native.js";
export function createScrollDriver(options = {}) {
    const config = normalizeScrollDriverConfig(options.config || {});
    return createNativeScrollDriver({ ...options, config });
}
export function normalizeScrollDriverConfig(config = {}) {
    if (config === true)
        return defaultScrollDriverConfig();
    if (typeof config === "string")
        return defaultScrollDriverConfig();
    const defaults = defaultScrollDriverConfig();
    return {
        ...defaults,
        ...config,
        snap: {
            ...defaults.snap,
            ...(config.snap || {})
        },
        navigation: {
            ...defaults.navigation,
            ...(config.navigation || {})
        }
    };
}
function defaultScrollDriverConfig() {
    return {
        progress: "geometry",
        start: null,
        end: null,
        clamp: true,
        snap: {
            enabled: false,
            mode: "after-idle",
            target: "step"
        },
        navigation: {
            behavior: "instant",
            lock: true,
            progress: 0.98
        }
    };
}
