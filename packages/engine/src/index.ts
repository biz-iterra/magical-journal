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
export { computeZodiac, zodiacModule } from "./zodiac.js";

// numerology
export { computeLifepath, lifepathModule } from "./numerology/lifepath.js";
export { kanaToHepburn } from "./numerology/romaji.js";
export { computeDestiny, destinyModule } from "./numerology/destiny.js";

// kigaku
export { computeHonmeiStar, computeGetsumeiStar, starToGogyo, kigakuProfileModule } from "./kigaku/honmei.js";
export { buildBan, getOppositeDirection, JYOUI_POSITIONS } from "./kigaku/ban.js";
export { judgeDirections, isShojo, isBiwa, isSokoku, kigakuDirectionModule } from "./kigaku/direction.js";

// mapping
export type { CharacterInfo } from "./mapping.js";
export { CHARACTER_MAP, getCharacter, getCharacterName } from "./mapping.js";
