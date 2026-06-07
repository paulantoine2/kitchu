"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ComboboxContextValue = {
  disabled: boolean;
  filteredItems: unknown[];
  inputValue: string;
  itemToStringValue: (item: unknown) => string;
  listboxId: string;
  open: boolean;
  selectedValue: unknown;
  selectItem: (item: unknown) => void;
  setInputValue: (value: string) => void;
  setOpen: (open: boolean) => void;
};

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null);

function useComboboxContext(component: string) {
  const context = React.useContext(ComboboxContext);
  if (!context) {
    throw new Error(`${component} must be used within Combobox`);
  }
  return context;
}

export type ComboboxProps<TItem> = {
  items: TItem[];
  value?: TItem | null;
  defaultValue?: TItem | null;
  onValueChange?: (value: TItem | null) => void;
  inputValue?: string;
  onInputValueChange?: (value: string) => void;
  itemToStringValue?: (item: TItem) => string;
  disabled?: boolean;
  children: React.ReactNode;
};

export function Combobox<TItem>({
  items,
  value,
  defaultValue = null,
  onValueChange,
  inputValue,
  onInputValueChange,
  itemToStringValue = String,
  disabled = false,
  children,
}: ComboboxProps<TItem>) {
  const [open, setOpen] = React.useState(false);
  const listboxId = React.useId();
  const [internalValue, setInternalValue] = React.useState<TItem | null>(defaultValue);
  const selectedValue = value !== undefined ? value : internalValue;
  const [internalInputValue, setInternalInputValue] = React.useState(() =>
    selectedValue ? itemToStringValue(selectedValue) : "",
  );
  const currentInputValue = inputValue ?? internalInputValue;

  const setCurrentInputValue = React.useCallback(
    (nextValue: string) => {
      if (inputValue === undefined) {
        setInternalInputValue(nextValue);
      }
      onInputValueChange?.(nextValue);
    },
    [inputValue, onInputValueChange],
  );

  const selectItem = React.useCallback(
    (item: unknown) => {
      const typedItem = item as TItem;
      if (value === undefined) {
        setInternalValue(typedItem);
      }
      setCurrentInputValue(itemToStringValue(typedItem));
      onValueChange?.(typedItem);
      setOpen(false);
    },
    [itemToStringValue, onValueChange, setCurrentInputValue, value],
  );

  const filteredItems = React.useMemo(() => {
    const query = currentInputValue.trim().toLocaleLowerCase("fr-FR");
    if (!query) return items;

    return items.filter((item) =>
      itemToStringValue(item).toLocaleLowerCase("fr-FR").includes(query),
    );
  }, [currentInputValue, itemToStringValue, items]);

  const context = React.useMemo<ComboboxContextValue>(
    () => ({
      disabled,
      filteredItems,
      inputValue: currentInputValue,
      itemToStringValue: itemToStringValue as (item: unknown) => string,
      listboxId,
      open,
      selectedValue,
      selectItem,
      setInputValue: setCurrentInputValue,
      setOpen,
    }),
    [
      currentInputValue,
      disabled,
      filteredItems,
      itemToStringValue,
      listboxId,
      open,
      selectedValue,
      selectItem,
      setCurrentInputValue,
    ],
  );

  return (
    <ComboboxContext.Provider value={context}>
      <PopoverPrimitive.Root open={open} onOpenChange={(nextOpen) => !disabled && setOpen(nextOpen)}>
        {children}
      </PopoverPrimitive.Root>
    </ComboboxContext.Provider>
  );
}

export function ComboboxInput({
  className,
  onChange,
  onFocus,
  showClear = false,
  showTrigger = true,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value"> & {
  showClear?: boolean;
  showTrigger?: boolean;
}) {
  const context = useComboboxContext("ComboboxInput");

  return (
    <PopoverPrimitive.Anchor asChild>
      <div className="relative w-full">
        <input
          className={cn(
            "h-10 w-full rounded-md border border-[#dddddd] bg-white px-3 pr-10 text-sm text-[#222222] shadow-sm outline-none transition placeholder:text-[#717171] focus:border-[#222222] focus:ring-2 focus:ring-[#ff385c]/15 disabled:cursor-not-allowed disabled:bg-[#f7f7f7]",
            showClear && context.inputValue ? "pr-16" : "pr-10",
            className,
          )}
          aria-controls={context.listboxId}
          aria-autocomplete="list"
          aria-expanded={context.open ? "true" : "false"}
          disabled={context.disabled}
          role="combobox"
          value={context.inputValue}
          onChange={(event) => {
            context.setInputValue(event.target.value);
            context.setOpen(true);
            onChange?.(event);
          }}
          onFocus={(event) => {
            context.setOpen(true);
            onFocus?.(event);
          }}
          {...props}
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {showClear && context.inputValue && (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#717171] transition hover:bg-[#f7f4ef] hover:text-[#222222]"
              aria-label="Effacer"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                context.setInputValue("");
                context.setOpen(true);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showTrigger && (
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#717171] transition hover:bg-[#f7f4ef] hover:text-[#222222]"
              aria-label={context.open ? "Fermer les suggestions" : "Ouvrir les suggestions"}
              disabled={context.disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => context.setOpen(!context.open)}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </PopoverPrimitive.Anchor>
  );
}

export function ComboboxContent({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-h-72 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border border-[#dddddd] bg-white p-1 text-sm text-[#222222] shadow-[0_14px_40px_rgba(0,0,0,0.12)] outline-none",
          className,
        )}
        onOpenAutoFocus={(event) => event.preventDefault()}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export function ComboboxEmpty({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = useComboboxContext("ComboboxEmpty");
  if (context.filteredItems.length > 0) return null;

  return (
    <div
      className={cn("px-3 py-5 text-center text-sm text-[#717171]", className)}
      {...props}
    />
  );
}

export function ComboboxList<TItem>({
  className,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
  children: (item: TItem) => React.ReactNode;
}) {
  const context = useComboboxContext("ComboboxList");

  return (
    <div
      className={cn("max-h-64 overflow-y-auto overscroll-contain py-1", className)}
      id={context.listboxId}
      role="listbox"
      {...props}
    >
      {context.filteredItems.map((item) => children(item as TItem))}
    </div>
  );
}

export function ComboboxItem<TItem>({
  className,
  children,
  value,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> & {
  value: TItem;
}) {
  const context = useComboboxContext("ComboboxItem");
  const selected =
    Object.is(context.selectedValue, value) ||
    (context.selectedValue !== null &&
      context.selectedValue !== undefined &&
      context.itemToStringValue(context.selectedValue) === context.itemToStringValue(value));

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={cn(
        "flex min-h-9 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left outline-none transition hover:bg-[#f7f4ef] focus:bg-[#f7f4ef] data-[selected=true]:bg-[#fff0f3]",
        className,
      )}
      data-selected={selected}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => context.selectItem(value)}
      {...props}
    >
      <div className="min-w-0 flex-1 truncate">{children}</div>
      <Check className={cn("h-4 w-4 shrink-0 text-[#ff385c]", selected ? "opacity-100" : "opacity-0")} />
    </button>
  );
}
