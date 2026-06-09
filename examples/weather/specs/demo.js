import { createBarStory } from "./bar-story.js";
import { createLineStory } from "./line-story.js";
import { createPointStory } from "./point-story.js";
import { createUnitStory } from "./unit-story.js";
import { layoutCopy } from "./shared.js";

const STORY_REGISTRY = {
  bar: {
    label: "Bar",
    mark: "bar",
    create: createBarStory
  },
  unit: {
    label: "Unit",
    mark: "unit",
    create: createUnitStory
  },
  point: {
    label: "Point",
    mark: "point",
    create: createPointStory
  },
  line: {
    label: "Line",
    mark: "line",
    create: createLineStory
  }
};

export function createDemoSpec({
  layoutPreset = "textOverVis",
  storyId = "bar",
  actionMode = null
} = {}) {
  const layout = layoutCopy[layoutPreset] || layoutCopy.textOverVis;
  // Explicit actionMode override takes priority; otherwise fall back to the
  // layout's natural default (floatToText → stepper, textOverVis → scroller).
  const resolvedActionMode = actionMode || layout.actionMode;

  const storyKey = STORY_REGISTRY[storyId] ? storyId : "bar";
  const storyDefinition = STORY_REGISTRY[storyKey];
  const storySpec = storyDefinition.create({ actionMode: resolvedActionMode });

  return {
    ...storySpec,
    title: `${layout.label}: ${storyDefinition.label} story`,
    description: `${layout.description} ${storySpec.description ?? ""}`.trim(),
    layout: {
      ...(storySpec.layout || {}),
      preset: layout.preset
    },
    story: {
      id: storyKey,
      label: storyDefinition.label,
      mark: storyDefinition.mark
    }
  };
}

export function availableStories() {
  return Object.entries(STORY_REGISTRY).map(([id, story]) => ({
    id,
    label: story.label,
    mark: story.mark
  }));
}

export default createDemoSpec();
