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

const scatterEncoding = {
  x: { field: "tmin", type: "quantitative", title: "Min temperature" },
  y: { field: "tmax", type: "quantitative", title: "Max temperature" },
  color: {
    field: "period",
    type: "nominal",
    range: ["#2f7d7e", "#8d6e3f", "#b05d3b"]
  },
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
  color: { value: "#2f7d7e" },
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

export function createDemoSpec({ layoutPreset = "textOverVis", chartType = "bar" } = {}) {
  const layout = layoutCopy[layoutPreset] || layoutCopy.textOverVis;
  const normalizedChart = ["bar", "scatter", "line"].includes(chartType) ? chartType : "bar";
  const chartDemo = {
    bar: createBarDemo,
    scatter: createScatterDemo,
    line: createLineDemo
  }[normalizedChart]();

  return {
    ...chartDemo,
    title: `${layout.label}: ${normalizedChart} scene transitions`,
    description: `${layout.description} ${chartDemo.description}`,
    designSpace: {
      layout: layout.designSpace,
      action: ["header", "step", "tooltip", "enter"]
    }
  };
}

function createBaseDemo() {
  return {
    $schema: "https://example.local/scrolly-lite/v0.json",
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
    views: {
      main: {
        title: "Melbourne weather sample",
        height: 540
      }
    }
  };
}

function createBarDemo() {
  return {
    ...createBaseDemo(),
    description:
      "This demo keeps the chart type fixed as bar chart and demonstrates Focus, Guide, Observation, and Granularity as scene-state changes.",
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
      },
      {
        title: "Guide: stacked to grouped segments",
        body:
          "The guide scene keeps the same hot/cold segments but changes their position and scale from stacked to grouped.",
        designSpace: {
          transition: {
            scene: ["granularity", "guide"]
          },
          action: ["step", "tooltip"]
        },
        views: {
          main: barView({
            key: ["decade", "temperature_kind"],
            guide: {
              layout: "grouped",
              staging: {
                order: ["x", "y"],
                stagger: { step: 20, max: 360 }
              }
            },
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
              layout: "grouped",
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
                order: ["x", "y"],
                stagger: { step: 24, max: 360 }
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
                order: ["y"],
                stagger: { step: 20, max: 300 }
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
              color: { value: "#536a9e" }
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
              range: ["#2f7d7e", "#8d6e3f", "#b05d3b"]
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
              color: { value: "#536a9e" }
            },
            encoding: {
              y: { field: "cold_days", type: "quantitative", title: "Cold days", domain: [0, 30] },
              color: { value: "#536a9e" }
            }
          })
        }
      }
    ]
  };
}

export default createDemoSpec();
