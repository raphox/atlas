import { useEffect, useId, useRef } from "react";
import { Search } from "lucide-react";

export function CompanySearch({
  query,
  companies,
  onQuery,
  onSelect,
  disabled,
}) {
  const listId = useId();
  const inputRef = useRef(null);
  useEffect(() => {
    const keyboard = (event) => {
      const typing =
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, [contenteditable="true"]',
        );
      if (
        event.key === "/" &&
        !typing &&
        !document.querySelector('[role="dialog"]')
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, []);
  return (
    <div className="pointer-events-auto relative w-full sm:w-72">
      <Search
        aria-hidden="true"
        className="atlas-map-search-icon pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <input
        ref={inputRef}
        type="search"
        list={listId}
        value={query}
        className="atlas-map-search-input native-input w-full pr-9 pl-9 text-xs"
        placeholder="Encontrar uma empresa…"
        aria-label="Buscar empresa"
        disabled={disabled}
        onChange={(event) => {
          const value = event.target.value;
          onQuery(value);
          const match = companies.find((company) => company.name === value);
          if (match) onSelect(match);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && companies.length) {
            event.preventDefault();
            onSelect(
              companies.find((company) => company.name === query) ||
                companies[0],
            );
          }
        }}
      />
      <datalist id={listId}>
        {companies.slice(0, 7).map((company) => (
          <option key={company.id} value={company.name} />
        ))}
      </datalist>
      <kbd className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
        /
      </kbd>
    </div>
  );
}
