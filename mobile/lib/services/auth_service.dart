import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';
import 'api_client.dart';

class UserProfile {
  const UserProfile({required this.id, this.fullName});

  final String id;
  final String? fullName;
}

class AuthService {
  AuthService(this._api);

  final ApiClient _api;

  SupabaseClient get _client {
    if (!isSupabaseReady) {
      throw StateError('Supabase is not initialized yet');
    }
    return Supabase.instance.client;
  }

  Session? get session => _client.auth.currentSession;
  User? get user => _client.auth.currentUser;
  bool get isSignedIn => session != null;

  Stream<AuthState> get authStateChanges => safeAuthStateChanges(_client.auth);

  Future<UserProfile?> fetchProfile(String userId) async {
    final res = await _client
        .from('profiles')
        .select('id, full_name')
        .eq('id', userId)
        .maybeSingle();

    if (res != null) {
      return UserProfile(
        id: userId,
        fullName: res['full_name'] as String?,
      );
    }

    final meta = _client.auth.currentUser?.userMetadata?['full_name'];
    if (meta is String && meta.trim().isNotEmpty) {
      return UserProfile(id: userId, fullName: meta.trim());
    }
    return UserProfile(id: userId);
  }

  /// Step 1: verify password. Returns true when an email OTP step is required.
  Future<bool> startLogin(String email, String password) async {
    await _ensureSupabaseReady();
    final result = await _api.requestLoginOtp(email.trim(), password);
    if (!result.otpRequired &&
        result.accessToken != null &&
        result.refreshToken != null) {
      final response = await _client.auth.setSession(
        result.refreshToken!,
        accessToken: result.accessToken!,
      );
      if (response.session == null) {
        throw AuthException('Could not complete sign-in. Please try again.');
      }
      return false;
    }
    return true;
  }

  Future<void> verifyLoginOtp(String email, String otp) async {
    await _ensureSupabaseReady();
    final tokens = await _api.verifyLoginOtp(email.trim(), otp.trim());
    final response = await _client.auth.setSession(
      tokens.refreshToken,
      accessToken: tokens.accessToken,
    );
    if (response.session == null) {
      throw AuthException('Could not complete sign-in. Please try again.');
    }
  }

  Future<void> _ensureSupabaseReady() async {
    if (isSupabaseReady) return;
    await initializeSupabase();
    if (!isSupabaseReady) {
      throw StateError('Sign-in is not ready yet. Wait a moment and try again.');
    }
  }

  /// Creates account via API (same Brevo mail path as login OTP).
  /// Returns true if the user must sign in manually (rare).
  Future<bool> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    await _ensureSupabaseReady();
    final result = await _api.signUp(
      email: email.trim(),
      password: password,
      fullName: fullName.trim(),
    );

    if (result.needsSignIn ||
        result.accessToken == null ||
        result.refreshToken == null) {
      return true;
    }

    final response = await _client.auth.setSession(
      result.refreshToken!,
      accessToken: result.accessToken!,
    );
    if (response.session == null) {
      return true;
    }
    return false;
  }

  Future<void> requestPasswordReset(String email) async {
    final redirectTo = '${Env.shopUrl}/reset-password';
    await _api.requestPasswordReset(email, redirectTo);
  }

  /// Permanently deletes the account on the server, then clears the local session.
  Future<void> deleteAccount() async {
    await _ensureSupabaseReady();
    final accessToken = _client.auth.currentSession?.accessToken;
    if (accessToken == null || accessToken.isEmpty) {
      throw AuthException('Please sign in again to delete your account.');
    }
    await _api.deleteAccount(accessToken);
    await _client.auth.signOut();
  }

  /// Sets a new password for the signed-in user.
  Future<void> updatePassword(String newPassword) async {
    await _ensureSupabaseReady();
    await _client.auth.updateUser(UserAttributes(password: newPassword));
  }

  Future<void> signOut() => _client.auth.signOut();
}

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(apiClientProvider);
});

bool isSupabaseReady = false;
Completer<void>? _supabaseInitCompleter;

/// Called when [initializeSupabase] completes (e.g. from login before splash init).
void Function()? onSupabaseInitialized;

/// Riverpod flag so auth providers rebuild after Supabase initializes.
final supabaseReadyProvider = StateProvider<bool>((ref) => isSupabaseReady);

Future<void> initializeSupabase() async {
  if (!Env.isConfigured) return;
  if (isSupabaseReady) return;

  final inFlight = _supabaseInitCompleter;
  if (inFlight != null) return inFlight.future;

  final completer = Completer<void>();
  _supabaseInitCompleter = completer;

  try {
    await Supabase.initialize(
      url: Env.supabaseUrl,
      anonKey: Env.supabaseAnonKey, // ignore: deprecated_member_use
      authOptions: const FlutterAuthClientOptions(
        // Avoid app_links crash on physical iOS when deep links aren't configured.
        detectSessionInUri: false,
      ),
    );
    isSupabaseReady = true;
    onSupabaseInitialized?.call();
    completer.complete();
  } catch (e, stack) {
    // A revoked refresh token can fail session restore. Drop the local
    // session and let the app continue signed out instead of crashing.
    if (isStaleSessionError(e)) {
      debugPrint('[OneSource] stale session during Supabase init: $e');
      await signOutStaleSession();
    }
    _supabaseInitCompleter = null;
    completer.completeError(e, stack);
    rethrow;
  }
}

/// Refresh-token and session failures that mean the stored login is dead.
///
/// Network blips ([AuthRetryableFetchException]) are not stale: the saved
/// session may still be valid once connectivity returns.
bool isStaleSessionError(Object error) {
  if (error is AuthRetryableFetchException) return false;
  if (error is AuthSessionMissingException || error is AuthInvalidJwtException) {
    return true;
  }
  if (error is! AuthException) return false;

  final code = (error.code ?? '').toLowerCase();
  const staleCodes = {
    'refresh_token_not_found',
    'invalid_refresh_token',
    'refresh_token_already_used',
    'session_not_found',
    'session_expired',
    'bad_jwt',
    'invalid_jwt',
  };
  if (staleCodes.contains(code)) return true;

  final message = error.message.toLowerCase();
  return message.contains('refresh token') ||
      message.contains('refresh_token') ||
      message.contains('invalid jwt') ||
      message.contains('session expired') ||
      message.contains('session is missing') ||
      message.contains('session missing') ||
      message.contains('session not found') ||
      (message.contains('session') && message.contains('invalid'));
}

bool _staleSignOutInFlight = false;

/// Clears the persisted Supabase session without surfacing a refresh error.
Future<void> signOutStaleSession() async {
  if (_staleSignOutInFlight) return;
  _staleSignOutInFlight = true;
  try {
    if (!Supabase.instance.isInitialized) return;
    await Supabase.instance.client.auth.signOut(scope: SignOutScope.local);
  } catch (e, stack) {
    debugPrint('[OneSource] local sign-out after stale session failed: $e\n$stack');
  } finally {
    _staleSignOutInFlight = false;
  }
}

/// Auth recovery and token refresh push failures onto [GoTrueClient.onAuthStateChange].
/// A late listener (Riverpod) otherwise receives that error as its first event and
/// rethrows it during build. Translate those into a signed-out state.
Stream<AuthState> safeAuthStateChanges(GoTrueClient auth) {
  return mapAuthRecoveryErrors(
    auth.onAuthStateChange,
    readSession: () => auth.currentSession,
    onStaleSession: () {
      unawaited(signOutStaleSession());
    },
  );
}

@visibleForTesting
Stream<AuthState> mapAuthRecoveryErrors(
  Stream<AuthState> source, {
  required Session? Function() readSession,
  required void Function() onStaleSession,
}) {
  return source.transform(
    StreamTransformer<AuthState, AuthState>.fromHandlers(
      handleData: (data, sink) => sink.add(data),
      handleError: (error, stackTrace, sink) {
        if (isStaleSessionError(error)) {
          debugPrint('[OneSource] stale auth session, signing out locally: $error');
          onStaleSession();
          sink.add(const AuthState(AuthChangeEvent.signedOut, null));
          return;
        }
        debugPrint(
          '[OneSource] auth recovery error kept off the widget tree: $error\n$stackTrace',
        );
        final session = readSession();
        sink.add(
          AuthState(
            session == null ? AuthChangeEvent.signedOut : AuthChangeEvent.initialSession,
            session,
          ),
        );
      },
    ),
  );
}

final authStateProvider = StreamProvider<AuthState>((ref) {
  if (!ref.watch(supabaseReadyProvider)) {
    return const Stream<AuthState>.empty();
  }
  return safeAuthStateChanges(Supabase.instance.client.auth);
});

final profileProvider = FutureProvider<UserProfile?>((ref) async {
  if (!ref.watch(supabaseReadyProvider)) return null;
  final auth = ref.watch(authStateProvider);
  // Never let a session-restore failure fail this provider (and then the build).
  if (auth.hasError) return null;
  final user = auth.valueOrNull?.session?.user;
  if (user == null) return null;
  return ref.read(authServiceProvider).fetchProfile(user.id);
});
