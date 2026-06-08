import { createBarStory } from "./weather/bar-story.js?v=semantic-key-27";
import { createLineStory } from "./weather/line-story.js?v=semantic-key-20";
import { createScatterStory } from "./weather/scatter-story.js?v=semantic-key-20";
import { createUnitStory } from "./weather/unit-story.js?v=semantic-key-19";
import { layoutCopy, withScrollActionMode } from "./weather/shared.js?v=semantic-key-20";

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
    create: createScatterStory
  },
  line: {
    label: "Line",
    mark: "line",
    create: createLineStory
  }
};

const STORY_ALIASES = {
  scatter: "point"
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
  const key = STORY_ALIASES[value] || value;
  return STORY_REGISTRY[key] ? key : "bar";
}

export default createDemoSpec();
