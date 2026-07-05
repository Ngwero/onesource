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

  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

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

  /// Step 1: verify password on server and email OTP via One Source SMTP.
  Future<void> startLogin(String email, String password) async {
    await _api.requestLoginOtp(email, password);
  }

  Future<void> verifyLoginOtp(String email, String otp) async {
    final tokens = await _api.verifyLoginOtp(email, otp);
    await _client.auth.setSession(tokens.refreshToken);
  }

  Future<bool> signUp({
    required String email,
    required String password,
    required String fullName,
  }) async {
    final res = await _client.auth.signUp(
      email: email.trim(),
      password: password,
      data: {'full_name': fullName.trim()},
    );

    if (res.user != null) {
      try {
        await _client.from('profiles').upsert({
          'id': res.user!.id,
          'full_name': fullName.trim(),
          'updated_at': DateTime.now().toIso8601String(),
        });
      } catch (_) {}
    }

    return res.session == null;
  }

  Future<void> requestPasswordReset(String email) async {
    final redirectTo = '${Env.shopUrl}/reset-password';
    await _api.requestPasswordReset(email, redirectTo);
  }

  Future<void> signOut() => _client.auth.signOut();
}

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(apiClientProvider);
});

bool isSupabaseReady = false;

/// Riverpod flag so auth providers rebuild after Supabase initializes.
final supabaseReadyProvider = StateProvider<bool>((ref) => isSupabaseReady);

Future<void> initializeSupabase() async {
  if (!Env.isConfigured || isSupabaseReady) return;
  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey, // ignore: deprecated_member_use
    authOptions: const FlutterAuthClientOptions(
      // Avoid app_links crash on physical iOS when deep links aren't configured.
      detectSessionInUri: false,
    ),
  );
  isSupabaseReady = true;
}

final authStateProvider = StreamProvider<AuthState>((ref) {
  if (!ref.watch(supabaseReadyProvider)) {
    return const Stream<AuthState>.empty();
  }
  return Supabase.instance.client.auth.onAuthStateChange;
});

final profileProvider = FutureProvider<UserProfile?>((ref) async {
  if (!ref.watch(supabaseReadyProvider)) return null;
  final auth = ref.watch(authStateProvider);
  final user = auth.value?.session?.user;
  if (user == null) return null;
  return ref.read(authServiceProvider).fetchProfile(user.id);
});
