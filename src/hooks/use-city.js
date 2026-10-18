import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { City } from "@/city";
import { CitySlider } from "@/city-slider";
import { mapTooltipAnchor } from "@/lib/map-tooltip";

// React owns the interface; this hook owns the WebGL scene and its lifetime.
export function useCity({
  atlas,
  panelRef,
  viewportRef,
  labelsRef,
  labelNodes,
  onHover,
}) {
  const cityRef = useRef(null);
  const sliderRef = useRef(null);
  const hoveredCompany = useRef(null);
  const lastHover = useRef(null);
  const hoverHideTimer = useRef(null);
  const tooltipHovered = useRef(false);
  const latest = useRef(null);
  latest.current = { atlas, onHover };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const cancelHoverHide = useCallback(() => {
    clearTimeout(hoverHideTimer.current);
    hoverHideTimer.current = null;
  }, []);
  const clearHover = useCallback(() => {
    cancelHoverHide();
    hoveredCompany.current = null;
    lastHover.current = null;
    tooltipHovered.current = false;
    latest.current.onHover(null);
  }, [cancelHoverHide]);
  const scheduleHoverHide = useCallback(() => {
    if (tooltipHovered.current || hoverHideTimer.current !== null) return;
    // Allow crossing the small gap between the facade and the tooltip.
    hoverHideTimer.current = setTimeout(() => {
      hoverHideTimer.current = null;
      if (!tooltipHovered.current) clearHover();
    }, 150);
  }, [clearHover]);
  const onTooltipEnter = useCallback(() => {
    tooltipHovered.current = true;
    cancelHoverHide();
  }, [cancelHoverHide]);
  const onTooltipLeave = useCallback(() => {
    tooltipHovered.current = false;
    scheduleHoverHide();
  }, [scheduleHoverHide]);

  useLayoutEffect(() => {
    let city;
    let slider;
    const updateHover = (scene) => {
      const company = hoveredCompany.current;
      let next = null;
      if (company && !latest.current.atlas.busy) {
        const point = scene.project(company.x, company.roofTop, company.z);
        const anchor = mapTooltipAnchor(
          point,
          viewportRef.current.clientWidth,
          viewportRef.current.clientHeight,
        );
        if (anchor) next = { company, ...anchor };
      }
      const previous = lastHover.current;
      if (
        previous?.company === next?.company &&
        previous?.x === next?.x &&
        previous?.y === next?.y
      )
        return;
      lastHover.current = next;
      latest.current.onHover(next);
    };
    const contextLost = (event) => {
      event.preventDefault();
      toast.error(
        "A conexão gráfica foi interrompida. Recarregue a página para restaurar o mapa.",
      );
    };
    try {
      city = new City(viewportRef.current, {
        select: (company) => latest.current.atlas.selectCompany(company),
        deselect: () => latest.current.atlas.closeSelection(),
        hover: (company) => {
          if (!company) {
            scheduleHoverHide();
            return;
          }
          cancelHoverHide();
          hoveredCompany.current = company;
          updateHover(city);
        },
        frame: (scene) => {
          updateHover(scene);
          const { filters, layout } = latest.current.atlas;
          const width = viewportRef.current?.clientWidth || 0;
          const height = viewportRef.current?.clientHeight || 0;
          for (const [mask, node] of labelNodes.current) {
            const anchor = layout.anchors[mask];
            if (!anchor) continue;
            const point = scene.project(...anchor);
            node.style.left = `${(point.x * 0.5 + 0.5) * width}px`;
            node.style.top = `${(-point.y * 0.5 + 0.5) * height}px`;
            node.style.opacity =
              filters.region === "all" || Number(filters.region) === mask
                ? "1"
                : ".2";
            node.style.display =
              point.z > 1 || point.z < -1 || scene.camera.zoom > 3.3
                ? "none"
                : "";
          }
        },
      });
      slider = new CitySlider(city, panelRef.current, labelsRef.current);
      city.renderer.domElement.addEventListener(
        "webglcontextlost",
        contextLost,
      );
      cityRef.current = city;
      sliderRef.current = slider;
      setReady(true);
    } catch (error) {
      console.error("Não foi possível iniciar o Atlas.", error);
      setError(
        "Não foi possível abrir a cidade 3D. Use um navegador com WebGL habilitado e aceleração gráfica disponível.",
      );
    }
    return () => {
      cancelHoverHide();
      tooltipHovered.current = false;
      slider?.dispose();
      city?.renderer.domElement.removeEventListener(
        "webglcontextlost",
        contextLost,
      );
      city?.dispose();
      cityRef.current = null;
      sliderRef.current = null;
      hoveredCompany.current = null;
      lastHover.current = null;
    };
  }, [
    panelRef,
    viewportRef,
    labelsRef,
    labelNodes,
    cancelHoverHide,
    scheduleHoverHide,
  ]);

  useLayoutEffect(() => {
    clearHover();
  }, [atlas.layout, atlas.busy, atlas.selected, clearHover]);

  useLayoutEffect(() => {
    const city = cityRef.current;
    if (!city) return;
    try {
      city.setCompanies(atlas.layout.companies, atlas.layout);
      city.view(latest.current.atlas.currentView, true);
      setError(null);
    } catch (error) {
      console.error(error);
      setError(
        "Não foi possível preparar esta cidade. Recarregue a aplicação para tentar novamente.",
      );
    }
  }, [atlas.layout]);

  useLayoutEffect(() => {
    const city = cityRef.current;
    if (city) {
      city.life = atlas.life;
      if (city.traffic) city.traffic.visible = atlas.life;
      city.effects = atlas.effects;
    }
  }, [atlas.life, atlas.effects, atlas.layout]);

  useImperativeHandle(
    atlas.mapRef,
    () => ({
      cancel() {
        sliderRef.current?.cancel();
        if (cityRef.current) cityRef.current.controls.enabled = true;
      },
      deselect() {
        if (cityRef.current) cityRef.current.selection.visible = false;
      },
      select(company, focus, maxZoom) {
        const city = cityRef.current;
        if (!city) return;
        city.select(company);
        if (focus) city.focus(company, { maxZoom });
      },
      zoom(factor) {
        cityRef.current?.zoom(factor);
      },
      view(view) {
        cityRef.current?.view(view);
      },
      capture() {
        sliderRef.current?.capture();
        if (cityRef.current) cityRef.current.controls.enabled = false;
      },
      play(direction) {
        return sliderRef.current?.play(direction);
      },
      scrollIntoView() {
        panelRef.current?.scrollIntoView({
          block: "start",
          behavior: cityRef.current?.reduceMotion ? "instant" : "smooth",
        });
        viewportRef.current?.focus({ preventScroll: true });
      },
      stats() {
        const renderer = cityRef.current?.renderer;
        return {
          drawCalls: renderer?.info.render.calls ?? 0,
          triangles: renderer?.info.render.triangles ?? 0,
        };
      },
    }),
    [atlas.mapRef, panelRef, viewportRef],
  );
  return { ready, error, onTooltipEnter, onTooltipLeave };
}
