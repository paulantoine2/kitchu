"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useKitchuSearch } from "@/components/kitchu/kitchu-search";
import type { UnitRecord } from "@/components/kitchu/types";
import { isHardcodedMeasurementKind } from "@/components/kitchu/unit-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function UnitMobileItem({ unit }: { unit: UnitRecord }) {
  const isConfigurable = !isHardcodedMeasurementKind(unit.kind);

  return (
    <Item
      variant="outline"
      size="sm"
      className={isConfigurable ? undefined : "text-muted-foreground"}
      render={isConfigurable ? <Link href={`/units/${unit.id}`} /> : undefined}
    >
      <ItemContent className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="shrink-0 font-semibold tabular-nums">{unit.symbol}</span>
          <ItemTitle className="min-w-0 flex-1 truncate">{unit.name}</ItemTitle>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="font-mono text-xs">
            {unit.code}
          </Badge>
          <Badge variant="secondary">{unit.kind.toLowerCase()}</Badge>
          {isConfigurable ? (
            <Badge variant="secondary">Configurable</Badge>
          ) : (
            <Badge variant="secondary">Standard</Badge>
          )}
        </div>
      </ItemContent>
    </Item>
  );
}

function UnitTableRow({ unit }: { unit: UnitRecord }) {
  const isConfigurable = !isHardcodedMeasurementKind(unit.kind);

  return (
    <TableRow className={isConfigurable ? undefined : "text-muted-foreground"}>
      <TableCell className="font-semibold tabular-nums">{unit.symbol}</TableCell>
      <TableCell className="max-w-[280px] whitespace-normal">
        {isConfigurable ? (
          <Link
            href={`/units/${unit.id}`}
            className="font-medium underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {unit.name}
          </Link>
        ) : (
          <span className="font-medium">{unit.name}</span>
        )}
      </TableCell>
      <TableCell className="font-mono text-xs">{unit.code}</TableCell>
      <TableCell>{unit.kind.toLowerCase()}</TableCell>
      <TableCell>
        {isConfigurable ? (
          <Badge variant="secondary">Configurable</Badge>
        ) : (
          <Badge variant="secondary">Standard</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

export function UnitList({
  units,
  onNewUnit,
}: {
  units: UnitRecord[];
  onNewUnit: () => void;
}) {
  const { query } = useKitchuSearch();

  const filteredUnits = useMemo(
    () =>
      units.filter((unit) =>
        [unit.name, unit.code, unit.symbol, unit.kind]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [units, query],
  );

  const configurableCount = filteredUnits.filter((unit) => !isHardcodedMeasurementKind(unit.kind)).length;

  return (
    <div className="mx-auto max-w-[1480px] animate-fade-in px-4 py-8 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Unités</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredUnits.length} unité{filteredUnits.length !== 1 ? "s" : ""}
            {configurableCount !== filteredUnits.length && (
              <> · {configurableCount} configurable{configurableCount !== 1 ? "s" : ""}</>
            )}
          </p>
        </div>
        <Button size="sm" onClick={onNewUnit} className="shrink-0 self-start sm:self-auto">
          <Plus data-icon="inline-start" />
          Nouvelle unité
        </Button>
      </div>

      {filteredUnits.length === 0 ? (
        <Empty className="border border-dashed border-border/80 bg-card/50 py-16">
          <EmptyDescription>
            {query ? "Aucune unité ne correspond à votre recherche." : "Aucune unité pour le moment."}
          </EmptyDescription>
        </Empty>
      ) : (
        <>
          <ItemGroup className="stagger-children gap-2 md:hidden">
            {filteredUnits.map((unit) => (
              <UnitMobileItem key={unit.id} unit={unit} />
            ))}
          </ItemGroup>
          <div className="hidden animate-fade-up overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/[0.05] md:block dark:ring-foreground/[0.08]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbole</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((unit) => (
                  <UnitTableRow key={unit.id} unit={unit} />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
