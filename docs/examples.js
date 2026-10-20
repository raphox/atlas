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
    metric: { label: "Monthly revenue", value: 1200 + ((i * 7919) % 24000) },
    categories: categories.filter((_, bit) => ((i % 7) + 1) & (1 << bit)),
    status: i % 9 === 0 ? "critical" : i % 5 === 0 ? "warning" : "healthy",
    updatedAt: "2026-10-20T12:00:00Z",
    statusChangedAt: new Date(Date.UTC(2026, 9, 20, 11, 59 - i)).toISOString(),
  })),
  null,
  2,
);

export const examples = [
  {
    id: "basic",
    title: "Company map",
    label: "01 · Company map",
    description:
      "Categories become districts. Metrics give buildings height. Health takes shape and color.",
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
  {
    id: "weather",
    title: "Weather and lighting",
    label: "02 · Weather and lighting",
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
    label: "03 · Selection and events",
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
        showEnvironmentControls
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
];
