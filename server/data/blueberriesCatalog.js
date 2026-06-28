import { unsplashImage } from "./bulkCatalog.js";

export const BLUEBERRIES_CATEGORY_ID = "fresh-fruits";

const PHOTOS = [
  "1498557850523-fd3d118b962e",
  "1464965911861-746a04b4bca6",
  "1518977676601-b53f82aba655",
  "1603833660818-4e1477a4c4d7",
  "1619546819796-9d9777d80269",
  "1622206151226-18ca2c9ab4a1",
];

/** Twenty blueberry SKUs — replaces Garden Sprayer bulk rows + expands the range. */
export const BLUEBERRY_PRODUCTS = [
  { id: "12", name: "Blueberries – 150g", unit: "per 150g", photo: 0 },
  { id: "bulk-farm-inputs-002", name: "Blueberries – Premium 250g", unit: "per 250g", photo: 1 },
  { id: "bulk-farm-inputs-004", name: "Blueberries – Organic 200g", unit: "per 200g", photo: 2 },
  { id: "bulk-farm-inputs-006", name: "Blueberries – Wild 180g", unit: "per 180g", photo: 3 },
  { id: "bulk-farm-inputs-008", name: "Blueberries – Family pack 500g", unit: "per 500g", photo: 4 },
  { id: "blueberry-03", name: "Blueberries – Fresh punnet 125g", unit: "per 125g", photo: 5 },
  { id: "blueberry-04", name: "Blueberries – Jumbo grade", unit: "per 200g", photo: 0 },
  { id: "blueberry-05", name: "Blueberries – Local farm", unit: "per 250g", photo: 1 },
  { id: "blueberry-06", name: "Blueberries – Export grade", unit: "per 300g", photo: 2 },
  { id: "blueberry-07", name: "Blueberries – Sweet & ripe", unit: "per 150g", photo: 3 },
  { id: "blueberry-08", name: "Blueberries – Breakfast pack", unit: "per 2 x 150g", photo: 4 },
  { id: "blueberry-09", name: "Blueberries – Smoothie pack", unit: "per 400g", photo: 5 },
  { id: "blueberry-10", name: "Blueberries – Baking grade", unit: "per 350g", photo: 0 },
  { id: "blueberry-11", name: "Blueberries – Hand-picked", unit: "per 200g", photo: 1 },
  { id: "blueberry-12", name: "Blueberries – Highland", unit: "per 250g", photo: 2 },
  { id: "blueberry-13", name: "Blueberries – Bulk 1kg", unit: "per kg", photo: 3 },
  { id: "blueberry-14", name: "Blueberries – Snack cup", unit: "per cup", photo: 4 },
  { id: "blueberry-15", name: "Blueberries – Frozen fresh", unit: "per 500g", photo: 5 },
  { id: "blueberry-16", name: "Blueberries – Mixed berries", unit: "per 300g", photo: 0 },
  { id: "blueberry-17", name: "Blueberries – One Source pick", unit: "per 200g", photo: 1 },
];

export function blueberryImage(index) {
  return unsplashImage(PHOTOS[index % PHOTOS.length]);
}
