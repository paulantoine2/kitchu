"use client";

import { Plus, Save, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NavButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactElement<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "default" : "ghost"}
      onClick={onClick}
      className={`min-w-fit rounded-full px-3 md:flex-none md:px-4 ${
        active ? "shadow-none" : "text-[#717171] hover:text-[#222222]"
      }`}
    >
      {icon}
      {children}
    </Button>
  );
}

export function EntityImage({
  src,
  label,
  size = "md",
}: {
  src?: string | null;
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const className = {
    sm: "h-14 w-14",
    md: "h-20 w-20",
    lg: "h-32 w-32",
  }[size];
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-lg border border-[#dddddd] bg-[#f7f4ef] shadow-sm`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#fff0f3] text-sm font-semibold text-[#d70466]">
          {initial}
        </div>
      )}
    </div>
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
    <aside className="min-w-0 space-y-3 lg:sticky lg:top-24 lg:self-start">
      <Card className="overflow-hidden">
        <CardHeader className="bg-white">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button variant="secondary" size="sm" onClick={onNew} aria-label={actionLabel}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{actionLabel}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 bg-[#fffdfb]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#717171]" />
            <Input
              value={searchValue}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Rechercher"
              className="rounded-full pl-9"
            />
          </div>
          <div className="max-h-[calc(100vh-260px)] space-y-2 overflow-auto pr-1">{children}</div>
        </CardContent>
      </Card>
    </aside>
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
    <div className="rounded-lg border border-[#eeeeee] bg-white/95 p-3 shadow-lg backdrop-blur md:sticky md:bottom-4 md:z-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="min-h-5 text-sm text-[#717171]">{notice}</p>
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="outline" onClick={onDelete} disabled={busy}>
              <Trash2 className="h-4 w-4" />
              Supprimer
            </Button>
          )}
          <Button onClick={onSave} disabled={busy}>
            <Save className="h-4 w-4" />
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
    <label className={`space-y-1.5 ${className ?? ""}`}>
      <Label className={showLabel ? undefined : "sr-only"}>{label}</Label>
      {children}
    </label>
  );
}
