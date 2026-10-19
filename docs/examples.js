const categories = [
  { label: "Comércio", value: "commerce" },
  { label: "Serviços", value: "services" },
  { label: "Tecnologia", value: "technology" },
];
const names = [
  "Aurora",
  "Horizonte",
  "Vértice",
  "Nexo",
  "Órbita",
  "Ponte",
  "Farol",
];

export const initialData = JSON.stringify(
  Array.from({ length: 28 }, (_, i) => ({
    id: `empresa-${i + 1}`,
    name: `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`,
    metric: { label: "Receita mensal", value: 1200 + ((i * 7919) % 24000) },
    categories: categories.filter((_, bit) => ((i % 7) + 1) & (1 << bit)),
    status: i % 9 === 0 ? "critical" : i % 5 === 0 ? "warning" : "healthy",
  })),
  null,
  2,
);

export const examples = [
  {
    id: "basic",
    title: "Mapa de empresas",
    label: "01 · Mapa de empresas",
    description:
      "Categorias viram bairros. Métricas dão altura aos edifícios. Saúde ganha forma e cor.",
    code: `// Edite as propriedades e clique em Executar.
// Os registros estão na aba data.json.
function Example() {
  return (
    <CityMap
      data={companies}
      title="Minha cidade"
      lightingMode="day"
      showEnvironmentControls
    />
  );
}

render(<Example />);`,
  },
  {
    id: "weather",
    title: "Clima e iluminação",
    label: "02 · Clima e iluminação",
    description:
      "Experimente chuva, neve e iluminação noturna com simulação local, sem chamadas a serviços de clima.",
    code: `function Example() {
  return (
    <CityMap
      data={companies}
      title="Uma noite na cidade"
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
    title: "Seleção e eventos",
    label: "03 · Seleção e eventos",
    description:
      "Clique em um edifício ou busque uma empresa. O evento onSelect entrega o registro original à sua aplicação.",
    code: `function Example() {
  const [selected, setSelected] = React.useState(null);

  return (
    <div>
      <CityMap
        data={companies}
        title="Explore e selecione"
        lightingMode="day"
        onSelect={setSelected}
      />
      <p className="selection-output" role="status">
        {selected
          ? "Empresa selecionada: " + selected.name
          : "Selecione uma empresa no mapa."}
      </p>
    </div>
  );
}

render(<Example />);`,
  },
];
