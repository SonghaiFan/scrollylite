export const DEFAULT_TIMING = {
    transition: {
        duration: 900,
        ease: "cubicInOut",
        stagger: { step: 10, max: 120 }
    },
    scene: {
        stagger: { step: 12, max: 160 }
    },
    stage: {
        minDuration: 180
    },
    unit: {
        axisDurationMultiplier: 1.35,
        xRatio: 0.42,
        stagger: { step: 10, max: 90 },
        xStagger: { step: 7, max: 126 }
    }
};
export function defaultTransition(overrides = {}) {
    const stagger = overrides.stagger == null || typeof overrides.stagger === "object"
        ? {
            ...DEFAULT_TIMING.transition.stagger,
            ...(overrides.stagger || {})
        }
        : overrides.stagger;
    return {
        ...DEFAULT_TIMING.transition,
        ...overrides,
        stagger
    };
}
export function stagedDuration(totalDuration, stageCount) {
    return Math.max(DEFAULT_TIMING.stage.minDuration, Math.round((totalDuration || DEFAULT_TIMING.transition.duration) / Math.max(stageCount, 1)));
}
