import { useEffect, useRef, useState } from "react";
import { Layers3, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { REGIONS, STATUS } from "@/model";
import { format } from "@/hooks/use-atlas";
import { useCity } from "@/hooks/use-city";
import { CompanySearch } from "./company-search";
import { CompanyDetails } from "./company-details";
import { PerspectiveTabs, SceneControls, ZoomControls } from "./map-controls";

function DistrictLabels({ layout, labelsRef, labelNodes }) {
  return (
    <div
      ref={labelsRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {REGIONS.filter((region) => layout.anchors[region.mask]).map((region) => (
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
              layout.companies.filter((company) => company.mask === region.mask)
                .length,
            )}
          </small>
        </div>
      ))}
    </div>
  );
}
function MapLoading({ error, loading, busy, nextPage }) {
  if (!loading && !error && !busy) return null;
  return (
    <div
      className={`absolute inset-0 z-30 flex items-center justify-center ${busy && !error ? "bg-background/65" : "bg-background"}`}
      role={error ? "alert" : "status"}
      aria-live="polite"
    >
      <Card className="m-5 max-w-sm border-0 bg-card/90 shadow-none">
        <CardContent className="flex flex-col items-center gap-4 py-3 text-center">
          {error ? (
            <>
              <strong className="text-sm">
                Não foi possível carregar a aplicação.
              </strong>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {error}
              </p>
              <Button variant="outline" onClick={() => location.reload()}>
                Tentar novamente
              </Button>
            </>
          ) : (
            <>
              {busy ? (
                <LoaderCircle className="size-8 animate-spin text-primary" />
              ) : (
                <Layers3 className="size-10 animate-pulse text-primary" />
              )}
              <strong className="text-sm font-medium">
                {busy
                  ? `Carregando cidade ${nextPage}…`
                  : "Construindo a cidade"}
              </strong>
              <span className="text-xs text-muted-foreground">
                Preparando empresas e bairros…
              </span>
            </>
          )}
        </CardContent>
      </Card>
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
          {REGIONS.find((region) => region.mask === tooltip.company.mask).label}{" "}
          · {format(tooltip.company.users)} usuários ·{" "}
          {STATUS[tooltip.company.status].label}
        </small>
      </TooltipContent>
    </Tooltip>
  );
}
export function CityMap({ atlas }) {
  const panelRef = useRef(null),
    viewportRef = useRef(null),
    labelsRef = useRef(null),
    labelNodes = useRef(new Map());
  const [tooltip, setTooltip] = useState(null);
  const { ready, error, onTooltipEnter, onTooltipLeave } = useCity({
    atlas,
    panelRef,
    viewportRef,
    labelsRef,
    labelNodes,
    onHover: setTooltip,
  });
  const disabled = atlas.loading || !ready || Boolean(error || atlas.error);
  useEffect(() => {
    const keyboard = (event) => {
      const target = event.target;
      const interactive =
        target instanceof Element &&
        target.closest(
          'input, textarea, select, button, [role="combobox"], [role="dialog"], [contenteditable="true"]',
        );
      if (event.key === "Escape" && !document.querySelector('[role="dialog"]'))
        atlas.closeSelection();
      if (
        disabled ||
        interactive ||
        document.querySelector('[role="dialog"]') ||
        !["+", "=", "-", "0"].includes(event.key)
      )
        return;
      event.preventDefault();
      if (event.key === "0") atlas.changeView("iso");
      else atlas.zoom(event.key === "-" ? 1 / 1.3 : 1.3);
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [atlas.closeSelection, atlas.changeView, atlas.zoom, disabled]);
  return (
    <section
      ref={panelRef}
      id="city-map"
      className="relative min-h-[520px] flex-1 overflow-hidden bg-[#e9ede4] lg:min-h-[460px]"
      aria-label="Mapa interativo de empresas"
      aria-busy={atlas.busy || atlas.loading}
    >
      <div
        ref={viewportRef}
        id="viewport"
        className="absolute inset-0 touch-none outline-none"
        tabIndex={0}
        aria-label="Cidade 3D. Arraste para girar, use a roda para zoom, clique em uma empresa para detalhes."
      />
      <DistrictLabels
        layout={atlas.layout}
        labelsRef={labelsRef}
        labelNodes={labelNodes}
      />
      <div className="pointer-events-none absolute top-4 right-4 left-4 z-10 flex flex-col justify-between gap-3 sm:top-6 sm:right-6 sm:left-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <span className="size-1.5 rounded-full bg-emerald-600 ring-4 ring-emerald-800/5" />
          <div>
            <strong className="text-xs font-medium">
              Distrito das empresas
            </strong>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {atlas.pageSize === "all"
                ? "Todas as empresas"
                : `Até ${format(atlas.pageSize)} empresas`}{" "}
              · cidade {atlas.pagination.page}
            </p>
          </div>
        </div>
        <CompanySearch
          query={atlas.filters.query}
          companies={atlas.layout.companies}
          onQuery={(query) => atlas.updateFilters({ query })}
          onSelect={(company) => atlas.selectCompany(company, true)}
          disabled={disabled}
        />
      </div>
      <PerspectiveTabs
        view={atlas.currentView}
        onChange={atlas.changeView}
        disabled={disabled || atlas.busy}
      />
      <ZoomControls atlas={atlas} disabled={disabled || atlas.busy} />
      <SceneControls atlas={atlas} disabled={disabled} />
      <div
        className="pointer-events-none absolute bottom-28 left-6 text-center text-muted-foreground"
        aria-hidden="true"
      >
        <span className="text-[9px]">N</span>
        <div className="text-3xl leading-6">↑</div>
      </div>
      <footer className="pointer-events-none select-none absolute right-0 bottom-0 left-0 z-10 flex h-8 items-center justify-between gap-2 border-t border-border/60 px-5 text-[9px] text-muted-foreground">
        <span className="tracking-[.15em]">ATLAS / CITY VIEW</span>
        <span>
          {atlas.pagination.start}–{atlas.pagination.end} de{" "}
          {format(atlas.pagination.total)} empresas
        </span>
      </footer>
      <CompanyHover
        key={tooltip?.company.id}
        tooltip={tooltip}
        collisionBoundary={viewportRef.current}
        onPointerEnter={onTooltipEnter}
        onPointerLeave={onTooltipLeave}
      />
      {!atlas.loading && !atlas.layout.companies.length && !atlas.error && (
        <Card className="absolute top-1/2 left-1/2 z-10 w-64 -translate-1/2 gap-4 bg-card/95 text-center">
          <CardContent className="space-y-4">
            <p className="text-sm">Nenhuma empresa encontrada.</p>
            <Button size="sm" onClick={atlas.clearFilters}>
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      )}
      <CompanyDetails
        company={atlas.selected}
        onClose={atlas.closeSelection}
        onFocus={() => atlas.selectCompany(atlas.selected, true)}
      />
      <MapLoading
        error={atlas.error || error}
        loading={atlas.loading || !ready}
        busy={atlas.busy}
        nextPage={atlas.pagination.page}
      />
    </section>
  );
}
