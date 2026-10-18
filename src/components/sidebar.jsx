import { useRef } from "react";
import { ArrowDownToLine, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { REGIONS, STATUS } from "@/model";
import { downloadExample, format } from "@/hooks/use-atlas";
import { cn } from "@/lib/utils";

function HealthFilter({ value, onChange }) {
  return (
    <div className="space-y-3">
      <label
        htmlFor="health-filter"
        id="health-label"
        className="section-label"
      >
        SAÚDE DA EMPRESA
      </label>
      <select
        id="health-filter"
        className="native-select w-full text-xs"
        value={value}
        aria-labelledby="health-label"
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="all">Todos os níveis de risco</option>
        {Object.entries(STATUS).map(([key, status]) => (
          <option key={key} value={key}>
            {status.label}
          </option>
        ))}
      </select>
    </div>
  );
}
function CompanyMetrics({ matching, pageSize, loading }) {
  return (
    <section
      aria-label="Resumo das empresas filtradas"
      className="space-y-5 py-5"
    >
      <div>
        <p className="text-xs text-muted-foreground">Empresas encontradas</p>
        <strong className="my-1 block font-display text-5xl font-semibold tracking-tighter">
          {loading ? "—" : format(matching.length)}
        </strong>
        <p className="text-[10px] text-muted-foreground">
          {pageSize === "all"
            ? "todas em uma cidade"
            : `até ${format(pageSize)} empresas por cidade`}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(STATUS).map(([key, status]) => (
          <div key={key}>
            <div className="flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full"
                style={{ background: status.color }}
              />
              <strong className="text-sm font-semibold">
                {loading
                  ? "—"
                  : format(matching.filter((c) => c.status === key).length)}
              </strong>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {key === "healthy" ? "Saudáveis" : status.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
function SystemFilters({ matching, region, onChange, onClear }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="section-label">SISTEMAS & INTERSEÇÕES</h2>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1 text-[10px] text-muted-foreground"
          onClick={onClear}
        >
          Limpar
        </Button>
      </div>
      <div className="space-y-1">
        {[
          {
            mask: "all",
            label: "Todos os sistemas",
            color: "var(--muted-foreground)",
          },
          ...REGIONS,
        ].map((item) => (
          <Button
            key={item.mask}
            variant="ghost"
            aria-pressed={region === String(item.mask)}
            onClick={() => onChange(String(item.mask))}
            className={cn(
              "h-auto w-full justify-start gap-2.5 whitespace-normal border border-transparent px-2 py-2 text-left",
              region === String(item.mask) &&
                "border-sidebar-border bg-sidebar-active text-sidebar-accent-foreground",
            )}
          >
            <span
              className="mt-1 size-2 shrink-0 self-start rounded-sm"
              style={{ background: item.color }}
            />
            <span className="min-w-0 flex-1 text-[11px] font-normal leading-relaxed">
              {item.label}
              {item.mask !== "all" && (
                <small className="block text-[9px] text-muted-foreground">
                  {item.mask === 7
                    ? "interseção tripla"
                    : item.label.includes("+")
                      ? "interseção"
                      : "exclusivo"}
                </small>
              )}
            </span>
            <span className="self-start pt-0.5 text-[10px] font-normal tabular-nums text-muted-foreground">
              {format(
                item.mask === "all"
                  ? matching.length
                  : matching.filter((c) => c.mask === item.mask).length,
              )}
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}
function ImportCompanies({ onImport, loading }) {
  const fileRef = useRef(null);
  return (
    <footer className="mt-auto pt-6">
      <Button
        variant="outline"
        className="h-auto w-full justify-start gap-2 px-3 py-3 text-left text-[11px] whitespace-normal"
        disabled={loading}
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-3.5" />
        Carregar minhas empresas
        <Badge variant="secondary" className="ml-auto text-[8px]">
          JSON
        </Badge>
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="Arquivo JSON de empresas"
        onChange={(event) => {
          onImport(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <Button
        variant="link"
        className="px-0 text-[10px] text-muted-foreground"
        onClick={downloadExample}
      >
        Baixar arquivo de exemplo
        <ArrowDownToLine className="size-3" />
      </Button>
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
        Cor mostra os sistemas.
        <br />
        Altura mostra a quantidade de usuários.
      </p>
    </footer>
  );
}
export function Sidebar({ atlas }) {
  return (
    <aside className="flex flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground p-6 md:overflow-y-auto md:border-r md:border-b-0 md:p-4 lg:p-6">
      <div className="flex justify-between text-[9px] font-semibold tracking-[.15em] text-muted-foreground">
        <span>VISÃO DA OPERAÇÃO</span>
        <span>01 / CIDADE</span>
      </div>
      <h1 className="mt-5 font-display text-4xl md:text-3xl lg:text-4xl font-semibold leading-[1.2] tracking-[-.05em]">
        Saúde em
        <br />
        <span className="text-primary">perspectiva.</span>
      </h1>
      <p className="mt-3 mb-6 text-xs leading-relaxed text-muted-foreground">
        Uma cidade, todas as empresas.
        <br />
        Explore os sinais da sua operação.
      </p>
      <HealthFilter
        value={atlas.filters.status}
        onChange={(status) => atlas.updateFilters({ status })}
      />
      <Separator className="mt-5" />
      <CompanyMetrics
        matching={atlas.matching}
        pageSize={atlas.pageSize}
        loading={atlas.loading}
      />
      <Separator />
      <SystemFilters
        matching={atlas.matching}
        region={atlas.filters.region}
        onChange={(region) => atlas.updateFilters({ region })}
        onClear={atlas.clearFilters}
      />
      <ImportCompanies onImport={atlas.importData} loading={atlas.loading} />
    </aside>
  );
}
