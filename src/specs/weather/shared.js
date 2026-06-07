import { defaultTransition } from "../../timing.js";
import {
  externalizeScrollyViewSpec,
  getScrollyMeta,
  withScrollyMeta
} from "../../scrolly-meta.js?v=semantic-key-5";

export const sharedTiming = defaultTransition();

export const sortByYear = [{ sort: { field: "year", order: "ascending" } }];

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

export const pointEncoding = {
  x: { field: "tmin", type: "quantitative", title: "Min temperature" },
  y: { field: "tmax", type: "quantitative", title: "Max temperature" },
  color: PERIOD_LUMINANCE_COLOR,
  tooltip: [
    { field: "decade", title: "Decade" },
    { field: "period", title: "Period" },
    { field: "tmin", title: "Min temp" },
    { field: "tmax", title: "Max temp" },
    { field: "hot_days", title: "Hot days" },
    { field: "cold_days", title: "Cold days" }
  ]
};

export function pointView(overrides = {}) {
  return externalizeScrollyViewSpec({
    data: "weather",
    mark: "point",
    key: "decade",
    size: 8,
    transition: sharedTiming,
    transform: sortByYear,
    encoding: pointEncoding,
    ...overrides,
    encoding: {
      ...pointEncoding,
      ...(overrides.encoding || {})
    }
  });
}

export const scatterEncoding = pointEncoding;

export function scatterView(overrides = {}) {
  return pointView(overrides);
}

export const lineEncoding = {
  x: { field: "decade", type: "nominal", title: "Decade" },
  y: { field: "hot_days", type: "quantitative", title: "Hot days", domain: [0, 30] },
  color: { value: HOT_COLOR },
  tooltip: [
    { field: "decade", title: "Decade" },
    { field: "period", title: "Period" },
    { field: "hot_days", title: "Hot days" },
    { field: "cold_days", title: "Cold days" },
    { field: "tmax", title: "Max temp" },
    { field: "tmin", title: "Min temp" }
  ]
};

export function lineView(overrides = {}) {
  return externalizeScrollyViewSpec({
    data: "weather",
    mark: "line",
    key: "decade",
    pointSize: 5,
    strokeWidth: 3,
    transition: sharedTiming,
    transform: sortByYear,
    encoding: lineEncoding,
    ...overrides,
    encoding: {
      ...lineEncoding,
      ...(overrides.encoding || {})
    }
  });
}

export const unitEncoding = {
  x: { field: "year", type: "quantitative", title: "Year" },
  y: { field: "hot_days", type: "quantitative", title: "Hot days", domain: [0, 30] },
  color: HOT_PERIOD_COLOR,
  tooltip: [
    { field: "decade", title: "Decade" },
    { field: "period", title: "Period" },
    { field: "hot_days", title: "Hot days" },
    { field: "cold_days", title: "Cold days" }
  ]
};

export const unitDefaults = {
  key: "decade",
  labelField: "decade",
  valueField: "hot_days",
  layout: "grid",
  columns: 22,
  maxUnits: 240
};

export function unitView(overrides = {}) {
  return externalizeScrollyViewSpec({
    data: "weather",
    mark: "unit",
    key: "decade",
    transition: sharedTiming,
    transform: sortByYear,
    unit: unitDefaults,
    encoding: unitEncoding,
    ...overrides,
    unit: {
      ...unitDefaults,
      ...(overrides.unit || {})
    },
    encoding: {
      ...unitEncoding,
      ...(overrides.encoding || {})
    }
  });
}

export function createBaseDemo() {
  return {
    $schema: "https://example.local/scrolly-lite/v0.json",
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
            withScrollyMeta(viewSpec, {
              scroll: getScrollyMeta(viewSpec).scroll || viewSpec.scroll || { ease: "linear" }
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
