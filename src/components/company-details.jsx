import { useMapI18n } from "../charts/city/use-map-i18n.js";
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
export function CompanyDetails({ company, onClose, onFocus }) {
  const { t, format } = useMapI18n();
  if (!company) return null;
  return (
    <Card
      className="atlas-map-details pointer-events-auto mr-14 w-[min(310px,calc(100%-3.5rem))] self-end gap-4 shadow-xl"
      role="region"
      aria-label={t("details")}
    >
      <CardHeader className="relative gap-3 pr-10">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-3 size-7"
          aria-label={t("closeDetails")}
          onClick={onClose}
        >
          <X />
        </Button>
        <p className="section-label">{t("selectedCompany")}</p>
        <div>
          <StatusBadge
            status={company.status}
            label={t(`status.${company.status}`)}
          />
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
            <p className="mb-1 text-[10px] text-muted-foreground">
              {t("categories")}
            </p>
            <strong className="block text-xs leading-relaxed">
              {categoryLabel(company)}
            </strong>
          </div>
        </div>
        <Separator />
        <CardDescription className="text-xs leading-relaxed">
          {t(`description.${company.status}`)}
        </CardDescription>
        <Button className="w-full text-xs" onClick={onFocus}>
          {t("zoomCompany")}
          <ArrowUpRight className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
