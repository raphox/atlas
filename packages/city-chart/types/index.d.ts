import type {
  ChartDefinition,
  ChartDefinitionOptions,
  ChartFocusStrategy,
  ChartMark,
  ChartRenderer,
  ChartSpec,
} from "@tanstack/charts";

export interface CityDatum {
  id: string | number;
  name: string;
  metric: { label: string; value: number };
  categories: { label: string; value: string }[];
  status: "healthy" | "warning" | "critical";
  mask?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
}
export type CityView = "iso" | "top";
export type CityWeather = "none" | "rain" | "snow";
export type CityLighting = "auto" | "day" | "twilight" | "night";
export interface CityLayout<T extends CityDatum = CityDatum> {
  companies: (T & {
    x: number;
    z: number;
    col: number;
    row: number;
    mask: number;
  })[];
  roadBounds: { x1: number; x2: number; z1: number; z2: number };
  bounds: Record<string, { x1: number; x2: number; z1: number; z2: number }>;
  anchors: Record<number, [number, number, number]>;
  center: [number, number];
}
export type CityDefinitionOptions<T extends CityDatum = CityDatum> =
  ChartDefinitionOptions<T, number, number> &
    Omit<Partial<ChartSpec>, "marks"> & { layout?: CityLayout<T> };
export declare function defineCityChart<T extends CityDatum>(
  data: readonly T[],
  options?: CityDefinitionOptions<T>,
): ChartDefinition<T, number, number>;
export declare function cityMark<T extends CityDatum>(
  data: readonly T[],
  options?: { id?: string; layout?: CityLayout<T> },
): ChartMark<T, number, number>;
export declare const cityFocus: ChartFocusStrategy;
export interface CityEngine<T extends CityDatum = CityDatum> {
  setActivity(options: { life?: boolean; effects?: boolean }): void;
  setLightingMode(mode: CityLighting): void;
  setWeather(weather: CityWeather): void;
  view(view: CityView, immediate?: boolean): void;
  zoom(factor: number): void;
  select(company: T | null): void;
  focus(company: T, options?: { maxZoom?: boolean }): void;
  companies: T[];
  companiesById: Map<T["id"], T>;
  layout: CityLayout<T>;
  dispose(): void;
}
export interface CityRendererOptions<T extends CityDatum = CityDatum> {
  view?: CityView;
  life?: boolean;
  effects?: boolean;
  onMount?: (city: CityEngine<T>) => void;
  onData?: (city: CityEngine<T>, update: { resetView: boolean }) => void;
  onDestroy?: (city: CityEngine<T>) => void;
  onError?: (error: Error) => void;
  hover?: (company: T | null, event?: PointerEvent) => void;
  projection?: (city: CityEngine<T>) => void;
}
export declare function createCityRenderer<T extends CityDatum = CityDatum>(
  options?: CityRendererOptions<T>,
): ChartRenderer<T, number, number>;
