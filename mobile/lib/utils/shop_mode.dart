import '../data/cosmetics.dart';
import '../data/pharmacy.dart';
import 'kitchen_mode.dart';

/// Fresh produce, Kitchen Ware, Cosmetics and Pharmacy.
enum ShopMode { fresh, kitchen, cosmetics, pharmacy }

ShopMode shopModeForLocation(String location) {
  if (isPharmacyPath(location)) return ShopMode.pharmacy;
  if (isCosmeticsPath(location)) return ShopMode.cosmetics;
  if (isKitchenPath(location)) return ShopMode.kitchen;
  return ShopMode.fresh;
}

extension ShopModePaths on ShopMode {
  String get homePath => switch (this) {
        ShopMode.fresh => '/home',
        ShopMode.kitchen => '/kitchen',
        ShopMode.cosmetics => '/cosmetics',
        ShopMode.pharmacy => '/pharmacy',
      };

  String get shopPath => switch (this) {
        ShopMode.fresh => '/shop',
        ShopMode.kitchen => '/kitchen/shop',
        ShopMode.cosmetics => '/cosmetics/shop',
        ShopMode.pharmacy => '/pharmacy/shop',
      };

  String get categoriesPath => switch (this) {
        ShopMode.fresh => '/categories',
        ShopMode.kitchen => '/kitchen/categories',
        ShopMode.cosmetics => '/cosmetics/categories',
        ShopMode.pharmacy => '/pharmacy/categories',
      };

  String get searchPath => switch (this) {
        ShopMode.fresh => '/search',
        ShopMode.kitchen => '/kitchen/search',
        ShopMode.cosmetics => '/cosmetics/search',
        ShopMode.pharmacy => '/pharmacy/search',
      };

  String get searchHintKey => switch (this) {
        ShopMode.fresh => 'header.searchPlaceholder',
        ShopMode.kitchen => 'header.kitchenSearchPlaceholder',
        ShopMode.cosmetics => 'header.cosmeticsSearchPlaceholder',
        ShopMode.pharmacy => 'header.pharmacySearchPlaceholder',
      };
}
