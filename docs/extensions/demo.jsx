import { useEffect, useMemo, useRef, useState } from "react";
import { CityMap } from "../../src/charts/city/map.jsx";
import {
  STATUS,
  categoryLabel,
  metricDomainFor,
  regionsFor,
} from "../../src/model.js";
import { useWeather } from "./use-weather.js";
import {
  downloadJson,
  filterCompanies,
  MAX_JSON_BYTES,
  paginate,
  parseJson,
  sampleCompanies,
} from "./data.js";

const defaults = { statuses: [], region: "all", query: "" };
const nextPaint = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
const format = (value) => new Intl.NumberFormat("en-US").format(value);

export function ExtensionDemo() {
  const [data, setData] = useState(sampleCompanies);
  const [filters, setFilters] = useState(defaults);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [selected, setSelected] = useState(null);
  const [source, setSource] = useState("Sample portfolio");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [life, setLife] = useState(true);
  const [liveWeather, setLiveWeather] = useState(false);
  const mapRef = useRef(null);
  const operation = useRef(0);
  const controller = useRef(null);
  const weather = useWeather(liveWeather && life);
  const metricDomain = useMemo(() => metricDomainFor(data), [data]);
  const regions = useMemo(() => regionsFor(data), [data]);
  const matching = useMemo(
    () => filterCompanies(data, filters),
    [data, filters],
  );
  const counts = useMemo(
    () => filterCompanies(data, { ...filters, region: "all" }),
    [data, filters],
  );
  const city = useMemo(
    () => paginate(matching, page, pageSize),
    [matching, page, pageSize],
  );
  const busy = loading || transitioning;

  useEffect(() => {
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
    return () => {
      operation.current++;
      controller.current?.abort();
    };
  }, []);

  function cancel() {
    operation.current++;
    controller.current?.abort();
    mapRef.current?.cancel();
    setLoading(false);
    setTransitioning(false);
  }
  function resetSelection() {
    mapRef.current?.deselect();
    setSelected(null);
  }
  function changeFilters(patch) {
    cancel();
    resetSelection();
    setFilters((previous) => ({ ...previous, ...patch }));
    setPage(1);
  }
  function replaceData(next, label) {
    resetSelection();
    setData(next);
    setFilters(defaults);
    setPage(1);
    setSource(label);
    setError("");
    setMessage(
      `${format(next.length)} companies loaded. Data stays in this browser session.`,
    );
  }
  async function importFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    cancel();
    const request = ++operation.current;
    setLoading(true);
    try {
      if (file.size > MAX_JSON_BYTES)
        throw new Error("Choose JSON smaller than 5 MB.");
      const next = parseJson(await file.text());
      if (request === operation.current) replaceData(next, file.name);
    } catch (cause) {
      if (request === operation.current) setError(cause.message);
    } finally {
      if (request === operation.current) setLoading(false);
    }
  }
  async function loadSource(event) {
    event.preventDefault();
    cancel();
    const request = ++operation.current;
    const abort = new AbortController();
    controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 10000);
    setLoading(true);
    setError("");
    try {
      const endpoint = new URL(url, location.href);
      if (!["http:", "https:"].includes(endpoint.protocol))
        throw new Error("Use an HTTP or HTTPS JSON endpoint.");
      const response = await fetch(endpoint, {
        signal: abort.signal,
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok)
        throw new Error(`Data source returned HTTP ${response.status}.`);
      const next = parseJson(await response.text());
      if (request === operation.current)
        replaceData(next, "Connected JSON source");
    } catch (cause) {
      if (request === operation.current)
        setError(
          cause.name === "AbortError"
            ? "The data request timed out. Try again."
            : cause.message,
        );
    } finally {
      clearTimeout(timeout);
      if (request === operation.current) setLoading(false);
    }
  }
  async function changePage(direction) {
    if (busy) return;
    const target = city.current + direction;
    if (target < 1 || target > city.pages) return;
    const request = ++operation.current;
    setTransitioning(true);
    resetSelection();
    try {
      await nextPaint();
      if (request !== operation.current) return;
      mapRef.current?.capture();
      setPage(target);
      await nextPaint();
      if (request !== operation.current) return;
      await mapRef.current?.play(direction);
    } catch {
      if (request === operation.current)
        setError("Unable to animate the city transition. Try again.");
    } finally {
      if (request === operation.current) setTransitioning(false);
    }
  }

  return (
    <section className="extension-demo" aria-label="Extended chart example">
      <div className="extension-demo-heading">
        <div>
          <span className="eyebrow">LIVE INTEGRATION</span>
          <h3>Your portfolio workspace</h3>
        </div>
        <span className="extension-source">{source}</span>
      </div>
      <div className="extension-summary" aria-label="Portfolio summary">
        <div>
          <strong>{format(data.length)}</strong>
          <span>In portfolio</span>
        </div>
        <div>
          <strong data-testid="extension-matches">
            {format(matching.length)}
          </strong>
          <span>Matching filters</span>
        </div>
        <div>
          <strong>{format(city.rows.length)}</strong>
          <span>In this city</span>
        </div>
      </div>
      <div className="extension-filters">
        <label>
          Find companies
          <input
            aria-label="Filter company name"
            value={filters.query}
            onChange={(event) => changeFilters({ query: event.target.value })}
            placeholder="Search the full portfolio"
          />
        </label>
        <label>
          District
          <select
            aria-label="Filter district"
            value={filters.region}
            onChange={(event) => changeFilters({ region: event.target.value })}
          >
            <option value="all">All districts ({format(counts.length)})</option>
            {regions.map((region) => (
              <option key={region.mask} value={String(region.mask)}>
                {region.label} (
                {format(
                  counts.filter((company) => company.mask === region.mask)
                    .length,
                )}
                )
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>Status</legend>
          {Object.keys(STATUS).map((status) => (
            <label key={status}>
              <input
                type="checkbox"
                aria-label={status}
                checked={filters.statuses.includes(status)}
                onChange={(event) =>
                  changeFilters({
                    statuses: event.target.checked
                      ? [...filters.statuses, status]
                      : filters.statuses.filter((value) => value !== status),
                  })
                }
              />
              {status} (
              {format(
                matching.filter((company) => company.status === status).length,
              )}
              )
            </label>
          ))}
        </fieldset>
        <button type="button" onClick={() => changeFilters(defaults)}>
          Clear filters
        </button>
      </div>
      <div className="extension-weather">
        <label>
          <input
            type="checkbox"
            checked={liveWeather}
            onChange={(event) => setLiveWeather(event.target.checked)}
          />
          Connect local weather
        </label>
        <span role="status" data-testid="extension-weather">
          {liveWeather
            ? weather.message
            : "Weather disconnected · use the map selectors to simulate rain or snow."}
        </span>
        {liveWeather && (
          <span>
            Regional weather by{" "}
            <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
              Open-Meteo
            </a>{" "}
            ·{" "}
            <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>
          </span>
        )}
      </div>
      <p className="extension-note">
        Connecting weather asks for your approximate location. Coordinates are
        rounded to two decimals and sent to Open-Meteo; they remain in memory.
        Disable City life to pause requests and effects. Manual selectors
        override the scene.
      </p>
      <CityMap
        ref={mapRef}
        data={city.rows}
        metricDomain={metricDomain}
        monitorData={data}
        title="Extended CityMap"
        busy={busy}
        life={life}
        onLifeChange={setLife}
        weather={weather.type}
        showEnvironmentControls
        onSelect={setSelected}
      />
      <div className="extension-pagination" aria-label="City pagination">
        <button
          type="button"
          onClick={() => changePage(-1)}
          disabled={busy || city.current <= 1}
        >
          Previous city
        </button>
        <span role="status">
          City {city.current} of {city.pages}
        </span>
        <button
          type="button"
          onClick={() => changePage(1)}
          disabled={busy || city.current >= city.pages}
        >
          Next city
        </button>
        <label>
          Companies per city
          <select
            aria-label="Companies per city"
            value={String(pageSize)}
            disabled={busy}
            onChange={(event) => {
              cancel();
              resetSelection();
              setPageSize(
                event.target.value === "all"
                  ? "all"
                  : Number(event.target.value),
              );
              setPage(1);
            }}
          >
            {[100, 250, 500, 1000, "all"].map((size) => (
              <option key={size} value={size}>
                {size === "all" ? "All" : format(size)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        className="extension-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Companies in this city"
      >
        <table>
          <caption>Map and table share the same filters and city</caption>
          <thead>
            <tr>
              {[
                "Company",
                "Categories",
                "Metric",
                "Health",
                "Updated",
                "Locate",
              ].map((label) => (
                <th scope="col" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {city.rows.map((company) => (
              <tr key={company.id} aria-selected={selected?.id === company.id}>
                <th scope="row">{company.name}</th>
                <td>{categoryLabel(company)}</td>
                <td>
                  {company.metric.label}: {format(company.metric.value)}
                </td>
                <td>{company.status}</td>
                <td>
                  {company.updatedAt ? (
                    <time dateTime={company.updatedAt}>
                      {new Date(company.updatedAt).toLocaleString("en-US")}
                    </time>
                  ) : (
                    "Unknown"
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={`Locate ${company.name}`}
                    onClick={() => {
                      mapRef.current?.select(company, true, true);
                      mapRef.current?.scrollIntoView();
                    }}
                  >
                    View on map
                  </button>
                </td>
              </tr>
            ))}
            {!city.rows.length && (
              <tr>
                <td colSpan={6}>No companies match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="extension-data-controls">
        <div className="extension-actions">
          <label className="extension-upload">
            Import JSON
            <input
              aria-label="Import companies JSON"
              type="file"
              accept=".json,application/json"
              onChange={importFile}
            />
          </label>
          <button
            type="button"
            onClick={() => downloadJson(sampleCompanies().slice(0, 28))}
          >
            Download example JSON
          </button>
          <button
            type="button"
            onClick={() => {
              cancel();
              replaceData(sampleCompanies(), "Sample portfolio");
            }}
          >
            Restore sample portfolio
          </button>
        </div>
        <form onSubmit={loadSource}>
          <label>
            Company JSON endpoint
            <input
              type="url"
              aria-label="Company JSON endpoint"
              placeholder="https://example.com/companies.json"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Loading…" : "Load source"}
          </button>
          {loading && (
            <button type="button" onClick={cancel}>
              Cancel request
            </button>
          )}
        </form>
        {error && (
          <p role="alert">{error} The previous portfolio has been preserved.</p>
        )}
        <p role="status">{message}</p>
      </div>
    </section>
  );
}
