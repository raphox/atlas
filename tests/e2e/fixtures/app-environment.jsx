import { createRoot } from "react-dom/client";
import { CityMap } from "../../../src/components/city-map.jsx";
import { TooltipProvider } from "../../../src/components/ui/tooltip.jsx";
import { useAtlas } from "../../../src/hooks/use-atlas.js";
import "../../../src/index.css";

function EnvironmentApp() {
  const atlas = useAtlas();
  return (
    <TooltipProvider>
      <CityMap atlas={atlas} showEnvironmentControls />
    </TooltipProvider>
  );
}

createRoot(document.getElementById("root")).render(<EnvironmentApp />);
