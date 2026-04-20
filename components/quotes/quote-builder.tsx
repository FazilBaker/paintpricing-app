"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Palette,
  Plus,
  Trash2,
} from "lucide-react";

import { createQuoteAction } from "@/app/actions";
import {
  EXTERIOR_TEMPLATES,
  ROOM_TEMPLATES,
  QUOTE_TERMS,
} from "@/lib/constants";
import {
  calculateExteriorSuggested,
  calculateInteriorSuggested,
  calculateItemsSummary,
  createCustomItem,
  createExteriorItem,
  createInteriorItem,
  duplicateItem,
  serializeQuotePayload,
} from "@/lib/quote-engine";
import type {
  ExteriorCalcInputs,
  ExteriorTemplateKey,
  InteriorCalcInputs,
  ProfileRecord,
  QuoteClientInfo,
  QuoteItem,
  RoomTemplateKey,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";

/* ── Types ─────────────────────────────── */

type QuoteBuilderProps = {
  profile: ProfileRecord;
  initialData?: {
    client: QuoteClientInfo;
    items: QuoteItem[];
    parentQuoteId: string;
    version: number;
    discount?: { type: "flat" | "percent"; value: number };
  };
};

/* ── Template chip data ────────────────── */

type TemplateChip = {
  key: string;
  label: string;
  type: "interior" | "exterior";
};

const ALL_TEMPLATES: TemplateChip[] = [
  // Interior
  { key: "living-room", label: "Living Room", type: "interior" },
  { key: "master-bedroom", label: "Master Bed", type: "interior" },
  { key: "standard-bedroom", label: "Bedroom", type: "interior" },
  { key: "kitchen", label: "Kitchen", type: "interior" },
  { key: "bathroom", label: "Bathroom", type: "interior" },
  { key: "hallway", label: "Hallway", type: "interior" },
  // Exterior
  { key: "siding", label: "Siding", type: "exterior" },
  { key: "trim-fascia", label: "Trim & Fascia", type: "exterior" },
  { key: "soffit", label: "Soffit", type: "exterior" },
  { key: "doors", label: "Ext. Doors", type: "exterior" },
  { key: "garage-door", label: "Garage Door", type: "exterior" },
  { key: "deck-porch", label: "Deck / Porch", type: "exterior" },
  { key: "fence", label: "Fence", type: "exterior" },
];

const defaultClientInfo: QuoteClientInfo = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  projectAddress: "",
  quoteTitle: "Paint Estimate",
  quoteValidDays: 7,
  notes: "",
};

/* ── LocalStorage autosave ────────────── */

const AUTOSAVE_KEY = "pp_quote_draft";

function loadDraft(): { client: QuoteClientInfo; items: QuoteItem[]; discount: { type: "flat" | "percent"; value: number } } | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDraft(client: QuoteClientInfo, items: QuoteItem[], discount: { type: "flat" | "percent"; value: number }) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ client, items, discount }));
  } catch {
    // ignore quota errors
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore
  }
}

/* ── Collapsible section ───────────────── */

function Section({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card>
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 sm:p-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && !open && (
            <p className="mt-0.5 text-xs text-[var(--muted)] truncate">{subtitle}</p>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--muted)]" />
        )}
      </button>
      {open && <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0">{children}</div>}
    </Card>
  );
}

/* ── Interior calculator (expandable) ──── */

function InteriorCalculator({
  inputs,
  settings,
  onRecalculate,
}: {
  inputs: InteriorCalcInputs;
  settings: ProfileRecord["settings"];
  onRecalculate: (inputs: InteriorCalcInputs, suggestedPrice: number, scopeDesc: string) => void;
}) {
  const update = (partial: Partial<InteriorCalcInputs>) => {
    const next = { ...inputs, ...partial };
    const { suggestedPrice, scopeDescription } = calculateInteriorSuggested(next, settings);
    onRecalculate(next, Math.round(suggestedPrice), scopeDescription);
  };

  return (
    <div className="space-y-3 rounded-[var(--radius)] bg-[var(--brand-muted)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Calculator — adjust to recalculate suggestion
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Wall sq ft</Label>
          <Input
            type="number"
            min="0"
            value={inputs.defaultWallSqFt}
            onChange={(e) => update({ defaultWallSqFt: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ceiling sq ft</Label>
          <Input
            type="number"
            min="0"
            value={inputs.defaultCeilingSqFt}
            onChange={(e) => update({ defaultCeilingSqFt: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Trim (linear ft)</Label>
          <Input
            type="number"
            min="0"
            value={inputs.trimLinearFeet}
            onChange={(e) => update({ trimLinearFeet: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Doors</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={inputs.doorCount}
            onChange={(e) => update({ doorCount: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Windows</Label>
          <Input
            type="number"
            min="0"
            step="1"
            value={inputs.windowCount}
            onChange={(e) => update({ windowCount: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Toggle
          checked={inputs.includeCeiling}
          onChange={(c) => update({ includeCeiling: c })}
          label="Ceiling"
        />
        <Toggle
          checked={inputs.paintDoors}
          onChange={(c) => update({ paintDoors: c })}
          label="Paint doors"
        />
        <Toggle
          checked={inputs.paintWindows}
          onChange={(c) => update({ paintWindows: c })}
          label="Paint windows"
        />
        <Toggle
          checked={inputs.heavyPrep}
          onChange={(c) => update({ heavyPrep: c })}
          label="Heavy prep"
        />
      </div>
    </div>
  );
}

/* ── Exterior calculator (expandable) ──── */

function ExteriorCalculator({
  inputs,
  templateKey,
  settings,
  onRecalculate,
}: {
  inputs: ExteriorCalcInputs;
  templateKey: ExteriorTemplateKey;
  settings: ProfileRecord["settings"];
  onRecalculate: (inputs: ExteriorCalcInputs, suggestedPrice: number, scopeDesc: string) => void;
}) {
  const update = (partial: Partial<ExteriorCalcInputs>) => {
    const next = { ...inputs, ...partial };
    const { suggestedPrice, scopeDescription } = calculateExteriorSuggested(next, templateKey, settings);
    onRecalculate(next, Math.round(suggestedPrice), scopeDescription);
  };

  return (
    <div className="space-y-3 rounded-[var(--radius)] bg-[var(--brand-muted)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Calculator — adjust to recalculate suggestion
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Square feet</Label>
          <Input
            type="number"
            min="0"
            value={inputs.sqFt}
            onChange={(e) => update({ sqFt: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Coats</Label>
          <Input
            type="number"
            min="1"
            max="10"
            step="1"
            value={inputs.coats}
            onChange={(e) => update({ coats: Math.max(1, Number(e.target.value) || 1) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Toggle
          checked={inputs.useSpray}
          onChange={(c) => update({ useSpray: c })}
          label="Sprayer"
        />
        <Toggle
          checked={inputs.heavyPrep}
          onChange={(c) => update({ heavyPrep: c })}
          label="Heavy prep"
        />
      </div>
    </div>
  );
}

/* ── Single item card ─────────────────── */

function ItemCard({
  item,
  index,
  canDelete,
  settings,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  item: QuoteItem;
  index: number;
  canDelete: boolean;
  settings: ProfileRecord["settings"];
  onUpdate: (updates: Partial<QuoteItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  const hasCalculator = item.type === "interior" || item.type === "exterior";
  const priceChanged = item.price !== item.suggestedPrice && item.suggestedPrice > 0;

  const typeBadgeColors =
    item.type === "interior"
      ? "bg-[var(--brand-soft)] text-[var(--brand)]"
      : item.type === "exterior"
        ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
        : "bg-[var(--success-soft)] text-[var(--success)]";

  const isExt = item.type === "exterior";
  const borderColor = isExt ? "var(--amber-500)" : "var(--navy-700)";
  const badgeBg = isExt ? "var(--amber-50)" : "var(--navy-50)";
  const badgeColor = isExt ? "var(--amber-600)" : "var(--navy-700)";

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] overflow-hidden"
      style={{ borderLeft: `3px solid ${borderColor}`, boxShadow: "var(--shadow-sm)" }}
    >
      {/* Compact header — always visible */}
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        style={{ gridTemplateColumns: "auto 1fr auto auto auto" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] font-mono text-xs font-bold"
            style={{ background: badgeBg, color: badgeColor }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <p className="font-semibold text-[15px] truncate">
                {item.name || <span className="text-[var(--muted)] italic">Untitled</span>}
              </p>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                style={{ background: badgeBg, color: badgeColor }}
              >
                {item.type}
              </span>
            </div>
            {!expanded && item.suggestedPrice > 0 && priceChanged && (
              <p className="text-[11px] text-[var(--muted)] truncate">
                Suggested {formatCurrency(item.suggestedPrice)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-[18px] font-semibold" style={{ letterSpacing: "-0.01em" }}>
            {formatCurrency(item.price)}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-[var(--muted)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--muted)]" />
          )}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="space-y-3 px-4 pb-4 sm:px-5 sm:pb-5 pt-3 border-t border-[var(--line-2)]" style={{ background: "var(--background)" }}>
          {/* Name row */}
          <div className="flex items-center gap-2">
            <Input
              className="text-sm font-semibold flex-1"
              value={item.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder={item.type === "custom" ? "e.g. Move furniture, Travel fee" : "Item name"}
            />
          </div>

          {/* Price input — BIG and prominent */}
          <div className="space-y-1">
            <Label className="text-xs">Your price</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--muted)]">
                $
              </span>
              <Input
                type="number"
                min="0"
                step="1"
                className="pl-7 text-lg font-bold font-mono"
                value={item.price || ""}
                onChange={(e) => onUpdate({ price: Number(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            {item.suggestedPrice > 0 && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-[var(--muted)]">
                  Suggested: {formatCurrency(item.suggestedPrice)}
                </p>
                {priceChanged && (
                  <button
                    type="button"
                    className="text-xs font-medium text-[var(--brand)] hover:underline"
                    onClick={() => onUpdate({ price: item.suggestedPrice })}
                  >
                    Use suggestion
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex items-center gap-1 flex-wrap">
            {hasCalculator && (
              <button
                type="button"
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  showCalc
                    ? "bg-[var(--brand)] text-white"
                    : "bg-[var(--brand-muted)] text-[var(--brand)] hover:bg-[var(--brand-soft)]"
                }`}
                onClick={() => setShowCalc(!showCalc)}
              >
                <Calculator className="h-3.5 w-3.5" />
                Calculator
              </button>
            )}
            <button
              type="button"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                showExtras
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--brand-muted)] text-[var(--brand)] hover:bg-[var(--brand-soft)]"
              }`}
              onClick={() => setShowExtras(!showExtras)}
            >
              <Palette className="h-3.5 w-3.5" />
              Details
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-[var(--brand-muted)] text-[var(--brand)] hover:bg-[var(--brand-soft)] transition"
              onClick={onDuplicate}
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)] transition"
              onClick={onRemove}
              disabled={!canDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>

          {/* Calculator panel */}
          {showCalc && item.type === "interior" && item.interiorInputs && (
            <InteriorCalculator
              inputs={item.interiorInputs}
              settings={settings}
              onRecalculate={(inputs, suggestedPrice, scopeDesc) => {
                onUpdate({
                  interiorInputs: inputs,
                  suggestedPrice,
                  scopeDescription: scopeDesc,
                });
              }}
            />
          )}
          {showCalc && item.type === "exterior" && item.exteriorInputs && item.templateKey && (
            <ExteriorCalculator
              inputs={item.exteriorInputs}
              templateKey={item.templateKey as ExteriorTemplateKey}
              settings={settings}
              onRecalculate={(inputs, suggestedPrice, scopeDesc) => {
                onUpdate({
                  exteriorInputs: inputs,
                  suggestedPrice,
                  scopeDescription: scopeDesc,
                });
              }}
            />
          )}

          {/* Extras panel (paint color, scope description, note) */}
          {showExtras && (
            <div className="space-y-3 rounded-[var(--radius)] bg-[var(--surface)] border border-[var(--line)] p-3">
              <div className="space-y-1">
                <Label className="text-xs">Paint color / product</Label>
                <Input
                  value={item.paintColor}
                  onChange={(e) => onUpdate({ paintColor: e.target.value })}
                  placeholder="e.g. SW 7015 Repose Gray"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Scope description (shown on PDF)</Label>
                <Textarea
                  value={item.scopeDescription}
                  onChange={(e) => onUpdate({ scopeDescription: e.target.value })}
                  placeholder="Auto-generated from calculator, or type your own"
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Internal note (not on PDF)</Label>
                <Input
                  value={item.note}
                  onChange={(e) => onUpdate({ note: e.target.value })}
                  placeholder="Private notes for your reference"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Template picker (tabbed chips) ── */

const INTERIOR_PRIMARY: TemplateChip[] = ALL_TEMPLATES.filter(
  (t) => t.type === "interior" && ["living-room", "standard-bedroom", "kitchen", "bathroom", "hallway"].includes(t.key),
);
const INTERIOR_MORE: TemplateChip[] = ALL_TEMPLATES.filter(
  (t) => t.type === "interior" && !INTERIOR_PRIMARY.find((p) => p.key === t.key),
);
const EXTERIOR_PRIMARY: TemplateChip[] = ALL_TEMPLATES.filter(
  (t) => t.type === "exterior" && ["siding", "trim-fascia", "deck-porch", "garage-door"].includes(t.key),
);
const EXTERIOR_MORE: TemplateChip[] = ALL_TEMPLATES.filter(
  (t) => t.type === "exterior" && !EXTERIOR_PRIMARY.find((p) => p.key === t.key),
);

function TemplatePicker({
  onAddInterior,
  onAddExterior,
  onAddCustom,
}: {
  onAddInterior: (key: RoomTemplateKey) => void;
  onAddExterior: (key: ExteriorTemplateKey) => void;
  onAddCustom: () => void;
}) {
  const [tab, setTab] = useState<"interior" | "exterior">("interior");
  const [moreOpen, setMoreOpen] = useState(false);
  const isExt = tab === "exterior";
  const primaryChips = isExt ? EXTERIOR_PRIMARY : INTERIOR_PRIMARY;
  const moreChips = isExt ? EXTERIOR_MORE : INTERIOR_MORE;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-4" style={{ boxShadow: "var(--shadow-sm)" }}>
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Tap to add</span>
        {/* Interior / Exterior toggle */}
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--navy-50)" }}>
          {(["interior", "exterior"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setMoreOpen(false); }}
              className="px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all"
              style={tab === t
                ? { background: "var(--surface)", color: "var(--ink)", boxShadow: "var(--shadow-sm)" }
                : { color: "var(--muted)", background: "transparent" }
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {primaryChips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              if (c.type === "interior") onAddInterior(c.key as RoomTemplateKey);
              else onAddExterior(c.key as ExteriorTemplateKey);
            }}
            className="flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95"
            style={isExt
              ? { background: "var(--amber-50)", borderColor: "var(--amber-100)", color: "var(--amber-600)" }
              : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }
            }
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = isExt ? "var(--amber-500)" : "var(--navy-500)";
              (e.currentTarget as HTMLButtonElement).style.background = isExt ? "var(--amber-100)" : "var(--navy-50)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = isExt ? "var(--amber-100)" : "var(--line)";
              (e.currentTarget as HTMLButtonElement).style.background = isExt ? "var(--amber-50)" : "var(--surface)";
            }}
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-white text-xs font-bold leading-none"
              style={{ background: isExt ? "var(--amber-500)" : "var(--navy-700)", color: isExt ? "#3B2300" : "white" }}
            >
              +
            </span>
            {c.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium text-[var(--muted)] transition-all"
          style={{ borderStyle: "dashed", borderColor: "var(--muted-2)", background: "transparent" }}
        >
          More… {moreOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {moreOpen && (
        <div className="mt-3 pt-3 border-t border-dashed border-[var(--line)] flex gap-2 flex-wrap">
          {moreChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                if (c.type === "interior") onAddInterior(c.key as RoomTemplateKey);
                else onAddExterior(c.key as ExteriorTemplateKey);
                setMoreOpen(false);
              }}
              className="flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95"
              style={isExt
                ? { background: "var(--amber-50)", borderColor: "var(--amber-100)", color: "var(--amber-600)" }
                : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink)" }
              }
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold leading-none"
                style={{ background: isExt ? "var(--amber-500)" : "var(--navy-700)", color: isExt ? "#3B2300" : "white" }}
              >
                +
              </span>
              {c.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onAddCustom}
            className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95"
            style={{ background: "var(--surface)", borderColor: "var(--line)", color: "var(--navy-700)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Custom item
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main builder ──────────────────────── */

export function QuoteBuilder({ profile, initialData }: QuoteBuilderProps) {
  const [client, setClient] = useState<QuoteClientInfo>(() => {
    if (initialData?.client) return initialData.client;
    const draft = loadDraft();
    return draft?.client ?? defaultClientInfo;
  });

  const [items, setItems] = useState<QuoteItem[]>(() => {
    if (initialData?.items && initialData.items.length > 0) return initialData.items;
    const draft = loadDraft();
    return draft?.items ?? [];
  });

  const [discount, setDiscount] = useState<{ type: "flat" | "percent"; value: number }>(() => {
    if (initialData?.discount) return initialData.discount;
    const draft = loadDraft();
    return draft?.discount ?? { type: "flat", value: 0 };
  });

  const [showMoreClient, setShowMoreClient] = useState(false);
  const [showDiscount, setShowDiscount] = useState(() => {
    if (initialData?.discount && initialData.discount.value > 0) return true;
    const draft = loadDraft();
    return (draft?.discount?.value ?? 0) > 0;
  });

  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const isEditing = !!initialData;

  // Autosave to localStorage (debounced)
  useEffect(() => {
    if (isEditing) return; // don't autosave when editing existing quote
    const timer = setTimeout(() => {
      saveDraft(client, items, discount);
    }, 500);
    return () => clearTimeout(timer);
  }, [client, items, discount, isEditing]);

  const summary = useMemo(
    () => calculateItemsSummary(items, profile.settings, discount),
    [items, profile.settings, discount],
  );

  const payload = useMemo(
    () =>
      serializeQuotePayload({
        client,
        items,
        rooms: [], // legacy empty
        exteriorItems: [], // legacy empty
        discount,
        summary,
        settings: profile.settings,
        branding: {
          businessName: profile.businessName ?? "",
          businessEmail: profile.businessEmail ?? "",
          phone: profile.phone ?? "",
          website: profile.website,
          licenseNumber: profile.licenseNumber,
          logoUrl: profile.logoUrl,
          customFields: profile.customFields,
        },
      }),
    [client, profile, items, discount, summary],
  );

  const updateItem = useCallback((itemId: string, updates: Partial<QuoteItem>) => {
    setItems((cur) =>
      cur.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
    );
  }, []);

  const addInterior = useCallback((key: RoomTemplateKey) => {
    setItems((cur) => [...cur, createInteriorItem(key, profile.settings)]);
  }, [profile.settings]);

  const addExterior = useCallback((key: ExteriorTemplateKey) => {
    setItems((cur) => [...cur, createExteriorItem(key, profile.settings)]);
  }, [profile.settings]);

  const addCustom = useCallback(() => {
    setItems((cur) => [...cur, createCustomItem()]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((cur) => cur.filter((i) => i.id !== id));
  }, []);

  const dupItem = useCallback((id: string) => {
    setItems((cur) => {
      const idx = cur.findIndex((i) => i.id === id);
      if (idx < 0) return cur;
      const copy = duplicateItem(cur[idx]);
      const next = [...cur];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(() => {
    setSubmitting(true);
    clearDraft();
  }, []);

  const hasItems = items.length > 0;

  return (
    <form
      ref={formRef}
      action={createQuoteAction}
      onSubmit={handleSubmit}
      className="grid gap-4 lg:grid-cols-[1fr_320px]"
    >
      <input name="payload" type="hidden" value={payload} readOnly />
      {initialData && (
        <>
          <input name="parentQuoteId" type="hidden" value={initialData.parentQuoteId} readOnly />
          <input name="version" type="hidden" value={initialData.version} readOnly />
        </>
      )}

      {/* ── Main column ──────────────── */}
      <div className="space-y-3 pb-36 sm:pb-0 min-w-0">
        {/* Client info — collapsed by default on mobile */}
        <Section
          title="Client info"
          subtitle={client.customerName || client.projectAddress || "Tap to add"}
          defaultOpen={isEditing || !!client.customerName}
        >
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Customer name</Label>
                <Input
                  value={client.customerName}
                  onChange={(e) =>
                    setClient((c) => ({ ...c, customerName: e.target.value }))
                  }
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Project address</Label>
                <Input
                  value={client.projectAddress}
                  onChange={(e) =>
                    setClient((c) => ({ ...c, projectAddress: e.target.value }))
                  }
                  placeholder="123 Main St"
                />
              </div>
            </div>

            {!showMoreClient ? (
              <button
                type="button"
                className="text-xs font-medium text-[var(--brand)] hover:underline"
                onClick={() => setShowMoreClient(true)}
              >
                + Add email, phone & notes
              </button>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={client.customerEmail}
                    onChange={(e) =>
                      setClient((c) => ({ ...c, customerEmail: e.target.value }))
                    }
                    placeholder="client@email.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    type="tel"
                    value={client.customerPhone}
                    onChange={(e) =>
                      setClient((c) => ({ ...c, customerPhone: e.target.value }))
                    }
                    placeholder="(555) 555-1234"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quote title</Label>
                  <Input
                    value={client.quoteTitle}
                    onChange={(e) =>
                      setClient((c) => ({ ...c, quoteTitle: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valid for (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={client.quoteValidDays}
                    onChange={(e) =>
                      setClient((c) => ({
                        ...c,
                        quoteValidDays: Number(e.target.value) || 7,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Notes / terms</Label>
                  <Textarea
                    value={client.notes}
                    onChange={(e) =>
                      setClient((c) => ({ ...c, notes: e.target.value }))
                    }
                    placeholder={QUOTE_TERMS.join(" ")}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Template picker */}
        <TemplatePicker
          onAddInterior={addInterior}
          onAddExterior={addExterior}
          onAddCustom={addCustom}
        />

        {/* Item list — flat, unified */}
        {items.map((item, i) => (
          <ItemCard
            key={item.id}
            item={item}
            index={i}
            canDelete={items.length > 1}
            settings={profile.settings}
            onUpdate={(u) => updateItem(item.id, u)}
            onRemove={() => removeItem(item.id)}
            onDuplicate={() => dupItem(item.id)}
          />
        ))}

        {items.length === 0 && (
          <div
            className="py-9 text-center rounded-[var(--radius-lg)] border border-dashed"
            style={{ borderColor: "var(--muted-2)", background: "var(--surface)" }}
          >
            <p className="text-[15px] font-semibold mb-1">No items yet</p>
            <p className="text-sm text-[var(--muted)]">Tap a chip above to add your first room.</p>
          </div>
        )}

        {/* Discount section */}
        {hasItems && !showDiscount && (
          <button
            type="button"
            className="text-xs font-medium text-[var(--brand)] hover:underline"
            onClick={() => setShowDiscount(true)}
          >
            + Add discount
          </button>
        )}
        {showDiscount && (
          <Card>
            <CardContent className="py-3 sm:py-4">
              <div className="flex items-center gap-3">
                <Label className="text-xs shrink-0">Discount</Label>
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    className="font-mono"
                    value={discount.value || ""}
                    onChange={(e) =>
                      setDiscount((d) => ({ ...d, value: Number(e.target.value) || 0 }))
                    }
                    placeholder="0"
                  />
                  <div className="flex gap-1 rounded-full bg-[var(--brand-muted)] p-0.5">
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        discount.type === "flat"
                          ? "bg-[var(--brand)] text-white"
                          : "text-[var(--muted)]"
                      }`}
                      onClick={() => setDiscount((d) => ({ ...d, type: "flat" }))}
                    >
                      $
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        discount.type === "percent"
                          ? "bg-[var(--brand)] text-white"
                          : "text-[var(--muted)]"
                      }`}
                      onClick={() => setDiscount((d) => ({ ...d, type: "percent" }))}
                    >
                      %
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs text-[var(--danger)] hover:underline shrink-0"
                  onClick={() => {
                    setDiscount({ type: "flat", value: 0 });
                    setShowDiscount(false);
                  }}
                >
                  Remove
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Desktop sidebar ──────────── */}
      <div className="hidden lg:block space-y-4 lg:sticky lg:top-24 lg:self-start">
        {/* Live summary card */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[var(--line-2)]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Live summary</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--navy-50)", color: "var(--navy-700)" }}
            >
              {items.length} items
            </span>
          </div>
          <div className="p-4 space-y-4">
            {/* Grand total */}
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">Grand total</p>
              <p className="font-mono font-bold" style={{ fontSize: 36, letterSpacing: "-0.025em" }}>
                {formatCurrency(summary.grandTotal)}
              </p>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 pt-3 border-t border-[var(--line-2)] text-sm">
              {items.length > 0 && items.map((item, i) => (
                <div key={item.id} className="flex justify-between gap-2">
                  <span className="text-[var(--muted)] truncate">{item.name || `Item ${i + 1}`}</span>
                  <span className="font-mono shrink-0">{formatCurrency(item.price)}</span>
                </div>
              ))}
              {summary.discount > 0 && (
                <div className="flex justify-between text-[var(--success)]">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(summary.discount)}</span>
                </div>
              )}
              {summary.taxTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--muted)]">Tax</span>
                  <span className="font-mono">{formatCurrency(summary.taxTotal)}</span>
                </div>
              )}
              {summary.minimumApplied && (
                <p className="text-xs text-[var(--accent-strong)]">Minimum job charge applied.</p>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              type="submit"
              disabled={!hasItems || submitting}
            >
              {submitting ? "Saving..." : isEditing ? `Save as v${initialData.version}` : "Save quote"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky footer ─────── */}
      <div className="fixed bottom-[60px] left-0 right-0 z-40 border-t border-[var(--line)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-md)] sm:bottom-0 lg:hidden safe-bottom">
        <div className="flex items-center justify-between gap-4 max-w-[1120px] mx-auto">
          <div>
            <p className="text-xs text-[var(--muted)]">Grand total</p>
            <p className="text-xl font-bold font-mono text-[var(--brand)]">
              {formatCurrency(summary.grandTotal)}
            </p>
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={!hasItems || submitting}
            className="shrink-0"
          >
            {submitting
              ? "Saving..."
              : isEditing
                ? `Save v${initialData.version}`
                : "Save Quote"}
          </Button>
        </div>
      </div>
    </form>
  );
}
