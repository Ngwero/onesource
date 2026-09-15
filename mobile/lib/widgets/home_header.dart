import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../providers/notifications_provider.dart';
import 'brand_logo.dart';
import 'home_search_bar.dart';
import 'locale_currency_bar.dart';
import 'shop_mode_switch.dart';

/// Brand-first home header with a short staggered entrance.
class HomeHeader extends ConsumerStatefulWidget {
  const HomeHeader({
    super.key,
    required this.name,
    required this.onAccount,
    this.kitchenMode = false,
  });

  final String name;
  final VoidCallback onAccount;
  final bool kitchenMode;

  @override
  ConsumerState<HomeHeader> createState() => _HomeHeaderState();
}

class _HomeHeaderState extends ConsumerState<HomeHeader>
    with SingleTickerProviderStateMixin {
  late final AnimationController _intro;
  late final Animation<double> _brand;
  late final Animation<double> _body;
  late final Animation<Offset> _searchSlide;

  @override
  void initState() {
    super.initState();
    _intro = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 720),
    );
    _brand = CurvedAnimation(
      parent: _intro,
      curve: const Interval(0.0, 0.45, curve: Curves.easeOutCubic),
    );
    _body = CurvedAnimation(
      parent: _intro,
      curve: const Interval(0.2, 0.75, curve: Curves.easeOutCubic),
    );
    _searchSlide = Tween<Offset>(
      begin: const Offset(0, 0.35),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _intro,
        curve: const Interval(0.4, 1.0, curve: Curves.easeOutBack),
      ),
    );
    _intro.forward();
  }

  @override
  void dispose() {
    _intro.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final strings = ref.watch(stringsProvider);
    final topPad = MediaQuery.paddingOf(context).top;
    final kitchen = widget.kitchenMode;

    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: double.infinity,
          padding: EdgeInsets.fromLTRB(20, topPad + 12, 20, 34),
          decoration: BoxDecoration(
            color: kitchen ? const Color(0xFF243D32) : AppColors.darkGreen,
            borderRadius:
                const BorderRadius.vertical(bottom: Radius.circular(24)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              FadeTransition(
                opacity: _brand,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0, 0.18),
                    end: Offset.zero,
                  ).animate(_brand),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const BrandLogo(height: 34, onDark: true),
                            const SizedBox(height: 10),
                            Text(
                              '${strings.greetingForTime()}, ${widget.name}',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      _NotificationBellButton(
                        onTap: () => context.push('/notifications'),
                      ),
                      const SizedBox(width: 8),
                      _HeaderIconButton(
                        icon: Icons.person_outline_rounded,
                        onTap: widget.onAccount,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              FadeTransition(
                opacity: _body,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0, 0.12),
                    end: Offset.zero,
                  ).animate(_body),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const LocaleCurrencyBar(onDark: true, compact: true),
                      const SizedBox(height: 12),
                      ShopModeSwitch(
                        kitchenMode: kitchen,
                        onDark: true,
                      ),
                      const SizedBox(height: 22),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        Positioned(
          left: 20,
          right: 20,
          bottom: -22,
          child: FadeTransition(
            opacity: _body,
            child: SlideTransition(
              position: _searchSlide,
              child: HomeSearchBar(
                onDark: true,
                kitchenMode: kitchen,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _NotificationBellButton extends ConsumerWidget {
  const _NotificationBellButton({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadNotificationCountProvider);
    return Material(
      color: Colors.white.withValues(alpha: 0.08),
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 42,
          height: 42,
          child: Stack(
            alignment: Alignment.center,
            children: [
              const Icon(Icons.notifications_none_rounded, color: Colors.white, size: 22),
                  if (unread > 0)
                Positioned(
                  top: 8,
                  right: 8,
                  child: Container(
                    width: unread > 9 ? 20 : 16,
                    height: 16,
                    decoration: BoxDecoration(
                      color: AppColors.lemonGreen,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      unread > 9 ? '9+' : '$unread',
                      style: const TextStyle(
                        color: AppColors.darkGreen,
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        height: 1,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeaderIconButton extends StatelessWidget {
  const _HeaderIconButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.08),
      shape: const CircleBorder(),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 42,
          height: 42,
          child: Icon(icon, color: Colors.white, size: 22),
        ),
      ),
    );
  }
}
