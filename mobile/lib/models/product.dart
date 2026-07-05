class Product {
  const Product({
    required this.id,
    required this.title,
    required this.price,
    this.originalPrice,
    required this.rating,
    required this.reviewCount,
    required this.image,
    required this.category,
    required this.unit,
    required this.prime,
    required this.description,
    required this.inStock,
    this.stockQuantity,
    this.delivery,
    this.supplierName,
  });

  final String id;
  final String title;
  final double price;
  final double? originalPrice;
  final double rating;
  final int reviewCount;
  final String image;
  final String category;
  final String unit;
  final bool prime;
  final String description;
  final bool inStock;
  final int? stockQuantity;
  final String? delivery;
  final String? supplierName;

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      originalPrice: (json['originalPrice'] as num?)?.toDouble(),
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      reviewCount: json['reviewCount'] as int? ?? 0,
      image: json['image'] as String? ?? '',
      category: json['category'] as String? ?? '',
      unit: json['unit'] as String? ?? '',
      prime: json['prime'] as bool? ?? false,
      description: json['description'] as String? ?? '',
      inStock: json['inStock'] as bool? ?? true,
      stockQuantity: json['stockQuantity'] as int?,
      delivery: json['delivery'] as String?,
      supplierName: json['supplierName'] as String?,
    );
  }
}

class Category {
  const Category({
    required this.id,
    required this.name,
    required this.icon,
    this.image,
  });

  final String id;
  final String name;
  final String icon;
  final String? image;

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] as String,
      name: json['name'] as String? ?? '',
      icon: json['icon'] as String? ?? '🥬',
      image: json['image'] as String?,
    );
  }
}
