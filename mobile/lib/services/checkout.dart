const deliveryFeeUgx = 15000;
const freeDeliveryThresholdUgx = 100000;

int calcDeliveryFee(double subtotalUgx) {
  return subtotalUgx >= freeDeliveryThresholdUgx ? 0 : deliveryFeeUgx;
}

({int delivery, double total}) calcOrderTotal(double subtotalUgx) {
  final delivery = calcDeliveryFee(subtotalUgx);
  return (delivery: delivery, total: subtotalUgx + delivery);
}
