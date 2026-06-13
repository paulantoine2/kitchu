"use client";

import { Plus, Save, Search, Trash2, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field as ShadcnField,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type PartialEstimateSeverity = "critical" | "minor";

export function PartialEstimateIndicator({
  severity,
  className,
  compact = false,
}: {
  severity: PartialEstimateSeverity | null;
  className?: string;
  compact?: boolean;
}) {
  if (!severity) {
    return null;
  }

  if (severity === "critical") {
    if (compact) {
      return (
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                className={cn("inline-flex shrink-0 text-destructive/70", className)}
                aria-label="Estimation indisponible"
              />
            }
          >
            <TriangleAlert className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>Estimation indisponible — données produit manquantes</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Badge variant="outline" className={cn("text-[10px] text-muted-foreground", className)}>
        Estimation partielle
      </Badge>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "inline-flex shrink-0 text-muted-foreground",
              compact && "opacity-60",
              className,
            )}
            aria-label="Estimation partielle"
          />
        }
      >
        <TriangleAlert className={compact ? "size-3.5" : undefined} />
      </TooltipTrigger>
      <TooltipContent>
        Estimation partielle — certains ingrédients manquent de données produit
      </TooltipContent>
    </Tooltip>
  );
}

export function EntityImage({
  src,
  label,
  size = "md",
  className,
}: {
  src?: string | null;
  label: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClassName = {
    xs: "size-8 rounded-md",
    sm: "size-14 rounded-lg",
    md: "size-20 rounded-lg",
    lg: "size-32 rounded-lg",
  }[size];
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <Avatar className={cn(sizeClassName, "rounded-lg after:rounded-lg", className)}>
      {src ? <AvatarImage src={src} alt={label} className="rounded-lg" /> : null}
      <AvatarFallback className="rounded-lg bg-primary/10 font-semibold text-primary">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}

export function LibraryPanel({
  title,
  searchValue,
  onSearch,
  actionLabel,
  onNew,
  children,
}: {
  title: string;
  searchValue: string;
  onSearch: (value: string) => void;
  actionLabel: string;
  onNew: () => void;
  children: React.ReactNode;
}) {
  return (
    <aside className="min-h-0 min-w-0 lg:sticky lg:top-24 lg:self-start lg:h-[calc(100dvh-6rem)]">
      <Card className="flex h-full min-h-0 max-h-[calc(100dvh-6rem)] flex-col lg:max-h-none">
        <CardHeader className="shrink-0 border-b py-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">{title}</CardTitle>
            <Button variant="secondary" size="sm" onClick={onNew} aria-label={actionLabel} className="shrink-0">
              <Plus data-icon="inline-start" />
              <span className="hidden sm:inline">{actionLabel}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-2">
          <InputGroup className="shrink-0 rounded-full">
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={searchValue}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Rechercher"
            />
          </InputGroup>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            <div className="flex flex-col gap-1">{children}</div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

export function LibraryListItem({
  active,
  onClick,
  media,
  title,
  description,
  warning,
}: {
  active: boolean;
  onClick: () => void;
  media: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  warning?: string;
}) {
  return (
    <Item
      variant={active ? "outline" : "default"}
      size="xs"
      className={cn(
        "w-full cursor-pointer border py-1.5 text-left transition-[background-color,box-shadow,border-color] duration-200",
        active
          ? "border-primary/30 bg-accent shadow-soft"
          : "border-transparent hover:bg-muted/60",
      )}
      render={<button type="button" onClick={onClick} />}
    >
      <ItemMedia variant="image">{media}</ItemMedia>
      <ItemContent className="min-w-0 gap-0">
        <ItemTitle className="truncate text-sm leading-tight">{title}</ItemTitle>
        {description ? <ItemDescription className="line-clamp-1">{description}</ItemDescription> : null}
      </ItemContent>
      {warning ? (
        <ItemActions className="shrink-0">
          <span className="inline-flex text-amber-500 dark:text-amber-400" title={warning} aria-label={warning}>
            <TriangleAlert className="size-4" aria-hidden="true" />
          </span>
        </ItemActions>
      ) : null}
    </Item>
  );
}

export function StickySave({
  busy,
  notice,
  onSave,
  onDelete,
}: {
  busy: boolean;
  notice: string;
  onSave: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="min-h-5 min-w-0 flex-1 text-sm text-muted-foreground">{notice || "\u00a0"}</p>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {onDelete && (
            <Button variant="outline" onClick={onDelete} disabled={busy}>
              <Trash2 data-icon="inline-start" />
              Supprimer
            </Button>
          )}
          <Button onClick={onSave} disabled={busy}>
            {busy ? <Spinner data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {busy ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  className,
  showLabel = true,
  children,
}: {
  label: string;
  className?: string;
  showLabel?: boolean;
  children: React.ReactNode;
}) {
  return (
    <ShadcnField className={className}>
      <FieldLabel className={showLabel ? undefined : "sr-only"}>{label}</FieldLabel>
      {children}
    </ShadcnField>
  );
}
