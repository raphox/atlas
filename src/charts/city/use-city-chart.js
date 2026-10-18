import {
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { createCityRenderer } from "./renderer.js";
import { layoutCity } from "@/model";
import { CitySlider } from "@/city-slider";
import { mapTooltipAnchor } from "@/lib/map-tooltip";

// TanStack owns the renderer lifetime; this hook bridges camera and UI state.
export function useCityChart({
  definition,
  busy,
  selected,
  region,
  currentView,
  life,
  lightingMode,
  effects,
  chartRef,
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
  const [layout, setLayout] = useState(() => layoutCity([]));
  const latest = useRef(null);
  latest.current = {
    layout,
    busy,
    region,
    currentView,
    onHover,
  };
  const sceneRef = useRef(null);
  const updateOverlays = useRef(null);
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

  const renderer = useMemo(() => {
    const updateHover = (scene) => {
      const company = hoveredCompany.current;
      let next = null;
      if (company && !latest.current.busy) {
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
    const projectOverlays = (scene) => {
      updateHover(scene);
      const { region, layout } = latest.current;
      const width = viewportRef.current?.clientWidth || 0;
      const height = viewportRef.current?.clientHeight || 0;
      for (const [mask, node] of labelNodes.current) {
        const anchor = layout.anchors[mask];
        if (!anchor) continue;
        const point = scene.project(...anchor);
        node.style.left = `${(point.x * 0.5 + 0.5) * width}px`;
        node.style.top = `${(-point.y * 0.5 + 0.5) * height}px`;
        node.style.opacity =
          region === "all" || Number(region) === mask ? "1" : ".2";
        node.style.display =
          point.z > 1 || point.z < -1 || scene.camera.zoom > 3.3 ? "none" : "";
      }
    };
    updateOverlays.current = projectOverlays;
    return createCityRenderer({
      hover: (company) => {
        if (!company) {
          scheduleHoverHide();
          return;
        }
        cancelHoverHide();
        hoveredCompany.current = company;
        if (cityRef.current) updateHover(cityRef.current);
      },
      projection: projectOverlays,
      onMount(city) {
        cityRef.current = city;
        city.renderer.domElement.addEventListener(
          "webglcontextlost",
          contextLost,
        );
        setReady(true);
      },
      onData(city, { resetView }) {
        if (resetView) city.view(latest.current.currentView, true);
        latest.current.layout = city.layout;
        setLayout(city.layout);
        setError(null);
      },
      onError(error) {
        console.error("Não foi possível preparar a cidade 3D.", error);
        setError(
          "Não foi possível abrir a cidade 3D. Use um navegador com WebGL habilitado e aceleração gráfica disponível.",
        );
      },
      onDestroy(city) {
        cancelHoverHide();
        sliderRef.current?.dispose();
        city.renderer.domElement.removeEventListener(
          "webglcontextlost",
          contextLost,
        );
        cityRef.current = null;
        sliderRef.current = null;
        hoveredCompany.current = null;
        lastHover.current = null;
        tooltipHovered.current = false;
      },
    });
  }, [
    panelRef,
    viewportRef,
    labelsRef,
    labelNodes,
    cancelHoverHide,
    scheduleHoverHide,
  ]);

  useLayoutEffect(() => () => cancelHoverHide(), [cancelHoverHide]);

  // Chart mounts its renderer in a child layout effect. Parent/sibling refs
  // become available only here, after that effect has completed.
  useLayoutEffect(() => {
    if (cityRef.current && !sliderRef.current) {
      sliderRef.current = new CitySlider(
        cityRef.current,
        panelRef.current,
        labelsRef.current,
      );
    }
  }, [panelRef, labelsRef]);

  useLayoutEffect(() => {
    clearHover();
  }, [definition, busy, selected, clearHover]);

  useLayoutEffect(() => {
    const city = cityRef.current;
    if (city) {
      city.setActivity({ life, effects });
    }
  }, [life, effects, layout]);

  useLayoutEffect(() => {
    cityRef.current?.setLightingMode(lightingMode);
  }, [lightingMode, layout]);

  useLayoutEffect(() => {
    cityRef.current?.view(currentView);
  }, [currentView]);

  useLayoutEffect(() => {
    const city = cityRef.current;
    if (!city) return;
    city.select(city.companiesById?.get(selected?.id));
  }, [selected, layout]);

  useLayoutEffect(() => {
    if (cityRef.current) updateOverlays.current?.(cityRef.current);
  }, [layout, region]);

  useImperativeHandle(
    chartRef,
    () => ({
      cancel() {
        sliderRef.current?.cancel();
        if (cityRef.current) cityRef.current.controls.enabled = true;
      },
      deselect() {
        cityRef.current?.select(null);
      },
      select(company, focus, maxZoom) {
        const city = cityRef.current;
        if (!city) return;
        const rendered = city.companiesById?.get(company.id);
        if (!rendered) return;
        city.select(rendered);
        if (focus) city.focus(rendered, { maxZoom });
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
        viewportRef.current
          ?.querySelector("[data-city-surface]")
          ?.focus({ preventScroll: true });
      },
      stats() {
        const renderer = cityRef.current?.renderer;
        return {
          drawCalls: renderer?.info.render.calls ?? 0,
          triangles: renderer?.info.render.triangles ?? 0,
          chartRenderer: "atlas-city-3d",
          chartPoints: sceneRef.current?.points.length ?? 0,
          lightingMode: cityRef.current?.lightingMode,
          lightingPeriod: cityRef.current?.lightingPeriod,
        };
      },
    }),
    [chartRef, panelRef, viewportRef],
  );
  return {
    renderer,
    layout,
    ready,
    error,
    onTooltipEnter,
    onTooltipLeave,
    onRender({ scene }) {
      sceneRef.current = scene;
    },
  };
}
