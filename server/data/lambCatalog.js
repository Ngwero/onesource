import { unsplashImage } from "./bulkCatalog.js";

/** Verified Unsplash photo IDs (meat / livestock). */
export const LAMB_PHOTO_IDS = [
  "1464965911861-746a04b4bca6",
  "1587735243615-c03a25aaff33",
  "1632280007412-b71e0aaea1b4",
  "1547514704-5ce94b527e52",
  "1512621776951-a57141f2eefd",
  "1498557850523-fd3d118b962e",
  "1553279777-2a6e2c0e8c1a",
  "1603048712934-8b4b4b4b4b4b",
  "1598110750624-20704084e04e",
  "1576045057995-568f588fb82f",
  "1508747703725-3e8b046331e0",
  "1523049673857-eb18f1d7b578",
  "1447175008436-1701707538da",
  "1618375569909-a6e285c5dfca",
  "1622206151226-18ca2c9ab4a1",
  "1550258987-190b2d41a8a5",
  "1577069861036-d4c6c2b0e8c8",
  "1611080620898-05e2ccbcfe79",
  "1605027990121-4751ddfbef54",
  "1551752494-213fd7f21e8f",
];

/** All lamb search products — ids must match DB fill-kw-lamb-* and bulk lamb rows. */
export const LAMB_PRODUCTS = [
  { id: "fill-kw-lamb-01", name: "Lamb Mince", unit: "per kg", photoId: LAMB_PHOTO_IDS[0] },
  { id: "fill-kw-lamb-02", name: "Lamb Leg", unit: "per kg", photoId: LAMB_PHOTO_IDS[1] },
  { id: "fill-kw-lamb-03", name: "Lamb Shoulder", unit: "per kg", photoId: LAMB_PHOTO_IDS[2] },
  { id: "fill-kw-lamb-04", name: "Lamb Ribs", unit: "per kg", photoId: LAMB_PHOTO_IDS[3] },
  { id: "fill-kw-lamb-05", name: "Lamb Stew Cuts", unit: "per kg", photoId: LAMB_PHOTO_IDS[4] },
  { id: "fill-kw-lamb-06", name: "Lamb Liver", unit: "per kg", photoId: LAMB_PHOTO_IDS[5] },
  { id: "fill-kw-lamb-07", name: "Lamb Shank", unit: "per kg", photoId: LAMB_PHOTO_IDS[6] },
  { id: "fill-kw-lamb-08", name: "Lamb Neck", unit: "per kg", photoId: LAMB_PHOTO_IDS[7] },
  { id: "fill-kw-lamb-09", name: "Lamb – Local", unit: "per kg", photoId: LAMB_PHOTO_IDS[8] },
  { id: "fill-kw-lamb-10", name: "Lamb – Premium", unit: "per kg", photoId: LAMB_PHOTO_IDS[9] },
  { id: "fill-kw-lamb-11", name: "Lamb Fillet", unit: "per kg", photoId: LAMB_PHOTO_IDS[10] },
  { id: "fill-kw-lamb-12", name: "Lamb Soup Pack", unit: "per pack", photoId: LAMB_PHOTO_IDS[11] },
  { id: "fill-kw-lamb-13", name: "Lamb Sausages", unit: "per pack", photoId: LAMB_PHOTO_IDS[12] },
  { id: "fill-kw-lamb-14", name: "Lamb – Farm Fresh", unit: "per kg", photoId: LAMB_PHOTO_IDS[13] },
  { id: "fill-kw-lamb-15", name: "Lamb Backstrap", unit: "per kg", photoId: LAMB_PHOTO_IDS[14] },
  { id: "fill-kw-lamb-16", name: "Lamb – Export", unit: "per kg", photoId: LAMB_PHOTO_IDS[15] },
  { id: "fill-kw-lamb-17", name: "Lamb Curry Cut", unit: "per kg", photoId: LAMB_PHOTO_IDS[16] },
  { id: "bulk-livestock-products-003", name: "Lamb Chops", unit: "per kg", photoId: LAMB_PHOTO_IDS[17] },
  { id: "bulk-livestock-products-006", name: "Lamb Chops", unit: "per kg", photoId: LAMB_PHOTO_IDS[18] },
  { id: "bulk-livestock-products-009", name: "Lamb Chops", unit: "per kg", photoId: LAMB_PHOTO_IDS[19] },
];

export function lambImage(photoId) {
  return unsplashImage(photoId);
}
