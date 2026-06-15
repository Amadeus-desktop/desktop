import type { AppLocale } from "../types";
import { common } from "./common";
import { controlCenter } from "./controlCenter";
import { settings } from "./settings";
import { llm } from "./llm";
import { character } from "./character";
import { perception } from "./perception";
import { report } from "./report";
import { companion } from "./companion";
import { persona } from "./persona";

export const locale: AppLocale = {
  common,
  controlCenter,
  settings,
  llm,
  character,
  perception,
  report,
  companion,
  persona,
};
