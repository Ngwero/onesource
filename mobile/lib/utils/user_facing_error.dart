import 'dart:convert';

import 'package:supabase_flutter/supabase_flutter.dart';

import '../services/api_client.dart';

/// Turns raw exceptions / API payloads into short, user-safe copy.
String formatUserFacingError(
  Object error, {
  String fallback = 'Something went wrong. Please try again.',
}) {
  if (error is ApiException) {
    return _sanitizeMessage(error.message, fallback: fallback);
  }
  if (error is AuthException) {
    return _mapAuthMessage(error.message, fallback: fallback);
  }
  if (error is StateError) {
    return _sanitizeMessage(error.message, fallback: fallback);
  }

  final raw = error.toString();
  // Strip "Exception: " / "Error: " prefixes Flutter often adds.
  final cleaned = raw
      .replaceFirst(RegExp(r'^(Exception|Error|ApiException):\s*', caseSensitive: false), '')
      .trim();
  return _sanitizeMessage(cleaned, fallback: fallback);
}

/// Prefer this for auth screens (same sanitizer, auth-aware mapping).
String formatAuthError(Object error) => formatUserFacingError(
      error,
      fallback: 'We could not complete that request. Please try again.',
    );

String formatLoadError(Object error) => formatUserFacingError(
      error,
      fallback: 'We could not load this right now. Please try again.',
    );

String formatCheckoutError(Object error) => formatUserFacingError(
      error,
      fallback: 'We could not place your order. Please check your details and try again.',
    );

String _mapAuthMessage(String message, {required String fallback}) {
  final lower = message.toLowerCase();
  if (lower.contains('session missing') || lower.contains('expired')) {
    return 'Your login code expired. Sign in again to get a new code.';
  }
  if (lower.contains('invalid login') || lower.contains('invalid email or password')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (lower.contains('already') && (lower.contains('registered') || lower.contains('exists'))) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (lower.contains('network') || lower.contains('socket') || lower.contains('failed host lookup')) {
    return 'Please check your internet connection and try again.';
  }
  if (lower.contains('confirm') && lower.contains('email')) {
    return 'We could not send a confirmation email. Please try again shortly.';
  }
  if (lower.contains('unexpected_failure') || lower.contains('"code"')) {
    return _sanitizeMessage(message, fallback: fallback);
  }
  return _sanitizeMessage(message, fallback: fallback);
}

String _sanitizeMessage(String message, {required String fallback}) {
  final trimmed = message.trim();
  if (trimmed.isEmpty) return fallback;

  // Raw JSON from APIs / Supabase
  if (trimmed.startsWith('{') && trimmed.contains('"')) {
    try {
      final decoded = jsonDecode(trimmed);
      if (decoded is Map) {
        final nested = decoded['error'];
        if (nested is Map && nested['message'] is String) {
          return _sanitizeMessage(nested['message'] as String, fallback: fallback);
        }
        final msg = decoded['message'] ?? decoded['error'] ?? decoded['msg'];
        if (msg is String && msg.trim().isNotEmpty) {
          return _humanizeTechnical(msg.trim(), fallback: fallback);
        }
      }
    } catch (_) {
      return fallback;
    }
    return fallback;
  }

  return _humanizeTechnical(trimmed, fallback: fallback);
}

String _humanizeTechnical(String message, {required String fallback}) {
  final lower = message.toLowerCase();

  if (lower.contains('error sending confirmation email') ||
      lower.contains('unexpected_failure')) {
    return 'We could not finish creating your account right now. Please try again in a moment.';
  }
  if (lower.contains('socketexception') ||
      lower.contains('clientexception') ||
      lower.contains('failed host lookup') ||
      lower.contains('connection refused') ||
      lower.contains('network is unreachable') ||
      lower.contains('timed out') ||
      lower.contains('timeout')) {
    return 'Please check your internet connection and try again.';
  }
  if (lower.contains('xmlhttprequest') || lower.contains('statuscode')) {
    return fallback;
  }
  // Stack-trace-ish or very long technical blobs
  if (trimmedLooksTechnical(message)) {
    return fallback;
  }
  // Cap length for UI
  if (message.length > 180) {
    return fallback;
  }
  return message;
}

bool trimmedLooksTechnical(String message) {
  final lower = message.toLowerCase();
  if (lower.contains('stack trace') ||
      lower.contains('#0 ') ||
      lower.contains('dart:') ||
      lower.contains('package:') ||
      lower.contains('at object.')) {
    return true;
  }
  return RegExp(r'\b[a-z]+exception\b', caseSensitive: false).hasMatch(message) &&
      message.contains(':');
}
