import { createBaseDemo, scatterView } from "./shared.js?v=semantic-key-10";

export function createScatterStory() {
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
