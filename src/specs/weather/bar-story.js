import { bar, story } from "../../grammar/index.js?v=semantic-agg-1";
import {
  COLD_COLOR,
  HOT_COLOR,
  TEMPERATURE_HUE,
  createBaseDemo,
  sharedTiming
} from "./shared.js";

export function createBarStory() {
  const base = bar("weather")
    .x("decade")
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

  const tidyBase = bar("weatherDays")
    .x("decade")
    .y("days", { title: "Days" })
    .key("decade")
    .transition(sharedTiming)
    .sort("year")
    .tooltip([
      { field: "decade", title: "Decade" },
      { field: "period", title: "Period" },
      { field: "temperature_kind", title: "Kind" },
      { field: "days", title: "Days" }
    ]);

  const segmented = tidyBase.agg({
    by: ["decade", "temperature_kind"],
    value: "days",
    op: "sum",
    layout: "stacked",
    color: TEMPERATURE_HUE
  });
  const grouped = segmented.layout("grouped").stage(["x", "y"]);
  const total = grouped
    .agg("temperature_kind")
    .y("days", { title: "Total days" })
    .color("#6d7480");

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
      base.where({ period: "recent" }),
      "The focus scene keeps the bar chart form but filters the data to the recent period."
    )
    .step(
      "Guide: re-orient and rescale",
      base.flip(),
      "The guide scene turns vertical bars into horizontal bars with a two-stage y-then-x transition."
    )
    .step(
      "Observation: change encoded variable",
      base
        .y("cold_days", { title: "Cold days" })
        .color(COLD_COLOR),
      "The observation scene keeps the same decade categories but changes the value encoded by bar height."
    )
    .step(
      "Granularity: split into hot/cold segments",
      segmented,
      "The granularity scene changes one aggregate bar into hot/cold segments for each decade."
    )
    .step(
      "Guide: stacked to grouped segments",
      grouped,
      "The guide scene keeps the same hot/cold segments but changes their position and scale from stacked to grouped."
    )
    .step(
      "Granularity: merge to total days",
      total,
      "The granularity scene merges hot/cold segments back into one total-days bar per decade."
    )
    .toSpec();
}
