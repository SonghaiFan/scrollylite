import { bar, story } from "../../grammar/index.js?v=semantic-key-15";
import {
  createBaseDemo,
  sharedTiming
} from "./shared.js?v=semantic-key-16";

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
      "This demo keeps the mark fixed as bar and demonstrates Focus, Guide, and Granularity as scene-state changes over tidy data."
    )
    .step(
      "Baseline: vertical bar chart",
      base.where({ type: "Hot days" }),
      {
        body: "Start with one vertical bar per decade, using bar height to encode hot days.",
        authoring: 'base.where({ type: "Hot days" })'
      }
    )
    .step(
      "Focus: filter to a subset",
      base.where({ type: "Hot days", period: "recent"}),
      {
        body: "The focus scene keeps the bar chart form but filters the data to the recent period.",
        authoring: 'base.where({ type: "Hot days", period: "recent" })'
      }
    )
    .step(
      "Guide: re-orient and rescale",
      base.where({ type: "Hot days", period: "recent"}).flip(),
      {
        body: "The guide scene turns vertical bars into horizontal bars with a two-stage y-then-x transition.",
        authoring: 'base.where({ type: "Hot days", period: "recent" }).flip()'
      }
    )
    .step(
      "Focus: switch selected type",
      base.where({ type: "Cold days" }).flip(),
      {
        body: "In tidy data, changing from hot days to cold days is a keyed filter change over the same count channel.",
        authoring: 'base.where({ type: "Cold days" }).flip()'
      }
    )
    .step(
      "Baseline: return to hot days",
      base.where({ type: "Hot days" }),
      {
        body: "Start with one vertical bar per decade, using bar height to encode hot days.",
        authoring: 'base.where({ type: "Hot days" })'
      }
    )
    .step(
      "Granularity: split into hot/cold segments",
      base.split("type"),
      {
        body: "The granularity scene changes one aggregate bar into hot/cold segments for each decade.",
        authoring: 'base.split("type")'
      }
    )
    .step(
      "Guide: stacked to grouped segments",
      base.split("type").layout("grouped"),
      {
        body: "The guide scene keeps the same hot/cold segments but changes their position and scale from stacked to grouped.",
        authoring: 'base.split("type").layout("grouped")'
      }
    )
    .step(
      "Granularity: collapse to total days",
      base.collapse("type", { title: "Total days" }),
      {
        body: "The granularity scene collapses child segment keys into one parent total-days bar per decade.",
        authoring: 'base.collapse("type", { title: "Total days" })'
      }
    )
    .toSpec();
}
