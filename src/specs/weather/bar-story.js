import { bar, story } from "../../grammar/index.js?v=semantic-key-10";
import {
  createBaseDemo,
  sharedTiming
} from "./shared.js?v=semantic-key-10";

export function createBarStory() {
  const base = bar("weatherDays")
    .x("decade")
    .y("count")
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
      base.where({ type: "Hot days" }),
      "Start with one vertical bar per decade, using bar height to encode hot days."
    )
    .step(
      "Focus: filter to a subset",
      base.where({ type: "Hot days", period: "recent"}),
      "The focus scene keeps the bar chart form but filters the data to the recent period."
    )
    .step(
      "Guide: re-orient and rescale",
      base.where({ type: "Hot days", period: "recent"}).flip(),
      "The guide scene turns vertical bars into horizontal bars with a two-stage y-then-x transition."
    )
    .step(
      "Focus: switch selected type",
      base.where({ type: "Cold days" }).flip(),
      "In tidy data, changing from hot days to cold days is a keyed filter change over the same count channel."
    )
    .step(
      "Baseline: return to hot days",
      base.where({ type: "Hot days" }),
      "Start with one vertical bar per decade, using bar height to encode hot days."
    )
    .step(
      "Granularity: split into hot/cold segments",
      base.split("type"),
      "The granularity scene changes one aggregate bar into hot/cold segments for each decade."
    )
    .step(
      "Guide: stacked to grouped segments",
      base.split("type").layout("grouped"),
      "The guide scene keeps the same hot/cold segments but changes their position and scale from stacked to grouped."
    )
    .step(
      "Granularity: collapse to total days",
      base.collapse("type", { title: "Total days" }),
      "The granularity scene collapses child segment keys into one parent total-days bar per decade."
    )
    .toSpec();
}
