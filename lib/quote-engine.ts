import { CUSTOM_TEMPLATE, INDUSTRY_ASSUMPTIONS, QUOTE_TERMS, ROOM_TEMPLATES } from "@/lib/constants";
import type {
  CalculatedRoom,
  ProfileSettings,
  QuoteDraftPayload,
  QuoteRoomInput,
  QuoteSummary,
  RoomTemplate,
  RoomTemplateKey,
} from "@/lib/types";
import { roundQuarterUp } from "@/lib/utils";

function getTemplate(templateKey: RoomTemplateKey): RoomTemplate {
  if (templateKey === "custom") {
    return CUSTOM_TEMPLATE;
  }

  return ROOM_TEMPLATES[templateKey];
}

function getWallArea(room: QuoteRoomInput) {
  if (room.length && room.width && room.height) {
    return 2 * (room.length + room.width) * room.height;
  }

  return room.defaultWallSqFt;
}

function getCeilingArea(room: QuoteRoomInput) {
  if (!room.includeCeiling) {
    return 0;
  }

  if (room.length && room.width) {
    return room.length * room.width;
  }

  return room.defaultCeilingSqFt;
}

export function createRoomFromTemplate(templateKey: RoomTemplateKey): QuoteRoomInput {
  const template = getTemplate(templateKey);

  return {
    id: crypto.randomUUID(),
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

export function calculateQuoteSummary(
  rooms: QuoteRoomInput[],
  settings: ProfileSettings,
): QuoteSummary {
  const calculatedRooms: CalculatedRoom[] = rooms.map((room) => {
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
  });

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
    wallGallons,
    trimGallons,
    totalGallons: wallGallons + trimGallons,
    laborHours,
    laborTotal,
    materialBaseTotal,
    materialsTotal,
    subtotalBeforeMinimum,
    subtotal,
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
