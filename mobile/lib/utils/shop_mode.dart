import '../data/cosmetics.dart';
import 'kitchen_mode.dart';

/// The three storefronts: Fresh produce, Kitchen Ware and Cosmetics.
enum ShopMode { fresh, kitchen, cosmetics }

ShopMode shopModeForLocation(String location) {
  if (isCosmeticsPath(location)) return ShopMode.cosmetics;
  if (isKitchenPath(location)) return ShopMode.kitchen;
  return ShopMode.fresh;
}

extension ShopModePaths on ShopMode {
  String get homePath => switch (this) {
        ShopMode.fresh => '/home',
        ShopMode.kitchen => '/kitchen',
        ShopMode.cosmetics => '/cosmetics',
      };

  String get shopPath => switch (this) {
        ShopMode.fresh => '/shop',
        ShopMode.kitchen => '/kitchen/shop',
        ShopMode.cosmetics => '/cosmetics/shop',
      };

  String get categoriesPath => switch (this) {
        ShopMode.fresh => '/categories',
        ShopMode.kitchen => '/kitchen/categories',
        ShopMode.cosmetics => '/cosmetics/categories',
      };

  String get searchPath => switch (this) {
        ShopMode.fresh => '/search',
        ShopMode.kitchen => '/kitchen/search',
        ShopMode.cosmetics => '/cosmetics/search',
      };

  String get searchHintKey => switch (this) {
        ShopMode.fresh => 'header.searchPlaceholder',
        ShopMode.kitchen => 'header.kitchenSearchPlaceholder',
        ShopMode.cosmetics => 'header.cosmeticsSearchPlaceholder',
      };
}
