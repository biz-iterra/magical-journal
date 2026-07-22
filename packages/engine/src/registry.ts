import type { DiagnosisModule, InputKey, ModuleStatus, ProfileInputs } from "./types.js";

/** レジストリに登録されるモジュール情報 */
export interface ModuleRegistration {
  readonly module: DiagnosisModule;
  readonly status: ModuleStatus;
  readonly displayOrder: number;
}

/**
 * 診断モジュールレジストリ。
 * docs/11 の規約に従い、モジュールの登録・取得・一括実行を提供する。
 * held/planned モジュールは getEnabled / getClientSafe / getRequiredInputs / computeAll に含まれない。
 */
export class DiagnosisRegistry {
  private readonly registrations = new Map<string, ModuleRegistration>();

  /**
   * モジュールを登録する。
   * @throws 同一 id が既に登録されている場合
   */
  register(module: DiagnosisModule, status: ModuleStatus, displayOrder: number): void {
    if (this.registrations.has(module.id)) {
      throw new Error(`DiagnosisRegistry: module "${module.id}" is already registered`);
    }
    this.registrations.set(module.id, { module, status, displayOrder });
  }

  /** enabled モジュールを displayOrder 昇順で返す */
  getEnabled(): DiagnosisModule[] {
    return this.sortedEnabled().map((r) => r.module);
  }

  /** enabled かつ clientSafe なモジュールを displayOrder 昇順で返す(友達診断用) */
  getClientSafe(): DiagnosisModule[] {
    return this.sortedEnabled()
      .filter((r) => r.module.clientSafe)
      .map((r) => r.module);
  }

  /** enabled モジュールの requiredInputs の和集合 */
  getRequiredInputs(): Set<InputKey> {
    const result = new Set<InputKey>();
    for (const reg of this.enabledRegistrations()) {
      for (const key of reg.module.requiredInputs) {
        result.add(key);
      }
    }
    return result;
  }

  /** enabled モジュールの optionalInputs の和集合(required と重複するものは除外) */
  getOptionalInputs(): Set<InputKey> {
    const required = this.getRequiredInputs();
    const result = new Set<InputKey>();
    for (const reg of this.enabledRegistrations()) {
      for (const key of reg.module.optionalInputs) {
        if (!required.has(key)) {
          result.add(key);
        }
      }
    }
    return result;
  }

  /** id でモジュール登録情報を取得する */
  getModule(id: string): ModuleRegistration | undefined {
    return this.registrations.get(id);
  }

  /** enabled モジュールすべてを実行し、id -> 結果 の Map を返す */
  computeAll(inputs: ProfileInputs, masters?: unknown): Map<string, unknown> {
    const results = new Map<string, unknown>();
    for (const reg of this.sortedEnabled()) {
      results.set(reg.module.id, reg.module.compute(inputs, masters));
    }
    return results;
  }

  // ── private helpers ──

  private enabledRegistrations(): ModuleRegistration[] {
    const result: ModuleRegistration[] = [];
    for (const reg of this.registrations.values()) {
      if (reg.status === "enabled") {
        result.push(reg);
      }
    }
    return result;
  }

  private sortedEnabled(): ModuleRegistration[] {
    return this.enabledRegistrations().sort((a, b) => a.displayOrder - b.displayOrder);
  }
}
