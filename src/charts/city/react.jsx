import { useRef, useState } from "react";
import { Chart } from "@tanstack/charts/react/core";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { regionsFor, categoryLabel, metricFor, STATUS } from "@/model";
import { format } from "@/hooks/use-atlas";
import { useCityChart } from "./use-city-chart.js";
import { EnvironmentControls } from "./environment-controls.jsx";

function DistrictLabels({ layout, labelsRef, labelNodes, visible }) {
  return (
    <div
      ref={labelsRef}
      hidden={!visible}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {regionsFor(layout.companies)
        .filter((region) => layout.anchors[region.mask])
        .map((region) => (
          <div
            key={region.mask}
            ref={(node) => {
              if (node) labelNodes.current.set(region.mask, node);
              else labelNodes.current.delete(region.mask);
            }}
            className="district-label absolute flex -translate-1/2 items-center gap-1.5 rounded-md border border-border/80 bg-card/95 px-2 py-1.5 text-[10px] font-bold whitespace-nowrap shadow-md backdrop-blur"
            style={{ color: region.color }}
          >
            <span
              className="size-1.5 shrink-0 rounded-sm"
              style={{ background: region.color }}
            />
            <span>{region.shortLabel}</span>
            <small className="text-[9px] font-normal text-muted-foreground">
              {format(
                layout.companies.filter(
                  (company) => company.mask === region.mask,
                ).length,
              )}
            </small>
          </div>
        ))}
    </div>
  );
}
function CompanyHover({
  tooltip,
  collisionBoundary,
  onPointerEnter,
  onPointerLeave,
}) {
  if (!tooltip) return null;
  return (
    <Tooltip open>
      <TooltipTrigger asChild>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-px"
          style={{ left: tooltip.x, top: tooltip.y }}
        />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        alignOffset={-16}
        sideOffset={0}
        arrowPadding={8}
        collisionPadding={12}
        collisionBoundary={collisionBoundary}
        updatePositionStrategy="always"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        className="pointer-events-auto max-w-64 animate-none border border-border bg-white px-3 py-2 text-[11px] text-slate-900 shadow-md"
        arrowClassName="fill-white stroke-border"
        arrowBordered
      >
        <span>{tooltip.company.name}</span>
        <small className="mt-1 block text-[9px] opacity-80">
          {categoryLabel(tooltip.company)} · {metricFor(tooltip.company).label}:{" "}
          {format(metricFor(tooltip.company).value)} ·{" "}
          {STATUS[tooltip.company.status].label}
        </small>
      </TooltipContent>
    </Tooltip>
  );
}
// Standard TanStack definition and ChartPoint callbacks, with a Three.js surface.
export function CityChart({
  definition,
  id,
  viewportId,
  chartRef,
  onSelect,
  onFocusChange,
  view = "iso",
  life = true,
  lightingMode = "auto",
  weather = "none",
  showEnvironmentControls = false,
  effects = true,
  showDistrictLabels = false,
  region = "all",
  busy = false,
  selected = null,
  children,
  ariaLabel = "Health score das empresas em uma cidade 3D",
}) {
  const panelRef = useRef(null);
  const viewportRef = useRef(null);
  const labelsRef = useRef(null);
  const labelNodes = useRef(new Map());
  const [tooltip, setTooltip] = useState(null);
  const [lightingOverride, setLightingOverride] = useState("auto");
  const [weatherOverride, setWeatherOverride] = useState("auto");
  const weatherMode = showEnvironmentControls ? weatherOverride : "auto";
  const {
    renderer,
    layout,
    ready,
    error,
    onRender,
    onTooltipEnter,
    onTooltipLeave,
  } = useCityChart({
    definition,
    busy,
    selected,
    region,
    currentView: view,
    life,
    lightingMode:
      showEnvironmentControls && lightingOverride !== "auto"
        ? lightingOverride
        : lightingMode,
    weather: weatherMode === "auto" ? weather : weatherMode,
    effects,
    chartRef,
    panelRef,
    viewportRef,
    labelsRef,
    labelNodes,
    onHover: setTooltip,
  });
  const environmentControls = showEnvironmentControls ? (
    <EnvironmentControls
      lighting={lightingOverride}
      weather={weatherOverride}
      onLightingChange={setLightingOverride}
      onWeatherChange={setWeatherOverride}
      disabled={!life || busy || !ready || Boolean(error)}
    />
  ) : null;
  return (
    <div
      ref={panelRef}
      id={id}
      className="relative min-h-[520px] flex-1 overflow-hidden bg-[#e9ede4] lg:min-h-[460px]"
      aria-busy={busy || !ready}
    >
      <div
        ref={viewportRef}
        id={viewportId}
        className="city-chart-viewport absolute inset-0 touch-none outline-none"
        aria-label="Cidade 3D. Arraste para girar, use a roda para zoom, clique em uma empresa para detalhes."
      >
        <Chart
          definition={definition}
          renderer={renderer}
          ariaLabel={ariaLabel}
          ariaDescription="Cada construção representa uma empresa. Altura indica o valor da métrica, cor indica categorias e efeitos indicam o nível de risco."
          style={{ height: "100%" }}
          onSelect={onSelect}
          onFocusChange={onFocusChange}
          onRender={onRender}
        />
      </div>
      <DistrictLabels
        visible={showDistrictLabels}
        layout={layout}
        labelsRef={labelsRef}
        labelNodes={labelNodes}
      />
      <CompanyHover
        key={tooltip?.company.id}
        tooltip={tooltip}
        collisionBoundary={viewportRef.current}
        onPointerEnter={onTooltipEnter}
        onPointerLeave={onTooltipLeave}
      />
      {typeof children === "function" ? (
        children({ ready, error, environmentControls, weatherMode })
      ) : (
        <>
          {children}
          {environmentControls && (
            <div className="pointer-events-none absolute right-4 bottom-4 left-4 z-10 flex flex-wrap justify-end gap-2">
              {environmentControls}
            </div>
          )}
        </>
      )}
    </div>
  );
}
