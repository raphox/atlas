import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  filteredCompanies,
  layoutCity,
  paginateCompanies,
  placeCompanies,
  regionsFor,
  metricLabel,
} from "@/model";
import { loadCompanyData } from "@/data-source";

export const format = (value) => new Intl.NumberFormat("pt-BR").format(value);
const defaultFilters = { region: "all", status: [], query: "" };
const afterPaint = () =>
  new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );

export function useAtlas() {
  const [companies, setCompanies] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [selected, setSelected] = useState(null);
  const [dataMode, setDataMode] = useState("Ambiente demonstrativo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [currentView, setCurrentView] = useState("iso");
  const [life, setLife] = useState(true);
  const [lightingMode, setLightingMode] = useState("auto");
  const [effects, setEffects] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showDistrictLabels, setShowDistrictLabels] = useState(false);
  const mapRef = useRef(null);
  const requestRef = useRef(null);
  const pagination = useMemo(
    () => paginateCompanies(companies, filters, page, pageSize),
    [companies, filters, page, pageSize],
  );
  const regions = useMemo(() => regionsFor(companies), [companies]);
  const valueLabel = useMemo(() => metricLabel(companies), [companies]);
  const layout = useMemo(() => layoutCity(pagination.companies), [pagination]);
  const matching = useMemo(
    () => filteredCompanies(companies, filters),
    [companies, filters],
  );

  useEffect(() => {
    let active = true;
    loadCompanyData()
      .then((data) => {
        if (!active) return;
        setCompanies(data.companies);
        setDataMode(
          data.demo ? "Ambiente demonstrativo" : "Fonte JSON conectada",
        );
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      requestRef.current = null;
    };
  }, []);

  const cancel = useCallback(() => {
    requestRef.current = null;
    mapRef.current?.cancel();
    setBusy(false);
  }, []);
  const closeSelection = useCallback(() => {
    setSelected(null);
    mapRef.current?.deselect();
  }, []);
  const updateFilters = useCallback(
    (patch) => {
      cancel();
      closeSelection();
      setPage(1);
      setFilters((previous) => ({ ...previous, ...patch }));
    },
    [cancel, closeSelection],
  );
  const clearFilters = useCallback(() => {
    cancel();
    closeSelection();
    setPage(1);
    setFilters(defaultFilters);
  }, [cancel, closeSelection]);
  const selectCompany = useCallback(
    (company, focus = false, maxZoom = false) => {
      cancel();
      setSelected(company);
      mapRef.current?.select(company, focus, maxZoom);
    },
    [cancel],
  );
  const resizePage = useCallback(
    (size) => {
      cancel();
      closeSelection();
      setPage(1);
      setPageSize(size);
    },
    [cancel, closeSelection],
  );
  const changeView = useCallback(
    (view) => {
      cancel();
      if (view === currentView) mapRef.current?.view(view);
      else setCurrentView(view);
    },
    [cancel, currentView],
  );
  const zoom = useCallback(
    (factor) => {
      cancel();
      mapRef.current?.zoom(factor);
    },
    [cancel],
  );
  const changePage = async (direction) => {
    if (
      requestRef.current ||
      loading ||
      page + direction < 1 ||
      page + direction > pagination.pages
    )
      return;
    closeSelection();
    const request = {};
    requestRef.current = request;
    setBusy(true);
    try {
      await afterPaint();
      if (requestRef.current !== request) return;
      mapRef.current?.capture();
      setPage((previous) => previous + direction);
      await afterPaint();
      if (requestRef.current !== request) return;
      await mapRef.current?.play(direction);
    } catch (error) {
      console.error("Falha ao trocar de cidade.", error);
      toast.error(
        "Não foi possível carregar a próxima cidade. Tente novamente.",
      );
    } finally {
      if (requestRef.current === request) cancel();
    }
  };
  const importData = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Escolha um JSON com até 5 MB.");
      return;
    }
    try {
      const next = placeCompanies(JSON.parse(await file.text()));
      setCompanies(next);
      clearFilters();
      setError(null);
      setDataMode("Dados importados");
      toast.success(
        `${format(next.length)} empresas carregadas. Seus dados ficam apenas neste navegador.`,
      );
    } catch (error) {
      toast.error(
        error instanceof SyntaxError
          ? "O arquivo não contém um JSON válido."
          : error.message,
      );
    }
  };

  useEffect(() => {
    const integration = {
      get summary() {
        return {
          companies: companies.length,
          filtered: pagination.total,
          page: pagination.page,
          pages: pagination.pages,
          pageSize,
          visible: layout.companies.length,
          regions: regions.map((region) => ({
            label: region.label,
            systems: region.label,
            count: companies.filter((c) => c.mask === region.mask).length,
          })),
          ...mapRef.current?.stats(),
        };
      },
    };
    window.atlas = integration;
    return () => {
      if (window.atlas === integration) delete window.atlas;
    };
  }, [companies, pagination, pageSize, layout, regions]);

  return {
    companies,
    regions,
    valueLabel,
    filters,
    pagination,
    layout,
    matching,
    pageSize,
    selected,
    dataMode,
    loading,
    error,
    busy,
    currentView,
    life,
    lightingMode,
    setLightingMode,
    effects,
    autoRotate,
    setAutoRotate,
    showDistrictLabels,
    setShowDistrictLabels,
    setLife,
    setEffects,
    mapRef,
    updateFilters,
    clearFilters,
    closeSelection,
    selectCompany,
    resizePage,
    changeView,
    zoom,
    changePage,
    importData,
  };
}

export function downloadExample() {
  const updatedAt = new Date().toISOString();
  const statusChangedAt = new Date(Date.now() - 15 * 60_000).toISOString();
  const records = [
    {
      id: "exemplo-1",
      name: "Aurora Tecnologia",
      metric: { label: "Receita mensal", value: 2200 },
      categories: [
        { label: "Varejo", value: "retail" },
        { label: "Serviços", value: "services" },
        { label: "Indústria", value: "industry" },
      ],
      status: "critical",
      updatedAt,
      statusChangedAt,
    },
    {
      id: "exemplo-2",
      name: "Cedro Logística",
      metric: { label: "Receita mensal", value: 350 },
      categories: [
        { label: "Varejo", value: "retail" },
        { label: "Serviços", value: "services" },
      ],
      status: "warning",
      updatedAt,
      statusChangedAt,
    },
    {
      id: "exemplo-3",
      name: "Lume Educação",
      metric: { label: "Receita mensal", value: 42 },
      categories: [{ label: "Indústria", value: "industry" }],
      status: "healthy",
      updatedAt,
      statusChangedAt,
    },
  ];
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(records, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "empresas-exemplo.json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
