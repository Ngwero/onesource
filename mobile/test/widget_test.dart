import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:onesource_mobile/config/theme.dart';

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
}
