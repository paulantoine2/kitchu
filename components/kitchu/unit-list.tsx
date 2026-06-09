"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { UnitRecord } from "@/components/kitchu/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { isHardcodedMeasurementKind } from "@/components/kitchu/unit-helpers";

function UnitCard({ unit }: { unit: UnitRecord }) {
  const isConfigurable = !isHardcodedMeasurementKind(unit.kind);

  return (
    <Link href={isConfigurable ? `/units/${unit.id}` : "#"} className={isConfigurable ? undefined : "pointer-events-none"}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="flex aspect-[4/3] items-center justify-center bg-primary/10">
          <div className="flex size-20 items-center justify-center rounded-xl bg-card text-3xl font-semibold shadow-sm ring-1 ring-foreground/10">
            {unit.symbol}
          </div>
        </div>
        <CardContent className="pt-3">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug">{unit.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {unit.code} · {unit.kind.toLowerCase()}
          </p>
          {!isConfigurable && (
            <Badge variant="secondary" className="mt-2">
              Standard
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function UnitList({
  units,
  onNewUnit,
}: {
  units: UnitRecord[];
  onNewUnit: () => void;
}) {
  const [search, setSearch] = useState("");

  const filteredUnits = useMemo(
    () =>
      units.filter((unit) =>
        [unit.name, unit.code, unit.symbol, unit.kind]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [units, search],
  );

  const configurableCount = filteredUnits.filter((unit) => !isHardcodedMeasurementKind(unit.kind)).length;

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Unités</h2>
          <p className="text-sm text-muted-foreground">
            {filteredUnits.length} unité{filteredUnits.length !== 1 ? "s" : ""}
            {configurableCount !== filteredUnits.length && (
              <> · {configurableCount} configurable{configurableCount !== 1 ? "s" : ""}</>
            )}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onNewUnit} className="shrink-0 self-start sm:self-auto">
          <Plus data-icon="inline-start" />
          Nouvelle unité
        </Button>
      </div>

      <InputGroup className="mb-6 rounded-full">
        <InputGroupAddon align="inline-start">
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une unité"
        />
      </InputGroup>

      {filteredUnits.length === 0 ? (
        <Empty className="border-border bg-card">
          <EmptyDescription>
            {search ? "Aucune unité ne correspond à votre recherche." : "Aucune unité pour le moment."}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredUnits.map((unit) => (
            <UnitCard key={unit.id} unit={unit} />
          ))}
        </div>
      )}
    </div>
  );
}
