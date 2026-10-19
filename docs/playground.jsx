import React, { useContext, useEffect, useRef, useState } from "react";
import { LiveContext, LiveError, LivePreview, LiveProvider } from "react-live";
import EditorModule from "react-simple-code-editor";
import { Highlight, themes } from "prism-react-renderer";
import {
  Check,
  Copy,
  Play,
  RotateCcw,
  Code2,
  Eye,
  Columns2,
} from "lucide-react";
import { CityMap } from "../src/charts/city/map.jsx";
import { validateCityData } from "../src/charts/city/data.js";
import { examples, initialData } from "./examples.js";

// This package publishes a CommonJS default; Vite's dev and build interop differ.
const Editor = EditorModule.default ?? EditorModule;

function ExecutionStatus({ dirty, dataError }) {
  const { error } = useContext(LiveContext);
  return (
    <div className="execution-status" role="status">
      <span
        className={error || dataError ? "status-dot error" : "status-dot"}
      />
      {dataError || error
        ? "Corrija o erro e execute novamente"
        : dirty
          ? "Alterações não executadas"
          : "Prévia atualizada"}
    </div>
  );
}

export function Playground() {
  const [exampleId, setExampleId] = useState("basic");
  const example = examples.find((item) => item.id === exampleId);
  const [draft, setDraft] = useState(example.code);
  const [data, setData] = useState(initialData);
  const [file, setFile] = useState("jsx");
  const [layout, setLayout] = useState("split");
  const [copyMessage, setCopyMessage] = useState("");
  const [dataError, setDataError] = useState("");
  const [execution, setExecution] = useState(() => ({
    code: example.code,
    data: initialData,
    scope: { CityMap, React, companies: JSON.parse(initialData) },
    revision: 0,
  }));
  const copyTimer = useRef(null);
  const dirty = draft !== execution.code || data !== execution.data;

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  function run(code = draft, records = data) {
    try {
      const companies = JSON.parse(records);
      validateCityData(companies);
      setDataError("");
      setExecution((current) => ({
        code,
        data: records,
        scope: { CityMap, React, companies },
        revision: current.revision + 1,
      }));
    } catch (error) {
      setDataError(`data.json: ${error.message}`);
    }
  }

  function reset(id = exampleId) {
    const next = examples.find((item) => item.id === id);
    setExampleId(id);
    setDraft(next.code);
    setData(initialData);
    setFile("jsx");
    run(next.code, initialData);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(file === "jsx" ? draft : data);
      setCopyMessage("Copiado");
    } catch {
      setCopyMessage("Não foi possível copiar. Selecione o texto no editor.");
    }
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyMessage(""), 3500);
  }

  return (
    <section
      className="playground"
      aria-label="Playground interativo"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          run();
        }
      }}
    >
      <div className="playground-toolbar">
        <label className="example-select">
          <span className="sr-only">Exemplo</span>
          <select
            value={exampleId}
            onChange={(event) => reset(event.target.value)}
          >
            {examples.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="playground-actions">
          <button
            className="icon-button"
            title="Restaurar exemplo"
            aria-label="Restaurar exemplo"
            onClick={() => reset()}
          >
            <RotateCcw size={16} />
          </button>
          <button className="run-button" onClick={() => run()}>
            <Play size={13} fill="currentColor" />
            Executar<span className="run-shortcut">⌘ / Ctrl ↵</span>
          </button>
        </div>
      </div>
      <p className="example-description">{example.description}</p>
      <div className="playground-view-bar">
        <div
          className="layout-switch"
          role="group"
          aria-label="Layout do playground"
        >
          {[
            ["split", "Dividido", Columns2],
            ["preview", "Prévia", Eye],
            ["code", "Código", Code2],
          ].map(([value, label, Icon]) => (
            <button
              key={value}
              aria-pressed={layout === value}
              onClick={() => setLayout(value)}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        <span className="runtime-label">React · execução no navegador</span>
      </div>
      <LiveProvider
        key={execution.revision}
        code={execution.code}
        scope={execution.scope}
        noInline
      >
        <div className={`playground-panels layout-${layout}`}>
          <div className="preview-panel" hidden={layout === "code"}>
            <div className="panel-heading">
              <span>
                <span className="status-dot" /> PRÉVIA INTERATIVA
              </span>
              <span>Three.js</span>
            </div>
            <LivePreview className="map-preview" />
          </div>
          <div className="editor-panel" hidden={layout === "preview"}>
            <div className="file-bar">
              <div role="group" aria-label="Arquivo do exemplo">
                {[
                  ["jsx", "example.jsx"],
                  ["json", "data.json"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={file === value}
                    onClick={() => setFile(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="icon-button"
                aria-label="Copiar arquivo"
                title="Copiar arquivo"
                onClick={copy}
              >
                {copyMessage === "Copiado" ? (
                  <Check size={15} />
                ) : (
                  <Copy size={15} />
                )}
              </button>
            </div>
            <div className="code-editor">
              <label className="sr-only" htmlFor="playground-source">
                {file === "jsx" ? "Código do exemplo" : "Dados do exemplo"}
              </label>
              <Editor
                key={file}
                textareaId="playground-source"
                value={file === "jsx" ? draft : data}
                onValueChange={file === "jsx" ? setDraft : setData}
                padding={20}
                ignoreTabKey
                highlight={(code) => (
                  <Highlight
                    code={code}
                    language={file}
                    theme={themes.nightOwl}
                  >
                    {({ tokens, getTokenProps }) =>
                      tokens.map((line, index) => (
                        <React.Fragment key={index}>
                          {line.map((token, tokenIndex) => (
                            <span
                              key={tokenIndex}
                              {...getTokenProps({ token })}
                            />
                          ))}
                          {index < tokens.length - 1 ? "\n" : null}
                        </React.Fragment>
                      ))
                    }
                  </Highlight>
                )}
              />
            </div>
            <div className="editor-note">
              {file === "jsx"
                ? "React, CityMap e companies já estão disponíveis. Use render(<Example />)."
                : "Edite os registros JSON. Cada empresa precisa de um id único."}
            </div>
          </div>
        </div>
        <div className="playground-footer">
          <ExecutionStatus dirty={dirty} dataError={dataError} />
          <span role="status">
            {copyMessage || "Edite e execute com Ctrl / ⌘ + Enter"}
          </span>
        </div>
        {dataError && (
          <pre className="playground-error" role="alert">
            {dataError}
          </pre>
        )}
        <LiveError className="playground-error" role="alert" />
      </LiveProvider>
    </section>
  );
}
