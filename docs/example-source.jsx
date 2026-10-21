import { examples, exampleModuleSource } from "./examples.js";

export function ExampleSource({ id = "basic" }) {
  const example = examples.find((item) => item.id === id);
  return (
    <pre data-example-source={id}>
      <code>{exampleModuleSource(example.code)}</code>
    </pre>
  );
}
