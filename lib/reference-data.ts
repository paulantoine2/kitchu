import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";

const UNITS_CACHE_KEY = "kitchu-reference-units";
const RATIOS_CACHE_KEY = "kitchu-reference-ratios";

const fetchUnits = unstable_cache(
  async () =>
    prisma.unit.findMany({
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    }),
  [UNITS_CACHE_KEY],
  { tags: [UNITS_CACHE_KEY], revalidate: 3600 },
);

const fetchGlobalRatios = unstable_cache(
  async () =>
    prisma.unitRatio.findMany({
      orderBy: { updatedAt: "desc" },
    }),
  [RATIOS_CACHE_KEY],
  { tags: [RATIOS_CACHE_KEY], revalidate: 3600 },
);

export async function getReferenceData() {
  const [units, globalRatios] = await Promise.all([fetchUnits(), fetchGlobalRatios()]);
  return { units, globalRatios };
}

export function revalidateReferenceData() {
  revalidateTag(UNITS_CACHE_KEY, "max");
  revalidateTag(RATIOS_CACHE_KEY, "max");
}
