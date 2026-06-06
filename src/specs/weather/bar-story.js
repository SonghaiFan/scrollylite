import { bar, story } from "../../grammar/index.js?v=default-domain-1";
import {
  COLD_COLOR,
  HOT_COLOR,
  TEMPERATURE_HUE,
  createBaseDemo,
  sharedTiming
} from "./shared.js";

export function createBarStory() {
  const base = bar("weatherDays")
    .where({ temperature_kind: "Hot days" })
    .x("decade")
    .y("days", { title: "Hot days" })
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
      base.filter({ period: "recent" }).flip(),
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
        .where({ temperature_kind: "Cold days" })
        .y("days", { title: "Cold days" })
        .color(COLD_COLOR),
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
