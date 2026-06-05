import { bar, story } from "../../grammar/index.js?v=story-split-1";
import {
  COLD_COLOR,
  HOT_COLOR,
  TEMPERATURE_HUE,
  createBaseDemo,
  sharedTiming
} from "./shared.js";

export function createBarStory() {
  const base = bar("weatherDays")
    .x("decade", { title: "Decade" })
    .y("days", { title: "Hot days" })
    .where({ temperature_kind: "Hot days" })
    .color(HOT_COLOR)
    .key("decade")
    .transition(sharedTiming)
    .sort("year")
    .tooltip([
      { field: "decade", title: "Decade" },
      { field: "period", title: "Period" },
      { field: "temperature_kind", title: "Kind" },
      { field: "days", title: "Days" }
    ]);

  const segmented = base.segment("temperature_kind", {
    value: "days",
    categoryTitle: "Decade",
    valueTitle: "Days",
    layout: "stacked",
    color: TEMPERATURE_HUE
  });

  return story(createBaseDemo())
    .layout("floatToText")
    .description(
      "This demo keeps the chart type fixed as bar chart and demonstrates Focus, Guide, Observation, and Granularity as scene-state changes."
    )
    .step(
      "Baseline: vertical bar chart",
      base,
      "Start with one vertical bar per decade, using bar height to encode hot days."
    )
    .step(
      "Focus: filter to a subset",
      base.filter({ period: "recent" }),
      "The focus scene keeps the bar chart form but filters the data to the recent period."
    )
    .step(
      "Guide: re-orient and rescale",
      base.guide({
        orientation: "horizontal",
        category: { field: "decade", type: "nominal", title: "Decade" },
        measure: { field: "days", type: "quantitative", title: "Hot days" },
        scale: { domain: [0, 30] },
        staging: {
          order: ["y", "x"]
        }
      }),
      "The guide scene turns vertical bars into horizontal bars with a two-stage y-then-x transition."
    )
    .step(
      "Observation: change encoded variable",
      base.observeWhere({ temperature_kind: "Cold days" }, {
        title: "Cold days",
        domain: [0, 30],
        color: { value: COLD_COLOR },
        tooltip: [
          { field: "decade", title: "Decade" },
          { field: "period", title: "Period" },
          { field: "temperature_kind", title: "Kind" },
          { field: "days", title: "Days" }
        ]
      }),
      "The observation scene keeps the same decade categories but changes the value encoded by bar height."
    )
    .step(
      "Granularity: aggregate to segmented bar",
      segmented,
      "The granularity scene changes one aggregate bar into hot/cold segments for each decade."
    )
    .step(
      "Guide: stacked to grouped segments",
      segmented.layout("grouped").stage(["x", "y"]),
      "The guide scene keeps the same hot/cold segments but changes their position and scale from stacked to grouped."
    )
    .toSpec();
}
