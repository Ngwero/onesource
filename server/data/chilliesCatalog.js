/**
 * Chillies and Peppers category — product catalogue for seed-chillies.js
 */
export const CHILLIES_CATEGORY_ID = "chillies-and-peppers";

export const CHILLIES_CATEGORY = {
  id: CHILLIES_CATEGORY_ID,
  name: "Chillies and Peppers",
  icon: "🌶️",
  group: "produce",
};

/** @type {{ section: string, name: string, unit: string }[]} */
export const CHILLIES_PRODUCTS = [
  // 1. Fresh Chillies
  { section: "Fresh Chillies", name: "Red Chillies", unit: "per kg" },
  { section: "Fresh Chillies", name: "Green Chillies", unit: "per kg" },
  { section: "Fresh Chillies", name: "Bird's Eye Chilli", unit: "per kg" },
  { section: "Fresh Chillies", name: "Thai Chilli", unit: "per kg" },
  { section: "Fresh Chillies", name: "Piri Piri / Peri-Peri Chilli", unit: "per kg" },
  { section: "Fresh Chillies", name: "Cayenne Chilli", unit: "per kg" },
  { section: "Fresh Chillies", name: "Jalapeño", unit: "per pack" },
  { section: "Fresh Chillies", name: "Serrano Pepper", unit: "per kg" },
  { section: "Fresh Chillies", name: "Scotch Bonnet", unit: "per kg" },
  { section: "Fresh Chillies", name: "Habanero", unit: "per kg" },
  // 2. Sweet and Mild Peppers
  { section: "Sweet and Mild Peppers", name: "Green Bell Pepper", unit: "per kg" },
  { section: "Sweet and Mild Peppers", name: "Red Bell Pepper", unit: "per kg" },
  { section: "Sweet and Mild Peppers", name: "Yellow Bell Pepper", unit: "per kg" },
  { section: "Sweet and Mild Peppers", name: "Orange Bell Pepper", unit: "per kg" },
  { section: "Sweet and Mild Peppers", name: "Banana Pepper", unit: "per kg" },
  { section: "Sweet and Mild Peppers", name: "Paprika Pepper", unit: "per kg" },
  // 3. Dried Chillies
  { section: "Dried Chillies", name: "Dried Red Chillies", unit: "per pack" },
  { section: "Dried Chillies", name: "Dried Bird's Eye Chillies", unit: "per pack" },
  { section: "Dried Chillies", name: "Dried Cayenne Chillies", unit: "per pack" },
  { section: "Dried Chillies", name: "Dried Whole Chillies", unit: "per pack" },
  { section: "Dried Chillies", name: "Sun-Dried Chillies", unit: "per pack" },
  // 4. Processed Chilli Products
  { section: "Processed Chilli Products", name: "Chilli Powder", unit: "per 100g" },
  { section: "Processed Chilli Products", name: "Chilli Flakes", unit: "per 100g" },
  { section: "Processed Chilli Products", name: "Crushed Chilli", unit: "per 100g" },
  { section: "Processed Chilli Products", name: "Chilli Paste", unit: "per jar" },
  { section: "Processed Chilli Products", name: "Chilli Sauce", unit: "per bottle" },
  { section: "Processed Chilli Products", name: "Hot Pepper Sauce", unit: "per bottle" },
  { section: "Processed Chilli Products", name: "Peri-Peri Sauce", unit: "per bottle" },
];

export function chilliesProductId(name) {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `chilli-${slug}`;
}
