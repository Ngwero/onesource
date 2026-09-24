import 'package:url_launcher/url_launcher.dart';

import '../config/env.dart';

Future<bool> openExternalUrl(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return false;
  return launchUrl(uri, mode: LaunchMode.externalApplication);
}

Future<bool> openPrivacyPolicy() =>
    openExternalUrl('${Env.shopUrl}/privacy');
