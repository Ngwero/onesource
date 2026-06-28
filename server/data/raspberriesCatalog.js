import { unsplashImage } from "./bulkCatalog.js";

export const RASPBERRIES_CATEGORY_ID = "fresh-fruits";

const PHOTOS = [
  "1622206151226-18ca2c9ab4a1",
  "1498557850523-fd3d118b962e",
];

/** Ten raspberry SKUs in fresh-fruits. */
export const RASPBERRY_PRODUCTS = [
  { id: "raspberry-01", name: "Raspberries – Fresh 125g", unit: "per 125g", photo: 0 },
  { id: "raspberry-02", name: "Raspberries – Premium 200g", unit: "per 200g", photo: 1 },
  { id: "raspberry-03", name: "Raspberries – Organic punnet", unit: "per 150g", photo: 0 },
  { id: "raspberry-04", name: "Raspberries – British grown", unit: "per 125g", photo: 1 },
  { id: "raspberry-05", name: "Raspberries – Sweet & ripe", unit: "per 200g", photo: 0 },
  { id: "raspberry-06", name: "Raspberries – Family pack 400g", unit: "per 400g", photo: 1 },
  { id: "raspberry-07", name: "Raspberries – Hand-picked", unit: "per 150g", photo: 0 },
  { id: "raspberry-08", name: "Raspberries – Breakfast pack", unit: "per 2 x 125g", photo: 1 },
  { id: "raspberry-09", name: "Raspberries – Dessert grade", unit: "per 250g", photo: 0 },
  { id: "raspberry-10", name: "Raspberries – One Source pick", unit: "per 200g", photo: 1 },
];

export function raspberryImage(index) {
  return unsplashImage(PHOTOS[index % PHOTOS.length]);
}
