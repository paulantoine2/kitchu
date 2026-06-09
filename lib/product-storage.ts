export const PRODUCT_STORAGE_TYPES = ["FRESH", "FROZEN", "DRY"] as const;

export type ProductStorageType = (typeof PRODUCT_STORAGE_TYPES)[number];

export const productStorageLabels: Record<ProductStorageType, string> = {
  FRESH: "Frais",
  FROZEN: "Surgelé",
  DRY: "Sec",
};

/** Lower value = higher reuse priority (fresh before frozen before dry). */
export const productStoragePriority: Record<ProductStorageType, number> = {
  FRESH: 0,
  FROZEN: 1,
  DRY: 2,
};

export const productStorageBadgeClass: Record<ProductStorageType, string> = {
  FRESH: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  FROZEN: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  DRY: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export function isProductStorageType(value: string): value is ProductStorageType {
  return PRODUCT_STORAGE_TYPES.includes(value as ProductStorageType);
}

export function compareProductStoragePriority(left: ProductStorageType, right: ProductStorageType) {
  return productStoragePriority[left] - productStoragePriority[right];
}

export function totalProductStock(products: Array<{ stockQuantity: number | null }>) {
  const total = products.reduce((sum, product) => sum + (product.stockQuantity ?? 0), 0);
  return total > 0 ? total : null;
}
