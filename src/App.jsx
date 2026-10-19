import { AppHeader } from "@/components/app-header";
import { Sidebar } from "@/components/sidebar";
import { CityMap } from "@/components/city-map";
import { CompanyTable } from "@/components/company-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useAtlas } from "@/hooks/use-atlas";

export default function App() {
  const atlas = useAtlas();
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex min-h-dvh flex-col md:h-dvh md:overflow-hidden">
        <AppHeader dataMode={atlas.dataMode} />
        <main className="grid min-h-0 flex-1 md:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
          <Sidebar atlas={atlas} />
          <div className="flex min-h-0 min-w-0 flex-col md:overflow-y-auto">
            <CityMap atlas={atlas} showEnvironmentControls />
            <CompanyTable atlas={atlas} />
          </div>
        </main>
      </div>
      <Toaster
        theme="light"
        position="bottom-center"
        closeButton
        duration={6000}
      />
    </TooltipProvider>
  );
}
