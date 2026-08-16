import { Badge } from "@/components/ui/badge";
import {
  productStorageBadgeClass,
  productStorageLabels,
  type ProductStorageType,
} from "@/lib/product-storage";
import { cn } from "@/lib/utils";

export function ProductStorageBadge({
  storageType,
  className,
}: {
  storageType: ProductStorageType;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(productStorageBadgeClass[storageType], className)}>
      {productStorageLabels[storageType]}
    </Badge>
  );
}
