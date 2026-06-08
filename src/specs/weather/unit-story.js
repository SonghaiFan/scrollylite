import { unit } from "../../charts/unit/grammar.js?v=semantic-key-1";
import { HOT_PERIOD_COLOR, story } from "./shared.js?v=semantic-key-19";

export function createUnitStory() {
  const base = unit("weather")
    .x("year")
    .y("hot_days")
    .color(HOT_PERIOD_COLOR)
    .key("decade")
    .value("hot_days")
    .label("decade")
    .sort("year");

  return story.demo()
    .layout("floatToText")
    .description(
      "This demo registers a unit chart idiom and demonstrates Focus plus Guide layouts for repeated count units."
    )
    .step(
      "Baseline: one unit per hot day",
      base,
      {
        body: "Start with one keyed circle per hot day. Units inherit semantic identity from decade plus unit index.",
        authoring: "base"
      }
    )
    .step(
      "Focus: filter to recent decades",
      base.where({ period: "recent" }),
      {
        body: "The focus scene keeps the unit idiom but filters rows before unit expansion.",
        authoring: 'base.where({ period: "recent" })'
      }
    )
    .step(
      "Guide: group units by period",
      base.group("period", { color: HOT_PERIOD_COLOR }),
      {
        body: "The guide scene changes position and scale to group the same repeated units by period.",
        authoring: 'base.group("period", { color: HOT_PERIOD_COLOR })'
      }
    )
    .step(
      "Guide: dodge units along the timeline",
      base.dodge("year"),
      {
        body: "The guide scene keeps the hot-day units but changes their reading guide to a collision-dodged timeline.",
        authoring: 'base.dodge("year")'
      }
    )
    .toSpec();
}
