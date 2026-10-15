import 'package:flutter_test/flutter_test.dart';
import 'package:onesource_mobile/services/auth_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  test('refresh_token_not_found signs out instead of surfacing the error', () async {
    final events = <AuthState>[];
    var signOuts = 0;
    final mapped = mapAuthRecoveryErrors(
      Stream<AuthState>.error(
        AuthApiException(
          'Invalid Refresh Token: Refresh Token Not Found',
          statusCode: '400',
          code: 'refresh_token_not_found',
        ),
      ),
      readSession: () => null,
      onStaleSession: () => signOuts++,
    );

    await mapped.listen(events.add).asFuture<void>();

    expect(signOuts, 1);
    expect(events, hasLength(1));
    expect(events.single.event, AuthChangeEvent.signedOut);
    expect(events.single.session, isNull);
  });

  test('invalid_refresh_token and session-expired messages sign out', () async {
    final cases = [
      AuthApiException('Invalid Refresh Token', statusCode: '400', code: 'invalid_refresh_token'),
      AuthException('Session expired.'),
      AuthSessionMissingException(),
      AuthException('Current session is missing data.'),
    ];

    for (final error in cases) {
      expect(isStaleSessionError(error), isTrue, reason: '$error');
      final events = <AuthState>[];
      var signOuts = 0;
      final mapped = mapAuthRecoveryErrors(
        Stream<AuthState>.error(error),
        readSession: () => null,
        onStaleSession: () => signOuts++,
      );
      await mapped.listen(events.add).asFuture<void>();
      expect(signOuts, 1, reason: '$error');
      expect(events.single.event, AuthChangeEvent.signedOut, reason: '$error');
    }
  });

  test('a retryable network refresh does not sign out', () async {
    final events = <AuthState>[];
    var signOuts = 0;
    final mapped = mapAuthRecoveryErrors(
      Stream<AuthState>.error(AuthRetryableFetchException(message: 'offline')),
      readSession: () => null,
      onStaleSession: () => signOuts++,
    );

    await mapped.listen(events.add).asFuture<void>();

    expect(isStaleSessionError(AuthRetryableFetchException()), isFalse);
    expect(signOuts, 0);
    expect(events.single.event, AuthChangeEvent.signedOut);
    expect(events.single.session, isNull);
  });

  test('a normal auth event is forwarded', () async {
    const state = AuthState(AuthChangeEvent.initialSession, null);
    final events = <AuthState>[];
    final mapped = mapAuthRecoveryErrors(
      Stream<AuthState>.value(state),
      readSession: () => null,
      onStaleSession: () => fail('should not sign out'),
    );

    await mapped.listen(events.add).asFuture<void>();
    expect(events, [state]);
  });
}
