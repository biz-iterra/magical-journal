import type { Direction8, DirectionFortune, MisfortuneType } from "@mj/engine";

export interface DirectionOverlay {
  readonly direction: Direction8;
  readonly fortune: DirectionFortune;
  readonly misfortunes: readonly MisfortuneType[];
}

export interface DirectionMapProps {
  readonly center: { lat: number; lng: number };
  readonly directions: readonly DirectionOverlay[];
  readonly height?: string;
}

export interface MapProvider {
  mount(container: HTMLElement, center: { lat: number; lng: number }, zoom: number): void;
  clearOverlays(): void;
  addSectorOverlay(
    center: { lat: number; lng: number },
    startAngle: number,
    endAngle: number,
    radiusKm: number,
    color: string,
    opacity: number,
  ): void;
  addDistanceRing(center: { lat: number; lng: number }, radiusKm: number): void;
  destroy(): void;
}
