// types
export type {
  DiagnosisModule,
  ProfileInputs,
  InputKey,
  ModuleStatus,
  StarNumber,
  GogyoElement,
  Direction8,
  Ban,
  DirectionFortune,
  MisfortuneType,
  DirectionResult,
  PotentialTypeId,
  PotentialResult,
  ZodiacSign,
  NumerologyNumber,
  SekkiriBoundary,
  CalendarProvider,
  TonpuMode,
} from "./types.js";

// config
export type { EngineConfig } from "./config.js";
export { DEFAULT_CONFIG } from "./config.js";

// registry
export type { ModuleRegistration } from "./registry.js";
export { DiagnosisRegistry } from "./registry.js";

// potential
export { POTENTIAL_TABLE } from "./potential-table.js";
export { computePotentialValue, computePotential, potentialModule } from "./potential.js";

// modules
export { computeZodiac, zodiacModule, ZODIAC_SIGNS } from "./zodiac.js";

// 性質レポート(静的配信)の slug
export {
  PERSONALITY_STATIC_DIR,
  personalitySlug,
  personalityStaticFileName,
  personalityStaticPath,
  personalityTypeSlug,
} from "./personality-slug.js";

// numerology
export { computeLifepath, lifepathModule } from "./numerology/lifepath.js";
export { kanaToHepburn } from "./numerology/romaji.js";
export { computeDestiny, destinyModule } from "./numerology/destiny.js";

// kigaku
export {
  computeHonmeiStar,
  computeGetsumeiStar,
  starToGogyo,
  kigakuProfileModule,
} from "./kigaku/honmei.js";
export { buildBan, getOppositeDirection, JYOUI_POSITIONS } from "./kigaku/ban.js";
export {
  computeDayHourBans,
  computeHourBan,
  computeHourCenterStar,
  getHourPeriodByTime,
  getHourPeriodIndex,
  HOUR_PERIODS,
} from "./kigaku/jiban.js";
export type { HourBan, HourPeriod } from "./kigaku/jiban.js";
export {
  judgeDirections,
  isShojo,
  isBiwa,
  isSokoku,
  kigakuDirectionModule,
} from "./kigaku/direction.js";

// 象意マスタ(docs/14)
export type { StarMeaning, StarKeywords, DirectionEffect } from "./kigaku/shougi.js";
export {
  STAR_MEANINGS,
  DIRECTION_EFFECTS,
  getStarMeaning,
  getDirectionEffect,
} from "./kigaku/shougi.js";

// mapping
export type { CharacterInfo } from "./mapping.js";
export {
  CHARACTER_MAP,
  POTENTIAL_TYPE_IDS,
  getCharacter,
  getCharacterName,
} from "./mapping.js";
