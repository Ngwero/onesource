import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../utils/open_url.dart';

/// In-app copy of the website's Privacy and Cookie Notice (`/privacy`).
/// The legal text stays in English, as on the website.
class PrivacyScreen extends StatelessWidget {
  const PrivacyScreen({super.key});

  static const _sections = <(String, List<String>)>[
    (
      '1. About this Notice',
      [
        'This Privacy and Cookie Notice explains how One Source (“we”, “us”, “our”) collects and processes your personal data when you use our website, mobile applications, and related services for ordering fresh produce, kitchen ware, cosmetics, and delivery across Uganda.',
      ],
    ),
    (
      '2. The data we collect about you',
      [
        'We collect personal data to provide and improve our products and services. Depending on how you use One Source, this may include:',
        '• Information you provide: name, email address, phone number, delivery address, account password, and order notes.',
        '• Order and payment-related data: items purchased, basket contents, delivery preferences, and cash-on-delivery order details. We currently accept cash on delivery only and do not process card payments in the app.',
        '• Usage data: pages and products viewed, searches, device type, app version, and approximate technical logs needed to keep the service secure and reliable.',
        '• Communications: messages you send to support, and transactional emails we send (for example login codes, password reset links, and order updates).',
        'We do not require access to your SMS inbox, full contacts list, or installed app list to use One Source shopping features.',
      ],
    ),
    (
      '3. Cookies and how we use them',
      [
        'A cookie (or similar technology) is a small file stored on your device. We use cookies and local storage to:',
        '• Keep you signed in and remember language or currency preferences',
        '• Save your basket, saved items, browsing history and shopping session',
        '• Measure basic site performance and fix errors',
        '• Improve how the shop works for returning customers',
        'You can control cookies through your browser or device settings. Disabling some cookies may limit features such as staying signed in or keeping your basket.',
      ],
    ),
    (
      '4. How we use your personal data',
      [
        'We use your personal data to:',
        '• Create and manage your One Source account',
        '• Process, pack, and deliver your orders',
        '• Send service messages (login codes, password resets, order status)',
        '• Provide customer support and resolve disputes',
        '• Improve our website, apps, catalogue, and delivery experience',
        '• Detect fraud, abuse, and security incidents',
        '• Meet legal and accounting obligations',
        '• Where permitted, send updates about products or offers — you can opt out of marketing messages at any time',
      ],
    ),
    (
      '5. How we share your personal data',
      [
        'We share personal data only when needed to run One Source, including with:',
        '• Delivery and fulfilment partners so your order can reach you',
        '• Infrastructure providers (hosting, database, email delivery) acting on our instructions',
        '• Authorities when required by law or to protect rights, safety, and security',
        'We do not sell your personal data. Service providers may only process your data for the purposes we specify.',
      ],
    ),
    (
      '6. International transfers',
      [
        'Some of our service providers may process data on servers outside Uganda. When that happens, we take steps appropriate under applicable law to protect your information, and we continue to respect your rights described in this notice.',
      ],
    ),
    (
      '7. Data security',
      [
        'We use technical and organisational measures designed to protect personal data against accidental loss, unauthorised access, alteration, or disclosure. Access is limited to people and systems that need the data to perform their work. No method of transmission over the internet is completely secure; please use a strong password and keep your login details private.',
      ],
    ),
    (
      '8. Your legal rights',
      [
        'Subject to applicable law, you may have the right to:',
        '• Access the personal data we hold about you',
        '• Ask us to correct inaccurate data',
        '• Ask us to delete or restrict certain processing',
        '• Object to certain uses of your data',
        '• Unsubscribe from marketing emails',
        'You can delete your One Source account at any time in the mobile app: open Account, then choose Delete account and confirm. This permanently removes your login and personal account details. Order records we must keep for business or legal reasons are anonymized so they no longer identify you. For other privacy requests, contact us using the details below.',
      ],
    ),
    (
      '9. Further details',
      [
        'If you have questions about this notice, how we process personal data, or wish to exercise your rights, contact One Source:',
        'Website: https://www.onesourco.com',
        'Email: noreply@one-sourcebrand.com',
        'We may update this notice from time to time. The “Last updated” date at the top of this page will change when we do. Continued use of One Source after an update means you acknowledge the revised notice.',
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(s.get('app.privacy.title')),
        backgroundColor: AppColors.canvas,
        actions: [
          IconButton(
            tooltip: s.get('app.privacy.openWebsite'),
            icon: const Icon(Icons.open_in_new_rounded),
            onPressed: openPrivacyPolicy,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 40),
        children: [
          const Text(
            'Privacy and Cookie Notice',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            s.t('app.privacy.lastUpdated', {'date': '24 September 2026'}),
            style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
          ),
          if (s.language.name != 'en') ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.leafPale,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                s.get('app.privacy.englishNote'),
                style: const TextStyle(fontSize: 13, height: 1.4),
              ),
            ),
          ],
          for (final (title, paragraphs) in _sections) ...[
            const SizedBox(height: 22),
            Text(title, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            for (final p in paragraphs) ...[
              const SizedBox(height: 8),
              Text(
                p,
                style: TextStyle(
                  color: AppColors.text.withValues(alpha: 0.8),
                  height: 1.5,
                  fontSize: 14.5,
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}
