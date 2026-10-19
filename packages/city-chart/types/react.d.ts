import type { JSX, ReactNode, Ref } from "react";
import type { ChartDefinition, ChartPoint } from "@tanstack/charts";
import type {
  CityDatum,
  CityLighting,
  CityView,
  CityWeather,
} from "./index.js";

export type {
  CityDatum,
  CityLighting,
  CityView,
  CityWeather,
} from "./index.js";
export interface CityStats {
  drawCalls: number;
  triangles: number;
  chartRenderer: "atlas-city-3d";
  chartPoints: number;
  lightingMode?: CityLighting;
  lightingPeriod?: "day" | "twilight" | "night";
  weather?: CityWeather;
  weatherVisible: boolean;
}
export interface CityChartHandle<T extends CityDatum = CityDatum> {
  zoom(factor: number): void;
  view(view: CityView): void;
  select(datum: T, focus?: boolean, maxZoom?: boolean): void;
  deselect(): void;
  cancel(): void;
  capture(): void;
  play(direction: number): Promise<void> | undefined;
  scrollIntoView(): void;
  stats(): CityStats | undefined;
}
export interface CityMapProps<T extends CityDatum = CityDatum> {
  data: readonly T[];
  ref?: Ref<CityChartHandle<T>>;
  className?: string;
  /** "default" applies default CSS variables; null uses only the host theme. */
  theme?: "default" | "tailwind" | null;
  title?: string;
  ariaLabel?: string;
  busy?: boolean;
  view?: CityView;
  onViewChange?: (view: CityView) => void;
  life?: boolean;
  onLifeChange?: (enabled: boolean) => void;
  effects?: boolean;
  onEffectsChange?: (enabled: boolean) => void;
  autoRotate?: boolean;
  onAutoRotateChange?: (enabled: boolean) => void;
  showDistrictLabels?: boolean;
  onDistrictLabelsChange?: (enabled: boolean) => void;
  lightingMode?: CityLighting;
  weather?: CityWeather;
  showControls?: boolean;
  showEnvironmentControls?: boolean;
  showSearch?: boolean;
  showDetails?: boolean;
  onSelect?: (datum: T | null) => void;
  onFocusChange?: (point: ChartPoint<T, number, number> | null) => void;
  children?: ReactNode;
}
export declare function CityMap<T extends CityDatum>(
  props: CityMapProps<T>,
): JSX.Element;
export interface CityChartState {
  ready: boolean;
  error: string | null;
  environmentControls: ReactNode;
  weatherMode: "auto" | CityWeather;
}
export interface CityChartProps<T extends CityDatum = CityDatum> {
  autoRotate?: boolean;
  definition: ChartDefinition<T, number, number>;
  chartRef?: Ref<CityChartHandle<T>>;
  id?: string;
  viewportId?: string;
  className?: string;
  theme?: "default" | "tailwind" | null;
  ariaLabel?: string;
  view?: CityView;
  life?: boolean;
  effects?: boolean;
  lightingMode?: CityLighting;
  weather?: CityWeather;
  showEnvironmentControls?: boolean;
  showDistrictLabels?: boolean;
  region?: "all" | number;
  busy?: boolean;
  selected?: T | null;
  onSelect?: (point: ChartPoint<T, number, number> | null) => void;
  onFocusChange?: (point: ChartPoint<T, number, number> | null) => void;
  children?: ReactNode | ((state: CityChartState) => ReactNode);
}
export declare function CityChart<T extends CityDatum>(
  props: CityChartProps<T>,
): JSX.Element;
export interface EnvironmentControlsProps {
  lighting: CityLighting;
  weather: "auto" | CityWeather;
  onLightingChange: (mode: CityLighting) => void;
  onWeatherChange: (weather: "auto" | CityWeather) => void;
  disabled?: boolean;
}
export declare function EnvironmentControls(
  props: EnvironmentControlsProps,
): JSX.Element;
