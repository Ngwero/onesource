import { unsplashImage } from "./bulkCatalog.js";

export const COW_PEAS_CATEGORY_ID = "legumes-and-pulses";

const PHOTOS = [
  "1622206151226-18ca2c9ab4a1",
  "1498557850523-fd3d118b962e",
];

/** Ten cow pea SKUs in legumes-and-pulses. */
export const COW_PEA_PRODUCTS = [
  { id: "cowpea-01", name: "Cow Peas – Dried 1kg", unit: "per kg", photo: 0 },
  { id: "cowpea-02", name: "Cow Peas – Premium grade", unit: "per kg", photo: 1 },
  { id: "cowpea-03", name: "Cow Peas – Organic", unit: "per kg", photo: 0 },
  { id: "cowpea-04", name: "Cow Peas – Local farm", unit: "per kg", photo: 1 },
  { id: "cowpea-05", name: "Cow Peas – Whole dried", unit: "per 2kg", photo: 0 },
  { id: "cowpea-06", name: "Cow Peas – Export quality", unit: "per kg", photo: 1 },
  { id: "cowpea-07", name: "Cow Peas – Bulk sack 5kg", unit: "per 5kg", photo: 0 },
  { id: "cowpea-08", name: "Cow Peas – Split", unit: "per kg", photo: 1 },
  { id: "cowpea-09", name: "Cow Peas – Fresh green", unit: "per kg", photo: 0 },
  { id: "cowpea-10", name: "Cow Peas – One Source pick", unit: "per kg", photo: 1 },
];

export function cowPeaImage(index) {
  return unsplashImage(PHOTOS[index % PHOTOS.length]);
}
