import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { categoryLabel, metricFor, PAGE_SIZES } from "@/model";
import { format } from "@/hooks/use-atlas";
import { StatusBadge } from "./status-badge";
import { CompanyDate } from "./company-monitor";

function CompanyPagination({ atlas }) {
  const { pagination, busy, loading } = atlas;
  return (
    <nav
      className="flex flex-wrap items-center justify-center gap-3 sm:justify-end"
      aria-label="Paginação compartilhada do mapa e da tabela"
    >
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        aria-label="Cidade anterior"
        onClick={() => atlas.changePage(-1)}
        disabled={busy || loading || pagination.page <= 1}
      >
        <ArrowLeft className="size-4" />
      </Button>
      <div className="min-w-25 text-center">
        <strong className="block text-xs font-semibold">
          Cidade {pagination.page} de {pagination.pages}
        </strong>
        <span className="text-[10px] text-muted-foreground">
          {atlas.layout.companies.length} empresas nesta cidade
        </span>
      </div>
      <Button
        variant="outline"
        size="icon"
        className="size-8"
        aria-label="Próxima cidade"
        onClick={() => atlas.changePage(1)}
        disabled={busy || loading || pagination.page >= pagination.pages}
      >
        <ArrowRight className="size-4" />
      </Button>
      <div className="flex items-center gap-2 border-l pl-3">
        <label
          id="page-size-label"
          htmlFor="page-size"
          className="text-[10px] text-muted-foreground"
        >
          Por cidade
        </label>
        <select
          id="page-size"
          className="native-select w-22 text-xs"
          value={String(atlas.pageSize)}
          aria-labelledby="page-size-label"
          disabled={busy || loading}
          onChange={(event) => {
            const value = event.target.value;
            atlas.resizePage(value === "all" ? value : Number(value));
          }}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={String(size)}>
              {size === "all" ? "Todas" : format(size)}
            </option>
          ))}
        </select>
      </div>
    </nav>
  );
}
export function CompanyTable({ atlas }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [atlas.layout]);
  const locate = (company) => {
    atlas.selectCompany(company, true, true);
    atlas.mapRef.current?.scrollIntoView();
  };
  return (
    <section
      className="shrink-0 border-t bg-card"
      aria-labelledby="table-title"
    >
      <header className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <h2
            id="table-title"
            className="font-display text-base font-semibold tracking-tight"
          >
            Empresas nesta cidade
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground" role="status">
            {atlas.loading
              ? "Carregando empresas…"
              : `${atlas.pagination.start}–${atlas.pagination.end} de ${format(atlas.pagination.total)} empresas · mesma página do mapa`}
          </p>
        </div>
        <span className="hidden text-[9px] tracking-[.15em] text-muted-foreground sm:block">
          MAPA + LISTA
        </span>
      </header>
      <Table
        className="text-xs"
        containerRef={scrollRef}
        containerClassName="max-h-60 overflow-auto border-y"
        containerProps={{
          tabIndex: 0,
          role: "region",
          "aria-label": "Tabela de empresas da página atual",
        }}
      >
        <TableCaption className="sr-only">
          Empresas presentes na cidade 3D, com os mesmos filtros e paginação.
        </TableCaption>
        <TableHeader className="sticky top-0 z-10 bg-muted">
          <TableRow>
            <TableHead className="pl-5">Empresa</TableHead>
            <TableHead>Categorias</TableHead>
            <TableHead className="text-right">{atlas.valueLabel}</TableHead>
            <TableHead>Saúde</TableHead>
            <TableHead>Atualização</TableHead>
            <TableHead>
              <span className="sr-only">Localizar empresa</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {atlas.layout.companies.map((company) => {
            return (
              <TableRow
                key={company.id}
                data-state={
                  atlas.selected?.id === company.id ? "selected" : undefined
                }
                aria-current={
                  atlas.selected?.id === company.id ? "true" : undefined
                }
              >
                <TableHead
                  scope="row"
                  className="min-w-48 pl-5 font-medium text-foreground"
                >
                  {company.name}
                </TableHead>
                <TableCell className="min-w-44 max-w-72 whitespace-normal text-[11px] leading-relaxed text-muted-foreground">
                  <span
                    className="mr-2 inline-block size-2 rounded-sm"
                    style={{
                      background: atlas.regions.find(
                        (region) => region.mask === company.mask,
                      )?.color,
                    }}
                  />
                  {categoryLabel(company)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {format(metricFor(company).value)}
                  {atlas.valueLabel === "Valor" && (
                    <small className="block text-[9px] text-muted-foreground">
                      {metricFor(company).label}
                    </small>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={company.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-[10px] text-muted-foreground">
                  <CompanyDate value={company.updatedAt} />
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px]"
                    aria-label={`Ver ${company.name} no mapa`}
                    onClick={() => locate(company)}
                  >
                    Ver no mapa
                    <ArrowUpRight className="size-3" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
          {!atlas.loading && !atlas.layout.companies.length && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 text-center text-muted-foreground"
              >
                Nenhuma empresa encontrada para estes filtros.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <footer className="px-5 py-3">
        <CompanyPagination atlas={atlas} />
      </footer>
    </section>
  );
}
