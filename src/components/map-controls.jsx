import { Home, Minus, MoveHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
function MapButton({ label, onClick, children, disabled }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}
export function PerspectiveTabs({ view, onChange, disabled }) {
  return (
    <Tabs
      value={view}
      onValueChange={onChange}
      className="absolute top-28 left-4 z-10 sm:top-24 sm:left-6"
    >
      <TabsList aria-label="Perspectiva">
        <TabsTrigger value="iso" disabled={disabled}>
          Isométrica
        </TabsTrigger>
        <TabsTrigger value="top" disabled={disabled}>
          Vista superior
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
export function ZoomControls({ atlas, disabled }) {
  return (
    <div className="absolute top-1/2 right-4 z-10 flex -translate-y-1/2 flex-col rounded-lg border bg-card/90 p-1 shadow-sm backdrop-blur">
      <MapButton
        label="Aproximar"
        disabled={disabled}
        onClick={() => atlas.zoom(1.3)}
      >
        <Plus />
      </MapButton>
      <MapButton
        label="Afastar"
        disabled={disabled}
        onClick={() => atlas.zoom(1 / 1.3)}
      >
        <Minus />
      </MapButton>
      <Separator className="my-1" />
      <MapButton
        label="Restaurar visão geral"
        disabled={disabled}
        onClick={() => atlas.changeView(atlas.currentView)}
      >
        <Home />
      </MapButton>
    </div>
  );
}
export function SceneControls({ atlas, disabled }) {
  return (
    <div className="pointer-events-none absolute right-4 bottom-11 left-4 z-10 flex items-center justify-between gap-3 sm:right-6 sm:left-6">
      <p className="hidden items-center gap-2 text-[9px] text-muted-foreground xl:flex">
        <MoveHorizontal className="size-4" />
        Arraste para girar · Scroll para zoom · Botão direito para mover
      </p>
      <div className="ml-auto flex flex-wrap gap-2">
        {[
          {
            id: "life",
            label: "Cidade viva",
            value: atlas.life,
            onChange: atlas.setLife,
          },
          {
            id: "effects",
            label: "Efeitos de risco",
            value: atlas.effects,
            onChange: atlas.setEffects,
          },
        ].map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex items-center gap-2 rounded-md border bg-card px-3 py-2"
          >
            <Switch
              id={`map-${item.id}`}
              checked={item.value}
              onCheckedChange={item.onChange}
              aria-label={item.label}
              disabled={disabled}
            />
            <Label htmlFor={`map-${item.id}`}>{item.label}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}
