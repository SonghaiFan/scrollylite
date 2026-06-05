import { defaultTransition } from "../timing.js";
import { authoredSteps, bar } from "../grammar/index.js";

const sharedTiming = defaultTransition();

const sortByYear = [{ sort: { field: "year", order: "ascending" } }];

const HOT_COLOR = "#b05d3b";
const COLD_COLOR = "#536a9e";

const PERIOD_LUMINANCE = {
  field: "period",
  domain: ["early", "middle", "recent"],
  lightness: [18, 0, -18]
};

const PERIOD_LUMINANCE_COLOR = {
  hue: {
    value: "#858585"
  },
  luminance: PERIOD_LUMINANCE
};

const TEMPERATURE_HUE = {
  field: "temperature_kind",
  type: "nominal",
  domain: ["Hot days", "Cold days"],
  range: [HOT_COLOR, COLD_COLOR]
};

const HOT_PERIOD_COLOR = {
  hue: {
    value: HOT_COLOR
  },
  luminance: PERIOD_LUMINANCE
};

const COLD_PERIOD_COLOR = {
  hue: {
    value: COLD_COLOR
  },
  luminance: PERIOD_LUMINANCE
};

const layoutCopy = {
  floatToText: {
    label: "Float to Text",
    description:
      "The chart stays beside the text while each step updates the registered renderer.",
    designSpace: {
      preset: "floatToText",
      axis: "vertical",
      binding: "floatToText",
      container: "visContainer",
      layering: ""
    }
  },
  textOverVis: {
    label: "Text over Vis",
    description:
      "The chart becomes a sticky visual stage while the article track scrolls across the center of it.",
    designSpace: {
      preset: "textOverVis",
      axis: "vertical",
      binding: "floatToText",
      container: "visContainer",
      layering: "textOverVis"
    }
  }
};

const scatterEncoding = {
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

function scatterView(overrides = {}) {
  return {
    data: "weather",
    mark: "scatter",
    key: "decade",
    size: 8,
    transition: sharedTiming,
    transform: sortByYear,
    encoding: scatterEncoding,
    ...overrides,
    encoding: {
      ...scatterEncoding,
      ...(overrides.encoding || {})
    }
  };
}

const lineEncoding = {
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

function lineView(overrides = {}) {
  return {
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
  };
}

const unitEncoding = {
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

const unitDefaults = {
  key: "decade",
  labelField: "decade",
  valueField: "hot_days",
  layout: "grid",
  columns: 22,
  maxUnits: 240
};

function unitView(overrides = {}) {
  return {
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
  };
}

export function createDemoSpec({
  layoutPreset = "textOverVis",
  chartType = "bar",
  actionMode = "step"
} = {}) {
  const layout = layoutCopy[layoutPreset] || layoutCopy.textOverVis;
  const normalizedChart = ["bar", "scatter", "line", "unit"].includes(chartType) ? chartType : "bar";
  const chartDemo = {
    bar: createBarDemo,
    scatter: createScatterDemo,
    line: createLineDemo,
    unit: createUnitDemo
  }[normalizedChart]();
  const preparedDemo = actionMode === "scroll" ? withScrollActionMode(chartDemo) : chartDemo;

  return {
    ...preparedDemo,
    title: `${layout.label}: ${normalizedChart} scene transitions`,
    description: `${layout.description} ${preparedDemo.description}`,
    designSpace: {
      layout: layout.designSpace,
      action: ["header", "step", "tooltip", "enter"]
    }
  };
}

function withScrollActionMode(demo) {
  return {
    ...demo,
    description: `${demo.description} Continuous mode maps scene transitions to scroll progress.`,
    steps: demo.steps.map((step) => {
      if (!hasTransitionStep(step)) return step;
      return {
        ...step,
        designSpace: {
          ...(step.designSpace || {}),
          action: ["scroll", "tooltip"]
        },
        views: Object.fromEntries(
          Object.entries(step.views || {}).map(([viewId, viewSpec]) => [
            viewId,
            {
              ...viewSpec,
              scroll: viewSpec.scroll || { ease: "linear" }
            }
          ])
        )
      };
    })
  };
}

function hasTransitionStep(step) {
  const scene = step.designSpace?.transition?.scene || [];
  const segue = step.designSpace?.transition?.segue || [];
  return scene.length > 0 || segue.length > 0;
}

function createBaseDemo() {
  return {
    $schema: "https://example.local/scrolly-lite/v0.json",
    data: {
      weather: {
        url: "./src/data/weather_sample.csv",
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

function createBarDemo() {
  const base = bar("weather")
    .x("decade", { title: "Decade" })
    .y("hot_days", { title: "Hot days" })
    .color(HOT_COLOR)
    .key("decade")
    .transition(sharedTiming)
    .sort("year")
    .tooltip([
      { field: "decade", title: "Decade" },
      { field: "period", title: "Period" },
      { field: "hot_days", title: "Hot days" },
      { field: "cold_days", title: "Cold days" }
    ]);

  const segmented = base.segment({
    fields: ["hot_days", "cold_days"],
    labels: {
      hot_days: "Hot days",
      cold_days: "Cold days"
    },
    as: ["temperature_kind", "days"],
    categoryTitle: "Decade",
    valueTitle: "Days",
    layout: "stacked",
    color: TEMPERATURE_HUE
  });

  return {
    ...createBaseDemo(),
    description:
      "This demo keeps the chart type fixed as bar chart and demonstrates Focus, Guide, Observation, and Granularity as scene-state changes.",
    steps: authoredSteps([
      {
        title: "Baseline: vertical bar chart",
        body:
          "Start with one vertical bar per decade, using bar height to encode hot days.",
        view: base
      },
      {
        title: "Focus: filter to a subset",
        body:
          "The focus scene keeps the bar chart form but filters the data to the recent period.",
        view: base.filter({ field: "period", equal: "recent" })
      },
      {
        title: "Guide: re-orient and rescale",
        body:
          "The guide scene turns vertical bars into horizontal bars with a two-stage y-then-x transition.",
        view: base.guide({
          orientation: "horizontal",
          category: { field: "decade", type: "nominal", title: "Decade" },
          measure: { field: "hot_days", type: "quantitative", title: "Hot days" },
          scale: { domain: [0, 30] },
          staging: {
            order: ["y", "x"]
          }
        })
      },
      {
        title: "Observation: change encoded variable",
        body:
          "The observation scene keeps the same decade categories but changes the value encoded by bar height.",
        view: base.y("cold_days", {
          title: "Cold days",
          domain: [0, 30],
          color: { value: COLD_COLOR },
          tooltip: [
            { field: "decade", title: "Decade" },
            { field: "period", title: "Period" },
            { field: "cold_days", title: "Cold days" },
            { field: "hot_days", title: "Hot days" }
          ]
        })
      },
      {
        title: "Granularity: aggregate to segmented bar",
        body:
          "The granularity scene changes one aggregate bar into hot/cold segments for each decade.",
        view: segmented
      },
      {
        title: "Guide: stacked to grouped segments",
        body:
          "The guide scene keeps the same hot/cold segments but changes their position and scale from stacked to grouped.",
        view: segmented.layout("grouped").stage(["x", "y"])
      }
    ])
  };
}

function createScatterDemo() {
  return {
    ...createBaseDemo(),
    description:
      "This demo keeps the chart type fixed as scatter plot and demonstrates Focus, Guide, Observation, and Granularity with semantic split/merge anchors.",
    steps: [
      {
        title: "Baseline: temperature scatter plot",
        body:
          "Start with one circle per decade, encoding minimum temperature on x and maximum temperature on y.",
        designSpace: {
          action: ["step", "tooltip", "enter"]
        },
        views: {
          main: scatterView()
        }
      },
      {
        title: "Focus: filter to a subset",
        body:
          "The focus scene keeps the scatter plot form but filters to the recent decades.",
        designSpace: {
          transition: {
            scene: ["focus"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: scatterView({
            focus: {
              field: "period",
              equal: "recent"
            }
          })
        }
      },
      {
        title: "Guide: swap axes and use log scale",
        body:
          "The guide scene changes how the same variables are read: axes swap and the horizontal scale becomes logarithmic.",
        designSpace: {
          transition: {
            scene: ["guide"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: scatterView({
            guide: {
              swap: true,
              x: {
                field: "tmax",
                title: "Max temperature (log scale)",
                scale: { type: "log" }
              },
              y: {
                field: "tmin",
                title: "Min temperature"
              },
              staging: {
                order: ["x", "y"]
              }
            }
          })
        }
      },
      {
        title: "Observation: change encoded variables",
        body:
          "The observation scene keeps the decade circles but changes both axes to encode hot and cold days.",
        designSpace: {
          transition: {
            scene: ["observation"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: scatterView({
            observation: {
              x: { field: "hot_days", title: "Hot days", domain: [0, 30] },
              y: { field: "cold_days", title: "Cold days", domain: [0, 30] }
            }
          })
        }
      },
      {
        title: "Granularity: merge decades into periods",
        body:
          "The granularity scene merges multiple decade circles into one aggregate circle for each period.",
        designSpace: {
          transition: {
            scene: ["granularity"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: scatterView({
            granularity: {
              mode: "aggregate",
              groupby: ["period"],
              key: "period",
              parentField: "period",
              detailField: "decade",
              x: { op: "mean", field: "hot_days", as: "hot_days", title: "Mean hot days", domain: [0, 30] },
              y: { op: "mean", field: "cold_days", as: "cold_days", title: "Mean cold days", domain: [0, 30] },
              countAs: "decades",
              sizeRange: [12, 24]
            },
            encoding: {
              x: { field: "hot_days", type: "quantitative", title: "Mean hot days", domain: [0, 30] },
              y: { field: "cold_days", type: "quantitative", title: "Mean cold days", domain: [0, 30] },
              size: { field: "decades", type: "quantitative", range: [12, 24] },
              tooltip: [
                { field: "period", title: "Period" },
                { field: "decades", title: "Decades" },
                { field: "hot_days", title: "Mean hot days" },
                { field: "cold_days", title: "Mean cold days" }
              ]
            }
          })
        }
      },
      {
        title: "Granularity: split periods back to decades",
        body:
          "The granularity scene splits each aggregate period circle back into its decade circles using the period as parent identity.",
        designSpace: {
          transition: {
            scene: ["granularity"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: scatterView({
            granularity: {
              mode: "detail",
              key: "decade",
              parentField: "period",
              detailField: "decade"
            },
            encoding: {
              x: { field: "hot_days", type: "quantitative", title: "Hot days", domain: [0, 30] },
              y: { field: "cold_days", type: "quantitative", title: "Cold days", domain: [0, 30] }
            }
          })
        }
      }
    ]
  };
}

function createLineDemo() {
  return {
    ...createBaseDemo(),
    description:
      "This demo keeps the chart type fixed as line chart and demonstrates Focus, Guide, Observation, and Granularity as changes in scale, encoded measure, and line grouping.",
    steps: [
      {
        title: "Baseline: hot-days trend line",
        body:
          "Start with one continuous line over decades, using vertical position to encode hot days.",
        designSpace: {
          action: ["step", "tooltip", "enter"]
        },
        views: {
          main: lineView()
        }
      },
      {
        title: "Focus: zoom to a subset",
        body:
          "The focus scene keeps the line objects intact, rescales the x range to the recent period, and crops overflow outside the plot.",
        designSpace: {
          transition: {
            scene: ["focus"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: lineView({
            focus: {
              field: "period",
              equal: "recent"
            }
          })
        }
      },
      {
        title: "Guide: change vertical scale",
        body:
          "The guide scene keeps hot days as the observation but changes the reading guide to a logarithmic y scale.",
        designSpace: {
          transition: {
            scene: ["guide"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: lineView({
            guide: {
              y: {
                field: "hot_days",
                title: "Hot days (log scale)",
                domain: [1, 30],
                scale: { type: "log" }
              },
              staging: {
                order: ["y"]
              }
            }
          })
        }
      },
      {
        title: "Observation: change encoded variable",
        body:
          "The observation scene keeps the same decade path but changes y from hot days to cold days.",
        designSpace: {
          transition: {
            scene: ["observation"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: lineView({
            observation: {
              y: { field: "cold_days", title: "Cold days", domain: [0, 30] }
            },
            encoding: {
              color: { value: COLD_COLOR }
            }
          })
        }
      },
      {
        title: "Granularity: split trend into periods",
        body:
          "The granularity scene keeps decade points consistent but splits the line into period-level segments.",
        designSpace: {
          transition: {
            scene: ["granularity"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: lineView({
            granularity: {
              mode: "series",
              series: "period",
              color: COLD_PERIOD_COLOR
            },
            encoding: {
              y: { field: "cold_days", type: "quantitative", title: "Cold days", domain: [0, 30] }
            }
          })
        }
      },
      {
        title: "Granularity: merge periods into one line",
        body:
          "The granularity scene merges the period-level line segments back into one continuous trend.",
        designSpace: {
          transition: {
            scene: ["granularity"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: lineView({
            granularity: {
              mode: "single",
              color: { value: COLD_COLOR }
            },
            encoding: {
              y: { field: "cold_days", type: "quantitative", title: "Cold days", domain: [0, 30] },
              color: { value: COLD_COLOR }
            }
          })
        }
      }
    ]
  };
}

function createUnitDemo() {
  return {
    ...createBaseDemo(),
    description:
      "This demo registers a unit chart idiom and demonstrates Focus plus Guide layouts for repeated count units.",
    steps: [
      {
        title: "Baseline: one unit per hot day",
        body:
          "Start with one keyed circle per hot day. Units inherit semantic identity from decade plus unit index.",
        designSpace: {
          action: ["step", "tooltip", "enter"]
        },
        views: {
          main: unitView()
        }
      },
      {
        title: "Focus: filter to recent decades",
        body:
          "The focus scene keeps the unit idiom but filters rows before unit expansion.",
        designSpace: {
          transition: {
            scene: ["focus"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: unitView({
            focus: {
              field: "period",
              equal: "recent"
            }
          })
        }
      },
      {
        title: "Guide: group units by period",
        body:
          "The guide scene changes position and scale to group the same repeated units by period.",
        designSpace: {
          transition: {
            scene: ["guide"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: unitView({
            guide: {
              layout: "groupedGrid",
              groupField: "period",
              color: HOT_PERIOD_COLOR
            }
          })
        }
      },
      {
        title: "Guide: dodge units along the timeline",
        body:
          "The guide scene keeps the hot-day units but changes their reading guide to a collision-dodged timeline.",
        designSpace: {
          transition: {
            scene: ["guide"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: unitView({
            guide: {
              layout: "dodge",
              xField: "year",
              xType: "quantitative",
              xTitle: "Year",
              staging: {
                order: ["x", "y"]
              }
            }
          })
        }
      }
    ]
  };
}

export default createDemoSpec();
