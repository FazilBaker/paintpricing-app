"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import type { CustomField } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CustomFieldsEditorProps {
  initialFields: CustomField[];
}

export function CustomFieldsEditor({ initialFields }: CustomFieldsEditorProps) {
  const [fields, setFields] = useState<CustomField[]>(initialFields);

  function addField() {
    setFields((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "", value: "" },
    ]);
  }

  function updateField(id: string, key: "label" | "value", val: string) {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [key]: val } : f)),
    );
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="customFields"
        value={JSON.stringify(fields.filter((f) => f.label.trim() && f.value.trim()))}
        readOnly
      />

      {fields.map((field) => (
        <div key={field.id} className="flex items-start gap-2">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <Input
              placeholder="Label (e.g. Website)"
              value={field.label}
              onChange={(e) => updateField(field.id, "label", e.target.value)}
            />
            <Input
              placeholder="Value"
              value={field.value}
              onChange={(e) => updateField(field.id, "value", e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeField(field.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="secondary" size="sm" onClick={addField}>
        <Plus className="h-4 w-4" />
        Add custom field
      </Button>

      {fields.length === 0 && (
        <p className="text-sm text-[var(--muted)]">
          Add extra info to show on your quotes — website, tax ID, additional contacts, etc.
        </p>
      )}
    </div>
  );
}
