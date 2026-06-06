const STARTED = 3;
const RUNNING = 4;

export function installTransitionProgress(d3) {
  const transition = d3.transition();
  const proto = transition?.constructor?.prototype;
  if (!proto || proto.__scrollyLiteProgressInstalled) return;

  Object.defineProperty(proto, "__scrollyLiteProgressInstalled", {
    value: true
  });

  proto.progress = function progress(value) {
    if (!this.__scrollyLiteProgressController) {
      this.__scrollyLiteProgressController = createProgressController(
        transitionNodes(this),
        this._id
      );
    }
    this.__scrollyLiteProgressController.progress(value);
    return this;
  };
};

export function createSceneTransitionProgress(scene) {
  return createProgressController(sceneNodes(scene));
}

export function clearSceneTransitionProgress(scene) {
  if (!scene?.transitionProgress) return;
  scene.transitionProgress.destroy();
  scene.transitionProgress = null;
}

function createProgressController(nodes, transitionId = null) {
  const items = collectSchedules(nodes, transitionId);
  const minTime = items.length ? Math.min(...items.map((item) => item.time)) : 0;
  const span = Math.max(
    1,
    ...items.map((item) => item.time - minTime + item.delay + item.duration)
  );
  items.sort((a, b) => a.time + a.delay - (b.time + b.delay));

  return {
    items,
    progress(value) {
      const elapsed = clamp(value, 0, 1) * span;
      items.forEach((item) => scrubSchedule(item, elapsed, minTime));
    },
    destroy() {
      items.forEach((item) => {
        item.schedule.timer?.stop();
        const schedules = item.node.__transition;
        if (!schedules) return;
        delete schedules[item.id];
        if (!Object.keys(schedules).length) delete item.node.__transition;
      });
    }
  };
}

function collectSchedules(nodes, transitionId) {
  const items = [];
  nodes.forEach((node) => {
    const schedules = node.__transition;
    if (!schedules) return;
    Object.entries(schedules).forEach(([id, schedule]) => {
      if (transitionId != null && Number(id) !== Number(transitionId)) return;
      schedule.timer?.stop();
      items.push({
        id,
        node,
        schedule,
        time: Number(schedule.time) || 0,
        delay: Number(schedule.delay) || 0,
        duration: Math.max(0, Number(schedule.duration) || 0),
        ease: typeof schedule.ease === "function" ? schedule.ease : (t) => t,
        tweens: null,
        started: false
      });
    });
  });
  return items;
}

function scrubSchedule(item, elapsed, minTime) {
  const start = item.time - minTime + item.delay;
  const duration = item.duration || 1;
  const local = clamp((elapsed - start) / duration, 0, 1);

  if (elapsed < start && !item.started) return;
  initializeSchedule(item);

  const eased = item.ease(local);
  item.tweens.forEach((tween) => tween.call(item.node, eased));
}

function initializeSchedule(item) {
  if (item.started) return;
  const { node, schedule } = item;
  schedule.timer?.stop();
  schedule.state = schedule.state < STARTED ? STARTED : schedule.state;
  item.tweens = schedule.tween
    .map((entry) => entry.value.call(node, node.__data__, schedule.index, schedule.group))
    .filter(Boolean);
  schedule.state = RUNNING;
  item.started = true;
}

function sceneNodes(scene) {
  const roots = scene?.progressRoots?.length
    ? scene.progressRoots
    : [scene?.node || scene?.svg?.node?.()].filter(Boolean);
  const nodes = new Set();
  roots.forEach((root) => {
    nodes.add(root);
    root.querySelectorAll?.("*").forEach((node) => nodes.add(node));
  });
  return Array.from(nodes);
}

function transitionNodes(transition) {
  const nodes = [];
  transition._groups.forEach((group) => {
    group.forEach((node) => {
      if (node) nodes.push(node);
    });
  });
  return nodes;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
