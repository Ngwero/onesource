import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../data/kitchen_ware.dart';
import '../providers/kitchen_catalog_provider.dart';
import '../utils/responsive.dart';
import '../widgets/product_grid.dart';
import '../utils/shop_mode.dart';
import '../widgets/shop_mode_switch.dart';

class KitchenCategoriesScreen extends ConsumerWidget {
  const KitchenCategoriesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final previews = {
      for (final aisle in kitchenWareAisles) aisle.id: ref.watch(kitchenAislePreviewProvider(aisle.id)),
    };

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(context.tr.get('kitchen.zonesTitle')),
        backgroundColor: AppColors.canvas,
      ),
      body: Builder(
        builder: (context) {
          return RefreshIndicator(
            onRefresh: () async {
              for (final aisle in kitchenWareAisles) {
                ref.invalidate(kitchenAislePreviewProvider(aisle.id));
              }
            },
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
              children: [
                const ShopModeSwitch(mode: ShopMode.kitchen),
                const SizedBox(height: 16),
                Text(
                  context.tr.get('kitchen.zoneHint'),
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 16),
                // Always list every subcategory — same pattern as Fresh categories.
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: categoryGridCount(context),
                    mainAxisExtent: 118,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  itemCount: kitchenWareAisles.length,
                  itemBuilder: (context, index) {
                    final aisle = kitchenWareAisles[index];
                    final accent = Color(aisle.accentArgb);
                    final preview = previews[aisle.id]!;
                    return Card(
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () => context.push(kitchenAislePath(aisle.id)),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                accent.withValues(alpha: 0.16),
                                AppColors.surface,
                              ],
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(aisle.icon, style: const TextStyle(fontSize: 26)),
                                  const Spacer(),
                                  Text(
                                    preview.whenOrNull(data: (r) => '${r.total}') ?? '…',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      color: accent,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                              const Spacer(),
                              Text(
                                context.tr.kitchenAisle(aisle.id, aisle.title),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 24),
                for (final aisle in kitchenWareAisles)
                  if (previews[aisle.id]!.valueOrNull?.products case final items? when items.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(aisle.icon, style: const TextStyle(fontSize: 20)),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  context.tr.kitchenAisle(aisle.id, aisle.title),
                                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 17),
                                ),
                              ),
                              TextButton(
                                onPressed: () => context.push(kitchenAislePath(aisle.id)),
                                child: Text(context.tr.get('common.seeAll')),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          ProductGrid(products: items.take(4).toList()),
                        ],
                      ),
                    ),
              ],
            ),
          );
        },
      ),
    );
  }
}
