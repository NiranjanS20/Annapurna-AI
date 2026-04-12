import { presetMenuItems } from "../constants/presetMenuItems";

export function getItemUnit(itemName) {
  if (!itemName) return "units";

  const found = presetMenuItems.find(
    i => i.name.toLowerCase() === itemName.toLowerCase()
  );

  return found?.unit || "units";
}
