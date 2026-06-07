"use client";

import { Plus, Save, Search, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

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
    <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{title}</CardTitle>
            <Button variant="secondary" size="sm" onClick={onNew} aria-label={actionLabel} className="shrink-0">
              <Plus data-icon="inline-start" />
              <span className="hidden sm:inline">{actionLabel}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <InputGroup className="rounded-full">
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={searchValue}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Rechercher"
            />
          </InputGroup>
          <ScrollArea className="max-h-[calc(100vh-260px)] pr-1">
            <div className="flex flex-col gap-2">{children}</div>
          </ScrollArea>
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
}: {
  active: boolean;
  onClick: () => void;
  media: React.ReactNode;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <Item
      variant={active ? "outline" : "default"}
      size="sm"
      className={cn(
        "w-full cursor-pointer border text-left transition-shadow",
        active
          ? "border-foreground bg-card shadow-md"
          : "border-transparent hover:border-border hover:bg-card hover:shadow-sm",
      )}
      render={<button type="button" onClick={onClick} />}
    >
      <ItemMedia variant="image">{media}</ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{description}</ItemDescription>
      </ItemContent>
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
    <Card className="bg-card/95 py-3 shadow-lg backdrop-blur md:sticky md:bottom-4 md:z-10">
      <div className="flex flex-col gap-3 px-(--card-spacing) sm:flex-row sm:items-center sm:justify-between">
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
    </Card>
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
