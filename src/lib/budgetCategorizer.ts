import { type BudgetCategory } from "@prisma/client";

// Define enum values for development use
const BudgetCategoryValues = {
  MECHANICAL: 'MECHANICAL' as BudgetCategory,
  ELECTRICAL: 'ELECTRICAL' as BudgetCategory,
  SYSTEMS: 'SYSTEMS' as BudgetCategory,
  SOFTWARE: 'SOFTWARE' as BudgetCategory,
  OTHER: 'OTHER' as BudgetCategory,
};

interface CategoryRule {
  category: BudgetCategory;
  keywords: string[];
  units?: string[];
  priority: number; // Higher number = higher priority
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: BudgetCategoryValues.MECHANICAL,
    keywords: [
      // Parts & Components
      "bearing", "shaft", "bracket", "housing", "gear", "weld", "cnc", "plate", "bolt", "nut", "washer",
      "screw", "spring", "gasket", "seal", "o-ring", "bushing", "coupling", "pulley", "belt", "chain",
      // Materials
      "steel", "aluminum", "aluminium", "brass", "copper", "titanium", "plastic", "rubber", "carbon",
      "stainless", "alloy", "metal", "sheet", "bar", "rod", "tube", "pipe", "wire", "cable",
      // Processes
      "machining", "welding", "grinding", "drilling", "milling", "turning", "stamping", "forging",
      "casting", "fabrication", "assembly", "coating", "anodizing", "plating",
      // Tools
      "wrench", "spanner", "socket", "drill", "bit", "tap", "die", "reamer", "punch", "chisel"
    ],
    units: ["mm", "cm", "m", "inch", "ft", "kg", "lb", "ton", "pcs", "pc", "piece", "set"],
    priority: 3
  },
  {
    category: BudgetCategoryValues.ELECTRICAL,
    keywords: [
      // Components
      "wire", "cable", "pcb", "connector", "harness", "sensor", "relay", "fuse", "resistor", "capacitor",
      "inductor", "diode", "led", "transistor", "mosfet", "ic", "chip", "microcontroller", "arduino",
      "raspberry", "breadboard", "stripboard", "terminal", "switch", "button", "potentiometer",
      // Power
      "battery", "power supply", "adapter", "charger", "inverter", "converter", "transformer",
      "voltage", "current", "amp", "volt", "watt", "ohm", "farad", "henry",
      // Cables & Wiring
      "ethernet", "usb", "hdmi", "vga", "coax", "fiber", "optical", "twisted pair", "shielded",
      "awg", "gauge", "strand", "solid", "multi-core",
      // Tools & Equipment
      "multimeter", "oscilloscope", "soldering", "crimping", "stripping", "heat shrink"
    ],
    units: ["awg", "v", "a", "w", "ohm", "f", "h", "mah", "wh", "pcs", "pc", "piece", "m", "ft"],
    priority: 3
  },
  {
    category: BudgetCategoryValues.SYSTEMS,
    keywords: [
      // Control Systems
      "controller", "ecu", "actuator", "servo", "stepper", "motor", "drive", "encoder", "resolver",
      "plc", "hmi", "scada", "pid", "feedback", "control", "automation", "robotic", "pneumatic",
      "hydraulic", "valve", "cylinder", "pump", "compressor",
      // Integration
      "embedded", "firmware", "microprocessor", "fpga", "dsp", "real-time", "rtos", "can bus",
      "modbus", "ethernet", "profinet", "devicenet", "fieldbus", "protocol", "interface",
      // Sensors & Monitoring
      "temperature", "pressure", "flow", "level", "proximity", "photoelectric", "ultrasonic",
      "laser", "vision", "camera", "encoder", "accelerometer", "gyroscope", "gps", "rtk"
    ],
    units: ["rpm", "hz", "bar", "psi", "gpm", "lpm", "cfm", "°c", "°f", "pcs", "pc", "piece", "set"],
    priority: 3
  },
  {
    category: BudgetCategoryValues.SOFTWARE,
    keywords: [
      // Software Types
      "license", "subscription", "software", "saas", "api", "sdk", "framework", "library",
      "application", "app", "program", "tool", "utility", "driver", "plugin", "extension",
      // Development
      "development", "programming", "coding", "ide", "compiler", "debugger", "version control",
      "git", "repository", "database", "mysql", "postgresql", "mongodb", "redis", "cloud",
      // Services
      "hosting", "domain", "ssl", "certificate", "backup", "storage", "cdn", "analytics",
      "monitoring", "logging", "support", "maintenance", "training", "documentation"
    ],
    units: ["user", "users", "month", "year", "gb", "tb", "req", "requests", "license", "seat"],
    priority: 2
  }
];

const UNIT_HINTS: Record<string, BudgetCategory[]> = {
  // Mechanical units
  "mm": [BudgetCategoryValues.MECHANICAL],
  "cm": [BudgetCategoryValues.MECHANICAL],
  "inch": [BudgetCategoryValues.MECHANICAL],
  "kg": [BudgetCategoryValues.MECHANICAL],
  "lb": [BudgetCategoryValues.MECHANICAL],

  // Electrical units
  "awg": [BudgetCategoryValues.ELECTRICAL],
  "v": [BudgetCategoryValues.ELECTRICAL],
  "volt": [BudgetCategoryValues.ELECTRICAL],
  "a": [BudgetCategoryValues.ELECTRICAL],
  "amp": [BudgetCategoryValues.ELECTRICAL],
  "w": [BudgetCategoryValues.ELECTRICAL],
  "watt": [BudgetCategoryValues.ELECTRICAL],
  "ohm": [BudgetCategoryValues.ELECTRICAL],
  "f": [BudgetCategoryValues.ELECTRICAL],
  "farad": [BudgetCategoryValues.ELECTRICAL],
  "mah": [BudgetCategoryValues.ELECTRICAL],
  "wh": [BudgetCategoryValues.ELECTRICAL],

  // Systems units
  "rpm": [BudgetCategoryValues.SYSTEMS],
  "hz": [BudgetCategoryValues.SYSTEMS],
  "bar": [BudgetCategoryValues.SYSTEMS],
  "psi": [BudgetCategoryValues.SYSTEMS],
  "gpm": [BudgetCategoryValues.SYSTEMS],
  "lpm": [BudgetCategoryValues.SYSTEMS],
  "cfm": [BudgetCategoryValues.SYSTEMS],

  // Software units
  "user": [BudgetCategoryValues.SOFTWARE],
  "users": [BudgetCategoryValues.SOFTWARE],
  "seat": [BudgetCategoryValues.SOFTWARE],
  "license": [BudgetCategoryValues.SOFTWARE],
  "gb": [BudgetCategoryValues.SOFTWARE],
  "tb": [BudgetCategoryValues.SOFTWARE],
};

export function categorizeBudgetItem(
  name: string,
  unit?: string | null,
  supplier?: string | null,
  notes?: string | null
): BudgetCategory {
  const text = [name, unit, supplier, notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const scores: Record<BudgetCategory, number> = {
    [BudgetCategoryValues.MECHANICAL]: 0,
    [BudgetCategoryValues.ELECTRICAL]: 0,
    [BudgetCategoryValues.SYSTEMS]: 0,
    [BudgetCategoryValues.SOFTWARE]: 0,
    [BudgetCategoryValues.OTHER]: 0,
  };

  // Score based on keyword matches
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) {
        scores[rule.category] += rule.priority;
      }
    }

    // Score based on unit matches
    if (unit && rule.units) {
      const unitLower = unit.toLowerCase();
      if (rule.units.some(u => unitLower.includes(u))) {
        scores[rule.category] += rule.priority;
      }
    }
  }

  // Additional scoring based on unit hints
  if (unit) {
    const unitLower = unit.toLowerCase();
    for (const [unitHint, categories] of Object.entries(UNIT_HINTS)) {
      if (unitLower.includes(unitHint)) {
        for (const category of categories) {
          scores[category] += 1;
        }
      }
    }
  }

  // Find the category with the highest score
  const maxScore = Math.max(...Object.values(scores));

  if (maxScore === 0) {
    return BudgetCategoryValues.OTHER;
  }

  // Return the first category with the max score
  for (const [category, score] of Object.entries(scores)) {
    if (score === maxScore) {
      return category as BudgetCategory;
    }
  }

  return BudgetCategoryValues.OTHER;
}

// Helper function to get human-readable category labels
export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  [BudgetCategoryValues.MECHANICAL]: "Mechanical",
  [BudgetCategoryValues.ELECTRICAL]: "Electrical",
  [BudgetCategoryValues.SYSTEMS]: "Systems",
  [BudgetCategoryValues.SOFTWARE]: "Software",
  [BudgetCategoryValues.OTHER]: "Other",
};

// Helper function to get category colors for charts
export const BUDGET_CATEGORY_COLORS: Record<BudgetCategory, string> = {
  [BudgetCategoryValues.MECHANICAL]: "#3B82F6", // Blue
  [BudgetCategoryValues.ELECTRICAL]: "#F59E0B", // Amber
  [BudgetCategoryValues.SYSTEMS]: "#10B981", // Emerald
  [BudgetCategoryValues.SOFTWARE]: "#8B5CF6", // Violet
  [BudgetCategoryValues.OTHER]: "#6B7280", // Gray
};

export const BUDGET_CATEGORY_OPTIONS = Object.values(BudgetCategoryValues).map(value => ({
  value,
  label: BUDGET_CATEGORY_LABELS[value],
}));