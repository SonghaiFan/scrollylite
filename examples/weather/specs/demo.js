import { createBarStory } from "./bar-story.js";
import { createLineStory } from "./line-story.js";
import { createPointStory } from "./point-story.js";
import { createUnitStory } from "./unit-story.js";
import { layoutCopy, withScrollActionMode } from "./shared.js";

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
  storyId,
  mark,
  chartType,
  actionMode = "step"
} = {}) {
  const layout = layoutCopy[layoutPreset] || layoutCopy.textOverVis;
  const storyKey = normalizeStoryId(storyId || mark || chartType);
  const storyDefinition = STORY_REGISTRY[storyKey];
  const storySpec = storyDefinition.create();
  const preparedStory = actionMode === "scroll"
    ? withScrollActionMode(storySpec)
    : storySpec;

  return {
    ...preparedStory,
    title: `${layout.label}: ${storyDefinition.label} story`,
    description: `${layout.description} ${preparedStory.description}`,
    layout: {
      ...(preparedStory.layout || {}),
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

function normalizeStoryId(value) {
  return STORY_REGISTRY[value] ? value : "bar";
}

export default createDemoSpec();
