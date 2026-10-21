const categories = [
  { label: "Commerce", value: "commerce" },
  { label: "Services", value: "services" },
  { label: "Technology", value: "technology" },
];
const names = [
  "Aurora",
  "Horizon",
  "Vertex",
  "Nexus",
  "Orbit",
  "Bridge",
  "Beacon",
];

export const initialData = JSON.stringify(
  Array.from({ length: 28 }, (_, i) => ({
    id: `company-${i + 1}`,
    name: `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`,
    metric: { label: "Monthly revenue", value: [40, 250, 1000, 3000][i % 4] },
    categories: categories.filter((_, bit) => ((i % 7) + 1) & (1 << bit)),
    status: i % 9 === 0 ? "critical" : i % 5 === 0 ? "warning" : "healthy",
    updatedAt: "2026-10-20T12:00:00Z",
    statusChangedAt: new Date(Date.UTC(2026, 9, 20, 11, 59 - i)).toISOString(),
  })),
  null,
  2,
);

const exampleDefinitions = [
  {
    id: "basic",
    title: "Basic map",
    label: "01 · Basic map",
    description:
      "Each building is a company. Height scales continuously with the metric; districts show category membership. Select a building for exact values.",
    code: `// Company records live in the data.json tab.
function Example() {
  return (
    <CityMap
      data={companies}
      title="My city"
      lightingMode="day"
      showMonitor={false}
      showSearch={false}
      showCompass={false}
      showInstructions={false}
    />
  );
}

render(<Example />);`,
  },
  {
    id: "weather",
    title: "Weather and lighting",
    label: "04 · Weather and lighting",
    description:
      "Explore rain, snow and nighttime lighting with local simulation and no weather service requests.",
    code: `function Example() {
  return (
    <CityMap
      data={companies}
      title="A night in the city"
      weather="rain"
      lightingMode="night"
      showEnvironmentControls
      showDistrictLabels
    />
  );
}

render(<Example />);`,
  },
  {
    id: "selection",
    title: "Selection and events",
    label: "02 · Selection and events",
    description:
      "Click a building or search for a company. onSelect passes the original record to your application.",
    code: `function Example() {
  const [selected, setSelected] = React.useState(null);

  return (
    <div>
      <CityMap
        data={companies}
        title="Explore and select"
        lightingMode="day"
        showMonitor={false}
        showCompass={false}
        showInstructions={false}
        onSelect={setSelected}
      />
      <p className="selection-output" role="status">
        {selected
          ? "Selected company: " + selected.name
          : "Select a company on the map."}
      </p>
    </div>
  );
}

render(<Example />);`,
  },
  {
    id: "updates",
    title: "Data updates and empty state",
    label: "03 · Data updates and empty state",
    description:
      "Replace the data array while preserving IDs. Update metrics, clear and restore companies, and keep the selected company's summary current.",
    code: `function Example() {
  const [records, setRecords] = React.useState(companies);
  const [selectedId, setSelectedId] = React.useState(null);
  const mapRef = React.useRef(null);
  const selected = records.find(company => company.id === selectedId);

  function updateMetrics() {
    setRecords(current => current.map(company => ({
      ...company,
      metric: { ...company.metric, value: company.metric.value + 600 },
      updatedAt: new Date().toISOString(),
      // Preserve statusChangedAt: this update only changes the metric.
    })));
  }

  return (
    <div>
      <div className="example-actions" role="group" aria-label="Data controls">
        <button onClick={updateMetrics} disabled={!records.length}>Update metrics</button>
        <button onClick={() => { setRecords([]); setSelectedId(null); }}>Clear companies</button>
        <button onClick={() => { setRecords(companies); setSelectedId(null); }}>Restore companies</button>
        <button disabled={!records.length} onClick={() => mapRef.current?.select(records[0])}>Select first company</button>
      </div>
      {!records.length && <p className="selection-output" role="status">No companies to display. Restore companies to explore the city.</p>}
      <CityMap
        ref={mapRef}
        data={records}
        title="Update the portfolio"
        lightingMode="day"
        showMonitor={false}
        showSearch={false}
        showCompass={false}
        showInstructions={false}
        onSelect={company => setSelectedId(company?.id ?? null)}
      />
      <p className="selection-output" role="status">
        {selected
          ? selected.name + ": " + selected.metric.value + " (" + selected.metric.label + ")"
          : "Select a company to follow its metric."}
      </p>
    </div>
  );
}

render(<Example />);`,
  },
  {
    id: "complete",
    title: "Complete map",
    label: "05 · Complete map",
    description:
      "Search, monitoring, timestamps, environment selectors, and every map overlay in one example.",
    code: `// Edit the props, then click Run.
// Company records live in the data.json tab.
function Example() {
  return (
    <CityMap
      data={companies}
      title="My city"
      showEnvironmentControls
    />
  );
}

render(<Example />);`,
  },
];

export const examples = [
  "basic",
  "selection",
  "updates",
  "weather",
  "complete",
].map((id) => exampleDefinitions.find((example) => example.id === id));

// The editor and the documentation share these sources. Copy as a normal React
// module; only the playground needs React Live's render(...) entry point.
export function exampleModuleSource(code) {
  const body = code
    .replace(/^render\(<Example \/>\);?\s*$/m, "export default Example;")
    .replace(
      /^render\(([\s\S]+)\);?\s*$/m,
      (_, jsx) => `export default function () {\n  return (${jsx});\n}`,
    );
  return [
    'import React from "react";',
    'import { CityMap } from "atlas-city-chart/react";',
    'import "atlas-city-chart/styles.css";',
    'import companies from "./data.json";',
    "",
    body,
  ].join("\n");
}
