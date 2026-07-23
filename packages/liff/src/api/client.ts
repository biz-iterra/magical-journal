import { clientError, formatError } from "../errors";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * HTTP ステータスコードとエラーコードを含む API エラー。
 * catch 側で status / code を参照して分岐できる。
 * message は「メッセージ(コード)」形式に整形済み。
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let currentIdToken: string | null = null;

/**
 * LIFF 初期化後に ID トークンをセットする。
 */
export function setIdToken(token: string | null): void {
  currentIdToken = token;
}

function getAuthHeader(): string {
  if (currentIdToken) {
    return `Bearer ${currentIdToken}`;
  }
  // 開発モードではモックトークンを使用
  if (import.meta.env.DEV) {
    return "Bearer dev:mock-user";
  }
  return "";
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const auth = getAuthHeader();
  if (auth) {
    headers.Authorization = auth;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // API のエラー応答 { error, code } を読み取り「メッセージ(コード)」に整形する。
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      code?: string;
    } | null;

    if (body?.error && body.code) {
      throw new ApiError(response.status, formatError(body.error, body.code), body.code);
    }
    if (body?.error) {
      throw new ApiError(response.status, body.error, null);
    }
    // 構造化されていない応答(ネットワーク層のエラー等)
    throw new ApiError(response.status, clientError("MJ-NET-001"), "MJ-NET-001");
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>("GET", path);
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("POST", path, body);
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>("PATCH", path, body);
  },
} as const;
