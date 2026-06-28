import { unsplashImage } from "./bulkCatalog.js";

export const PAW_PAWS_CATEGORY_ID = "fresh-fruits";

const PHOTOS = [
  "1622206151226-18ca2c9ab4a1",
  "1498557850523-fd3d118b962e",
];

/**
 * Ten paw paw (papaya) SKUs — reuses cowpea-01…10 product IDs in the database.
 */
export const PAW_PAW_PRODUCTS = [
  { id: "cowpea-01", name: "Paw Paw – Ripe each", unit: "each", photo: 0 },
  { id: "cowpea-02", name: "Paw Paw – Premium large", unit: "each", photo: 1 },
  { id: "cowpea-03", name: "Paw Paw – Organic", unit: "each", photo: 0 },
  { id: "cowpea-04", name: "Paw Paw – Local farm", unit: "each", photo: 1 },
  { id: "cowpea-05", name: "Paw Paw – Sweet & juicy", unit: "each", photo: 0 },
  { id: "cowpea-06", name: "Paw Paw – Export grade", unit: "each", photo: 1 },
  { id: "cowpea-07", name: "Paw Paw – Family pack 3", unit: "per 3", photo: 0 },
  { id: "cowpea-08", name: "Paw Paw – Half ripe", unit: "each", photo: 1 },
  { id: "cowpea-09", name: "Paw Paw – Hand-picked", unit: "each", photo: 0 },
  { id: "cowpea-10", name: "Paw Paw – One Source pick", unit: "each", photo: 1 },
];

export function pawPawImage(index) {
  return unsplashImage(PHOTOS[index % PHOTOS.length]);
}
