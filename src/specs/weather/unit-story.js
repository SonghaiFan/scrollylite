import { HOT_PERIOD_COLOR, createBaseDemo, unitView } from "./shared.js?v=semantic-key-10";

export function createUnitStory() {
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
