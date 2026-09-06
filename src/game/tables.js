import { TABLE as DRAGONS_LAIR } from "./constants.js";

// Table catalogue for the table-select screen. Only Dragon's Lair is
// playable right now; the rest are locked/buyable placeholders so the
// "buy new tables" shape is visible before more tables are built.
export const TABLES = [
  { ...DRAGONS_LAIR, price: 0, playable: true },
  {
    id: "wizards-tower",
    name: "Wizard's Tower",
    price: 199,
    playable: false,
    colors: { playfield: 0x14162e, bumperLit: 0x7c5cff, rail: 0xa78bfa },
  },
  {
    id: "ancient-ruins",
    name: "Ancient Ruins",
    price: 199,
    playable: false,
    colors: { playfield: 0x1c2418, bumperLit: 0x7cbf5a, rail: 0xa3b18a },
  },
];

export function getTable(id) {
  return TABLES.find((table) => table.id === id) ?? TABLES[0];
}
