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
}
