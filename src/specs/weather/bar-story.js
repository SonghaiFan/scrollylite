import { bar, story } from "../../grammar/index.js?v=semantic-key-5";
import {
  createBaseDemo,
  sharedTiming
} from "./shared.js?v=semantic-key-5";

export function createBarStory() {
  const base = bar("weatherDays")
    .x("decade")
    .y("count")
    .where({ type: "Hot days" })
    .transition(sharedTiming)
    .sort("year")
    .tooltip(["decade", "period", "type", "count"]);


  return story(createBaseDemo())
    .layout("floatToText")
    .description(
      "This demo keeps the chart type fixed as bar chart and demonstrates Focus, Guide, and Granularity as scene-state changes over tidy data."
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
      "Focus: switch selected type",
      base.where({ type: "Cold days" }),
      "In tidy data, changing from hot days to cold days is a keyed filter change over the same count channel."
    )
    .step(
      "Baseline: return to hot days",
      base,
      "Start with one vertical bar per decade, using bar height to encode hot days."
    )
    .step(
      "Granularity: split into hot/cold segments",
      base.split("type"),
      "The granularity scene changes one aggregate bar into hot/cold segments for each decade."
    )
    .step(
      "Guide: stacked to grouped segments",
      base.split("type").layout("grouped").stage(["x", "y"]),
      "The guide scene keeps the same hot/cold segments but changes their position and scale from stacked to grouped."
    )
    .step(
      "Guide: grouped back to stacked",
      base.split("type").layout("stacked").stage(["y", "x"]),
      "The guide scene keeps decade/type segment keys stable while regrouped bars return to a stacked layout."
    )
    .step(
      "Granularity: merge to total days",
      base.split("type").merge("type", { title: "Total days" }),
      "The granularity scene collapses child segment keys into one parent total-days bar per decade."
    )
    .toSpec();
}
