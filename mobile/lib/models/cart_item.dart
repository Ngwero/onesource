import 'product.dart';

class CartItem {
  const CartItem({required this.product, required this.quantity});

  final Product product;
  final int quantity;

  double get lineTotal => product.price * quantity;

  CartItem copyWith({int? quantity}) {
    return CartItem(product: product, quantity: quantity ?? this.quantity);
  }

  Map<String, dynamic> toJson() => {
        'productId': product.id,
        'quantity': quantity,
      };

  static CartItem? fromJson(Map<String, dynamic> json, Product product) {
    final qty = json['quantity'] as int? ?? 0;
    if (qty <= 0) return null;
    return CartItem(product: product, quantity: qty);
  }
}
