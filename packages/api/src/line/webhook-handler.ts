/**
 * LINE Webhook イベントのルーティング。
 *
 * テキストメッセージのキーワードに応じて応答メッセージ(Flex カード/テキスト)を
 * reply する。すべて事前生成データ・固定コピーの再利用で、リアルタイム LLM 呼び出しは
 * しない(CLAUDE.md ルール6)。
 *
 * 依存(DB クエリ・LINE クライアント・設定)は注入し、テストで実 LINE / 実 DB を
 * 使わずに検証できるようにする。個人情報はログに出力しない。
 */

import type { PotentialTypeId } from "@mj/engine";
import type { LineClient, LineMessage } from "./client.js";
import type { CharStyle, LineConfig } from "./flex.js";
import { buildFortuneCard, buildHelp, buildMyTypeCard, buildRegisterPrompt } from "./flex.js";

// ── LINE Webhook イベント型(必要最小限) ──────────────────

export interface LineWebhookEvent {
  readonly type: string;
  readonly replyToken?: string;
  readonly source?: { readonly userId?: string };
  readonly message?: { readonly type?: string; readonly text?: string };
}

// ── 注入する DB クエリの形(api の db/queries.ts と一致) ────

export interface WebhookQueries {
  getUserByLineId(lineUserId: string): { readonly id: number } | undefined;
  getProfile(userId: number): { readonly char_style: string } | undefined;
  getDiagResult(userId: number, moduleId: string): { readonly result_json: string } | undefined;
  getDailyFortune(
    userId: number,
    date: string,
  ): { readonly fortune_text: string | null } | undefined;
}

export interface WebhookHandlerDeps {
  readonly lineClient: LineClient;
  readonly config: LineConfig;
  readonly queries: WebhookQueries;
  /** JST の当日日付 "YYYY-MM-DD" を返す(テストで固定可能) */
  readonly todayJST: () => string;
}

// ── キーワード ──────────────────────────────────────────────

const KEYWORD_MYTYPE = "マイタイプ";
const KEYWORD_FORTUNE = "今日の運勢";

// ── result_json のパース(engine モジュール出力形状) ────────

interface PotentialResultShape {
  readonly primaryType: PotentialTypeId;
}
interface ZodiacResultShape {
  readonly sign: string;
}
interface KigakuResultShape {
  readonly honmeiStar: number;
}

function parseJson<T>(json: string | undefined): T | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}

function toCharStyle(value: string | undefined): CharStyle {
  return value === "female" ? "female" : "male";
}

// ── 応答メッセージの決定(純関数) ──────────────────────────

/**
 * 1 件のテキストメッセージに対する応答メッセージを決める。
 * 副作用なし(DB 参照は queries 経由の読み取りのみ)。テストしやすいよう分離。
 *
 * @returns 応答メッセージ配列。応答不要なら null。
 */
export function resolveTextResponse(
  text: string,
  lineUserId: string | undefined,
  deps: WebhookHandlerDeps,
): readonly LineMessage[] | null {
  const keyword = text.trim();
  const { queries, config } = deps;

  // ユーザー特定。未登録(user 無し / profile 無し)は登録案内を返す。
  const user = lineUserId ? queries.getUserByLineId(lineUserId) : undefined;
  const profile = user ? queries.getProfile(user.id) : undefined;
  const registered = user !== undefined && profile !== undefined;

  if (!registered) {
    return [buildRegisterPrompt(config)];
  }
  // ここで user / profile は確定
  const userId = (user as { id: number }).id;
  const charStyle = toCharStyle((profile as { char_style: string }).char_style);

  if (keyword === KEYWORD_MYTYPE) {
    const potential = parseJson<PotentialResultShape>(
      queries.getDiagResult(userId, "potential")?.result_json,
    );
    if (!potential) {
      // 診断結果が未生成。登録直後などのフォールバック。
      return [buildRegisterPrompt(config)];
    }
    const zodiac = parseJson<ZodiacResultShape>(
      queries.getDiagResult(userId, "zodiac")?.result_json,
    );
    const kigaku = parseJson<KigakuResultShape>(
      queries.getDiagResult(userId, "kigaku_profile")?.result_json,
    );
    return [
      buildMyTypeCard(config, {
        typeId: potential.primaryType,
        charStyle,
        zodiacSign: zodiac?.sign,
        honmeiStar: kigaku?.honmeiStar,
      }),
    ];
  }

  if (keyword === KEYWORD_FORTUNE) {
    const date = deps.todayJST();
    const fortune = queries.getDailyFortune(userId, date);
    return [
      buildFortuneCard(config, {
        date,
        fortuneText: fortune?.fortune_text ?? null,
      }),
    ];
  }

  // その他テキスト → ヘルプ
  return [buildHelp()];
}

// ── イベント処理(reply の副作用を担う) ────────────────────

/**
 * Webhook イベント配列を処理し、テキストメッセージへ応答する。
 * イベント単位で失敗を握りつぶさず、reply 失敗はログに残して次へ進む
 * (1 件の失敗で全体を落とさない)。
 */
export async function handleWebhookEvents(
  events: readonly LineWebhookEvent[],
  deps: WebhookHandlerDeps,
): Promise<void> {
  for (const event of events) {
    // 応答できるのはテキストメッセージ + replyToken があるもののみ。
    if (event.type !== "message" || event.message?.type !== "text") continue;
    const replyToken = event.replyToken;
    if (!replyToken) continue;

    const text = event.message.text ?? "";
    const messages = resolveTextResponse(text, event.source?.userId, deps);
    if (!messages || messages.length === 0) continue;

    try {
      await deps.lineClient.reply(replyToken, messages);
    } catch (err) {
      // 個人情報は出さない。userId・本文はログに含めない。
      const reason = err instanceof Error ? err.message : "unknown error";
      console.error(`[LINE] reply failed: ${reason}`);
    }
  }
}
