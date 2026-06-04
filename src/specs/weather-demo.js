const sharedTiming = {
  duration: 1200,
  ease: "cubicInOut",
  stagger: {
    step: 18,
    max: 360
  }
};

const sortByYear = [{ sort: { field: "year", order: "ascending" } }];

const hotDaysEncoding = {
  x: { field: "decade", type: "nominal", title: "Decade" },
  y: { field: "hot_days", type: "quantitative", title: "Hot days" },
  color: { value: "#b05d3b" },
  tooltip: [
    { field: "decade", title: "Decade" },
    { field: "period", title: "Period" },
    { field: "hot_days", title: "Hot days" },
    { field: "cold_days", title: "Cold days" }
  ]
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

function barView(overrides = {}) {
  return {
    data: "weather",
    mark: "bar",
    key: "decade",
    transition: sharedTiming,
    transform: sortByYear,
    encoding: hotDaysEncoding,
    ...overrides,
    encoding: {
      ...hotDaysEncoding,
      ...(overrides.encoding || {})
    }
  };
}

export function createDemoSpec({ layoutPreset = "textOverVis" } = {}) {
  const layout = layoutCopy[layoutPreset] || layoutCopy.textOverVis;

  return {
    $schema: "https://example.local/scrolly-lite/v0.json",
    title: `${layout.label}: bar scene transitions`,
    description:
      `${layout.description} This demo keeps the chart type fixed as bar chart and demonstrates Focus, Guide, Observation, and Granularity as scene-state changes.`,
    theme: {
      accent: "#2f7d7e",
      background: "#f8f5ef",
      foreground: "#1f2933"
    },
    data: {
      weather: {
        url: "./src/data/weather_sample.csv",
        type: "csv"
      }
    },
    layout: {
      offset: 0.58,
      nav: true,
      progress: true
    },
    designSpace: {
      layout: layout.designSpace,
      action: ["header", "step", "tooltip", "enter"]
    },
    views: {
      main: {
        title: "Melbourne weather sample",
        height: 540
      }
    },
    steps: [
      {
        title: "Baseline: vertical bar chart",
        body:
          "Start with one vertical bar per decade, using bar height to encode hot days.",
        designSpace: {
          action: ["step", "tooltip", "enter"]
        },
        views: {
          main: barView()
        }
      },
      {
        title: "Focus: filter to a subset",
        body:
          "The focus scene keeps the bar chart form but filters the data to the recent period.",
        designSpace: {
          transition: {
            scene: ["focus"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: barView({
            focus: {
              field: "period",
              equal: "recent"
            }
          })
        }
      },
      {
        title: "Guide: re-orient and rescale",
        body:
          "The guide scene turns vertical bars into horizontal bars with a two-stage y-then-x transition.",
        designSpace: {
          transition: {
            scene: ["guide"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: barView({
            guide: {
              orientation: "horizontal",
              category: { field: "decade", type: "nominal", title: "Decade" },
              measure: { field: "hot_days", type: "quantitative", title: "Hot days" },
              scale: { domain: [0, 30] },
              staging: {
                order: ["y", "x"],
                stagger: { step: 24, max: 360 }
              }
            }
          })
        }
      },
      {
        title: "Observation: change encoded variable",
        body:
          "The observation scene keeps the same decade categories but changes the value encoded by bar height.",
        designSpace: {
          transition: {
            scene: ["observation"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: barView({
            observation: {
              measure: "cold_days",
              title: "Cold days",
              domain: [0, 30]
            },
            encoding: {
              color: { value: "#536a9e" },
              tooltip: [
                { field: "decade", title: "Decade" },
                { field: "period", title: "Period" },
                { field: "cold_days", title: "Cold days" },
                { field: "hot_days", title: "Hot days" }
              ]
            }
          })
        }
      },
      {
        title: "Granularity: aggregate to segmented bar",
        body:
          "The granularity scene changes one aggregate bar into hot/cold segments for each decade.",
        designSpace: {
          transition: {
            scene: ["granularity"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: barView({
            key: ["decade", "temperature_kind"],
            granularity: {
              category: "decade",
              categoryTitle: "Decade",
              fields: ["hot_days", "cold_days"],
              labels: {
                hot_days: "Hot days",
                cold_days: "Cold days"
              },
              segment: "temperature_kind",
              value: "days",
              valueTitle: "Days",
              layout: "stacked",
              range: ["#b05d3b", "#536a9e"]
            },
            encoding: {
              tooltip: [
                { field: "decade", title: "Decade" },
                { field: "temperature_kind", title: "Segment" },
                { field: "days", title: "Days" }
              ]
            }
          })
        }
      }
    ]
  };
}

export default createDemoSpec();
