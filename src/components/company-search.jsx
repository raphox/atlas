import { useEffect, useRef, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function CompanySearch({
  query,
  companies,
  onQuery,
  onSelect,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    const keyboard = (event) => {
      const element = event.target;
      const typing =
        element instanceof Element &&
        element.closest(
          'input, textarea, [role="combobox"], [contenteditable="true"]',
        );
      if (
        event.key === "/" &&
        !typing &&
        !document.querySelector('[role="dialog"]')
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape") setOpen(false);
    };
    const pointer = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", keyboard);
    document.addEventListener("pointerdown", pointer);
    return () => {
      document.removeEventListener("keydown", keyboard);
      document.removeEventListener("pointerdown", pointer);
    };
  }, []);
  return (
    <div
      ref={containerRef}
      className="pointer-events-auto relative w-full sm:w-72"
    >
      <Command shouldFilter={false} className="overflow-visible bg-transparent">
        <InputGroup className="bg-card" data-disabled={disabled}>
          <CommandPrimitive.Input
            asChild
            ref={inputRef}
            value={query}
            onValueChange={(value) => {
              onQuery(value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={(event) => {
              if (!containerRef.current?.contains(event.relatedTarget))
                setOpen(false);
            }}
            placeholder="Encontrar uma empresa…"
            aria-label="Buscar empresa"
            disabled={disabled}
          >
            <InputGroupInput />
          </CommandPrimitive.Input>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <Kbd>/</Kbd>
          </InputGroupAddon>
        </InputGroup>
        {open && query.trim() && (
          <CommandList className="absolute top-12 right-0 left-0 z-20 rounded-md border bg-popover p-1 shadow-lg">
            <CommandEmpty>Nenhuma empresa encontrada.</CommandEmpty>
            <CommandGroup>
              {companies.slice(0, 7).map((company) => (
                <CommandItem
                  key={company.id}
                  value={company.id}
                  onSelect={() => {
                    onSelect(company);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  {company.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
    </div>
  );
}
