import '../config/env.dart';

/// Resolve product image paths to full URLs.
String resolveImageUrl(String? src) {
  if (src == null || src.trim().isEmpty) return '';
  final url = src.trim();

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/uploads/')) {
    final objectPath = url.substring('/uploads/'.length);
    return '${Env.supabaseUrl.replaceAll(RegExp(r'/$'), '')}'
        '/storage/v1/object/public/${Env.storageBucket}/$objectPath';
  }

  if (url.startsWith('/')) {
  final base = Env.apiBaseUrl.replaceAll(RegExp(r'/api$'), '');
    return '$base$url';
  }

  return url;
}
