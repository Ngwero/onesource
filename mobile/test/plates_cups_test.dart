import 'package:flutter_test/flutter_test.dart';
import 'package:onesource_mobile/models/product.dart';
import 'package:onesource_mobile/providers/plates_cups_provider.dart';

void main() {
  Product item(String id, String image) =>
      Product.fromJson({'id': id, 'title': id, 'image': image});
  test('plates and cups alternate without duplicate products or photos', () {
    final plate = item('plate', '/plate.jpg');
    final cup = item('cup', '/cup.jpg');
    final duplicatePhoto = item('duplicate', '/plate.jpg');
    final secondCup = item('cup2', '/cup2.jpg');
    expect(
        mixPlateCupProducts([plate, duplicatePhoto], [cup, secondCup, plate])
            .map((p) => p.id),
        ['plate', 'cup', 'cup2']);
    expect(mixPlateCupProducts([], [cup]), [cup]);
  });
}
