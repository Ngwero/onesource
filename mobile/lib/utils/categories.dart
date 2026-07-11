const _legacyCategoryMap = <String, String>{
  'fruit': 'fresh-fruits',
  'berries': 'fresh-fruits',
  'citrus': 'fresh-fruits',
  'tropical': 'fresh-fruits',
  'vegetables': 'fresh-vegetables',
  'salad-herbs': 'fresh-vegetables',
  'root-veg': 'roots-and-tubers',
  'root-crops-and-tubers': 'roots-and-tubers',
};

String normalizeCategoryId(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return 'uncategorized';
  final mapped = _legacyCategoryMap[trimmed] ?? trimmed;
  return mapped;
}

bool productMatchesCategory(String productCategory, String filterCategoryId) {
  if (filterCategoryId.trim().isEmpty) return true;
  final raw = productCategory.trim();
  if (raw.isEmpty) return false;

  final normalized = normalizeCategoryId(filterCategoryId);
  if (raw == filterCategoryId.trim()) return true;
  if (normalizeCategoryId(raw) == normalized) return true;

  for (final entry in _legacyCategoryMap.entries) {
    if (entry.value == normalized && raw == entry.key) return true;
  }
  return false;
}

String categoryDisplayName(String raw) {
  return raw.replaceAll('-', ' ').trim();
}
