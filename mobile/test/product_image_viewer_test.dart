import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:onesource_mobile/widgets/product_image_zoom.dart';

double _scaleOf(WidgetTester tester) {
  final viewer = tester.widget<InteractiveViewer>(find.byType(InteractiveViewer).first);
  return viewer.transformationController!.value.getMaxScaleOnAxis();
}

// Image placeholders spin forever, so pumpAndSettle would never finish.
Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 10; i++) {
    await tester.pump(const Duration(milliseconds: 60));
  }
}

void main() {
  const urls = ['https://example.com/a.webp', 'https://example.com/b.webp'];

  Future<void> openViewer(WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: TextButton(
                onPressed: () => openProductImageViewer(context, images: urls),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await _settle(tester);
  }

  testWidgets('viewer swipes between images and closes', (tester) async {
    await openViewer(tester);
    expect(find.byType(ProductImageViewer), findsOneWidget);
    expect(find.text('1 / 2'), findsOneWidget);

    await tester.fling(find.byType(PageView), const Offset(-400, 0), 1500);
    await _settle(tester);
    expect(find.text('2 / 2'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.close_rounded));
    await _settle(tester);
    expect(find.byType(ProductImageViewer), findsNothing);
  });

  testWidgets('double-tap zooms in and back out', (tester) async {
    await openViewer(tester);
    expect(_scaleOf(tester), closeTo(1, 0.001));

    final center = tester.getCenter(find.byType(InteractiveViewer).first);
    Future<void> doubleTap() async {
      await tester.tapAt(center);
      await tester.pump(const Duration(milliseconds: 60));
      await tester.tapAt(center);
      await _settle(tester);
    }

    await doubleTap();
    expect(_scaleOf(tester), greaterThan(2));

    await doubleTap();
    expect(_scaleOf(tester), closeTo(1, 0.001));
  });

  testWidgets('swipe down dismisses when not zoomed', (tester) async {
    await openViewer(tester);
    await tester.fling(find.byType(PageView), const Offset(0, 300), 1500);
    await _settle(tester);
    expect(find.byType(ProductImageViewer), findsNothing);
  });
}
