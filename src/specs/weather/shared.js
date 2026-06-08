import {
  narrativeScroll,
  withNarrative
} from "../../scrolly-meta.js?v=semantic-key-10";
import { story as createStory } from "../../grammar/index.js?v=semantic-key-20";

export const HOT_COLOR = "#b05d3b";
export const COLD_COLOR = "#536a9e";

export const PERIOD_LUMINANCE = {
  field: "period",
  domain: ["early", "middle", "recent"],
  lightness: [18, 0, -18]
};

export const PERIOD_LUMINANCE_COLOR = {
  hue: {
    value: "#858585"
  },
  luminance: PERIOD_LUMINANCE
};

export const TEMPERATURE_HUE = {
  field: "type",
  type: "nominal",
  domain: ["Hot days", "Cold days"],
  range: [HOT_COLOR, COLD_COLOR]
};

export const HOT_PERIOD_COLOR = {
  hue: {
    value: HOT_COLOR
  },
  luminance: PERIOD_LUMINANCE
};

export const COLD_PERIOD_COLOR = {
  hue: {
    value: COLD_COLOR
  },
  luminance: PERIOD_LUMINANCE
};

export const layoutCopy = {
  floatToText: {
    label: "Float to Text",
    description:
      "The chart stays beside the text while each step updates the registered renderer.",
    preset: "floatToText"
  },
  textOverVis: {
    label: "Text over Vis",
    description:
      "The chart becomes a sticky visual stage while the article track scrolls across the center of it.",
    preset: "textOverVis"
  }
};

export function createBaseDemo() {
  return {
    data: {
      weather: {
        url: "./src/data/weather_sample.csv",
        type: "csv"
      },
      weatherDays: {
        url: "./src/data/weather_days_tidy.csv?v=semantic-key-10",
        type: "csv"
      }
    },
    layout: {
      offset: 0.58,
      nav: true,
      progress: true,
      scroll: {
        progress: "geometry"
      }
    },
    views: {
      main: {
        title: "Melbourne weather sample",
        height: 540
      }
    }
  };
}

export const story = Object.assign(createStory, {
  demo() {
    return createStory(createBaseDemo());
  }
});

export function withScrollActionMode(demo) {
  return {
    ...demo,
    description: `${demo.description} Continuous mode maps scene transitions to scroll progress.`,
    steps: demo.steps.map((step, index) => {
      if (!shouldUseScrollAction(step, index)) return step;
      return {
        ...step,
        action: index === 0 ? ["scroll", "tooltip", "enter"] : ["scroll", "tooltip"],
        views: Object.fromEntries(
          Object.entries(step.views || {}).map(([viewId, viewSpec]) => [
            viewId,
            withNarrative(viewSpec, {
              action: {
                scroll: narrativeScroll(viewSpec) || { ease: "linear" }
              }
            })
          ])
        )
      };
    })
  };
}

function shouldUseScrollAction(step, index) {
  return index === 0 || hasTransitionStep(step);
}

function hasTransitionStep(step) {
  return Boolean(step.transition?.scene?.length);
}
