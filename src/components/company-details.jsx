import { ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "./status-badge";
import { categoryLabel, metricFor } from "@/model";
import { format } from "@/hooks/use-atlas";
const descriptions = {
  healthy: "Operação saudável. A construção mantém sua aparência normal.",
  warning:
    "Ponto de atenção: fumaça clara e alerta amarelo sinalizam risco médio.",
  critical:
    "Alto risco: construção piscando em vermelho, chamas nas janelas e fumaça escura indicam prioridade de atenção.",
};
export function CompanyDetails({ company, onClose, onFocus }) {
  if (!company) return null;
  return (
    <Card
      className="absolute right-4 bottom-28 z-20 w-[min(310px,calc(100%-2rem))] gap-4 bg-card/95 shadow-xl backdrop-blur"
      role="region"
      aria-label="Detalhes da empresa"
    >
      <CardHeader className="relative gap-3 pr-10">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-3 size-7"
          aria-label="Fechar detalhes"
          onClick={onClose}
        >
          <X />
        </Button>
        <p className="section-label">EMPRESA SELECIONADA</p>
        <div>
          <StatusBadge status={company.status} />
        </div>
        <CardTitle className="font-display text-xl leading-snug">
          {company.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Separator />
        <div className="grid grid-cols-[1fr_1.5fr] gap-5">
          <div>
            <p className="text-[10px] text-muted-foreground">
              {metricFor(company).label}
            </p>
            <strong className="font-display text-2xl font-semibold">
              {format(metricFor(company).value)}
            </strong>
          </div>
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground">Categorias</p>
            <strong className="block text-xs leading-relaxed">
              {categoryLabel(company)}
            </strong>
          </div>
        </div>
        <Separator />
        <CardDescription className="text-xs leading-relaxed">
          {descriptions[company.status]}
        </CardDescription>
        <Button className="w-full text-xs" onClick={onFocus}>
          Aproximar empresa
          <ArrowUpRight className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
