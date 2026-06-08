import { diffViewStates } from "../grammar/diff.js?v=semantic-key-17";
import { narrativeTransition } from "../scrolly-meta.js?v=semantic-key-11";
import { defaultTransition } from "../timing.js";

export function createDefaultTransitionPlan(previousSpec, nextSpec, options = {}) {
  if (!previousSpec || !nextSpec) return {};

  const diff = diffViewStates(previousSpec, nextSpec);
  const timing = defaultTransition({
    ...narrativeTransition(previousSpec || {}),
    ...narrativeTransition(nextSpec || {})
  });

  return {
    diff: diff.deltas.map(({ type, action, previous, next }) => ({ type, action, previous, next })),
    update: {
      mode: "ordinary",
      reason: options.reason || "default-idiom-update",
      timing,
      totalDuration: timing.duration + staggerMax(timing.stagger)
    },
    enter: {
      mode: "ordinary",
      reason: options.reason || "default-idiom-enter"
    },
    exit: {
      mode: "ordinary",
      reason: options.reason || "default-idiom-exit"
    }
  };
}

function staggerMax(stagger) {
  if (stagger == null || typeof stagger !== "object") return 0;
  const max = Number(stagger.max);
  return Number.isFinite(max) ? max : 0;
}
