"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ChefHat, Package, Utensils } from "lucide-react";
import {
  addIngredientUnitQuick,
  deleteIngredient,
  deleteRecipe,
  deleteUnit,
  deleteUnitRatio,
  saveIngredient,
  saveRecipe,
  saveUnit,
  saveUnitRatio,
} from "@/app/actions";
import {
  blankIngredient,
  blankRecipe,
  blankUnit,
  helloFreshImportToDraft,
  ingredientToDraft,
  recipeToDraft,
  unitToDraft,
} from "@/components/kitchu/drafts";
import { IngredientEditor } from "@/components/kitchu/ingredient-editor";
import { ingredientImageUrl, recipeImageUrl } from "@/components/kitchu/images";
import { toIngredientPayload, toRecipePayload, toUnitPayload } from "@/components/kitchu/payloads";
import { RecipeEditor } from "@/components/kitchu/recipe-editor";
import { RecipeView } from "@/components/kitchu/recipe-view";
import type { IngredientRecord, KitchuAppProps } from "@/components/kitchu/types";
import { EntityImage, LibraryListItem, LibraryPanel } from "@/components/kitchu/ui/shared";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { UnitEditor, UnitListButton, UnitListSection } from "@/components/kitchu/unit-editor";
import {
  canonicalBaseUnitForKind,
  isHardcodedMeasurementKind,
  specificIngredientUnits,
  usableUnitsForIngredient,
} from "@/components/kitchu/unit-helpers";

export function KitchuApp({ units, globalRatios, ingredients, recipes }: KitchuAppProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"recipes" | "ingredients" | "units">("recipes");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [unitSearch, setUnitSearch] = useState("");
  const [allIngredients, setAllIngredients] = useState(ingredients);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(recipes[0]?.id ?? null);
  const [recipeMode, setRecipeMode] = useState<"view" | "edit">(recipes[0] ? "view" : "edit");
  const [selectedIngredientId, setSelectedIngredientId] = useState<string | null>(
    ingredients[0]?.id ?? null,
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(units[0]?.id ?? null);
  const [recipeDraft, setRecipeDraft] = useState(() => recipeToDraft(recipes[0]));
  const [ingredientDraft, setIngredientDraft] = useState(() =>
    ingredientToDraft(ingredients[0], units[0]?.id ?? ""),
  );
  const [unitDraft, setUnitDraft] = useState(() => unitToDraft(units[0]));
  const [portions, setPortions] = useState(2);
  const [notice, setNotice] = useState("");

  const defaultBaseUnitId = canonicalBaseUnitForKind("MASS", units)?.id ?? units[0]?.id ?? "";

  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(recipeSearch.toLowerCase()),
  );
  const filteredIngredients = allIngredients.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(ingredientSearch.toLowerCase()),
  );
  const filteredUnits = units.filter((unit) =>
    [unit.name, unit.code, unit.symbol, unit.kind]
      .join(" ")
      .toLowerCase()
      .includes(unitSearch.toLowerCase()),
  );
  const editableUnits = filteredUnits.filter((unit) => !isHardcodedMeasurementKind(unit.kind));
  const selectedRecipe = selectedRecipeId
    ? recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null
    : null;

  function refreshWithNotice(message: string) {
    setNotice(message);
    router.refresh();
  }

  function runAction(action: () => Promise<void>) {
    startTransition(() => {
      action().catch((error) => setNotice(error instanceof Error ? error.message : "Erreur inattendue."));
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1480px] min-w-0 flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <ChefHat className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">Kitchu</h1>
              <p className="text-sm text-muted-foreground">Recettes, ingrédients, unités et produits réels.</p>
            </div>
          </div>
          <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
            <TabsList className="h-auto max-w-full overflow-x-auto rounded-full border border-border bg-card p-1 shadow-sm md:w-auto">
              <TabsTrigger value="recipes" className="rounded-full px-3 md:px-4">
                <BookOpen data-icon="inline-start" />
                Recettes
              </TabsTrigger>
              <TabsTrigger value="ingredients" className="rounded-full px-3 md:px-4">
                <Utensils data-icon="inline-start" />
                Ingrédients
              </TabsTrigger>
              <TabsTrigger value="units" className="rounded-full px-3 md:px-4">
                <Package data-icon="inline-start" />
                Unités
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] gap-6 px-4 py-6 lg:grid-cols-[340px_1fr] lg:px-8">
        {tab === "recipes" && (
          <>
            <LibraryPanel
              title="Bibliothèque"
              searchValue={recipeSearch}
              onSearch={setRecipeSearch}
              actionLabel="Nouvelle recette"
              onNew={() => {
                setSelectedRecipeId(null);
                setRecipeDraft(blankRecipe());
                setRecipeMode("edit");
              }}
            >
              {filteredRecipes.map((recipe) => (
                <LibraryListItem
                  key={recipe.id}
                  active={selectedRecipeId === recipe.id}
                  onClick={() => {
                    setSelectedRecipeId(recipe.id);
                    setRecipeDraft(recipeToDraft(recipe));
                    setRecipeMode("view");
                  }}
                  media={<EntityImage src={recipeImageUrl(recipe)} label={recipe.name} size="sm" />}
                  title={recipe.name}
                  description={
                    <>
                      {recipe.ingredients.length} ingrédients · {recipe.steps.length} étapes
                    </>
                  }
                />
              ))}
            </LibraryPanel>
            {recipeMode === "view" && selectedRecipe ? (
              <RecipeView
                recipe={selectedRecipe}
                units={units}
                ingredients={allIngredients}
                globalRatios={globalRatios}
                portions={portions}
                setPortions={setPortions}
                onEdit={() => {
                  setRecipeDraft(recipeToDraft(selectedRecipe));
                  setRecipeMode("edit");
                }}
              />
            ) : (
              <RecipeEditor
                draft={recipeDraft}
                setDraft={setRecipeDraft}
                ingredients={allIngredients}
                units={units}
                globalRatios={globalRatios}
                busy={isPending}
                notice={notice}
                onCancel={
                  selectedRecipe
                    ? () => {
                        setRecipeDraft(recipeToDraft(selectedRecipe));
                        setRecipeMode("view");
                      }
                    : undefined
                }
                onImport={(result) => {
                  setSelectedRecipeId(null);
                  setRecipeDraft(helloFreshImportToDraft(result));
                  setRecipeMode("edit");
                  setPortions(1);
                  const issues = result.matches.filter((item) => item.status !== "matched").length;
                  setNotice(
                    issues
                      ? `Import HelloFresh terminé. ${issues} ligne(s) à compléter.`
                      : "Import HelloFresh terminé.",
                  );
                }}
                onImportError={setNotice}
                onSave={() =>
                  runAction(async () => {
                    const result = await saveRecipe(toRecipePayload(recipeDraft));
                    if (result.ok) {
                      setSelectedRecipeId(result.id);
                      setRecipeDraft((current) => ({ ...current, id: result.id }));
                      setRecipeMode("view");
                      refreshWithNotice("Recette enregistrée.");
                    } else {
                      setNotice(result.error);
                    }
                  })
                }
                onDelete={() =>
                  recipeDraft.id &&
                  runAction(async () => {
                    const result = await deleteRecipe(recipeDraft.id!);
                    if (result.ok) {
                      const nextRecipe = recipes.find((recipe) => recipe.id !== recipeDraft.id);
                      setSelectedRecipeId(nextRecipe?.id ?? null);
                      setRecipeDraft(recipeToDraft(nextRecipe));
                      setRecipeMode(nextRecipe ? "view" : "edit");
                      refreshWithNotice("Recette supprimée.");
                    } else {
                      setNotice(result.error);
                    }
                  })
                }
                onCreateIngredient={(rowKey, draft, options, onCreated) =>
                  runAction(async () => {
                    const result = await saveIngredient(toIngredientPayload(draft, units, globalRatios));
                    if (result.ok) {
                      const ingredient = result.ingredient as IngredientRecord;
                      setAllIngredients((current) =>
                        current.some((item) => item.id === ingredient.id)
                          ? current
                          : [...current, ingredient].sort((a, b) => a.name.localeCompare(b.name)),
                      );
                      setRecipeDraft((current) => ({
                        ...current,
                        ingredients: current.ingredients.map((item) => {
                          if (item.key !== rowKey) return item;
                          const usableUnits = usableUnitsForIngredient(ingredient, units, globalRatios);
                          const matchedUnit = options?.unitCodes
                            ? usableUnits.find((entry) => options.unitCodes?.includes(entry.unit.code))
                            : undefined;
                          const unitId = matchedUnit?.unitId ?? usableUnits[0]?.unitId ?? "";
                          return {
                            ...item,
                            ingredientId: ingredient.id,
                            ingredientName: ingredient.name,
                            unitId,
                            importStatus: unitId ? "matched" : item.importStatus,
                          };
                        }),
                      }));
                      onCreated();
                      setNotice("Ingrédient créé.");
                    } else {
                      setNotice(result.error);
                    }
                  })
                }
                onQuickAddUnit={(rowKey, ingredientId, unitCode) =>
                  runAction(async () => {
                    const result = await addIngredientUnitQuick(ingredientId, unitCode);
                    if (result.ok) {
                      const ingredient = result.ingredient as IngredientRecord;
                      setAllIngredients((current) =>
                        current.map((item) => (item.id === ingredient.id ? ingredient : item)),
                      );
                      const addedUnit = usableUnitsForIngredient(ingredient, units, globalRatios).find(
                        (entry) => entry.unit.code === unitCode,
                      );
                      setRecipeDraft((current) => ({
                        ...current,
                        ingredients: current.ingredients.map((item) =>
                          item.key === rowKey
                            ? {
                                ...item,
                                ingredientId: ingredient.id,
                                ingredientName: ingredient.name,
                                unitId: addedUnit?.unitId ?? item.unitId,
                                importStatus: addedUnit ? "matched" : item.importStatus,
                              }
                            : item,
                        ),
                      }));
                      setNotice("Unité ajoutée à l'ingrédient.");
                    } else {
                      setNotice(result.error);
                    }
                  })
                }
              />
            )}
          </>
        )}

        {tab === "ingredients" && (
          <>
            <LibraryPanel
              title="Ingrédients"
              searchValue={ingredientSearch}
              onSearch={setIngredientSearch}
              actionLabel="Nouvel ingrédient"
              onNew={() => {
                setSelectedIngredientId(null);
                setIngredientDraft(blankIngredient(defaultBaseUnitId));
              }}
            >
              {filteredIngredients.map((ingredient) => {
                const usableUnitCount = usableUnitsForIngredient(ingredient, units, globalRatios).length;
                const specificRatioCount = specificIngredientUnits(ingredient, globalRatios, units).length;
                return (
                  <LibraryListItem
                    key={ingredient.id}
                    active={selectedIngredientId === ingredient.id}
                    onClick={() => {
                      setSelectedIngredientId(ingredient.id);
                      setIngredientDraft(ingredientToDraft(ingredient, defaultBaseUnitId));
                    }}
                    media={<EntityImage src={ingredientImageUrl(ingredient)} label={ingredient.name} size="sm" />}
                    title={ingredient.name}
                    description={`${usableUnitCount} unités · ${specificRatioCount} ratio${specificRatioCount > 1 ? "s" : ""} spécifique${specificRatioCount > 1 ? "s" : ""} · ${ingredient.products.length} produits`}
                  />
                );
              })}
            </LibraryPanel>
            <IngredientEditor
              draft={ingredientDraft}
              setDraft={setIngredientDraft}
              units={units}
              globalRatios={globalRatios}
              busy={isPending}
              notice={notice}
              onSave={() =>
                runAction(async () => {
                  const result = await saveIngredient(toIngredientPayload(ingredientDraft, units, globalRatios));
                  if (result.ok) {
                    setSelectedIngredientId(result.id);
                    refreshWithNotice("Ingrédient enregistré.");
                  } else {
                    setNotice(result.error);
                  }
                })
              }
              onDelete={() =>
                ingredientDraft.id &&
                runAction(async () => {
                  const deletedIngredientId = ingredientDraft.id!;
                  const result = await deleteIngredient(deletedIngredientId);
                  if (result.ok) {
                    const remainingIngredients = allIngredients.filter(
                      (ingredient) => ingredient.id !== deletedIngredientId,
                    );
                    const nextIngredient = remainingIngredients[0];
                    setAllIngredients(remainingIngredients);
                    setSelectedIngredientId(nextIngredient?.id ?? null);
                    setIngredientDraft(ingredientToDraft(nextIngredient, defaultBaseUnitId));
                    refreshWithNotice("Ingrédient supprimé.");
                  } else {
                    setNotice(result.error);
                  }
                })
              }
            />
          </>
        )}

        {tab === "units" && (
          <>
            <LibraryPanel
              title="Unités"
              searchValue={unitSearch}
              onSearch={setUnitSearch}
              actionLabel="Nouvelle unité"
              onNew={() => {
                setSelectedUnitId(null);
                setUnitDraft(blankUnit());
              }}
            >
              {editableUnits.length > 0 && (
                <UnitListSection title="Unités configurables">
                  {editableUnits.map((unit) => (
                    <UnitListButton
                      key={unit.id}
                      unit={unit}
                      active={selectedUnitId === unit.id}
                      onClick={() => {
                        setSelectedUnitId(unit.id);
                        setUnitDraft(unitToDraft(unit));
                      }}
                    />
                  ))}
                </UnitListSection>
              )}
              {editableUnits.length === 0 && (
                <Empty className="border-border bg-card">
                  <EmptyDescription>Aucune unité trouvée.</EmptyDescription>
                </Empty>
              )}
            </LibraryPanel>
            <UnitEditor
              draft={unitDraft}
              setDraft={setUnitDraft}
              units={units}
              ingredients={allIngredients}
              recipes={recipes}
              globalRatios={globalRatios}
              busy={isPending}
              notice={notice}
              onSave={() =>
                runAction(async () => {
                  const result = await saveUnit(toUnitPayload(unitDraft));
                  if (result.ok) {
                    setSelectedUnitId(result.id);
                    setUnitDraft((current) => ({ ...current, id: result.id }));
                    refreshWithNotice("Unité enregistrée.");
                  } else {
                    setNotice(result.error);
                  }
                })
              }
              onDelete={() =>
                unitDraft.id &&
                runAction(async () => {
                  const result = await deleteUnit(unitDraft.id!, { force: true });
                  if (result.ok) {
                    setSelectedUnitId(units.find((unit) => unit.id !== unitDraft.id)?.id ?? null);
                    setUnitDraft(unitToDraft(units.find((unit) => unit.id !== unitDraft.id)));
                    refreshWithNotice("Unité supprimée.");
                  } else {
                    setNotice(result.error);
                  }
                })
              }
              onSaveRatio={(payload) =>
                runAction(async () => {
                  const result = await saveUnitRatio(payload);
                  if (result.ok) {
                    refreshWithNotice("Ratio configurable enregistré.");
                  } else {
                    setNotice(result.error);
                  }
                })
              }
              onDeleteRatio={(id) =>
                runAction(async () => {
                  const result = await deleteUnitRatio(id);
                  if (result.ok) {
                    refreshWithNotice("Ratio configurable supprimé.");
                  } else {
                    setNotice(result.error);
                  }
                })
              }
            />
          </>
        )}
      </div>
    </main>
  );
}
