import { FREE_DELIVERY_THRESHOLD_GBP } from "../currency/currencies";

export const DELIVERY_FEE_UGX = 15_000;

export function calcDeliveryFee(subtotalUgx: number): number {
  return subtotalUgx >= FREE_DELIVERY_THRESHOLD_GBP ? 0 : DELIVERY_FEE_UGX;
}

export function calcOrderTotal(subtotalUgx: number): {
  delivery: number;
  total: number;
} {
  const delivery = calcDeliveryFee(subtotalUgx);
  return { delivery, total: subtotalUgx + delivery };
}
