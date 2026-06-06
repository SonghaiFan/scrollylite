import { COLD_COLOR, COLD_PERIOD_COLOR, createBaseDemo, lineView } from "./shared.js?v=semantic-key-10";

export function createLineStory() {
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
