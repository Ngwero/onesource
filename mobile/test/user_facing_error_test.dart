import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:onesource_mobile/utils/user_facing_error.dart';

void main() {
  test('classifies transport failures as offline', () {
    expect(isOfflineError(Exception('SocketException: Failed host lookup')),
        isTrue);
    expect(isOfflineError(Exception('ClientException: connection refused')),
        isTrue);
  });

  test('does not classify server timeouts as offline', () {
    expect(isOfflineError(TimeoutException('database timeout')), isFalse);
    expect(isOfflineError(Exception('statement timeout')), isFalse);
  });
}
