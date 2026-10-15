class Product {
  const Product({
    required this.id,
    required this.title,
    required this.price,
    this.originalPrice,
    required this.rating,
    required this.reviewCount,
    required this.image,
    this.images = const [],
    required this.category,
    required this.unit,
    required this.prime,
    required this.description,
    required this.inStock,
    this.stockQuantity,
    this.delivery,
    this.supplierName,
    this.details = const ProductInfo(),
  });

  final String id;
  final String title;
  final double price;
  final double? originalPrice;
  final double rating;
  final int reviewCount;
  final String image;

  /// Extra gallery frames. [gallery] always includes [image] first.
  final List<String> images;
  final String category;
  final String unit;
  final bool prime;
  final String description;
  final bool inStock;
  final int? stockQuantity;
  final String? delivery;
  final String? supplierName;

  /// Ingredients, allergens, warnings, usage and specifications.
  final ProductInfo details;

  /// True only when [rating] / [reviewCount] come from real customer reviews.
  bool get hasVerifiedRating => details.ratingSource != null && rating > 0 && reviewCount > 0;

  /// Every product photo, cover first, with blanks and duplicates removed.
  List<String> get gallery {
    final urls = <String>[];
    void add(String? raw) {
      final url = raw?.trim() ?? '';
      if (url.isNotEmpty && !urls.contains(url)) urls.add(url);
    }

    add(image);
    for (final extra in images) {
      add(extra);
    }
    return urls;
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as String,
      title: json['title'] as String? ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      originalPrice: (json['originalPrice'] as num?)?.toDouble(),
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      reviewCount: json['reviewCount'] as int? ?? 0,
      image: json['image'] as String? ?? '',
      images: _imageList(json['images']),
      category: json['category'] as String? ?? '',
      unit: json['unit'] as String? ?? '',
      prime: json['prime'] as bool? ?? false,
      description: json['description'] as String? ?? '',
      inStock: json['inStock'] as bool? ?? true,
      stockQuantity: json['stockQuantity'] as int?,
      delivery: json['delivery'] as String?,
      supplierName: json['supplierName'] as String?,
      details: json['details'] is Map<String, dynamic>
          ? ProductInfo.fromJson(json['details'] as Map<String, dynamic>)
          : const ProductInfo(),
    );
  }

  static List<String> _imageList(Object? raw) {
    if (raw is! List) return const [];
    return raw.whereType<String>().map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'price': price,
        if (originalPrice != null) 'originalPrice': originalPrice,
        'rating': rating,
        'reviewCount': reviewCount,
        'image': image,
        if (images.isNotEmpty) 'images': images,
        'category': category,
        'unit': unit,
        'prime': prime,
        'description': description,
        'inStock': inStock,
        if (stockQuantity != null) 'stockQuantity': stockQuantity,
        if (delivery != null) 'delivery': delivery,
        if (supplierName != null) 'supplierName': supplierName,
        if (details.ratingSource != null) 'details': {'ratingSource': details.ratingSource},
      };
}

class ProductSpec {
  const ProductSpec({required this.key, required this.label, required this.value});

  final String key;
  final String label;
  final String value;
}

class ProductInfo {
  const ProductInfo({
    this.source,
    this.brand,
    this.origin,
    this.temperature,
    this.ingredients,
    this.allergens = const [],
    this.allergenStatement,
    this.howToUse,
    this.storage,
    this.care,
    this.warnings = const [],
    this.highlights = const [],
    this.suitableFor = const [],
    this.specs = const [],
    this.ratingSource,
  });

  final String? source;
  final String? brand;
  final String? origin;
  final String? temperature;
  final String? ingredients;
  final List<String> allergens;
  final String? allergenStatement;
  final String? howToUse;
  final String? storage;
  final String? care;
  final List<String> warnings;
  final List<String> highlights;
  final List<String> suitableFor;
  final List<ProductSpec> specs;
  final String? ratingSource;

  bool get fromManufacturer => source == 'manufacturer';
  bool get hasSafety => (allergenStatement?.isNotEmpty ?? false) || warnings.isNotEmpty;

  static List<String> _strings(Object? v) =>
      v is List ? v.whereType<String>().where((s) => s.trim().isNotEmpty).toList() : const [];

  static String? _string(Object? v) => v is String && v.trim().isNotEmpty ? v.trim() : null;

  factory ProductInfo.fromJson(Map<String, dynamic> json) {
    final specs = json['specs'] is List
        ? (json['specs'] as List)
            .whereType<Map<String, dynamic>>()
            .where((s) => s['value'] is String && s['label'] is String)
            .map((s) => ProductSpec(
                  key: s['key'] as String? ?? '',
                  label: s['label'] as String,
                  value: s['value'] as String,
                ))
            .toList()
        : const <ProductSpec>[];
    return ProductInfo(
      source: _string(json['source']),
      brand: _string(json['brand']),
      origin: _string(json['origin']),
      temperature: _string(json['temperature']),
      ingredients: _string(json['ingredients']),
      allergens: _strings(json['allergens']),
      allergenStatement: _string(json['allergenStatement']),
      howToUse: _string(json['howToUse']),
      storage: _string(json['storage']),
      care: _string(json['care']),
      warnings: _strings(json['warnings']),
      highlights: _strings(json['highlights']),
      suitableFor: _strings(json['suitableFor']),
      specs: specs,
      ratingSource: _string(json['ratingSource']),
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
