/**
 * ひらがな/カタカナ → ヘボン式ローマ字変換器。
 *
 * ルール:
 * - 清音・濁音・半濁音・拗音の標準ヘボン式変換
 * - 促音(っ): 次の子音を重ねる。CH の前は T(例: まっちゃ=MATCHA)
 * - 撥音(ん): 基本は N。B/M/P の前は M(例: しんぶん=SHIMBUN)
 * - 長音省略(ヘボン式確定済み): 同じ母音の連続は1つに、「う」による長音も省略
 * - 結果は大文字で返す
 * - スペース・ハイフン等はそのまま通す
 */

// ── カタカナ → ひらがな変換 ─────────────────────────────────

function katakanaToHiragana(char: string): string {
  const code = char.charCodeAt(0);
  // カタカナ(ァ=0x30A1 〜 ヶ=0x30F6)→ ひらがな(ぁ=0x3041 〜)
  if (code >= 0x30a1 && code <= 0x30f6) {
    return String.fromCharCode(code - 0x0060);
  }
  // ヴ(0x30F4) → ゔ(0x3094) — ただし変換テーブルで別途扱う
  if (code === 0x30f4) {
    return "ゔ"; // ゔ
  }
  return char;
}

// ── 変換テーブル ────────────────────────────────────────────

/** 拗音(2文字) → ローマ字。先に長いマッチを試す */
const YOUON_TABLE: ReadonlyMap<string, string> = new Map([
  // か行
  ["きゃ", "KYA"],
  ["きゅ", "KYU"],
  ["きょ", "KYO"],
  // さ行
  ["しゃ", "SHA"],
  ["しゅ", "SHU"],
  ["しょ", "SHO"],
  // た行
  ["ちゃ", "CHA"],
  ["ちゅ", "CHU"],
  ["ちょ", "CHO"],
  // な行
  ["にゃ", "NYA"],
  ["にゅ", "NYU"],
  ["にょ", "NYO"],
  // は行
  ["ひゃ", "HYA"],
  ["ひゅ", "HYU"],
  ["ひょ", "HYO"],
  // ま行
  ["みゃ", "MYA"],
  ["みゅ", "MYU"],
  ["みょ", "MYO"],
  // ら行
  ["りゃ", "RYA"],
  ["りゅ", "RYU"],
  ["りょ", "RYO"],
  // が行
  ["ぎゃ", "GYA"],
  ["ぎゅ", "GYU"],
  ["ぎょ", "GYO"],
  // ざ行
  ["じゃ", "JA"],
  ["じゅ", "JU"],
  ["じょ", "JO"],
  // ば行
  ["びゃ", "BYA"],
  ["びゅ", "BYU"],
  ["びょ", "BYO"],
  // ぱ行
  ["ぴゃ", "PYA"],
  ["ぴゅ", "PYU"],
  ["ぴょ", "PYO"],
]);

/** 単音(1文字) → ローマ字 */
const KANA_TABLE: ReadonlyMap<string, string> = new Map([
  // 母音
  ["あ", "A"],
  ["い", "I"],
  ["う", "U"],
  ["え", "E"],
  ["お", "O"],
  // か行
  ["か", "KA"],
  ["き", "KI"],
  ["く", "KU"],
  ["け", "KE"],
  ["こ", "KO"],
  // さ行
  ["さ", "SA"],
  ["し", "SHI"],
  ["す", "SU"],
  ["せ", "SE"],
  ["そ", "SO"],
  // た行
  ["た", "TA"],
  ["ち", "CHI"],
  ["つ", "TSU"],
  ["て", "TE"],
  ["と", "TO"],
  // な行
  ["な", "NA"],
  ["に", "NI"],
  ["ぬ", "NU"],
  ["ね", "NE"],
  ["の", "NO"],
  // は行
  ["は", "HA"],
  ["ひ", "HI"],
  ["ふ", "FU"],
  ["へ", "HE"],
  ["ほ", "HO"],
  // ま行
  ["ま", "MA"],
  ["み", "MI"],
  ["む", "MU"],
  ["め", "ME"],
  ["も", "MO"],
  // や行
  ["や", "YA"],
  ["ゆ", "YU"],
  ["よ", "YO"],
  // ら行
  ["ら", "RA"],
  ["り", "RI"],
  ["る", "RU"],
  ["れ", "RE"],
  ["ろ", "RO"],
  // わ行
  ["わ", "WA"],
  ["を", "O"],
  // 濁音 — か行
  ["が", "GA"],
  ["ぎ", "GI"],
  ["ぐ", "GU"],
  ["げ", "GE"],
  ["ご", "GO"],
  // 濁音 — さ行
  ["ざ", "ZA"],
  ["じ", "JI"],
  ["ず", "ZU"],
  ["ぜ", "ZE"],
  ["ぞ", "ZO"],
  // 濁音 — た行
  ["だ", "DA"],
  ["ぢ", "JI"],
  ["づ", "ZU"],
  ["で", "DE"],
  ["ど", "DO"],
  // 濁音 — は行
  ["ば", "BA"],
  ["び", "BI"],
  ["ぶ", "BU"],
  ["べ", "BE"],
  ["ぼ", "BO"],
  // 半濁音
  ["ぱ", "PA"],
  ["ぴ", "PI"],
  ["ぷ", "PU"],
  ["ぺ", "PE"],
  ["ぽ", "PO"],
  // 撥音
  ["ん", "N"],
]);

/**
 * ローマ字の先頭子音を取得する。
 * CH の前の促音は T になるため、"CH" で始まるかを判別する必要がある。
 */
function getLeadingConsonant(romaji: string): string {
  if (romaji.length === 0) return "";
  // CH → 促音は T
  if (romaji.startsWith("CH")) return "T";
  return romaji[0]!;
}

/** 母音の終端文字を取得する(長音省略用) */
function getTrailingVowel(romaji: string): string {
  if (romaji.length === 0) return "";
  const last = romaji[romaji.length - 1]!;
  if ("AIUEO".includes(last)) return last;
  return "";
}

/**
 * 長音省略: 同じ母音の連続を省略する。
 * また「う」による長音(O+U → O)も省略する。
 *
 * ルール:
 * - 同母音連続: AA→A, II→I, UU→U, EE→E, OO→O
 * - う長音: OU→O (おう, こう, etc.)
 */
function applyLongVowelOmission(result: string): string {
  // 同母音連続を除去し、OU→O に変換
  let output = "";
  for (let i = 0; i < result.length; i++) {
    const ch = result[i]!;
    if (i > 0 && "AIUEO".includes(ch)) {
      const prev = result[i - 1]!;
      // 同母音連続は省略
      if (ch === prev) continue;
      // OU → O (う長音)
      if (prev === "O" && ch === "U") continue;
    }
    output += ch;
  }
  return output;
}

/**
 * ひらがな/カタカナ文字列をヘボン式ローマ字に変換する。
 *
 * @param kana ひらがなまたはカタカナの文字列(スペース・ハイフン等はそのまま通す)
 * @returns 大文字のヘボン式ローマ字
 */
export function kanaToHepburn(kana: string): string {
  // まずカタカナをひらがなに統一
  const hiragana = Array.from(kana).map(katakanaToHiragana).join("");

  let result = "";
  let i = 0;

  while (i < hiragana.length) {
    const char = hiragana[i]!;

    // 促音(っ)
    if (char === "っ") {
      // 次の文字のローマ字の先頭子音を重ねる
      if (i + 1 < hiragana.length) {
        const nextChar = hiragana[i + 1]!;
        // 次が拗音かチェック
        let nextRomaji: string | undefined;
        if (i + 2 < hiragana.length) {
          const pair = nextChar + hiragana[i + 2]!;
          nextRomaji = YOUON_TABLE.get(pair);
        }
        if (!nextRomaji) {
          nextRomaji = KANA_TABLE.get(nextChar);
        }
        if (nextRomaji) {
          result += getLeadingConsonant(nextRomaji);
        }
      }
      i++;
      continue;
    }

    // 撥音(ん) — B/M/P の前は M
    if (char === "ん") {
      // 次の文字のローマ字がB/M/Pで始まるかチェック
      if (i + 1 < hiragana.length) {
        const nextChar = hiragana[i + 1]!;
        let nextRomaji: string | undefined;
        if (i + 2 < hiragana.length) {
          const pair = nextChar + hiragana[i + 2]!;
          nextRomaji = YOUON_TABLE.get(pair);
        }
        if (!nextRomaji) {
          nextRomaji = KANA_TABLE.get(nextChar);
        }
        if (nextRomaji) {
          const firstConsonant = nextRomaji[0]!;
          if (firstConsonant === "B" || firstConsonant === "M" || firstConsonant === "P") {
            result += "M";
            i++;
            continue;
          }
        }
      }
      result += "N";
      i++;
      continue;
    }

    // 拗音(2文字マッチ)
    if (i + 1 < hiragana.length) {
      const pair = char + hiragana[i + 1]!;
      const youon = YOUON_TABLE.get(pair);
      if (youon) {
        result += youon;
        i += 2;
        continue;
      }
    }

    // 単音
    const single = KANA_TABLE.get(char);
    if (single) {
      result += single;
      i++;
      continue;
    }

    // テーブルにない文字(スペース、ハイフン等)はそのまま通す
    result += char;
    i++;
  }

  // 長音省略を適用
  // スペースやハイフンで区切られたブロックごとに適用する
  const parts = result.split(/(\s+|-)/);
  const processed = parts.map((part) => {
    // セパレータ部分はそのまま
    if (/^(\s+|-)$/.test(part)) return part;
    return applyLongVowelOmission(part);
  });

  return processed.join("");
}
