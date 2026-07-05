class OrderItem {
  const OrderItem({
    required this.id,
    required this.productId,
    required this.productTitle,
    required this.productImage,
    required this.unitPrice,
    required this.quantity,
    required this.lineTotal,
  });

  final String id;
  final String productId;
  final String productTitle;
  final String productImage;
  final double unitPrice;
  final int quantity;
  final double lineTotal;

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] as String? ?? '',
      productId: json['product_id'] as String? ?? '',
      productTitle: json['product_title'] as String? ?? '',
      productImage: json['product_image'] as String? ?? '',
      unitPrice: (json['unit_price'] as num?)?.toDouble() ?? 0,
      quantity: json['quantity'] as int? ?? 0,
      lineTotal: (json['line_total'] as num?)?.toDouble() ?? 0,
    );
  }
}

class Order {
  const Order({
    required this.id,
    required this.status,
    required this.email,
    required this.fullName,
    required this.subtotal,
    required this.deliveryFee,
    required this.total,
    required this.currency,
    required this.createdAt,
    this.phone,
    this.city,
    this.orderItems = const [],
  });

  final String id;
  final String status;
  final String email;
  final String fullName;
  final double subtotal;
  final double deliveryFee;
  final double total;
  final String currency;
  final String createdAt;
  final String? phone;
  final String? city;
  final List<OrderItem> orderItems;

  factory Order.fromJson(Map<String, dynamic> json) {
    final items = json['order_items'] as List<dynamic>? ?? [];
    return Order(
      id: json['id'] as String,
      status: json['status'] as String? ?? 'placed',
      email: json['email'] as String? ?? '',
      fullName: json['full_name'] as String? ?? '',
      subtotal: (json['subtotal'] as num?)?.toDouble() ?? 0,
      deliveryFee: (json['delivery_fee'] as num?)?.toDouble() ?? 0,
      total: (json['total'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? 'UGX',
      createdAt: json['created_at'] as String? ?? '',
      phone: json['phone'] as String?,
      city: json['city'] as String?,
      orderItems: items
          .map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

class CreateOrderItem {
  const CreateOrderItem({
    required this.productId,
    required this.title,
    required this.image,
    required this.unitPrice,
    required this.quantity,
  });

  final String productId;
  final String title;
  final String image;
  final double unitPrice;
  final int quantity;

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'title': title,
        'image': image,
        'unitPrice': unitPrice,
        'quantity': quantity,
      };
}

class CreateOrderPayload {
  const CreateOrderPayload({
    this.userId,
    required this.email,
    required this.fullName,
    required this.addressLine1,
    required this.city,
    required this.subtotal,
    required this.deliveryFee,
    required this.total,
    required this.items,
    this.phone,
    this.addressLine2,
    this.district,
    this.notes,
  });

  final String? userId;
  final String email;
  final String fullName;
  final String addressLine1;
  final String city;
  final double subtotal;
  final double deliveryFee;
  final double total;
  final List<CreateOrderItem> items;
  final String? phone;
  final String? addressLine2;
  final String? district;
  final String? notes;

  Map<String, dynamic> toJson() => {
        if (userId != null) 'userId': userId,
        'email': email,
        'fullName': fullName,
        'addressLine1': addressLine1,
        'city': city,
        'subtotal': subtotal,
        'deliveryFee': deliveryFee,
        'total': total,
        'items': items.map((i) => i.toJson()).toList(),
        if (phone != null) 'phone': phone,
        if (addressLine2 != null) 'addressLine2': addressLine2,
        if (district != null) 'district': district,
        if (notes != null) 'notes': notes,
      };
}
