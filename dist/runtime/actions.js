import { clamp } from "./utils.js";

export function hasScrollAction(stepOrAction = {}) {
  const actions = Array.isArray(stepOrAction) ? stepOrAction : stepOrAction.action || [];
  return actions.includes("scroll");
}

export function defaultScrollProgress(direction) {
  return direction === "up" ? 1 : 0;
}

export function normalizeScrollAction(scrollSpec = {}) {
  if (scrollSpec === true) return {};
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
