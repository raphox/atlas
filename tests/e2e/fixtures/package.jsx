import { createRef } from "react";
import { createRoot } from "react-dom/client";
import { CityMap } from "../../../packages/city-chart/dist/react.js";
import "../../../packages/city-chart/dist/styles.css";
import "./package.css";

const root = createRoot(document.getElementById("root"));
const refs = [createRef(), createRef()];
const data = Object.freeze([
  Object.freeze({
    id: "one",
    name: "Aurora",
    metric: { label: "Receita", value: 2400.5 },
    categories: [{ label: "Varejo", value: "retail" }],
    status: "critical",
  }),
  Object.freeze({
    id: "two",
    name: "Cedro",
    metric: { label: "Receita", value: 350 },
    categories: [{ label: "Serviços", value: "services" }],
    status: "warning",
  }),
]);
const theme = location.pathname.includes("tailwind") ? "tailwind" : "default";
window.packageRefs = refs;
window.packageSelections = [];
window.renderPackage = (next = data) =>
  root.render(
    <>
      <p className="consumer-text">Estilo do projeto consumidor</p>
      {refs.map((ref, index) => (
        <CityMap
          key={index}
          ref={ref}
          data={next}
          theme={theme}
          className={index === 0 ? "custom-city" : "other-city"}
          lightingMode="day"
          weather="rain"
          onSelect={(datum) =>
            window.packageSelections.push({
              index,
              datum,
              same: datum === next[0],
            })
          }
        />
      ))}
    </>,
  );
window.unmountPackage = () => root.unmount();
window.renderPackage();
