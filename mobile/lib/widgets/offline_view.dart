import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';

/// Full-screen connection state used only for genuine device network errors.
class OfflineView extends StatelessWidget {
  const OfflineView({super.key, this.onRetry});

  static const _asset = 'assets/lottie/offline-connection.json';

  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final tr = context.tr;
    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    return ColoredBox(
      color: AppColors.canvas,
      child: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) => SingleChildScrollView(
            physics: const ClampingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(24, 28, 24, 32),
            child: ConstrainedBox(
              constraints:
                  BoxConstraints(minHeight: constraints.maxHeight - 60),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Semantics(
                    label: tr.or('app.errors.offlineTitle', 'You’re offline'),
                    image: true,
                    child: SizedBox.square(
                      dimension: 230,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Lottie.asset(
                            _asset,
                            repeat: true,
                            animate: !reduceMotion,
                            backgroundLoading: true,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) =>
                                const SizedBox.shrink(),
                          ),
                          Container(
                            width: 92,
                            height: 92,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.darkGreen
                                      .withValues(alpha: 0.12),
                                  blurRadius: 28,
                                  offset: const Offset(0, 12),
                                ),
                              ],
                            ),
                            child: const Icon(
                              Icons.wifi_off_rounded,
                              size: 46,
                              color: AppColors.darkGreen,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    tr.or('app.errors.offlineTitle', 'You’re offline'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontFamily: 'Gabarito',
                      fontSize: 30,
                      height: 1.05,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.8,
                      color: AppColors.text,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 330),
                    child: Text(
                      tr.get('app.errors.offline'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 15,
                        height: 1.5,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ),
                  if (onRetry != null) ...[
                    const SizedBox(height: 28),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        onPressed: onRetry,
                        icon: const Icon(Icons.refresh_rounded),
                        label: Text(tr.get('common.retry')),
                        style: FilledButton.styleFrom(
                          backgroundColor: AppColors.darkGreen,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          textStyle: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 18),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.info_outline_rounded,
                          size: 16, color: AppColors.textMuted),
                      const SizedBox(width: 7),
                      Flexible(
                        child: Text(
                          tr.or(
                            'app.errors.offlineHint',
                            'Check Wi-Fi or mobile data, then try again.',
                          ),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
