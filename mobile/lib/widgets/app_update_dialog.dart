import 'dart:io' show Platform;
import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../services/app_update_service.dart';
import '../utils/open_url.dart';

bool _checkedThisLaunch = false;

/// Checks once per launch and shows the update prompt when a newer build is live.
Future<void> maybeShowAppUpdate(BuildContext context) async {
  if (_checkedThisLaunch) return;
  _checkedThisLaunch = true;
  final update = await checkForAppUpdate();
  if (update == null || !context.mounted) return;
  await showGeneralDialog<void>(
    context: context,
    barrierDismissible: !update.forced,
    barrierLabel: MaterialLocalizations.of(context).modalBarrierDismissLabel,
    barrierColor: Colors.transparent,
    transitionDuration: const Duration(milliseconds: 320),
    pageBuilder: (_, __, ___) => _AppUpdateDialog(update: update),
    transitionBuilder: (_, animation, __, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutBack);
      return Stack(
        children: [
          Positioned.fill(
            child: AnimatedBuilder(
              animation: animation,
              builder: (_, __) => BackdropFilter(
                filter: ImageFilter.blur(
                  sigmaX: 14 * animation.value,
                  sigmaY: 14 * animation.value,
                ),
                child: ColoredBox(
                  color: AppColors.leafDark.withValues(alpha: 0.35 * animation.value),
                ),
              ),
            ),
          ),
          FadeTransition(
            opacity: animation,
            child: ScaleTransition(
              scale: Tween<double>(begin: 0.88, end: 1).animate(curved),
              child: child,
            ),
          ),
        ],
      );
    },
  );
}

Future<void> _openStore(AppUpdateInfo update) async {
  if (Platform.isAndroid) {
    final package = Uri.parse(update.storeUrl).queryParameters['id'];
    if (package != null && await openExternalUrl('market://details?id=$package')) return;
  }
  await openExternalUrl(update.storeUrl);
}

class _AppUpdateDialog extends StatelessWidget {
  const _AppUpdateDialog({required this.update});

  final AppUpdateInfo update;

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    const radius = BorderRadius.all(Radius.circular(32));
    return PopScope(
      canPop: !update.forced,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Material(
              type: MaterialType.transparency,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: radius,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.25),
                      blurRadius: 40,
                      offset: const Offset(0, 20),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: radius,
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: radius,
                        border: Border.all(color: Colors.white.withValues(alpha: 0.55), width: 1.2),
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            Colors.white.withValues(alpha: 0.78),
                            Colors.white.withValues(alpha: 0.52),
                            AppColors.leafPale.withValues(alpha: 0.62),
                          ],
                        ),
                      ),
                      child: Stack(
                        children: [
                          const Positioned(top: 0, left: 0, right: 0, child: _MirrorSheen()),
                          Padding(
                            padding: const EdgeInsets.fromLTRB(24, 30, 24, 18),
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const _GlowIcon(),
                                const SizedBox(height: 20),
                                Text(
                                  s.get('app.update.title'),
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: -0.4,
                                    color: AppColors.leafDark,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                _VersionChip(from: update.current, to: update.latest),
                                const SizedBox(height: 14),
                                Text(
                                  s.t(update.forced ? 'app.update.forcedBody' : 'app.update.body', {
                                    'version': update.latest,
                                    'current': update.current,
                                  }),
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                    color: AppColors.leafDark.withValues(alpha: 0.75),
                                    height: 1.45,
                                    fontSize: 14.5,
                                  ),
                                ),
                                const SizedBox(height: 24),
                                _GradientButton(
                                  label: s.get('app.update.now'),
                                  onTap: () => _openStore(update),
                                ),
                                if (!update.forced) ...[
                                  const SizedBox(height: 6),
                                  TextButton(
                                    onPressed: () {
                                      rememberUpdateDismissed(update.latest);
                                      Navigator.of(context).pop();
                                    },
                                    style: TextButton.styleFrom(
                                      foregroundColor: AppColors.leafDark.withValues(alpha: 0.7),
                                      minimumSize: const Size.fromHeight(44),
                                    ),
                                    child: Text(
                                      s.get('app.update.later'),
                                      style: const TextStyle(fontWeight: FontWeight.w600),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Glossy reflection across the top of the glass panel.
class _MirrorSheen extends StatelessWidget {
  const _MirrorSheen();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Colors.white.withValues(alpha: 0.7),
              Colors.white.withValues(alpha: 0),
            ],
          ),
        ),
      ),
    );
  }
}

class _GlowIcon extends StatelessWidget {
  const _GlowIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 76,
      height: 76,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF3A7359), AppColors.leafDark],
        ),
        border: Border.all(color: Colors.white.withValues(alpha: 0.8), width: 3),
        boxShadow: [
          BoxShadow(
            color: AppColors.darkGreen.withValues(alpha: 0.45),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: const Icon(Icons.rocket_launch_rounded, size: 34, color: Colors.white),
    );
  }
}

class _VersionChip extends StatelessWidget {
  const _VersionChip({required this.from, required this.to});

  final String from;
  final String to;

  @override
  Widget build(BuildContext context) {
    final muted = AppColors.leafDark.withValues(alpha: 0.55);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.9)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('v$from', style: TextStyle(color: muted, fontWeight: FontWeight.w600, fontSize: 12.5)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6),
            child: Icon(Icons.arrow_forward_rounded, size: 14, color: muted),
          ),
          Text(
            'v$to',
            style: const TextStyle(
              color: AppColors.darkGreen,
              fontWeight: FontWeight.w800,
              fontSize: 12.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _GradientButton extends StatelessWidget {
  const _GradientButton({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    const radius = BorderRadius.all(Radius.circular(18));
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        gradient: const LinearGradient(
          colors: [Color(0xFF3A7359), AppColors.darkGreen, AppColors.leafDark],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.darkGreen.withValues(alpha: 0.4),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          child: SizedBox(
            height: 54,
            width: double.infinity,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.download_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Text(
                  label,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
