"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import type { UnitRecord } from "@/components/kitchu/types";
import { isHardcodedMeasurementKind } from "@/components/kitchu/unit-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function UnitTableRow({ unit }: { unit: UnitRecord }) {
  const isConfigurable = !isHardcodedMeasurementKind(unit.kind);

  return (
    <TableRow className={isConfigurable ? undefined : "text-muted-foreground"}>
      <TableCell className="font-semibold tabular-nums">{unit.symbol}</TableCell>
      <TableCell className="max-w-[280px] whitespace-normal">
        {isConfigurable ? (
          <Link href={`/units/${unit.id}`} className="font-medium hover:underline">
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
        <div className="overflow-hidden rounded-lg border border-border bg-card">
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
      )}
    </div>
  );
}
