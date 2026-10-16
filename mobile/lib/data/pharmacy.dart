import '../models/product.dart';

class PharmacyAisle {
  const PharmacyAisle({required this.id, required this.title, required this.icon});

  final String id;
  final String title;
  final String icon;
}

/// Same aisles as the website (`src/data/pharmacy.ts`).
const pharmacyAisles = <PharmacyAisle>[
  PharmacyAisle(id: 'medicines', title: 'Medicines', icon: '💊'),
  PharmacyAisle(id: 'supplements', title: 'Supplements & vitamins', icon: '🧴'),
  PharmacyAisle(id: 'first-aid', title: 'First aid & home care', icon: '🩹'),
  PharmacyAisle(id: 'care', title: 'Care & hygiene', icon: '🧼'),
  PharmacyAisle(id: 'orthopedics', title: 'Orthopedics', icon: '🦵'),
  PharmacyAisle(id: 'wellbeing', title: 'Well-being', icon: '🌿'),
  PharmacyAisle(id: 'mother-child', title: 'Mother & child', icon: '👶'),
  PharmacyAisle(id: 'animals', title: 'Pet health', icon: '🐾'),
  PharmacyAisle(id: 'nutrition', title: 'Medical nutrition', icon: '🥛'),
  PharmacyAisle(id: 'naturopathy', title: 'Naturopathy', icon: '🌱'),
  PharmacyAisle(id: 'sports', title: 'Sports & weight', icon: '🏃'),
  PharmacyAisle(id: 'offers', title: 'Offers & gifts', icon: '🎁'),
];

const pharmacyCategoryId = 'pharmacy';

PharmacyAisle? pharmacyAisleById(String id) {
  for (final aisle in pharmacyAisles) {
    if (aisle.id == id) return aisle;
  }
  return null;
}

String pharmacyAislePath(String id) => '/pharmacy/aisle/$id';

bool isValidPharmacyAisleId(String? id) => pharmacyAisleById(id ?? '') != null;

bool isPharmacyPath(String location) {
  final path = Uri.tryParse(location)?.path ?? location;
  if (path == '/pharmacy' || path.startsWith('/pharmacy/')) return true;
  return path.startsWith('/product/pharmacy-');
}

bool isPharmacyProduct(Product? product) {
  if (product == null) return false;
  return product.id.startsWith('pharmacy-') || product.category == pharmacyCategoryId;
}

String? pharmacyAisleIdFromProductId(String id) {
  if (!id.startsWith('pharmacy-')) return null;
  final rest = id.substring('pharmacy-'.length);
  for (final aisle in pharmacyAisles) {
    if (rest.startsWith('${aisle.id}-')) return aisle.id;
  }
  return null;
}
