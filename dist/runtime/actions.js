import { clamp } from "./utils.js";
export function hasScrollAction(stepOrAction = {}) {
    const actions = Array.isArray(stepOrAction) ? stepOrAction : stepOrAction.action || [];
    return actions.includes("scroll");
}
export function normalizeActionTokens(action = ["step", "tooltip"]) {
    const values = Array.isArray(action) ? action : [action];
    return uniqueActionTokens(values.flatMap((value) => {
        if (value === "stepper")
            return ["step", "tooltip"];
        if (value === "scroller")
            return ["scroll", "tooltip"];
        return [value];
    }));
}
export function normalizeActionEvent(event, options = {}, context = {}) {
    const source = normalizeEventSource(event);
    const type = source.type || options.type || "enter";
    const rawValue = firstDefined(source.value, source.progress, source.scrollProgress, options.value, options.progress, options.scrollProgress);
    const hasValue = rawValue != null && rawValue !== "";
    const isProgress = isProgressEvent(type) || hasValue;
    const fallbackIndex = isFiniteNumber(context.activeIndex) && context.activeIndex >= 0
        ? context.activeIndex
        : 0;
    const stepIndex = firstDefined(source.step, source.index, options.step, options.index, fallbackIndex);
    const index = clamp(Number(stepIndex) || 0, 0, Math.max(0, (context.stepCount || 1) - 1));
    const action = normalizeActionTokens(source.action || options.action || (isProgress ? "scroller" : "stepper"));
    return {
        type,
        index,
        value: clamp(Number(hasValue ? rawValue : defaultProgressForType(type, options.direction)), 0, 1),
        direction: source.direction || options.direction || "down",
        action,
        force: source.force ?? options.force,
        progress: isProgress
    };
}
export function defaultScrollProgress(direction) {
    return direction === "up" ? 1 : 0;
}
export function normalizeScrollAction(scrollSpec = {}) {
    if (scrollSpec === true)
        return {};
    return {
        ease: "linear",
        ...scrollSpec
    };
}
export function easeProgress(progress, name = "linear", d3) {
    if (!d3) {
        throw new Error("ScrollyLite scroll easing requires D3. Pass { d3 } to createStory().");
    }
    const eases = {
        linear: d3.easeLinear,
        cubic: d3.easeCubic,
        cubicInOut: d3.easeCubicInOut,
        cubicOut: d3.easeCubicOut
    };
    const ease = eases[name] || d3.easeLinear;
    return clamp(ease(clamp(progress, 0, 1)), 0, 1);
}
function normalizeEventSource(event) {
    if (typeof event === "number")
        return { type: "progress", value: event };
    if (typeof event === "string")
        return { type: event };
    if (!event || typeof event !== "object")
        return {};
    const target = event.currentTarget || event.target;
    if (target && typeof event.type === "string") {
        return {
            type: event.type,
            step: event.step ?? event.index ?? target.dataset?.stepIndex ?? target.closest?.("[data-step-index]")?.dataset?.stepIndex,
            value: event.value ?? event.progress ?? targetValue(target),
            direction: event.direction,
            action: event.action,
            force: event.force
        };
    }
    return event;
}
function targetValue(target) {
    if (!target)
        return undefined;
    if (typeof target.valueAsNumber === "number" && Number.isFinite(target.valueAsNumber)) {
        return target.valueAsNumber;
    }
    if (target.type === "range" || target.type === "number")
        return Number(target.value);
    if (typeof target.value === "string" && target.value.trim() !== "" && !Number.isNaN(Number(target.value))) {
        return Number(target.value);
    }
    return undefined;
}
function isProgressEvent(type) {
    return ["progress", "scroll", "input", "scrub", "slider"].includes(type);
}
function defaultProgressForType(type, direction) {
    if (type === "exit" || type === "unclick")
        return 0;
    return defaultScrollProgress(direction);
}
function firstDefined(...values) {
    return values.find((value) => value !== undefined && value !== null);
}
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function uniqueActionTokens(actions = []) {
    return [...new Set(actions.filter(Boolean))];
}
