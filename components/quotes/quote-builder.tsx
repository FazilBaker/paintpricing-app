"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { createQuoteAction } from "@/app/actions";
import { CUSTOM_TEMPLATE, QUOTE_TERMS, ROOM_TEMPLATES } from "@/lib/constants";
import { calculateQuoteSummary, createRoomFromTemplate, serializeQuotePayload } from "@/lib/quote-engine";
import type { ProfileRecord, QuoteClientInfo, QuoteRoomInput, RoomTemplateKey } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type QuoteBuilderProps = {
  profile: ProfileRecord;
};

const TEMPLATE_KEYS: RoomTemplateKey[] = [
  "living-room",
  "master-bedroom",
  "standard-bedroom",
  "kitchen",
  "bathroom",
  "hallway",
  "custom",
];

const defaultClientInfo: QuoteClientInfo = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  projectAddress: "",
  quoteTitle: "Interior Repaint Estimate",
  quoteValidDays: 7,
  notes: "",
};

export function QuoteBuilder({ profile }: QuoteBuilderProps) {
  const [client, setClient] = useState<QuoteClientInfo>(defaultClientInfo);
  const [rooms, setRooms] = useState<QuoteRoomInput[]>([
    createRoomFromTemplate("living-room"),
  ]);

  const summary = useMemo(
    () => calculateQuoteSummary(rooms, profile.settings),
    [rooms, profile.settings],
  );

  const payload = useMemo(
    () =>
      serializeQuotePayload({
        client,
        rooms,
        summary,
        settings: profile.settings,
        branding: {
          businessName: profile.businessName ?? "",
          businessEmail: profile.businessEmail ?? "",
          phone: profile.phone ?? "",
          licenseNumber: profile.licenseNumber,
          logoUrl: profile.logoUrl,
        },
      }),
    [client, profile, rooms, summary],
  );

  function updateRoom(roomId: string, updates: Partial<QuoteRoomInput>) {
    setRooms((current) =>
      current.map((room) => (room.id === roomId ? { ...room, ...updates } : room)),
    );
  }

  function addRoom(templateKey: RoomTemplateKey) {
    setRooms((current) => [...current, createRoomFromTemplate(templateKey)]);
  }

  function removeRoom(roomId: string) {
    setRooms((current) => current.filter((room) => room.id !== roomId));
  }

  return (
    <form action={createQuoteAction} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <input name="payload" type="hidden" value={payload} readOnly />

      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-5">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                Client info
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold">
                Build a new quote
              </h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["customerName", "Customer name", client.customerName],
                ["customerEmail", "Customer email", client.customerEmail],
                ["customerPhone", "Customer phone", client.customerPhone],
                ["quoteTitle", "Quote title", client.quoteTitle],
              ].map(([field, label, value]) => (
                <div className="space-y-2" key={field}>
                  <Label htmlFor={field}>{label}</Label>
                  <Input
                    id={field}
                    value={value}
                    onChange={(event) =>
                      setClient((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                  />
                </div>
              ))}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="projectAddress">Project address</Label>
                <Input
                  id="projectAddress"
                  value={client.projectAddress}
                  onChange={(event) =>
                    setClient((current) => ({
                      ...current,
                      projectAddress: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quoteValidDays">Quote valid for (days)</Label>
                <Input
                  id="quoteValidDays"
                  type="number"
                  min="1"
                  value={client.quoteValidDays}
                  onChange={(event) =>
                    setClient((current) => ({
                      ...current,
                      quoteValidDays: Number(event.target.value) || 7,
                    }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes for the quote</Label>
                <Textarea
                  id="notes"
                  value={client.notes}
                  onChange={(event) =>
                    setClient((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder={QUOTE_TERMS.join(" ")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Room templates
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold">
                  Tap a room and tweak the numbers
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {TEMPLATE_KEYS.map((key) => {
                const template = key === "custom" ? CUSTOM_TEMPLATE : ROOM_TEMPLATES[key];

                return (
                  <Button
                    key={key}
                    onClick={() => addRoom(key)}
                    type="button"
                    variant="secondary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {template.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {rooms.map((room, index) => (
          <Card key={room.id}>
            <CardContent className="space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                    Room {index + 1}
                  </p>
                  <Input
                    className="mt-3 max-w-sm text-lg font-semibold"
                    value={room.name}
                    onChange={(event) =>
                      updateRoom(room.id, { name: event.target.value })
                    }
                  />
                  <p className="mt-3 text-sm text-[var(--muted)]">{room.note}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeRoom(room.id)}
                  disabled={rooms.length === 1}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[
                  ["defaultWallSqFt", "Wall sq ft", room.defaultWallSqFt],
                  ["defaultCeilingSqFt", "Ceiling sq ft", room.defaultCeilingSqFt],
                  ["trimLinearFeet", "Trim linear ft", room.trimLinearFeet],
                  ["doorCount", "Doors", room.doorCount],
                  ["windowCount", "Windows", room.windowCount],
                  ["length", "Length (optional)", room.length ?? ""],
                  ["width", "Width (optional)", room.width ?? ""],
                  ["height", "Height (optional)", room.height ?? ""],
                ].map(([field, label, value]) => (
                  <div className="space-y-2" key={field}>
                    <Label htmlFor={`${room.id}-${field}`}>{label}</Label>
                    <Input
                      id={`${room.id}-${field}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={value}
                      onChange={(event) =>
                        updateRoom(room.id, {
                          [field]:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        } as Partial<QuoteRoomInput>)
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {[
                  { field: "includeCeiling", label: "Include ceiling", checked: room.includeCeiling },
                  {
                    field: "paintDoors",
                    label: "Paint doors as separate line item",
                    checked: room.paintDoors,
                  },
                  {
                    field: "paintWindows",
                    label: "Paint windows as separate line item",
                    checked: room.paintWindows,
                  },
                  {
                    field: "heavyPrep",
                    label: "Heavy prep (+50% prep hours)",
                    checked: room.heavyPrep,
                  },
                ].map((toggle) => (
                  <label
                    className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-medium"
                    key={toggle.field}
                  >
                    <span>{toggle.label}</span>
                    <input
                      checked={toggle.checked}
                      className="h-4 w-4 accent-[var(--brand)]"
                      onChange={(event) =>
                        updateRoom(room.id, {
                          [toggle.field]: event.target.checked,
                        } as Partial<QuoteRoomInput>)
                      }
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Live totals
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Wall gallons</span>
                <span>{formatNumber(summary.wallGallons)}</span>
              </div>
              <div className="flex justify-between">
                <span>Trim gallons</span>
                <span>{formatNumber(summary.trimGallons)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total labor hours</span>
                <span>{formatNumber(summary.laborHours)}</span>
              </div>
              <div className="flex justify-between">
                <span>Labor total</span>
                <span>{formatCurrency(summary.laborTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Materials total</span>
                <span>{formatCurrency(summary.materialsTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(summary.taxTotal)}</span>
              </div>
            </div>
            <div className="rounded-[24px] bg-[var(--brand-soft)] p-4">
              <p className="text-sm text-[var(--brand-strong)]">Grand total</p>
              <p className="mt-2 font-display text-4xl font-bold text-[var(--brand-strong)]">
                {formatCurrency(summary.grandTotal)}
              </p>
              {summary.minimumApplied ? (
                <p className="mt-2 text-sm text-[var(--brand-strong)]">
                  Minimum job charge applied.
                </p>
              ) : null}
            </div>
            <Button className="w-full" size="lg" type="submit">
              Save Quote and Open PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
