/**
 * 診断モジュールレジストリのセットアップ。
 * enabled モジュールを登録して返す。
 */

import {
  DiagnosisRegistry,
  destinyModule,
  kigakuDirectionModule,
  kigakuProfileModule,
  lifepathModule,
  potentialModule,
  zodiacModule,
} from "@mj/engine";

/**
 * 全 enabled モジュールを登録した DiagnosisRegistry を返す。
 * displayOrder は表示順を決定する。
 */
export function createRegistry(): DiagnosisRegistry {
  const registry = new DiagnosisRegistry();

  // enabled モジュールの登録(displayOrder 昇順で表示)
  registry.register(zodiacModule, "enabled", 1);
  registry.register(potentialModule, "enabled", 2);
  registry.register(kigakuProfileModule, "enabled", 3);
  registry.register(lifepathModule, "enabled", 4);
  registry.register(destinyModule, "enabled", 5);
  registry.register(kigakuDirectionModule, "enabled", 6);

  return registry;
}
