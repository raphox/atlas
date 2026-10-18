import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export function HelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="size-8 rounded-full"
          aria-label="Como navegar"
        >
          <CircleHelp className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <p className="text-[10px] font-semibold tracking-[.18em] text-muted-foreground">
            EXPLORE O ATLAS
          </p>
          <DialogTitle className="font-display text-2xl">
            A cidade conta uma história.
          </DialogTitle>
          <DialogDescription>
            Cada construção é uma empresa. A altura representa o valor da
            métrica informada, e a cor indica as categorias.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            As cores indicam a combinação exata de até três categorias. Uma
            empresa com duas categorias aparece uma única vez, na interseção
            entre elas.
          </p>
          <p>
            Cada cidade começa com até 100 empresas. Você pode escolher 250,
            500, 1.000 ou todas. Os filtros e a busca são aplicados à base
            inteira antes da paginação. A tabela acompanha a cidade; use “Ver no
            mapa” para localizar uma empresa.
          </p>
          <ul className="space-y-2">
            <li>
              <strong className="text-foreground">Saudável:</strong> aparência
              normal.
            </li>
            <li>
              <strong className="text-foreground">Risco médio:</strong> fumaça
              clara e alerta amarelo.
            </li>
            <li>
              <strong className="text-foreground">Alto risco:</strong>{" "}
              construção piscando em vermelho, fogo nas janelas e fumaça escura.
            </li>
          </ul>
          <p>
            Arraste para girar. Use a roda ou pinça para zoom. Para mover, use o
            botão direito ou dois dedos. Clique em um prédio para ver a empresa.
          </p>
          <p>
            Atalhos: / abre a busca, + e − controlam o zoom, 0 restaura a vista
            isométrica e Esc fecha os detalhes.
          </p>
          <p className="text-xs">
            A base inicial é fictícia. Você pode importar um JSON com seus
            próprios dados pelo menu lateral.
          </p>
        </div>
        <DialogClose asChild>
          <Button className="w-full">Explorar cidade</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
