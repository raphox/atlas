import { useMapI18n } from "../charts/city/use-map-i18n.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layers3, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { defineCityChart } from "@/charts/city";
import { useWeather } from "@/hooks/use-weather";
import { CompanySearch } from "./company-search";
import { CompanyDetails } from "./company-details";
import { CityChart } from "@/charts/city/react";
import { PerspectiveTabs, SceneControls, ZoomControls } from "./map-controls";

function MapLoading({ error, loading, busy, nextPage }) {
  const { t, format } = useMapI18n();
  if (!loading && !error && !busy) return null;
  return (
    <div
      className="atlas-map-loading absolute inset-0 z-30 flex items-center justify-center"
      role={error ? "alert" : "status"}
      aria-live="polite"
    >
      <Card className="atlas-map-loading-card m-5 max-w-sm border-0 shadow-none">
        <CardContent className="flex flex-col items-center gap-4 py-3 text-center">
          {error ? (
            <>
              <strong className="text-sm">{t("loadError")}</strong>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {error}
              </p>
              <Button variant="outline" onClick={() => location.reload()}>
                {t("retry")}
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
                  ? t("loadingCity", { page: format(nextPage) })
                  : t("buildingTitle")}
              </strong>
              <span className="text-xs text-muted-foreground">
                {t("preparing")}
              </span>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
export function CityMap({ atlas, showEnvironmentControls = false }) {
  const { t, format, locale } = useMapI18n();
  const fullscreenRef = useRef(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const weather = useWeather(atlas.life);
  const definition = useMemo(
    () => defineCityChart(atlas.layout.companies, { layout: atlas.layout }),
    [atlas.layout],
  );
  const onSelect = useCallback(
    (point) => {
      if (point) atlas.selectCompany(point.datum);
      else atlas.closeSelection();
    },
    [atlas.selectCompany, atlas.closeSelection],
  );
  const disabled = atlas.loading || Boolean(atlas.error);
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
      lang={locale}
      ref={fullscreenRef}
      className="flex min-h-[520px] grow shrink-0 flex-col lg:min-h-[460px]"
      aria-label={t("mapLabel")}
      data-chart="city-3d"
    >
      <CityChart
        definition={definition}
        id="city-map"
        viewportId="viewport"
        chartRef={atlas.mapRef}
        onSelect={onSelect}
        view={atlas.currentView}
        life={atlas.life}
        lightingMode={atlas.lightingMode}
        weather={weather.type}
        showEnvironmentControls={showEnvironmentControls}
        effects={atlas.effects}
        showDistrictLabels={atlas.showDistrictLabels}
        region={atlas.filters.region}
        busy={atlas.busy || atlas.loading}
        selected={atlas.selected}
      >
        {({ ready, error, environmentControls, weatherMode }) => {
          const disabled =
            atlas.loading || !ready || Boolean(error || atlas.error);
          return (
            <>
              <div className="atlas-map-layout pointer-events-none relative z-10 flex flex-1 flex-col gap-6 p-4 pb-11 sm:p-6 sm:pb-11">
                <div
                  className={`atlas-map-top-controls flex flex-col gap-3${controlsVisible ? "" : " invisible"}`}
                  aria-hidden={!controlsVisible}
                  inert={!controlsVisible}
                >
                  <div className="atlas-map-header flex flex-col items-start justify-between gap-3 sm:flex-row">
                    <div className="atlas-map-heading flex items-center gap-2.5">
                      <span className="size-1.5 rounded-full bg-emerald-600 ring-4 ring-emerald-800/5" />
                      <div>
                        <strong className="text-xs font-medium">
                          {t("title")}
                        </strong>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {atlas.pageSize === "all"
                            ? t("allCompanies")
                            : t("companyLimit", {
                                count: format(atlas.pageSize),
                              })}{" "}
                          ·{" "}
                          {t("cityPage", {
                            page: format(atlas.pagination.page),
                          })}
                        </p>
                        <p
                          role="status"
                          data-testid="weather-status"
                          className="mt-1 max-w-64 text-[10px] text-muted-foreground"
                        >
                          {!atlas.life || weatherMode === "auto"
                            ? weather.message
                            : {
                                none: t("simulation.none"),
                                rain: t("simulation.rain"),
                                snow: t("simulation.snow"),
                              }[weatherMode]}
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
                </div>
                <div className="atlas-map-bottom-controls mt-auto flex flex-col gap-3">
                  <CompanyDetails
                    company={atlas.selected}
                    onClose={atlas.closeSelection}
                    onFocus={() =>
                      atlas.selectCompany(atlas.selected, true, true)
                    }
                  />
                  <div
                    className={controlsVisible ? undefined : "invisible"}
                    aria-hidden={!controlsVisible}
                    inert={!controlsVisible}
                  >
                    <SceneControls
                      atlas={atlas}
                      disabled={disabled}
                      environmentControls={environmentControls}
                    />
                  </div>
                </div>
              </div>
              <ZoomControls
                atlas={atlas}
                disabled={disabled || atlas.busy}
                fullscreenRef={fullscreenRef}
                controlsVisible={controlsVisible}
                onToggleControls={() =>
                  setControlsVisible((visible) => !visible)
                }
              />
              <div
                className="atlas-map-compass pointer-events-none absolute bottom-28 left-4 text-center sm:left-6 text-muted-foreground"
                aria-hidden="true"
              >
                <span className="text-[9px]">N</span>
                <div className="text-3xl leading-6">↑</div>
              </div>
              <footer className="pointer-events-none select-none absolute right-0 bottom-0 left-0 z-10 flex min-h-8 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border/60 bg-card/50 px-4 py-1 text-[9px] text-muted-foreground sm:px-6">
                <span className="atlas-map-footer-text">
                  {t("weather")}:{" "}
                  <a
                    className="pointer-events-auto underline underline-offset-2"
                    href="https://open-meteo.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open-Meteo
                  </a>
                  {" · "}
                  <a
                    className="pointer-events-auto underline underline-offset-2"
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    CC BY 4.0
                  </a>
                </span>
                <span className="atlas-map-footer-text">
                  {t("companyRange", {
                    start: format(atlas.pagination.start),
                    end: format(atlas.pagination.end),
                    total: format(atlas.pagination.total),
                  })}
                </span>
              </footer>
              {!atlas.loading &&
                !atlas.layout.companies.length &&
                !atlas.error && (
                  <Card className="atlas-map-message absolute top-1/2 left-1/2 z-10 w-64 -translate-1/2 gap-4 text-center">
                    <CardContent className="space-y-4">
                      <p className="text-sm">{t("empty")}</p>
                      <Button size="sm" onClick={atlas.clearFilters}>
                        {t("clearFilters")}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              <MapLoading
                error={atlas.error || error}
                loading={atlas.loading || !ready}
                busy={atlas.busy}
                nextPage={atlas.pagination.page}
              />
            </>
          );
        }}
      </CityChart>
    </section>
  );
}
