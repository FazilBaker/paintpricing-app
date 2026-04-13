import type { ProfileSettings, RoomTemplate, RoomTemplateKey } from "@/lib/types";

export const FREE_QUOTES_LIMIT = 3;
export const LIFETIME_DEAL_LIMIT = 50;
export const LIFETIME_DEAL_PRICE = 249;

export const DEFAULT_SETTINGS: ProfileSettings = {
  hourlyLaborRate: 45,
  paintCostPerGallon: 50,
  wallCoverageSqFtPerGallon: 375,
  trimCoverageSqFtPerGallon: 250,
  defaultCoats: 2,
  materialMarkupPercent: 40,
  taxPercent: 0,
  minimumJobCharge: 0,
};

export const INDUSTRY_ASSUMPTIONS = {
  doorDeductionSqFt: 20,
  windowDeductionSqFt: 15,
  wallProductionSqFtPerHour: 200,
  trimLinearFeetPerHour: 100,
  prepHoursPer100SqFt: 0.75,
  cleanupHoursPerQuote: 0.5,
  doorUnitsPerHour: 8,
  windowUnitsPerHour: 10,
  trimPaintAreaPerLinearFoot: 0.5,
};

export const ROOM_TEMPLATES: Record<Exclude<RoomTemplateKey, "custom">, RoomTemplate> = {
  "living-room": {
    key: "living-room",
    label: "Living Room",
    defaultWallSqFt: 420,
    defaultCeilingSqFt: 240,
    defaultTrimLinearFeet: 60,
    defaultDoorCount: 4,
    defaultWindowCount: 3,
    ceilingIncluded: true,
    note: "Best for large open common areas.",
  },
  "master-bedroom": {
    key: "master-bedroom",
    label: "Master Bedroom",
    defaultWallSqFt: 380,
    defaultCeilingSqFt: 210,
    defaultTrimLinearFeet: 48,
    defaultDoorCount: 2,
    defaultWindowCount: 2,
    ceilingIncluded: true,
    note: "Primary bedrooms with closets or bath access.",
  },
  "standard-bedroom": {
    key: "standard-bedroom",
    label: "Standard Bedroom",
    defaultWallSqFt: 320,
    defaultCeilingSqFt: 160,
    defaultTrimLinearFeet: 44,
    defaultDoorCount: 1,
    defaultWindowCount: 2,
    ceilingIncluded: true,
    note: "Guest rooms, kids rooms, or offices.",
  },
  kitchen: {
    key: "kitchen",
    label: "Kitchen",
    defaultWallSqFt: 280,
    defaultCeilingSqFt: 120,
    defaultTrimLinearFeet: 55,
    defaultDoorCount: 1,
    defaultWindowCount: 1,
    ceilingIncluded: false,
    note: "Cabinets excluded from v1. Trim is usually heavier here.",
    heavyTrim: true,
  },
  bathroom: {
    key: "bathroom",
    label: "Bathroom",
    defaultWallSqFt: 180,
    defaultCeilingSqFt: 64,
    defaultTrimLinearFeet: 30,
    defaultDoorCount: 1,
    defaultWindowCount: 0,
    ceilingIncluded: true,
    note: "Moisture-resistant paint often applies.",
    moistureFlag: true,
  },
  hallway: {
    key: "hallway",
    label: "Hallway",
    defaultWallSqFt: 240,
    defaultCeilingSqFt: 90,
    defaultTrimLinearFeet: 70,
    defaultDoorCount: 3,
    defaultWindowCount: 0,
    ceilingIncluded: true,
    note: "Long trim runs and lots of door casing.",
  },
};

export const CUSTOM_TEMPLATE: RoomTemplate = {
  key: "custom",
  label: "Custom Room",
  defaultWallSqFt: 300,
  defaultCeilingSqFt: 144,
  defaultTrimLinearFeet: 40,
  defaultDoorCount: 1,
  defaultWindowCount: 1,
  ceilingIncluded: true,
  note: "Start from a blank room and tweak everything.",
};

export const QUOTE_TERMS = [
  "Quote valid for 7 days from issue date.",
  "Pricing is based on visible conditions at the time of estimating.",
  "Uncovered repairs, water damage, or change requests are billed separately.",
];

export const BILLING_COPY = {
  monthlyPrice: 29,
  yearlyPrice: 299,
  yearlySavings: 49,
  lifetimePrice: LIFETIME_DEAL_PRICE,
  lifetimeSeats: LIFETIME_DEAL_LIMIT,
};
