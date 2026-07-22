import type { PotentialTypeId } from "./types.js";

/** キャラクター情報 */
export interface CharacterInfo {
  readonly typeId: PotentialTypeId;
  readonly typeName: string;
  readonly characterMale: string;
  readonly characterFemale: string;
  readonly directoryKey: string;
}

/**
 * 12 タイプ -> キャラクター対応マップ。
 *
 * データソース:
 * - docs/05 キャラマッピング表.csv
 * - docs/04 タイプ記述調整表(IR-/EL+/PR- のタイプ名は調整後を採用)
 */
export const CHARACTER_MAP: ReadonlyMap<PotentialTypeId, CharacterInfo> =
  new Map<PotentialTypeId, CharacterInfo>([
    [
      "IR+",
      {
        typeId: "IR+",
        typeName: "マイペースな自信家",
        characterMale: "ヒカル",
        characterFemale: "ヒカリ",
        directoryKey: "characters/01-hikaru/",
      },
    ],
    [
      "IR-",
      {
        typeId: "IR-",
        // docs/04 調整後: 「移り気で繊細なアイデアマン」->「静かに核心を突く発想家」
        typeName: "静かに核心を突く発想家",
        characterMale: "ツクモ",
        characterFemale: "ツクヨ",
        directoryKey: "characters/02-tsukuyo/",
      },
    ],
    [
      "IL+",
      {
        typeId: "IL+",
        typeName: "個性的な理論派",
        characterMale: "カゼマ",
        characterFemale: "カザネ",
        directoryKey: "characters/03-kazema/",
      },
    ],
    [
      "IL-",
      {
        typeId: "IL-",
        typeName: "堅実な完璧主義者",
        characterMale: "キリヤ",
        characterFemale: "キリハ",
        directoryKey: "characters/04-kiriya/",
      },
    ],
    [
      "PR+",
      {
        typeId: "PR+",
        typeName: "一本気なパイオニア",
        characterMale: "ホムラ",
        characterFemale: "ホノカ",
        directoryKey: "characters/05-homura/",
      },
    ],
    [
      "PR-",
      {
        typeId: "PR-",
        // docs/04 調整後: 「後手を打つ行動派」->「黙々と腕を磨く職人肌」
        typeName: "黙々と腕を磨く職人肌",
        characterMale: "タキト",
        characterFemale: "タキミ",
        directoryKey: "characters/06-takito/",
      },
    ],
    [
      "PL+",
      {
        typeId: "PL+",
        typeName: "実直で率直な努力家",
        characterMale: "タカネ",
        characterFemale: "ミネカ",
        directoryKey: "characters/07-takane/",
      },
    ],
    [
      "PL-",
      {
        typeId: "PL-",
        typeName: "臨機応変な合理派",
        characterMale: "イワオ",
        characterFemale: "イワミ",
        directoryKey: "characters/08-iwao/",
      },
    ],
    [
      "ER+",
      {
        typeId: "ER+",
        typeName: "情熱的なドリーマー",
        characterMale: "ニジオ",
        characterFemale: "ニジカ",
        directoryKey: "characters/09-nijika/",
      },
    ],
    [
      "ER-",
      {
        typeId: "ER-",
        typeName: "しみじみ味わう人情家",
        characterMale: "ツユマ",
        characterFemale: "ツユハ",
        directoryKey: "characters/10-tsuyuha/",
      },
    ],
    [
      "EL+",
      {
        typeId: "EL+",
        // docs/04 調整後: 「率直なハニカミ屋」->「面倒見のよい育て上手」
        typeName: "面倒見のよい育て上手",
        characterMale: "アサヒ",
        characterFemale: "ヒナタ",
        directoryKey: "characters/11-hinata/",
      },
    ],
    [
      "EL-",
      {
        typeId: "EL-",
        typeName: "熟慮と気遣いのサポーター",
        characterMale: "ミナト",
        characterFemale: "コハク",
        directoryKey: "characters/12-kohaku/",
      },
    ],
  ]);

/**
 * タイプ ID からキャラクター情報を取得する。
 * @throws タイプ ID が見つからない場合
 */
export function getCharacter(typeId: PotentialTypeId): CharacterInfo {
  const info = CHARACTER_MAP.get(typeId);
  if (!info) {
    throw new Error(`Unknown PotentialTypeId: ${typeId}`);
  }
  return info;
}

/**
 * タイプ ID とスタイルからキャラクター名を取得する。
 */
export function getCharacterName(
  typeId: PotentialTypeId,
  style: "male" | "female",
): string {
  const info = getCharacter(typeId);
  return style === "male" ? info.characterMale : info.characterFemale;
}
