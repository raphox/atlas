import { useEffect, useId, useState } from "react";
import {
  Home,
  Maximize,
  Minimize,
  Minus,
  MoveHorizontal,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const name = useId();
  return (
    <fieldset
      disabled={disabled}
      className="absolute top-36 left-4 z-10 flex rounded-lg border bg-card/95 p-1 shadow-sm sm:top-24 sm:left-6"
    >
      <legend className="sr-only">Perspectiva</legend>
      {[
        { value: "iso", label: "Isométrica" },
        { value: "top", label: "Vista superior" },
      ].map((item) => (
        <label key={item.value} className="relative cursor-pointer">
          <input
            type="radio"
            name={name}
            value={item.value}
            checked={view === item.value}
            onChange={() => onChange(item.value)}
            className="peer absolute inset-0 z-10 size-full cursor-pointer opacity-0"
          />
          <span className="block rounded-md px-3 py-1.5 text-xs text-muted-foreground peer-checked:bg-accent peer-checked:text-accent-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-ring peer-disabled:opacity-50">
            {item.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
export function ZoomControls({ atlas, disabled, fullscreenRef }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenAvailable, setFullscreenAvailable] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(null);
  useEffect(() => {
    const update = () =>
      setFullscreen(document.fullscreenElement === fullscreenRef.current);
    setFullscreenAvailable(
      Boolean(
        document.fullscreenEnabled && fullscreenRef.current?.requestFullscreen,
      ),
    );
    document.addEventListener("fullscreenchange", update);
    update();
    return () => document.removeEventListener("fullscreenchange", update);
  }, [fullscreenRef]);
  const toggleFullscreen = async () => {
    setFullscreenError(null);
    try {
      atlas.mapRef.current?.cancel();
      if (document.fullscreenElement === fullscreenRef.current)
        await document.exitFullscreen();
      else await fullscreenRef.current.requestFullscreen();
    } catch {
      setFullscreenError(
        "Não foi possível alterar a tela cheia. Tente novamente.",
      );
    }
  };
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
      <Separator className="my-1" />
      <MapButton
        label={
          !fullscreenAvailable
            ? "Tela cheia indisponível neste navegador"
            : fullscreen
              ? "Sair da tela cheia"
              : "Abrir mapa em tela cheia"
        }
        disabled={disabled || !fullscreenAvailable}
        onClick={toggleFullscreen}
      >
        {fullscreen ? <Minimize /> : <Maximize />}
      </MapButton>
      {fullscreenError && (
        <p
          role="alert"
          className="absolute right-full bottom-0 mr-2 w-56 rounded-md border bg-card p-3 text-xs text-foreground shadow-md"
        >
          {fullscreenError}
        </p>
      )}
    </div>
  );
}
export function SceneControls({ atlas, disabled, environmentControls }) {
  return (
    <div className="pointer-events-none absolute right-4 bottom-11 left-4 z-10 flex items-center justify-between gap-3 sm:right-6 sm:left-6">
      <p className="hidden items-center gap-2 text-[9px] text-muted-foreground xl:flex">
        <MoveHorizontal className="size-4" />
        Arraste para girar · Scroll para zoom · Botão direito para mover
      </p>
      <div className="ml-auto flex flex-wrap justify-end gap-2">
        {environmentControls}
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
          {
            id: "district-labels",
            label: "Categorias e interseções",
            value: atlas.showDistrictLabels,
            onChange: atlas.setShowDistrictLabels,
          },
        ].map((item) => (
          <label
            key={item.id}
            className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-md border bg-card px-3 py-2 text-xs"
          >
            <input
              type="checkbox"
              className="size-4 accent-primary"
              id={`map-${item.id}`}
              checked={item.value}
              onChange={(event) => item.onChange(event.target.checked)}
              aria-label={item.label}
              disabled={disabled}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
