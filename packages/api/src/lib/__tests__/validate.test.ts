import { describe, expect, it } from "vitest";
import {
  isAbsentOrValidLatLng,
  isKanaName,
  isUniqueConstraintError,
  isValidBirthDate,
  isValidBirthTime,
  isValidLatLng,
  parseJsonOrNull,
} from "../validate.js";

/**
 * 入力検証はルートごとに書くとずれる。実際、よく行く場所の座標だけ検証していて
 * 登録・プロフィール更新は無検証だった。判定をここに集約したので、規則をここで固定する。
 */

describe("座標の検証", () => {
  it("有効な緯度経度を通す", () => {
    expect(isValidLatLng(35.68, 139.76)).toBe(true);
    expect(isValidLatLng(-90, -180)).toBe(true);
    expect(isValidLatLng(90, 180)).toBe(true);
  });

  it("文字列の座標を弾く(SQLite に TEXT で入り方位計算が壊れる)", () => {
    expect(isValidLatLng("35.68", "139.76")).toBe(false);
  });

  it("範囲外・非数値を弾く", () => {
    expect(isValidLatLng(9999, 139.76)).toBe(false);
    expect(isValidLatLng(35.68, 200)).toBe(false);
    expect(isValidLatLng(Number.NaN, 139.76)).toBe(false);
    expect(isValidLatLng(Number.POSITIVE_INFINITY, 0)).toBe(false);
    expect(isValidLatLng(true, 0)).toBe(false);
  });

  it("未指定(両方 null/undefined)は許容する", () => {
    expect(isAbsentOrValidLatLng(undefined, undefined)).toBe(true);
    expect(isAbsentOrValidLatLng(null, null)).toBe(true);
  });

  it("片方だけの指定は弾く(座標として使えない)", () => {
    expect(isAbsentOrValidLatLng(35.68, undefined)).toBe(false);
    expect(isAbsentOrValidLatLng(null, 139.76)).toBe(false);
  });
});

describe("生年月日・出生時刻の検証", () => {
  it("実在しない日付を弾く(通すと診断が黙って翌月として計算される)", () => {
    expect(isValidBirthDate("2000-02-31")).toBe(false);
    expect(isValidBirthDate("1990-13-05")).toBe(false);
    expect(isValidBirthDate("1999-02-29")).toBe(false);
  });

  it("実在する日付を通す(うるう年含む)", () => {
    expect(isValidBirthDate("1990-05-17")).toBe(true);
    expect(isValidBirthDate("2000-02-29")).toBe(true);
  });

  it("書式不正・非文字列を弾く", () => {
    expect(isValidBirthDate("1990/05/17")).toBe(false);
    expect(isValidBirthDate(19900517)).toBe(false);
    expect(isValidBirthDate(undefined)).toBe(false);
  });

  it("実在しない時刻を弾く", () => {
    expect(isValidBirthTime("99:99")).toBe(false);
    expect(isValidBirthTime("24:00")).toBe(false);
    expect(isValidBirthTime("8:30")).toBe(false);
  });

  it("実在する時刻を通す", () => {
    expect(isValidBirthTime("08:30")).toBe(true);
    expect(isValidBirthTime("23:59")).toBe(true);
    expect(isValidBirthTime("00:00")).toBe(true);
  });
});

describe("かな氏名の検証", () => {
  it("ひらがな・カタカナ・区切りを通す", () => {
    expect(isKanaName("やまだ たろう")).toBe(true);
    expect(isKanaName("ヤマダ タロウ")).toBe(true);
    expect(isKanaName("やまだ-たろう")).toBe(true);
  });

  it("漢字・英字を弾く(ローマ字変換の前提が崩れる)", () => {
    expect(isKanaName("山田 太郎")).toBe(false);
    expect(isKanaName("YAMADA TARO")).toBe(false);
  });

  it("空文字を弾く", () => {
    expect(isKanaName("")).toBe(false);
    expect(isKanaName("   ")).toBe(false);
  });
});

describe("保存済み JSON の読み取り", () => {
  it("壊れた JSON は null にする(1行の破損で応答全体を落とさない)", () => {
    expect(parseJsonOrNull("{壊れている")).toBeNull();
    expect(parseJsonOrNull(null)).toBeNull();
    expect(parseJsonOrNull(undefined)).toBeNull();
    expect(parseJsonOrNull("")).toBeNull();
  });

  it("正常な JSON はそのまま返す", () => {
    expect(parseJsonOrNull('{"a":1}')).toEqual({ a: 1 });
  });
});

describe("UNIQUE 制約違反の判定", () => {
  it("SQLITE_CONSTRAINT 系を検出する(二重登録を 409 に落とすため)", () => {
    expect(isUniqueConstraintError({ code: "SQLITE_CONSTRAINT_UNIQUE" })).toBe(true);
    expect(isUniqueConstraintError({ code: "SQLITE_CONSTRAINT_PRIMARYKEY" })).toBe(true);
  });

  it("それ以外は誤検出しない", () => {
    expect(isUniqueConstraintError(new Error("boom"))).toBe(false);
    expect(isUniqueConstraintError({ code: "SQLITE_BUSY" })).toBe(false);
    expect(isUniqueConstraintError(null)).toBe(false);
  });
});
