import { createRef } from "react";
import { createRoot } from "react-dom/client";
import { CityChart } from "../../../src/charts/city/react.jsx";
import { defineCityChart } from "../../../src/charts/city/index.js";
import { demoCompanies } from "../../../src/model.js";
import "../../../src/index.css";

const root = createRoot(document.getElementById("root"));
const chartRef = createRef();
const definition = defineCityChart(demoCompanies(12));
window.environmentStats = () => chartRef.current?.stats();
window.renderEnvironment = (props = {}) =>
  root.render(
    <CityChart
      definition={definition}
      chartRef={chartRef}
      lightingMode="day"
      weather="rain"
      effects={false}
      {...props}
    />,
  );
window.renderEnvironment();
