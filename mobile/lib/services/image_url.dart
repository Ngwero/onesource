import '../config/env.dart';

/// Card and list rendition. Matches web `IMAGE_WIDTH.card`.
const int imageWidthCard = 400;

/// Detail and pinch-zoom rendition. Matches web hero width.
const int imageWidthDetail = 1200;

const int _defaultQuality = 70;
const String _objectPublic = '/storage/v1/object/public/';

/// Public Storage object URL, or null when [url] is not on Supabase.
String? toPublicObjectUrl(String url) {
  if (url.contains('.supabase.co') && url.contains(_objectPublic)) {
    return url.split('#').first.split('?').first;
  }

  final origin = Env.supabaseUrl.replaceAll(RegExp(r'/$'), '');
  if (origin.isNotEmpty && url.startsWith('/uploads/')) {
    final objectPath = url.substring('/uploads/'.length);
    return '$origin$_objectPublic${Env.storageBucket}/$objectPath';
  }

  return null;
}

int clampImageQuality(int raw) {
  if (raw < 50) return 50;
  if (raw > 85) return 85;
  return raw;
}

/// Supabase render endpoint. Width is a maximum: Storage does not enlarge,
/// so a 146×184 pharmacy cover stays 146×184.
String? supabaseTransformUrl(
  String publicObjectUrl, {
  required int width,
  int quality = _defaultQuality,
}) {
  final idx = publicObjectUrl.indexOf(_objectPublic);
  if (idx < 0) return null;
  final origin = publicObjectUrl.substring(0, idx);
  final objectPath = publicObjectUrl.substring(idx + _objectPublic.length);
  final params =
      'width=$width&quality=${clampImageQuality(quality)}&resize=contain';
  return '$origin/storage/v1/render/image/public/$objectPath?$params';
}

/// Resolve product image paths to full URLs.
///
/// Supabase public objects become a render URL when [width] is set.
/// Other hosts, including non-Supabase `http(s)` URLs, are left unchanged.
String resolveImageUrl(
  String? src, {
  int? width,
  int quality = _defaultQuality,
}) {
  if (src == null || src.trim().isEmpty) return '';
  final url = src.trim();

  if (url.startsWith('data:')) return url;

  final publicUrl = toPublicObjectUrl(url);
  if (publicUrl != null) {
    if (width != null && width > 0) {
      return supabaseTransformUrl(
            publicUrl,
            width: width,
            quality: quality,
          ) ??
          publicUrl;
    }
    return publicUrl;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/')) {
    final base = Env.apiBaseUrl.replaceAll(RegExp(r'/api$'), '');
    return '$base$url';
  }

  return url;
}
