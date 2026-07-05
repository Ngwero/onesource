/// Runtime configuration via --dart-define or defaults for local dev.
///
/// Example:
/// flutter run \
///   --dart-define=SUPABASE_URL=https://xxx.supabase.co \
///   --dart-define=SUPABASE_ANON_KEY=eyJ... \
///   --dart-define=API_BASE_URL=http://10.0.2.2:3001/api
class Env {
  static const supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://kobbhuispglyflddjeqi.supabase.co',
  );

  static const supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtvYmJodWlzcGdseWZsZGRqZXFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NDc0NjcsImV4cCI6MjA5NTAyMzQ2N30.yb-ogFaXNXOfxOemIxx98WlMPlSyHXetj-v311IbJhc',
  );

  /// Shop API base URL including `/api` suffix.
  /// Android emulator: use http://10.0.2.2:3001/api
  /// iOS simulator: use http://localhost:3001/api
  /// Production: https://www.onesourco.com/api
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://www.onesourco.com/api',
  );

  static const storageBucket = String.fromEnvironment(
    'SUPABASE_STORAGE_BUCKET',
    defaultValue: 'images',
  );

  static bool get isConfigured =>
      supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;

  /// Public shop URL (no trailing slash) — used in password-reset emails.
  static String get shopUrl {
    const override = String.fromEnvironment('SHOP_URL');
    if (override.isNotEmpty) return override.replaceAll(RegExp(r'/$'), '');
    return apiBaseUrl.replaceAll(RegExp(r'/api/?$'), '');
  }
}
