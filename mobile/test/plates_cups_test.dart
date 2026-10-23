import 'package:flutter_test/flutter_test.dart';
import 'package:onesource_mobile/models/product.dart';
import 'package:onesource_mobile/providers/plates_cups_provider.dart';

void main() {
  Product item(String id, String image) =>
      Product.fromJson({'id': id, 'title': id, 'image': image});

  test('plates and cups stay on separate shelves without duplicate products or photos',
      () {
    final plate = item('plate', '/plate.jpg');
    final cup = item('cup', '/cup.jpg');
    final duplicatePhoto = item('duplicate', '/plate.jpg');
    final secondCup = item('cup2', '/cup2.jpg');
    final shelves = splitPlateCupShelves(
      [plate, duplicatePhoto],
      [cup, secondCup, plate],
    );
    expect(shelves.plates.map((p) => p.id), ['plate']);
    expect(shelves.cups.map((p) => p.id), ['cup', 'cup2']);
    expect(shelves.featured.map((p) => p.id), ['plate', 'cup', 'cup2']);
  });

  test('empty plate results still publish a cups-only row', () {
    final cup = item('cup', '/cup.jpg');
    final shelves = splitPlateCupShelves([], [cup]);
    expect(shelves.plates, isEmpty);
    expect(shelves.cups, [cup]);
  });

  test('preview image key treats resized copies as the same photo', () {
    expect(
      previewImageKey('https://cdn.example/photo.jpg?w=200&h=200'),
      previewImageKey('https://cdn.example/photo.jpg?w=800&q=70'),
    );
  });

  test(
      'kitchen home rows are non-stick, carbon steel, small appliances, plates, cups, then packed aisles without duplicate photos',
      () {
    final rows = assignKitchenHomeShelves(
      aisleProducts: {
        'non-stick': [
          item('kitchen-non-stick-1', '/ns.jpg'),
          item('kitchen-non-stick-2', '/shared.jpg'),
        ],
        'carbon-steel': [item('kitchen-carbon-steel-1', '/cs.jpg')],
        'small-appliances': [item('kitchen-small-appliances-1', '/sa.jpg')],
        'cookware-accessories': [
          item('kitchen-cookware-accessories-1', '/ca.jpg'),
        ],
        'tabletop': [
          item('kitchen-tabletop-bowl', '/bowl.jpg'),
          item('kitchen-tabletop-dup', '/shared.jpg'),
        ],
        'organization': [item('kitchen-organization-1', '/org.jpg')],
        'countertops-sinks': [
          item('kitchen-countertops-sinks-1', '/sink.jpg'),
        ],
        'cookware': [item('kitchen-cookware-1', '/cook.jpg')],
        'stainless-clad': [item('kitchen-stainless-clad-1', '/ss.jpg')],
        'cast-iron': [item('kitchen-cast-iron-1', '/iron.jpg')],
        'small-furniture': [item('kitchen-small-furniture-1', '/furn.jpg')],
        'extractor-hoods': [item('kitchen-extractor-hoods-1', '/hood.jpg')],
      },
      plates: [
        item('kitchen-tabletop-plate', '/shared.jpg'),
        item('kitchen-tabletop-plate2', '/plate.jpg'),
      ],
      cups: [
        item('kitchen-tabletop-cup', '/cup.jpg'),
        item('kitchen-tabletop-cup2', '/ns.jpg'),
      ],
    );

    expect(rows.map((row) => row.id).toList(), [
      'non-stick',
      'carbon-steel',
      'small-appliances',
      'plates',
      'cups',
      'cookware-accessories',
      'tabletop',
      'organization',
      'cookware',
      'stainless-clad',
      'cast-iron',
    ]);

    final images = [for (final row in rows) for (final p in row.products) p.image];
    expect(images.toSet().length, images.length);
    expect(
      rows.firstWhere((row) => row.id == 'plates').products.map((p) => p.image),
      ['/plate.jpg'],
    );
    expect(
      rows.firstWhere((row) => row.id == 'cups').products.map((p) => p.image),
      ['/cup.jpg'],
    );
    expect(
      rows
          .firstWhere((row) => row.id == 'tabletop')
          .products
          .map((p) => p.image),
      ['/bowl.jpg'],
    );
  });

  test('empty aisles are omitted from kitchen home', () {
    final rows = assignKitchenHomeShelves(
      aisleProducts: {
        'non-stick': [item('kitchen-non-stick-1', '/ns.jpg')],
        'carbon-steel': const [],
        'small-appliances': [item('kitchen-small-appliances-1', '/sa.jpg')],
      },
      plates: [item('kitchen-tabletop-plate', '/plate.jpg')],
      cups: const [],
    );
    expect(rows.map((row) => row.id).toList(), [
      'non-stick',
      'small-appliances',
      'plates',
    ]);
  });
}
