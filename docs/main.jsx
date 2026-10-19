import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Docs } from "./shell.jsx";
import "../src/charts/city/styles.css";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Docs />
  </StrictMode>,
);
