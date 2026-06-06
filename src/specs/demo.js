import { createBarStory } from "./weather/bar-story.js?v=semantic-key-5";
import { createLineStory } from "./weather/line-story.js?v=semantic-key-5";
import { createScatterStory } from "./weather/scatter-story.js?v=semantic-key-5";
import { createUnitStory } from "./weather/unit-story.js?v=semantic-key-5";
import { layoutCopy, withScrollActionMode } from "./weather/shared.js?v=semantic-key-5";

const STORY_REGISTRY = {
  bar: {
    label: "Bar",
    chart: "bar",
    create: createBarStory
  },
  scatter: {
    label: "Scatter",
    chart: "scatter",
    create: createScatterStory
  },
  line: {
    label: "Line",
    chart: "line",
    create: createLineStory
  },
  unit: {
    label: "Unit",
    chart: "unit",
    create: createUnitStory
  }
};

export function createDemoSpec({
  layoutPreset = "textOverVis",
  storyId,
  chartType,
  actionMode = "step"
} = {}) {
  const layout = layoutCopy[layoutPreset] || layoutCopy.textOverVis;
  const storyKey = normalizeStoryId(storyId || chartType);
  const storyDefinition = STORY_REGISTRY[storyKey];
  const storySpec = storyDefinition.create();
  const preparedStory = actionMode === "scroll"
    ? withScrollActionMode(storySpec)
    : storySpec;

  return {
    ...preparedStory,
    title: `${layout.label}: ${storyDefinition.label} story`,
    description: `${layout.description} ${preparedStory.description}`,
    designSpace: {
      layout: layout.designSpace,
      action: ["header", "step", "tooltip", "enter"]
    },
    story: {
      id: storyKey,
      label: storyDefinition.label,
      chart: storyDefinition.chart
    }
  };
}

export function availableStories() {
  return Object.entries(STORY_REGISTRY).map(([id, story]) => ({
    id,
    label: story.label,
    chart: story.chart
  }));
}

function normalizeStoryId(value) {
  return STORY_REGISTRY[value] ? value : "bar";
}

export default createDemoSpec();
