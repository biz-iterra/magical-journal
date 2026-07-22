import { DISTANCE_RINGS_KM, generateArcPoints } from "./geometry.js";
import type { MapProvider } from "./types.js";

let loadPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (loadPromise) return loadPromise;

  if (typeof google !== "undefined" && google.maps) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps の読み込みに失敗しました"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export class GoogleMapsProvider implements MapProvider {
  private map: google.maps.Map | null = null;
  private overlays: google.maps.Polygon[] = [];
  private rings: google.maps.Circle[] = [];

  async init(container: HTMLElement, center: { lat: number; lng: number }, zoom: number) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;
    if (!apiKey) {
      throw new Error("VITE_GOOGLE_MAPS_API_KEY が設定されていません");
    }

    await loadGoogleMaps(apiKey);
    this.mount(container, center, zoom);
  }

  mount(container: HTMLElement, center: { lat: number; lng: number }, zoom: number): void {
    this.map = new google.maps.Map(container, {
      center,
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "greedy",
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });
  }

  clearOverlays(): void {
    for (const o of this.overlays) o.setMap(null);
    for (const r of this.rings) r.setMap(null);
    this.overlays = [];
    this.rings = [];
  }

  addSectorOverlay(
    center: { lat: number; lng: number },
    startAngle: number,
    endAngle: number,
    radiusKm: number,
    color: string,
    opacity: number,
  ): void {
    if (!this.map) return;

    const arcPoints = generateArcPoints(center, startAngle, endAngle, radiusKm);
    const path = [center, ...arcPoints, center];

    const polygon = new google.maps.Polygon({
      paths: path,
      strokeColor: color,
      strokeOpacity: 0.6,
      strokeWeight: 1,
      fillColor: color,
      fillOpacity: opacity,
      map: this.map,
    });

    this.overlays.push(polygon);
  }

  addDistanceRing(center: { lat: number; lng: number }, radiusKm: number): void {
    if (!this.map) return;

    const circle = new google.maps.Circle({
      center,
      radius: radiusKm * 1000,
      strokeColor: "#6b7280",
      strokeOpacity: 0.3,
      strokeWeight: 1,
      fillOpacity: 0,
      map: this.map,
    });

    this.rings.push(circle);
  }

  addDistanceRings(center: { lat: number; lng: number }): void {
    for (const km of DISTANCE_RINGS_KM) {
      this.addDistanceRing(center, km);
    }
  }

  destroy(): void {
    this.clearOverlays();
    this.map = null;
  }
}
