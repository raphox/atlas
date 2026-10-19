import { useMapI18n } from "./use-map-i18n.js";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { defineCityChart } from "./definition.js";
import { CityChart } from "./react.jsx";
import { categoryLabel, metricFor } from "../../model.js";

function useSetting(value, initial, onChange) {
  const [local, setLocal] = useState(initial);
  return [
    value ?? local,
    (next) => {
      setLocal(next);
      onChange?.(next);
    },
  ];
}

/** A complete, self-contained city with camera, weather and scene controls. */
export const CityMap = forwardRef(function CityMap(
  {
    data,
    onSelect,
    onFocusChange,
    view: viewProp,
    onViewChange,
    life: lifeProp,
    onLifeChange,
    effects: effectsProp,
    onEffectsChange,
    showDistrictLabels: labelsProp,
    onDistrictLabelsChange,
    weather = "none",
    lightingMode = "auto",
    showControls = true,
    showEnvironmentControls = true,
    showSearch = true,
    showDetails = true,
    busy = false,
    title: titleProp,
    ariaLabel: ariaLabelProp,
    className = "",
    theme = "default",
    children,
  },
  ref,
) {
  const { t, format, locale } = useMapI18n();
  const title = titleProp ?? t("title");
  const ariaLabel = ariaLabelProp ?? t("mapLabel");
  const panelRef = useRef(null);
  const chartRef = useRef(null);
  const [view, setView] = useSetting(viewProp, "iso", onViewChange);
  const [life, setLife] = useSetting(lifeProp, true, onLifeChange);
  const [effects, setEffects] = useSetting(effectsProp, true, onEffectsChange);
  const [labels, setLabels] = useSetting(
    labelsProp,
    false,
    onDistrictLabelsChange,
  );
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(null);
  const definition = useMemo(() => defineCityChart(data), [data]);
  const selected = data.find((datum) => datum.id === selectedId) ?? null;
  const matches = query.trim()
    ? data
        .filter((datum) =>
          datum.name
            .toLocaleLowerCase()
            .includes(query.trim().toLocaleLowerCase()),
        )
        .slice(0, 8)
    : [];
  const choose = (datum, focus = false, maxZoom = false) => {
    setSelectedId(datum?.id ?? null);
    onSelect?.(datum);
    if (datum && focus) chartRef.current?.select(datum, true, maxZoom);
  };
  const changeView = (next) => {
    setView(next);
    chartRef.current?.view(next);
  };

  useImperativeHandle(ref, () => ({
    zoom: (factor) => chartRef.current?.zoom(factor),
    view: changeView,
    select: (datum, focus, maxZoom) => choose(datum, focus, maxZoom),
    deselect: () => choose(null),
    cancel: () => chartRef.current?.cancel(),
    capture: () => chartRef.current?.capture(),
    play: (direction) => chartRef.current?.play(direction),
    scrollIntoView: () => chartRef.current?.scrollIntoView(),
    stats: () => chartRef.current?.stats(),
  }));

  useEffect(() => {
    const update = () =>
      setFullscreen(document.fullscreenElement === panelRef.current);
    setFullscreenAvailable(
      Boolean(
        document.fullscreenEnabled && panelRef.current?.requestFullscreen,
      ),
    );
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const toggleFullscreen = async () => {
    setFullscreenError(null);
    try {
      chartRef.current?.cancel();
      if (document.fullscreenElement === panelRef.current)
        await document.exitFullscreen();
      else await panelRef.current.requestFullscreen();
    } catch {
      setFullscreenError("fullscreenError");
    }
  };

  return (
    <section
      lang={locale}
      ref={panelRef}
      className={`atlas-city-map ${theme ? `atlas-city-theme-${theme}` : ""} ${className}`}
      aria-label={ariaLabel}
      data-chart="city-3d"
      onKeyDown={(event) => {
        if (
          event.target.closest(
            "input, textarea, select, button, [contenteditable='true']",
          )
        )
          return;
        if (event.key === "Escape") choose(null);
        if (busy || !["+", "=", "-", "0"].includes(event.key)) return;
        event.preventDefault();
        if (event.key === "0") changeView("iso");
        else chartRef.current?.zoom(event.key === "-" ? 1 / 1.3 : 1.3);
      }}
    >
      <CityChart
        definition={definition}
        theme={null}
        chartRef={chartRef}
        onSelect={(point) => choose(point?.datum ?? null)}
        onFocusChange={onFocusChange}
        view={view}
        life={life}
        effects={effects}
        weather={weather}
        lightingMode={lightingMode}
        showDistrictLabels={labels}
        showEnvironmentControls={showControls && showEnvironmentControls}
        selected={selected}
        busy={busy}
        ariaLabel={ariaLabel}
      >
        {({ ready, error, environmentControls }) => {
          const disabled = busy || !ready || Boolean(error);
          return (
            <>
              <div className="atlas-city-top-controls">
                <header className="atlas-city-header">
                  <strong className="atlas-city-title">{title}</strong>
                  {showSearch && (
                    <div className="atlas-city-search">
                      <input
                        className="atlas-city-search-input"
                        type="search"
                        aria-label={t("searchMap")}
                        placeholder={t("searchPlaceholder")}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        disabled={disabled}
                      />
                      {query.trim() && (
                        <div className="atlas-city-results">
                          {matches.length ? (
                            matches.map((datum) => (
                              <button
                                key={datum.id}
                                className="atlas-city-search-result"
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  choose(datum, true);
                                  setQuery("");
                                }}
                              >
                                {datum.name}
                              </button>
                            ))
                          ) : (
                            <p
                              className="atlas-city-search-empty"
                              role="status"
                            >
                              {t("empty")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </header>
                {showControls && (
                  <fieldset
                    className="atlas-city-perspectives"
                    disabled={disabled}
                  >
                    <legend className="atlas-city-perspective-legend">
                      {t("perspective")}
                    </legend>
                    {[
                      ["iso", t("iso")],
                      ["top", t("top")],
                    ].map(([value, label]) => (
                      <button
                        className="atlas-city-perspective-button"
                        key={value}
                        type="button"
                        aria-pressed={view === value}
                        onClick={() => changeView(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </fieldset>
                )}
                {fullscreenError && (
                  <p role="alert" className="atlas-city-message">
                    {t(fullscreenError)}
                  </p>
                )}
                {showDetails && selected && (
                  <aside
                    className="atlas-city-details"
                    aria-label={t("details")}
                  >
                    <button
                      className="atlas-city-details-close"
                      type="button"
                      aria-label={t("closeDetails")}
                      onClick={() => choose(null)}
                    >
                      ×
                    </button>
                    <strong className="atlas-city-details-title">
                      {selected.name}
                    </strong>
                    <p className="atlas-city-details-categories">
                      {categoryLabel(selected)}
                    </p>
                    <p className="atlas-city-details-metric">
                      {metricFor(selected).label}:{" "}
                      {format(metricFor(selected).value)}
                    </p>
                    <p
                      className={`atlas-city-details-status atlas-city-details-status--${selected.status}`}
                    >
                      {t(`status.${selected.status}`)}
                    </p>
                    <button
                      className="atlas-city-details-focus"
                      type="button"
                      onClick={() =>
                        chartRef.current?.select(selected, true, true)
                      }
                    >
                      {t("focus")}
                    </button>
                  </aside>
                )}
                {!disabled && data.length === 0 && (
                  <p role="status" className="atlas-city-message">
                    {t("empty")}
                  </p>
                )}
              </div>
              {showControls && (
                <>
                  <div
                    className="atlas-city-zoom"
                    role="group"
                    aria-label={t("cameraControls")}
                  >
                    {[
                      [t("zoomIn"), "+", () => chartRef.current?.zoom(1.3)],
                      [
                        t("zoomOut"),
                        "−",
                        () => chartRef.current?.zoom(1 / 1.3),
                      ],
                      [t("resetView"), "⌂", () => changeView(view)],
                      [
                        fullscreen ? t("exitFullscreen") : t("enterFullscreen"),
                        fullscreen ? "⤡" : "⤢",
                        toggleFullscreen,
                      ],
                    ].map(([label, icon, action], index) => (
                      <button
                        key={label}
                        className={`atlas-city-camera-button atlas-city-camera-button--${["zoom-in", "zoom-out", "reset", "fullscreen"][index]}`}
                        type="button"
                        aria-label={label}
                        title={label}
                        disabled={
                          disabled || (index === 3 && !fullscreenAvailable)
                        }
                        onClick={action}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                  <div className="atlas-city-scene-controls">
                    {environmentControls}
                    {[
                      ["life", t("life"), life, setLife],
                      ["effects", t("effects"), effects, setEffects],
                      ["labels", t("districtLabels"), labels, setLabels],
                    ].map(([id, label, checked, change]) => (
                      <label
                        key={label}
                        className={`atlas-city-control atlas-city-toggle atlas-city-toggle--${id}`}
                      >
                        <input
                          className="atlas-city-toggle-input"
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={(event) => change(event.target.checked)}
                        />
                        <span className="atlas-city-control-label">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              {disabled && (
                <div
                  className="atlas-city-loading"
                  role={error ? "alert" : "status"}
                >
                  {error || (busy ? t("updating") : t("building"))}
                </div>
              )}
              {children}
            </>
          );
        }}
      </CityChart>
    </section>
  );
});
