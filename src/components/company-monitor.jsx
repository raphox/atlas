import { useEffect, useMemo, useState } from "react";
import { STATUS } from "@/model";
import { format } from "@/hooks/use-atlas";
import { useMapI18n } from "../charts/city/use-map-i18n.js";
import {
  recentCriticalCompanies,
  timestampValue,
} from "../lib/company-dates.js";

export function CompanyDate({ value }) {
  const { locale, t } = useMapI18n();
  if (!Number.isFinite(timestampValue(value)))
    return <span>{t("dateUnknown")}</span>;
  return (
    <time dateTime={value}>
      {new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))}
    </time>
  );
}

function DigitalClock() {
  const { locale, t } = useMapI18n();
  const [now, setNow] = useState(null);
  useEffect(() => {
    const update = () => {
      if (!document.hidden) setNow(new Date());
    };
    update();
    const timer = setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const clock = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }),
    [locale],
  );
  const date = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
      }),
    [locale],
  );
  return (
    <div
      className="atlas-monitor-clock"
      role="timer"
      aria-label={t("localClock")}
      aria-live="off"
    >
      <span>{t("localClock")}</span>
      <time dateTime={now?.toISOString()} data-testid="monitor-clock">
        {now ? clock.format(now) : "--:--:--"}
      </time>
      <span>{now ? date.format(now) : "—"}</span>
    </div>
  );
}

function CompanyMetrics({ matching, pageSize, loading }) {
  return (
    <section
      aria-label="Resumo das empresas filtradas"
      className="atlas-monitor-metrics"
    >
      <div>
        <p className="text-xs">Empresas encontradas</p>
        <strong className="my-1 block font-display text-4xl font-semibold tracking-tighter">
          {loading ? "—" : format(matching.length)}
        </strong>
        <p className="text-[10px]">
          {pageSize === "all"
            ? "todas em uma cidade"
            : `até ${format(pageSize)} empresas por cidade`}
        </p>
      </div>
      <div className="grid gap-2">
        {Object.entries(STATUS).map(([key, status]) => (
          <div key={key} className="flex items-center gap-1.5">
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
            <p className="text-[10px]">
              {key === "healthy" ? "Saudáveis" : status.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
export function CompanyMonitor({
  companies,
  matching,
  pageSize,
  loading,
  error,
}) {
  const { t, format } = useMapI18n();
  const recent = useMemo(() => recentCriticalCompanies(companies), [companies]);
  return (
    <aside className="atlas-company-monitor" aria-label={t("monitoring")}>
      <DigitalClock />
      <CompanyMetrics
        matching={matching}
        pageSize={pageSize}
        loading={loading}
      />
      <section
        aria-label={t("recentCritical")}
        className="atlas-monitor-alerts"
      >
        <h2>{t("recentCritical")}</h2>
        <p className="atlas-monitor-caption">{t("monitorScope")}</p>
        {loading || error ? (
          <p className="atlas-monitor-empty">
            {t(error ? "monitorUnavailable" : "monitorLoading")}
          </p>
        ) : (
          <>
            <ol>
              {recent.companies.map((company) => (
                <li key={company.id}>
                  <strong title={company.name}>{company.name}</strong>
                  <CompanyDate value={company.statusChangedAt} />
                </li>
              ))}
            </ol>
            {!recent.total && (
              <p className="atlas-monitor-empty">{t("noCritical")}</p>
            )}
            {recent.undatedCount > 0 && (
              <p className="atlas-monitor-caption">
                {t("criticalWithoutDate", {
                  count: format(recent.undatedCount),
                })}
              </p>
            )}
          </>
        )}
      </section>
    </aside>
  );
}
