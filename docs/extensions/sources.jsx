import demo from "./demo.jsx?raw";
import data from "./data.js?raw";
import weather from "./weather.js?raw";
import hook from "./use-weather.js?raw";

export function ExtensionSources() {
  return (
    <div className="extension-sources">
      {[
        ["demo.jsx", "Composition, table, sources and page transitions", demo],
        ["data.js", "Normalization, filters, pagination and JSON", data],
        ["use-weather.js", "Location, refresh, cache and cleanup", hook],
        ["weather.js", "Open-Meteo request and response conversion", weather],
      ].map(([name, description, source]) => (
        <details key={name}>
          <summary>
            {name} · {description}
          </summary>
          <pre>
            <code>{source}</code>
          </pre>
        </details>
      ))}
    </div>
  );
}
