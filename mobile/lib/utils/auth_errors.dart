import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/api_client.dart';

String formatAuthError(Object error) {
  if (error is ApiException) return error.message;
  if (error is AuthException) {
    final msg = error.message.toLowerCase();
    if (msg.contains('session missing')) {
      return 'Your login code expired. Sign in again to get a new code.';
    }
    return error.message;
  }
  if (error is StateError) return error.message;
  return 'Something went wrong. Please try again.';
}
