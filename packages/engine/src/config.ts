/** エンジン全体の設定フラグ。流派差・未確定論点を設定で切り替える */
export interface EngineConfig {
  /** 比和の扱い(true=吉として扱う) */
  readonly biwaTreatedAsGood: boolean;
  /** 北基準(true=真北、false=磁北) */
  readonly trueNorth: boolean;
  /** 小児殺の採用(false=不採用) */
  readonly includeShounisatsu: boolean;
  /** 方位角度方式(true=30/60度方式、false=45度均等) */
  readonly useTraditionalAngles: boolean;
  /** 数秘: マスターナンバー採用 */
  readonly masterNumberEnabled: boolean;
  /** 数秘: 計算方式(allDigits=全桁合算、separate=年月日個別還元) */
  readonly lifepathMethod: "allDigits" | "separate";
  /** ローマ字: ヘボン式かかな転写か */
  readonly romajiSystem: "hepburn" | "kanaTranscription";
}

/** 確定済みの既定値。変更しないこと */
export const DEFAULT_CONFIG: EngineConfig = {
  biwaTreatedAsGood: true,
  trueNorth: true,
  includeShounisatsu: false,
  useTraditionalAngles: true,
  masterNumberEnabled: true,
  lifepathMethod: "allDigits",
  romajiSystem: "hepburn",
};
