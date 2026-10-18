import { Badge } from "@/components/ui/badge";
import { STATUS } from "@/model";
import { cn } from "@/lib/utils";
const colors = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  critical: "border-red-200 bg-red-50 text-red-800",
};
export function StatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={cn("whitespace-nowrap text-[10px]", colors[status])}
    >
      {STATUS[status].label}
    </Badge>
  );
}
