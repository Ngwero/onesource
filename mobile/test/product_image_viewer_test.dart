import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:onesource_mobile/widgets/product_image_zoom.dart';

double _scaleOf(WidgetTester tester, {int index = 0}) {
  final transform =
      tester.widget<Transform>(find.byKey(ValueKey('product-zoom-$index')));
  return transform.transform.getMaxScaleOnAxis();
}

double _inlineScale(WidgetTester tester) {
  final transform = tester.widget<Transform>(
    find.descendant(
        of: find.byType(ZoomableProductImage),
        matching: find.byType(Transform)),
  );
  return transform.transform.getMaxScaleOnAxis();
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

    final center =
        tester.getCenter(find.byKey(const ValueKey('product-zoom-0')));
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

  testWidgets('double-tap away from the centre zooms toward that point',
      (tester) async {
    await openViewer(tester);
    final box = tester.getRect(find.byKey(const ValueKey('product-zoom-0')));
    final point = box.center + const Offset(-90, -70);
    final hits = tester
        .hitTestOnBinding(point)
        .path
        .map((h) => h.target.runtimeType)
        .join(',');
    expect(hits, contains('RenderPointerListener'),
        reason: 'box=$box point=$point hits=$hits');
    await tester.tapAt(point);
    await tester.pump(const Duration(milliseconds: 60));
    await tester.tapAt(point);
    await _settle(tester);
    expect(_scaleOf(tester), greaterThan(2), reason: 'box=$box point=$point');
  });

  testWidgets('swipe down dismisses when not zoomed', (tester) async {
    await openViewer(tester);
    await tester.fling(find.byType(PageView), const Offset(0, 300), 1500);
    await _settle(tester);
    expect(find.byType(ProductImageViewer), findsNothing);
  });

  testWidgets('photo shows Tap to zoom and a tap opens the viewer',
      (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: ZoomableProductImage(
              images: urls,
              size: 280,
              heroTag: 'product-image-1',
            ),
          ),
        ),
      ),
    );
    await tester.pump();
    expect(find.text('Tap to zoom'), findsOneWidget);
    expect(find.byIcon(Icons.zoom_in_rounded), findsOneWidget);

    await tester.tap(find.byType(ZoomableProductImage));
    await _settle(tester);
    expect(find.byType(ProductImageViewer), findsOneWidget);
  });

  testWidgets('pinch on the photo is not stolen by the page scroll',
      (tester) async {
    final controller = ScrollController();
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ListView(
            controller: controller,
            children: [
              const SizedBox(height: 40),
              Center(
                child: ZoomableProductImage(
                  images: urls,
                  size: 280,
                ),
              ),
              const SizedBox(height: 1200),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    final center = tester.getCenter(find.byType(ZoomableProductImage));
    final first = await tester.startGesture(center + const Offset(-24, 0));
    final second = await tester.startGesture(center + const Offset(24, 0));
    await tester.pump();
    await first.moveBy(const Offset(-48, 36));
    await second.moveBy(const Offset(48, 36));
    await tester.pump();

    expect(controller.offset, 0);
    expect(_inlineScale(tester), greaterThan(1.2));

    await first.up();
    await second.up();
    await tester.pump();
  });

  testWidgets('one finger drag on the photo still scrolls the page',
      (tester) async {
    final controller = ScrollController();
    addTearDown(controller.dispose);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ListView(
            controller: controller,
            children: [
              Center(
                child: ZoomableProductImage(
                  images: urls,
                  size: 280,
                ),
              ),
              const SizedBox(height: 1200),
            ],
          ),
        ),
      ),
    );
    await tester.pump();

    final center = tester.getCenter(find.byType(ZoomableProductImage));
    final finger = await tester.startGesture(center);
    await finger.moveBy(const Offset(0, -160));
    await tester.pump();
    expect(controller.offset, greaterThan(40));
    await finger.up();
    await _settle(tester);
  });
}
