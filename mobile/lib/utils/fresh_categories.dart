import '../models/product.dart';

/// Preferred Fresh home marquee order — colourful produce interleaved with meat.
const freshCategoryPriority = <String>[
  'fresh-fruits',
  'poultry-products', // chicken meat
  'fresh-vegetables',
  'fish-and-aquaculture',
  'chillies-and-peppers',
  'livestock-products', // beef / goat
  'herbs-and-spices',
  'dairy-products',
  'roots-and-tubers',
  'legumes-and-pulses',
  'oilseeds-and-nuts',
  'cereals-and-grains',
  'coffee-tea-cocoa',
  'export-fresh-produce',
];

/// Friendlier labels for meat aisles on the Fresh home strip.
String freshCategoryDisplayName(Category c) {
  switch (c.id) {
    case 'poultry-products':
      return 'Chicken';
    case 'livestock-products':
      return 'Meat';
    case 'fish-and-aquaculture':
      return 'Fish';
    case 'dairy-products':
      return 'Dairy';
    case 'chillies-and-peppers':
      return 'Chillies';
    case 'fresh-fruits':
      return 'Fruits';
    case 'fresh-vegetables':
      return 'Veggies';
    case 'roots-and-tubers':
      return 'Roots';
    case 'herbs-and-spices':
      return 'Herbs';
    case 'legumes-and-pulses':
      return 'Beans';
    case 'oilseeds-and-nuts':
      return 'Nuts';
    case 'cereals-and-grains':
      return 'Grains';
    case 'coffee-tea-cocoa':
      return 'Coffee';
    default:
      return c.name;
  }
}

/// Interleave produce + protein so the strip looks varied and colourful.
List<Category> diversifyFreshCategories(List<Category> input) {
  final byId = {for (final c in input) c.id: c};
  final ordered = <Category>[];
  final seen = <String>{};

  for (final id in freshCategoryPriority) {
    final c = byId[id];
    if (c == null) continue;
    ordered.add(c);
    seen.add(id);
  }
  for (final c in input) {
    if (seen.add(c.id)) ordered.add(c);
  }
  return ordered;
}
