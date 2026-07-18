export type InputKey =
  | "birth_date"
  | "birth_time"
  | "name_kana"
  | "name_romaji"
  | "name_kanji"
  | "home_latlng";

export type ModuleStatus = "enabled" | "held" | "planned";

export interface ProfileInputs {
  readonly birthDate: string;
  readonly birthTime?: string;
  readonly nameKana?: string;
  readonly nameRomaji?: string;
  readonly nameKanji?: string;
  readonly homeLat?: number;
  readonly homeLng?: number;
}

export interface DiagnosisModule {
  readonly id: string;
  readonly version: number;
  readonly requiredInputs: readonly InputKey[];
  readonly optionalInputs: readonly InputKey[];
  readonly clientSafe: boolean;
  compute(inputs: ProfileInputs, masters?: unknown): unknown;
}
