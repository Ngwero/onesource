import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';

class NotFoundScreen extends StatelessWidget {
  const NotFoundScreen({super.key, this.title, this.body});

  final String? title;
  final String? body;

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(title: Text(s.get('common.brand', fallback: 'One Source'))),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '404',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: AppColors.accent,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.2,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  title ?? s.get('notFoundPage.title', fallback: s.get('app.errors.notFound')),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  body ??
                      s.get(
                        'notFoundPage.body',
                        fallback: s.get('app.errors.notFound'),
                      ),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textMuted, height: 1.4),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () => context.go('/home'),
                  child: Text(s.get('notFoundPage.home', fallback: s.get('common.backToShop'))),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
