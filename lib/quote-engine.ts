import { CUSTOM_TEMPLATE, CUSTOM_EXTERIOR_TEMPLATE, EXTERIOR_TEMPLATES, INDUSTRY_ASSUMPTIONS, QUOTE_TERMS, ROOM_TEMPLATES } from "@/lib/constants";
import type {
  CalculatedRoom,
  ExteriorCalcInputs,
  ExteriorTemplate,
  ExteriorTemplateKey,
  InteriorCalcInputs,
  ProfileSettings,
  QuoteDraftPayload,
  QuoteExteriorInput,
  QuoteItem,
  QuoteRoomInput,
  QuoteSummary,
  RoomTemplate,
  RoomTemplateKey,
} from "@/lib/types";
import { roundQuarterUp } from "@/lib/utils";

// ── Interior helpers ──────────────────────────────────────

function getTemplate(templateKey: RoomTemplateKey): RoomTemplate {
  if (templateKey === "custom") {
    return CUSTOM_TEMPLATE;
  }

  return ROOM_TEMPLATES[templateKey];
}

function getWallAreaFromInputs(inputs: InteriorCalcInputs) {
  if (inputs.length && inputs.width && inputs.height) {
    return 2 * (inputs.length + inputs.width) * inputs.height;
  }
  return inputs.defaultWallSqFt;
}

function getCeilingAreaFromInputs(inputs: InteriorCalcInputs) {
  if (!inputs.includeCeiling) return 0;
  if (inputs.length && inputs.width) {
    return inputs.length * inputs.width;
  }
  return inputs.defaultCeilingSqFt;
}

/**
 * Calculate the suggested price for an interior item from calculator inputs.
 */
export function calculateInteriorSuggested(
  inputs: InteriorCalcInputs,
  settings: ProfileSettings,
): { suggestedPrice: number; scopeDescription: string } {
  const wallArea = getWallAreaFromInputs(inputs);
  const ceilingArea = getCeilingAreaFromInputs(inputs);
  const paintableWallArea = Math.max(
    wallArea -
      inputs.doorCount * INDUSTRY_ASSUMPTIONS.doorDeductionSqFt -
      inputs.windowCount * INDUSTRY_ASSUMPTIONS.windowDeductionSqFt,
    0,
  );
  const trimPaintArea =
    inputs.trimLinearFeet * INDUSTRY_ASSUMPTIONS.trimPaintAreaPerLinearFoot;
  const doorsPaintArea = inputs.paintDoors
    ? inputs.doorCount * INDUSTRY_ASSUMPTIONS.doorDeductionSqFt
    : 0;
  const windowsPaintArea = inputs.paintWindows
    ? inputs.windowCount * INDUSTRY_ASSUMPTIONS.windowDeductionSqFt
    : 0;

  const wallGallons = roundQuarterUp(
    ((paintableWallArea + ceilingArea) /
      settings.wallCoverageSqFtPerGallon) *
      settings.defaultCoats,
  );
  const trimGallons = roundQuarterUp(
    ((trimPaintArea + doorsPaintArea + windowsPaintArea) /
      settings.trimCoverageSqFtPerGallon) *
      settings.defaultCoats,
  );

  const wallLaborHours =
    (paintableWallArea + ceilingArea) / INDUSTRY_ASSUMPTIONS.wallProductionSqFtPerHour;
  const trimLaborHours =
    inputs.trimLinearFeet / INDUSTRY_ASSUMPTIONS.trimLinearFeetPerHour;
  const doorLaborHours = inputs.paintDoors
    ? inputs.doorCount / INDUSTRY_ASSUMPTIONS.doorUnitsPerHour
    : 0;
  const windowLaborHours = inputs.paintWindows
    ? inputs.windowCount / INDUSTRY_ASSUMPTIONS.windowUnitsPerHour
    : 0;
  const prepBaseHours =
    (wallArea / 100) * INDUSTRY_ASSUMPTIONS.prepHoursPer100SqFt;
  const prepHours = inputs.heavyPrep ? prepBaseHours * 1.5 : prepBaseHours;

  const materialCost =
    (wallGallons + trimGallons) * settings.paintCostPerGallon;
  const materialSell =
    materialCost * (1 + settings.materialMarkupPercent / 100);
  const laborHours =
    wallLaborHours + trimLaborHours + doorLaborHours + windowLaborHours + prepHours;
  const suggestedPrice = materialSell + laborHours * settings.hourlyLaborRate;

  // Auto-generate scope description
  const parts: string[] = [];
  parts.push(`Walls (${Math.round(paintableWallArea)} sq ft)`);
  if (ceilingArea > 0) parts.push(`ceiling`);
  if (inputs.trimLinearFeet > 0) parts.push(`trim (${Math.round(inputs.trimLinearFeet)} lin ft)`);
  if (inputs.paintDoors && inputs.doorCount > 0) parts.push(`${inputs.doorCount} door${inputs.doorCount > 1 ? "s" : ""}`);
  if (inputs.paintWindows && inputs.windowCount > 0) parts.push(`${inputs.windowCount} window${inputs.windowCount > 1 ? "s" : ""}`);
  if (inputs.heavyPrep) parts.push("heavy prep");
  const scopeDescription = `Paint ${parts.join(", ")}. ${settings.defaultCoats} coats.`;

  return { suggestedPrice, scopeDescription };
}

// ── Exterior helpers ──────────────────────────────────────

function getExteriorTemplate(key: ExteriorTemplateKey): ExteriorTemplate {
  if (key === "custom-exterior") {
    return CUSTOM_EXTERIOR_TEMPLATE;
  }
  return EXTERIOR_TEMPLATES[key];
}

/**
 * Calculate the suggested price for an exterior item from calculator inputs.
 */
export function calculateExteriorSuggested(
  inputs: ExteriorCalcInputs,
  templateKey: ExteriorTemplateKey,
  settings: ProfileSettings,
): { suggestedPrice: number; scopeDescription: string } {
  const template = getExteriorTemplate(templateKey);

  const gallons = roundQuarterUp(
    (inputs.sqFt / template.coverageSqFtPerGallon) * inputs.coats,
  );

  const productionRate = inputs.useSpray
    ? template.productionSqFtPerHourSpray
    : template.productionSqFtPerHourBrush;
  const paintHours = inputs.sqFt / productionRate;

  const prepBaseHours =
    (inputs.sqFt / 100) * INDUSTRY_ASSUMPTIONS.prepHoursPer100SqFt * INDUSTRY_ASSUMPTIONS.exteriorPrepMultiplier;
  const prepHours = inputs.heavyPrep ? prepBaseHours * 1.5 : prepBaseHours;

  const laborHours = paintHours + prepHours;
  const materialCost = gallons * settings.paintCostPerGallon;
  const materialSell = materialCost * (1 + settings.materialMarkupPercent / 100);
  const suggestedPrice = materialSell + laborHours * settings.hourlyLaborRate;

  const parts: string[] = [];
  parts.push(`${Math.round(inputs.sqFt)} sq ft`);
  if (inputs.useSpray) parts.push("spray application");
  else parts.push("brush/roll application");
  if (inputs.heavyPrep) parts.push("heavy prep (scrape, prime, caulk)");
  const scopeDescription = `${template.label}: ${parts.join(", ")}. ${inputs.coats} coats.`;

  return { suggestedPrice, scopeDescription };
}

// ── Create items from templates ──────────────────────────

export function createInteriorItem(templateKey: RoomTemplateKey, settings: ProfileSettings): QuoteItem {
  const template = getTemplate(templateKey);
  const inputs: InteriorCalcInputs = {
    defaultWallSqFt: template.defaultWallSqFt,
    defaultCeilingSqFt: template.defaultCeilingSqFt,
    includeCeiling: template.ceilingIncluded,
    trimLinearFeet: template.defaultTrimLinearFeet,
    doorCount: template.defaultDoorCount,
    windowCount: template.defaultWindowCount,
    paintDoors: false,
    paintWindows: false,
    heavyPrep: false,
    moistureFlag: template.moistureFlag,
  };

  const { suggestedPrice, scopeDescription } = calculateInteriorSuggested(inputs, settings);

  return {
    id: crypto.randomUUID(),
    type: "interior",
    templateKey,
    name: template.label,
    price: Math.round(suggestedPrice),
    suggestedPrice: Math.round(suggestedPrice),
    scopeDescription,
    paintColor: "",
    note: "",
    interiorInputs: inputs,
    exteriorInputs: null,
  };
}

export function createExteriorItem(templateKey: ExteriorTemplateKey, settings: ProfileSettings): QuoteItem {
  const template = getExteriorTemplate(templateKey);
  const inputs: ExteriorCalcInputs = {
    sqFt: template.defaultSqFt,
    coats: template.defaultCoats,
    useSpray: false,
    heavyPrep: false,
  };

  const { suggestedPrice, scopeDescription } = calculateExteriorSuggested(inputs, templateKey, settings);

  return {
    id: crypto.randomUUID(),
    type: "exterior",
    templateKey: templateKey,
    name: template.label,
    price: Math.round(suggestedPrice),
    suggestedPrice: Math.round(suggestedPrice),
    scopeDescription,
    paintColor: "",
    note: "",
    interiorInputs: null,
    exteriorInputs: inputs,
  };
}

export function createCustomItem(): QuoteItem {
  return {
    id: crypto.randomUUID(),
    type: "custom",
    templateKey: null,
    name: "",
    price: 0,
    suggestedPrice: 0,
    scopeDescription: "",
    paintColor: "",
    note: "",
    interiorInputs: null,
    exteriorInputs: null,
  };
}

export function duplicateItem(item: QuoteItem): QuoteItem {
  return {
    ...item,
    id: crypto.randomUUID(),
    name: `${item.name} (copy)`,
    interiorInputs: item.interiorInputs ? { ...item.interiorInputs } : null,
    exteriorInputs: item.exteriorInputs ? { ...item.exteriorInputs } : null,
  };
}

// ── Summary calculation (new unified) ─────────────────────

export function calculateItemsSummary(
  items: QuoteItem[],
  settings: ProfileSettings,
  discount: { type: "flat" | "percent"; value: number } = { type: "flat", value: 0 },
): QuoteSummary {
  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + item.price, 0);
  const subtotal = Math.max(subtotalBeforeDiscount, settings.minimumJobCharge);
  const minimumApplied = subtotal > subtotalBeforeDiscount;

  let discountAmount = 0;
  if (discount.value > 0) {
    if (discount.type === "percent") {
      discountAmount = subtotal * (discount.value / 100);
    } else {
      discountAmount = discount.value;
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxTotal = afterDiscount * (settings.taxPercent / 100);
  const grandTotal = afterDiscount + taxTotal;

  return {
    rooms: [], // legacy — empty for new quotes
    items,
    wallGallons: 0,
    trimGallons: 0,
    totalGallons: 0,
    laborHours: 0,
    laborTotal: 0,
    materialBaseTotal: 0,
    materialsTotal: 0,
    subtotalBeforeMinimum: subtotalBeforeDiscount,
    subtotal,
    discount: discountAmount,
    taxTotal,
    grandTotal,
    minimumApplied,
  };
}

// ── Legacy functions (kept for backward compat with existing quotes) ──

/** @deprecated Use createInteriorItem instead */
export function createRoomFromTemplate(templateKey: RoomTemplateKey): QuoteRoomInput {
  const template = getTemplate(templateKey);

  return {
    id: crypto.randomUUID(),
    scope: "interior",
    templateKey,
    name: template.label,
    defaultWallSqFt: template.defaultWallSqFt,
    defaultCeilingSqFt: template.defaultCeilingSqFt,
    includeCeiling: template.ceilingIncluded,
    trimLinearFeet: template.defaultTrimLinearFeet,
    doorCount: template.defaultDoorCount,
    windowCount: template.defaultWindowCount,
    paintDoors: false,
    paintWindows: false,
    heavyPrep: false,
    note: template.note,
    moistureFlag: template.moistureFlag,
  };
}

/** @deprecated Use createExteriorItem instead */
export function createExteriorFromTemplate(templateKey: ExteriorTemplateKey): QuoteExteriorInput {
  const template = getExteriorTemplate(templateKey);

  return {
    id: crypto.randomUUID(),
    scope: "exterior",
    templateKey,
    name: template.label,
    sqFt: template.defaultSqFt,
    coats: template.defaultCoats,
    useSpray: false,
    heavyPrep: false,
    note: template.note,
  };
}

function getWallArea(room: QuoteRoomInput) {
  if (room.length && room.width && room.height) {
    return 2 * (room.length + room.width) * room.height;
  }
  return room.defaultWallSqFt;
}

function getCeilingArea(room: QuoteRoomInput) {
  if (!room.includeCeiling) return 0;
  if (room.length && room.width) {
    return room.length * room.width;
  }
  return room.defaultCeilingSqFt;
}

function calculateInteriorRoom(
  room: QuoteRoomInput,
  settings: ProfileSettings,
): CalculatedRoom {
  const wallArea = getWallArea(room);
  const ceilingArea = getCeilingArea(room);
  const paintableWallArea = Math.max(
    wallArea -
      room.doorCount * INDUSTRY_ASSUMPTIONS.doorDeductionSqFt -
      room.windowCount * INDUSTRY_ASSUMPTIONS.windowDeductionSqFt,
    0,
  );
  const trimPaintArea =
    room.trimLinearFeet * INDUSTRY_ASSUMPTIONS.trimPaintAreaPerLinearFoot;
  const doorsPaintArea = room.paintDoors
    ? room.doorCount * INDUSTRY_ASSUMPTIONS.doorDeductionSqFt
    : 0;
  const windowsPaintArea = room.paintWindows
    ? room.windowCount * INDUSTRY_ASSUMPTIONS.windowDeductionSqFt
    : 0;

  const wallGallons = roundQuarterUp(
    ((paintableWallArea + ceilingArea) /
      settings.wallCoverageSqFtPerGallon) *
      settings.defaultCoats,
  );
  const trimGallons = roundQuarterUp(
    ((trimPaintArea + doorsPaintArea + windowsPaintArea) /
      settings.trimCoverageSqFtPerGallon) *
      settings.defaultCoats,
  );

  const wallLaborHours =
    (paintableWallArea + ceilingArea) / INDUSTRY_ASSUMPTIONS.wallProductionSqFtPerHour;
  const trimLaborHours =
    room.trimLinearFeet / INDUSTRY_ASSUMPTIONS.trimLinearFeetPerHour;
  const doorLaborHours = room.paintDoors
    ? room.doorCount / INDUSTRY_ASSUMPTIONS.doorUnitsPerHour
    : 0;
  const windowLaborHours = room.paintWindows
    ? room.windowCount / INDUSTRY_ASSUMPTIONS.windowUnitsPerHour
    : 0;
  const prepBaseHours =
    (wallArea / 100) * INDUSTRY_ASSUMPTIONS.prepHoursPer100SqFt;
  const prepHours = room.heavyPrep ? prepBaseHours * 1.5 : prepBaseHours;

  const materialCost =
    (wallGallons + trimGallons) * settings.paintCostPerGallon;
  const materialSell =
    materialCost * (1 + settings.materialMarkupPercent / 100);
  const laborHours =
    wallLaborHours + trimLaborHours + doorLaborHours + windowLaborHours + prepHours;
  const roomSubtotal = materialSell + laborHours * settings.hourlyLaborRate;

  return {
    id: room.id,
    name: room.name,
    scope: "interior",
    templateKey: room.templateKey,
    wallArea,
    ceilingArea,
    paintableWallArea,
    trimPaintArea,
    doorsPaintArea,
    windowsPaintArea,
    wallGallons,
    trimGallons,
    laborHours,
    materialCost,
    materialSell,
    roomSubtotal,
    note: room.note,
    moistureFlag: room.moistureFlag,
  };
}

function calculateExteriorItem(
  item: QuoteExteriorInput,
  settings: ProfileSettings,
): CalculatedRoom {
  const template = getExteriorTemplate(item.templateKey);

  const gallons = roundQuarterUp(
    (item.sqFt / template.coverageSqFtPerGallon) * item.coats,
  );

  const productionRate = item.useSpray
    ? template.productionSqFtPerHourSpray
    : template.productionSqFtPerHourBrush;
  const paintHours = item.sqFt / productionRate;

  const prepBaseHours =
    (item.sqFt / 100) * INDUSTRY_ASSUMPTIONS.prepHoursPer100SqFt * INDUSTRY_ASSUMPTIONS.exteriorPrepMultiplier;
  const prepHours = item.heavyPrep ? prepBaseHours * 1.5 : prepBaseHours;

  const laborHours = paintHours + prepHours;
  const materialCost = gallons * settings.paintCostPerGallon;
  const materialSell = materialCost * (1 + settings.materialMarkupPercent / 100);
  const roomSubtotal = materialSell + laborHours * settings.hourlyLaborRate;

  return {
    id: item.id,
    name: item.name,
    scope: "exterior",
    templateKey: item.templateKey,
    wallArea: item.sqFt,
    ceilingArea: 0,
    paintableWallArea: item.sqFt,
    trimPaintArea: 0,
    doorsPaintArea: 0,
    windowsPaintArea: 0,
    wallGallons: gallons,
    trimGallons: 0,
    laborHours,
    materialCost,
    materialSell,
    roomSubtotal,
    note: item.note,
  };
}

/** @deprecated Use calculateItemsSummary instead */
export function calculateQuoteSummary(
  rooms: QuoteRoomInput[],
  settings: ProfileSettings,
  exteriorItems: QuoteExteriorInput[] = [],
): QuoteSummary {
  const interiorCalc: CalculatedRoom[] = rooms.map((room) =>
    calculateInteriorRoom(room, settings),
  );

  const exteriorCalc: CalculatedRoom[] = exteriorItems.map((item) =>
    calculateExteriorItem(item, settings),
  );

  const calculatedRooms = [...interiorCalc, ...exteriorCalc];

  const wallGallons = calculatedRooms.reduce((sum, room) => sum + room.wallGallons, 0);
  const trimGallons = calculatedRooms.reduce((sum, room) => sum + room.trimGallons, 0);
  const materialBaseTotal = calculatedRooms.reduce(
    (sum, room) => sum + room.materialCost,
    0,
  );
  const materialsTotal = calculatedRooms.reduce(
    (sum, room) => sum + room.materialSell,
    0,
  );
  const roomLaborHours = calculatedRooms.reduce(
    (sum, room) => sum + room.laborHours,
    0,
  );
  const laborHours = roomLaborHours + INDUSTRY_ASSUMPTIONS.cleanupHoursPerQuote;
  const laborTotal = laborHours * settings.hourlyLaborRate;
  const subtotalBeforeMinimum = laborTotal + materialsTotal;
  const subtotal = Math.max(subtotalBeforeMinimum, settings.minimumJobCharge);
  const taxTotal = subtotal * (settings.taxPercent / 100);

  return {
    rooms: calculatedRooms,
    items: [],
    wallGallons,
    trimGallons,
    totalGallons: wallGallons + trimGallons,
    laborHours,
    laborTotal,
    materialBaseTotal,
    materialsTotal,
    subtotalBeforeMinimum,
    subtotal,
    discount: 0,
    taxTotal,
    grandTotal: subtotal + taxTotal,
    minimumApplied: subtotal > subtotalBeforeMinimum,
  };
}

export function serializeQuotePayload(payload: QuoteDraftPayload) {
  return JSON.stringify(payload);
}

export function buildDefaultTerms(extraNotes: string) {
  return [QUOTE_TERMS.join(" "), extraNotes].filter(Boolean).join("\n\n");
}
