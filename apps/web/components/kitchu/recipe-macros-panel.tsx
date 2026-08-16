import { Flame } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  formatMacroCalories,
  type MacroTotals,
  type RecipeMacroEstimate,
} from "@/components/kitchu/recipe-macros";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatMacroGrams(value: number) {
  return `${formatNumber(value)} g`;
}

function formatMacroCell(value: number, kind: "calories" | "grams") {
  if (kind === "calories") {
    return formatMacroCalories(value) ?? "—";
  }
  return value > 0 ? formatMacroGrams(value) : "—";
}

const SUMMARY_ROWS: { key: keyof MacroTotals; label: string; kind: "calories" | "grams" }[] = [
  { key: "calories", label: "Calories", kind: "calories" },
  { key: "protein", label: "Protéines", kind: "grams" },
  { key: "carbs", label: "Glucides", kind: "grams" },
  { key: "fat", label: "Lipides", kind: "grams" },
];

const INGREDIENT_MACRO_COLUMNS: { key: keyof MacroTotals; label: string; kind: "calories" | "grams" }[] = [
  { key: "calories", label: "kcal", kind: "calories" },
  { key: "protein", label: "Prot.", kind: "grams" },
  { key: "carbs", label: "Gluc.", kind: "grams" },
  { key: "fat", label: "Lip.", kind: "grams" },
];

export function RecipeMacrosPanel({
  macroEstimate,
  portions,
}: {
  macroEstimate: RecipeMacroEstimate;
  portions: number;
}) {
  const perServing = macroEstimate.perServing;
  if (!perServing) {
    return null;
  }

  const portionCount = Math.max(1, portions);
  const contributingLines = macroEstimate.lines.filter((line) => line.hasData);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Flame />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight">Macros estimées</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Valeurs nutritionnelles pour {portionCount} portion{portionCount > 1 ? "s" : ""}
            {!macroEstimate.isComplete ? " — estimation partielle." : "."}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/[0.05] dark:ring-foreground/[0.08]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Macro</TableHead>
              <TableHead className="text-right">Par portion</TableHead>
              {portionCount > 1 && (
                <TableHead className="text-right">Total ({portionCount} portions)</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {SUMMARY_ROWS.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {formatMacroCell(perServing[row.key], row.kind)}
                </TableCell>
                {portionCount > 1 && (
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {formatMacroCell(perServing[row.key] * portionCount, row.kind)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {contributingLines.length > 0 && (
          <div className="border-t border-border/60 px-3 pb-3">
            <p className="px-3 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Détail par ingrédient
              {portionCount > 1 ? " (par portion)" : ""}
            </p>
            <Table className="mt-2">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Ingrédient</TableHead>
                  {INGREDIENT_MACRO_COLUMNS.map((column) => (
                    <TableHead key={column.key} className="text-right">
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contributingLines.map((line) => (
                  <TableRow key={`${line.ingredientId}-${line.ingredientName}`}>
                    <TableCell className="max-w-[12rem] whitespace-normal font-medium">
                      {line.ingredientName}
                    </TableCell>
                    {INGREDIENT_MACRO_COLUMNS.map((column) => (
                      <TableCell key={column.key} className="text-right tabular-nums">
                        {formatMacroCell(line.macros[column.key], column.kind)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!macroEstimate.isComplete && (
          <p className="border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
            Données manquantes pour : {macroEstimate.missingIngredientNames.join(", ")}
          </p>
        )}
      </div>
    </section>
  );
}
