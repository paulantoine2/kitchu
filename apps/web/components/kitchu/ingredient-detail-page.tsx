"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deletePrivateProduct,
  savePrivateProduct,
  saveUserProductState,
} from "@/app/actions";
import { ProductStorageBadge } from "@/components/kitchu/product-storage-badge";
import { KitchuShell } from "@/components/kitchu/kitchu-shell";
import type { IngredientRecord, KitchuAppProps, UnitRecord } from "@/components/kitchu/types";
import { useKitchuCart } from "@/components/kitchu/use-kitchu-cart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { PRODUCT_STORAGE_TYPES, productStorageLabels, type ProductStorageType } from "@/lib/product-storage";
import { formatCurrency, formatNumber } from "@/lib/utils";

type Product = IngredientRecord["products"][number];

function PersonalStateForm({ product }: { product: Product }) {
  const [stockQuantity, setStockQuantity] = useState(product.stockQuantity?.toString() ?? "");
  const [priceOverride, setPriceOverride] = useState(product.priceOverride?.toString() ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <FieldGroup className="grid gap-4 sm:grid-cols-2">
      <Field>
        <FieldLabel htmlFor={`stock-${product.id}`}>Mon stock</FieldLabel>
        <Input
          id={`stock-${product.id}`}
          type="number"
          min={0}
          step="any"
          value={stockQuantity}
          onChange={(event) => setStockQuantity(event.target.value)}
          placeholder="0"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`price-${product.id}`}>Mon prix</FieldLabel>
        <Input
          id={`price-${product.id}`}
          type="number"
          min={0}
          step="0.01"
          value={priceOverride}
          onChange={(event) => setPriceOverride(event.target.value)}
          placeholder={formatCurrency(product.catalogPrice ?? product.price)}
        />
      </Field>
      <Button
        size="sm"
        variant="secondary"
        className="sm:col-span-2 sm:justify-self-start"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await saveUserProductState({
              productReferenceId: product.id,
              stockQuantity,
              priceOverride,
            });
            if (result.ok) toast.success("Vos données ont été enregistrées.");
            else toast.error(result.error);
          })
        }
      >
        {pending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
        Enregistrer mes données
      </Button>
    </FieldGroup>
  );
}

function PrivateProductForm({
  ingredient,
  units,
  product,
}: {
  ingredient: IngredientRecord;
  units: UnitRecord[];
  product?: Product;
}) {
  const [pending, startTransition] = useTransition();
  const [store, setStore] = useState(product?.store ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [storageType, setStorageType] = useState<ProductStorageType>(product?.storageType ?? "FRESH");
  const [packageQuantity, setPackageQuantity] = useState(product?.packageQuantity.toString() ?? "");
  const [packageUnitId, setPackageUnitId] = useState(product?.packageUnitId ?? ingredient.baseUnitId);
  const [packageToBaseFactor, setPackageToBaseFactor] = useState(product?.packageToBaseFactor?.toString() ?? "");
  const [price, setPrice] = useState((product?.catalogPrice ?? product?.price)?.toString() ?? "");
  const [stockQuantity, setStockQuantity] = useState(product?.stockQuantity?.toString() ?? "");

  function save() {
    startTransition(async () => {
      const result = await savePrivateProduct(ingredient.id, {
        id: product?.id,
        store,
        brand,
        name,
        imageUrl: product?.imageUrl ?? "",
        storageType,
        stockQuantity,
        packageQuantity,
        packageUnitId,
        packageToBaseFactor,
        price,
        url: product?.url ?? "",
        barcode: product?.barcode ?? "",
        notes: product?.notes ?? "",
        caloriesPer100g: product?.caloriesPer100g ?? "",
        proteinPer100g: product?.proteinPer100g ?? "",
        carbsPer100g: product?.carbsPer100g ?? "",
        fatPer100g: product?.fatPer100g ?? "",
      });
      if (result.ok) {
        toast.success(product ? "Référence mise à jour." : "Référence ajoutée.");
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product ? product.name : "Ajouter une référence privée"}</CardTitle>
        <CardDescription>Cette référence est visible uniquement dans votre compte.</CardDescription>
        {product && (
          <CardAction>
            <Badge variant="secondary">Privée</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Magasin</FieldLabel>
            <Input value={store} onChange={(event) => setStore(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Marque</FieldLabel>
            <Input value={brand} onChange={(event) => setBrand(event.target.value)} />
          </Field>
          <Field className="sm:col-span-2">
            <FieldLabel>Produit</FieldLabel>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Conservation</FieldLabel>
            <NativeSelect value={storageType} onChange={(event) => setStorageType(event.target.value as ProductStorageType)}>
              {PRODUCT_STORAGE_TYPES.map((value) => <option key={value} value={value}>{productStorageLabels[value]}</option>)}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel>Prix</FieldLabel>
            <Input type="number" min={0} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Quantité du colis</FieldLabel>
            <Input type="number" min={0} step="any" value={packageQuantity} onChange={(event) => setPackageQuantity(event.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Unité du colis</FieldLabel>
            <NativeSelect value={packageUnitId} onChange={(event) => setPackageUnitId(event.target.value)}>
              {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name} ({unit.symbol})</option>)}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel>Ratio vers {ingredient.baseUnit.symbol}</FieldLabel>
            <Input type="number" min={0} step="any" value={packageToBaseFactor} onChange={(event) => setPackageToBaseFactor(event.target.value)} placeholder="Automatique si convertible" />
          </Field>
          <Field>
            <FieldLabel>Mon stock</FieldLabel>
            <Input type="number" min={0} step="any" value={stockQuantity} onChange={(event) => setStockQuantity(event.target.value)} />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-between gap-3">
        {product ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(async () => {
              const result = await deletePrivateProduct(product.id);
              if (result.ok) window.location.reload();
              else toast.error(result.error);
            })}
          >
            <Trash2 data-icon="inline-start" />
            Supprimer
          </Button>
        ) : <span />}
        <Button size="sm" disabled={pending} onClick={save}>
          {pending ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          Enregistrer
        </Button>
      </CardFooter>
    </Card>
  );
}

export function IngredientDetailPage({
  ingredient,
  ...props
}: KitchuAppProps & { ingredient: IngredientRecord }) {
  const { cartOpen, setCartOpen, cart } = useKitchuCart(props);
  const sharedProducts = ingredient.products.filter((product) => !product.ownerId);
  const privateProducts = ingredient.products.filter((product) => product.ownerId !== null);

  return (
    <KitchuShell
      cartOpen={cartOpen}
      onCartOpenChange={setCartOpen}
      cartItemCount={cart.itemCount}
      cartSummary={cart.summary}
      viewer={props.viewer}
      onCartPortionsChange={cart.setPortions}
      onCartRemoveRecipe={cart.remove}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/ingredients" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ArrowLeft data-icon="inline-start" />
            Retour aux ingrédients
          </Link>
          {props.viewer?.role === "ADMIN" && (
            <Link href={`/ingredients/${ingredient.id}/edit`} className={buttonVariants({ size: "sm" })}>
              <Pencil data-icon="inline-start" />
              Modifier le catalogue
            </Link>
          )}
        </div>

        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{ingredient.name}</h1>
          <p className="text-muted-foreground">
            Mesuré en {ingredient.baseUnit.name.toLocaleLowerCase("fr")} ({ingredient.baseUnit.symbol}).
          </p>
          {ingredient.notes && <p>{ingredient.notes}</p>}
        </header>

        {!props.viewer && (
          <Alert>
            <Plus />
            <AlertTitle>Personnalisez ce catalogue</AlertTitle>
            <AlertDescription>
              <Link href="/connexion">Connectez-vous</Link> pour ajouter vos produits, vos prix et votre stock.
            </AlertDescription>
          </Alert>
        )}

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Références communes</h2>
            <p className="text-sm text-muted-foreground">Disponibles pour tous les utilisateurs.</p>
          </div>
          {sharedProducts.map((product) => (
            <Card key={product.id}>
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{[product.brand, product.store].filter(Boolean).join(" · ")}</CardDescription>
                <CardAction><ProductStorageBadge storageType={product.storageType} /></CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{formatCurrency(product.price)}</Badge>
                  <Badge variant="outline">{formatNumber(product.packageQuantity)} {product.packageUnit.symbol}</Badge>
                  {product.stockQuantity != null && <Badge variant="outline">Stock {formatNumber(product.stockQuantity)}</Badge>}
                </div>
                {props.viewer && <PersonalStateForm product={product} />}
              </CardContent>
            </Card>
          ))}
          {sharedProducts.length === 0 && <p className="text-sm text-muted-foreground">Aucune référence commune.</p>}
        </section>

        {props.viewer && (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold">Mes références</h2>
              <p className="text-sm text-muted-foreground">Elles ne sont visibles que par vous.</p>
            </div>
            {privateProducts.map((product) => (
              <PrivateProductForm key={product.id} ingredient={ingredient} units={props.units} product={product} />
            ))}
            <PrivateProductForm ingredient={ingredient} units={props.units} />
          </section>
        )}
      </div>
    </KitchuShell>
  );
}
