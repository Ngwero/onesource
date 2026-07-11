import '../models/product.dart';
import '../utils/categories.dart';

const chilliesCategoryId = 'chillies-and-peppers';

class HomeRowConfig {
  const HomeRowConfig({
    required this.id,
    required this.match,
    this.seeAllCategoryId,
    this.seeAllSearch,
    this.seeAllHref,
    this.fallbackToCategory = true,
  });

  final String id;
  final bool Function(Product product) match;
  final String? seeAllCategoryId;
  final String? seeAllSearch;
  final String? seeAllHref;
  /// When false, never pad the row with unrelated category products.
  final bool fallbackToCategory;
}

bool Function(Product) _inCategory(String categoryId) {
  return (Product p) => normalizeCategoryId(p.category) == categoryId;
}

bool _titleMatches(Product p, String pattern) =>
    RegExp(pattern, caseSensitive: false).hasMatch(p.title);

bool _haystackMatches(Product p, String pattern) =>
    RegExp(pattern, caseSensitive: false).hasMatch('${p.title} ${p.description}');

bool _isChilliProduct(Product p) {
  if (normalizeCategoryId(p.category) == chilliesCategoryId) return true;
  return _haystackMatches(
    p,
    r'chilli|chili|habanero|scotch bonnet|piri piri|peri-peri|jalapeño|jalapeno|cayenne|serrano',
  );
}

final homeProductRows = <HomeRowConfig>[
  HomeRowConfig(
    id: 'chillies',
    seeAllCategoryId: chilliesCategoryId,
    seeAllSearch: 'chilli',
    match: _isChilliProduct,
  ),
  HomeRowConfig(
    id: 'mangoes',
    seeAllSearch: 'mango',
    match: _isMango,
  ),
  HomeRowConfig(
    id: 'bananas',
    seeAllSearch: 'banana',
    seeAllCategoryId: 'fresh-fruits',
    match: _isBanana,
  ),
  HomeRowConfig(
    id: 'fruits',
    seeAllCategoryId: 'fresh-fruits',
    seeAllSearch: 'fruit',
    match: _inCategory('fresh-fruits'),
  ),
  HomeRowConfig(
    id: 'tomatoes',
    seeAllSearch: 'tomato',
    fallbackToCategory: false,
    match: _isTomato,
  ),
  HomeRowConfig(
    id: 'vegetables',
    seeAllCategoryId: 'fresh-vegetables',
    seeAllSearch: 'vegetable',
    match: _isVegetable,
  ),
  HomeRowConfig(
    id: 'onions',
    seeAllSearch: 'onion',
    seeAllCategoryId: 'fresh-vegetables',
    match: _isOnion,
  ),
  HomeRowConfig(
    id: 'potatoes',
    seeAllCategoryId: 'roots-and-tubers',
    seeAllSearch: 'potato',
    match: _isPotato,
  ),
  HomeRowConfig(
    id: 'herbs',
    seeAllCategoryId: 'herbs-and-spices',
    seeAllSearch: 'herb',
    match: _isHerbs,
  ),
  HomeRowConfig(
    id: 'legumes',
    seeAllCategoryId: 'legumes-and-pulses',
    seeAllSearch: 'beans',
    match: _isLegumes,
  ),
  HomeRowConfig(
    id: 'nuts',
    seeAllCategoryId: 'oilseeds-and-nuts',
    seeAllSearch: 'nuts',
    match: _isNuts,
  ),
  HomeRowConfig(
    id: 'chicken',
    seeAllCategoryId: 'poultry-products',
    seeAllSearch: 'chicken',
    match: _isChicken,
  ),
  HomeRowConfig(
    id: 'beef',
    seeAllCategoryId: 'livestock-products',
    seeAllSearch: 'beef',
    match: _isBeef,
  ),
  HomeRowConfig(
    id: 'fish',
    seeAllCategoryId: 'fish-and-aquaculture',
    seeAllSearch: 'fish',
    match: _isFish,
  ),
  HomeRowConfig(
    id: 'eggs',
    seeAllCategoryId: 'poultry-products',
    seeAllSearch: 'egg',
    match: _isEgg,
  ),
  HomeRowConfig(
    id: 'dairy',
    seeAllCategoryId: 'dairy-products',
    seeAllSearch: 'milk',
    match: _inCategory('dairy-products'),
  ),
  HomeRowConfig(
    id: 'rice-grains',
    seeAllCategoryId: 'cereals-and-grains',
    seeAllSearch: 'rice',
    match: _isGrains,
  ),
  HomeRowConfig(
    id: 'coffee-tea',
    seeAllCategoryId: 'coffee-tea-cocoa',
    seeAllSearch: 'coffee',
    match: _isCoffeeTea,
  ),
];

bool _isMango(Product p) => _titleMatches(p, r'mango');

bool _isBanana(Product p) => _titleMatches(p, r'banana|plantain');

bool _isTomato(Product p) => _titleMatches(p, r'tomato');

bool _isVegetable(Product p) {
  if (_isTomato(p) || _isOnion(p)) return false;
  return normalizeCategoryId(p.category) == 'fresh-vegetables' ||
      _titleMatches(p, r'spinach|cabbage|nakati|amaranth|malakwang|greens|lettuce|cucumber');
}

bool _isOnion(Product p) => _titleMatches(p, r'onion|shallot');

bool _isPotato(Product p) =>
    normalizeCategoryId(p.category) == 'roots-and-tubers' ||
    _titleMatches(p, r'potato|sweet potato|yam|cassava|irish');

bool _isHerbs(Product p) =>
    normalizeCategoryId(p.category) == 'herbs-and-spices' ||
    _titleMatches(p, r'herb|basil|mint|coriander|parsley|rosemary|thyme');

bool _isLegumes(Product p) =>
    normalizeCategoryId(p.category) == 'legumes-and-pulses' ||
    _titleMatches(p, r'bean|pea|lentil|cowpea|groundnut');

bool _isNuts(Product p) =>
    normalizeCategoryId(p.category) == 'oilseeds-and-nuts' ||
    _titleMatches(p, r'nut|peanut|groundnut|sesame|sunflower');

bool _isChicken(Product p) =>
    !_isEgg(p) &&
    (normalizeCategoryId(p.category) == 'poultry-products' || _titleMatches(p, r'chicken'));

bool _isBeef(Product p) =>
    normalizeCategoryId(p.category) == 'livestock-products' ||
    _titleMatches(p, r'beef|lamb|goat|mutton');

bool _isFish(Product p) =>
    normalizeCategoryId(p.category) == 'fish-and-aquaculture' ||
    _titleMatches(p, r'fish|tilapia|mackerel|catfish|smoked');

bool _isEgg(Product p) =>
    _titleMatches(p, r'\begg') && !_titleMatches(p, r'eggplant');

bool _isGrains(Product p) =>
    normalizeCategoryId(p.category) == 'cereals-and-grains' ||
    _titleMatches(p, r'rice|maize|corn|wheat|flour|grain|millet');

bool _isCoffeeTea(Product p) =>
    normalizeCategoryId(p.category) == 'coffee-tea-cocoa' ||
    _titleMatches(p, r'coffee|tea|cocoa');

List<Product> productsForHomeRow(
  List<Product> products,
  HomeRowConfig row, {
  int limit = 12,
}) {
  var matched = products.where((p) => p.inStock && row.match(p)).toList();

  if (matched.length >= 4) return matched.take(limit).toList();

  if (row.fallbackToCategory && row.seeAllCategoryId != null) {
    final fromCat = products
        .where((p) => p.inStock && normalizeCategoryId(p.category) == row.seeAllCategoryId)
        .toList();
    final ids = matched.map((p) => p.id).toSet();
    for (final p in fromCat) {
      if (row.match(p) && ids.add(p.id)) matched.add(p);
      if (matched.length >= limit) break;
    }
  }

  return matched.take(limit).toList();
}

String? homeRowSeeAllPath(HomeRowConfig row) {
  if (row.seeAllHref != null) return row.seeAllHref;
  if (row.seeAllCategoryId != null) return '/category/${row.seeAllCategoryId}';
  if (row.seeAllSearch != null) return '/search?q=${Uri.encodeComponent(row.seeAllSearch!)}';
  return null;
}
