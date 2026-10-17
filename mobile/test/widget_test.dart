import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:onesource_mobile/config/theme.dart';
import 'package:onesource_mobile/widgets/loading_view.dart';

void main() {
  testWidgets('One Source theme builds', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: const Scaffold(body: Text('One Source')),
      ),
    );
    expect(find.text('One Source'), findsOneWidget);
  });

  testWidgets('offline errors use the full-screen retry state', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildAppTheme(),
        home: Scaffold(
          body: ErrorView(
            message: Exception('SocketException: Failed host lookup'),
            onRetry: () {},
          ),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('You’re offline'), findsOneWidget);
    expect(find.byIcon(Icons.refresh_rounded), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
