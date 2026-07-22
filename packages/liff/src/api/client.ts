const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

/**
 * HTTP ステータスコードを含む API エラー。
 * catch 側で status を参照して 409 / 404 等を分岐できる。
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
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
    const text = await response.text().catch(() => "");
    throw new ApiError(response.status, `API error ${response.status}: ${text}`);
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
