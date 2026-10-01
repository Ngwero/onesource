import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/order.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/currency_provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../utils/cart_feedback.dart';
import '../utils/categories.dart';
import '../utils/open_url.dart';
import '../utils/responsive.dart';
import '../utils/user_facing_error.dart';
import '../widgets/popular_product_card.dart';
import '../widgets/product_thumbnail.dart';

const exportCategoryId = 'export-fresh-produce';
const _exportGreen = Color(0xFF064E3B);

bool isExportProduct(Product product) =>
    productMatchesCategory(product.category, exportCategoryId);

final exportProductsProvider = FutureProvider<List<Product>>((ref) async {
  ref.keepAlive();
  final page = await apiClientProvider.fetchProductsPage(
    category: exportCategoryId,
    pageSize: 200,
  );
  return page.products;
});

final _exportHeroImageProvider = FutureProvider<String?>((ref) async {
  try {
    final slides = await apiClientProvider.fetchHeroSlides(placement: 'exports');
    return slides.isEmpty ? null : slides.first.image;
  } catch (_) {
    return null;
  }
});

class ExportsScreen extends ConsumerWidget {
  const ExportsScreen({super.key});

  static const _destinations = [
    ('🇬🇧', 'London'),
    ('🇦🇪', 'Dubai'),
    ('🇧🇪', 'Brussels'),
    ('🇶🇦', 'Doha'),
    ('🇰🇪', 'Nairobi'),
    ('🇷🇼', 'Kigali'),
  ];

  static const _certifications = [
    'GlobalG.A.P.',
    'HACCP',
    'Phytosanitary certified',
    'EU market compliant',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = context.tr;
    final productsAsync = ref.watch(exportProductsProvider);
    final heroImage = ref.watch(_exportHeroImageProvider).valueOrNull;
    final exportCount = ref.watch(cartProvider.select(
      (items) => items.where((i) => isExportProduct(i.product)).fold<int>(0, (n, i) => n + i.quantity),
    ));

    final steps = [
      (Icons.agriculture_rounded, 'source'),
      (Icons.verified_rounded, 'quality'),
      (Icons.ac_unit_rounded, 'coldChain'),
      (Icons.flight_takeoff_rounded, 'freight'),
    ];
    final stats = [
      ('25+', 'exports.stats.markets'),
      ('1,200t', 'exports.stats.volume'),
      ('24/7', 'exports.stats.coldChain'),
      ('300+', 'exports.stats.farms'),
    ];

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Text(s.get('nav.exports')),
        backgroundColor: AppColors.canvas,
      ),
      floatingActionButton: exportCount > 0
          ? FloatingActionButton.extended(
              backgroundColor: _exportGreen,
              foregroundColor: Colors.white,
              onPressed: () => context.push('/exports/confirmation'),
              icon: const Icon(Icons.flight_takeoff_rounded),
              label: Text('${s.get('exports.confirmation.title')} ($exportCount)'),
            )
          : null,
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(exportProductsProvider),
        child: ListView(
          padding: EdgeInsets.only(bottom: shellBottomPadding(context) + 72),
          children: [
            _Hero(image: heroImage),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 2.2,
                children: [
                  for (final (value, key) in stats)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            value,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: _exportGreen,
                            ),
                          ),
                          Text(
                            s.get(key),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
            _SectionTitle(
              title: s.get('exports.products.title'),
              subtitle: s.get('exports.products.subtitle'),
            ),
            productsAsync.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator(color: _exportGreen)),
              ),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(16),
                child: Text(formatLoadError(e), textAlign: TextAlign.center),
              ),
              data: (products) => products.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(16),
                      child: Text(s.get('exports.products.empty'), textAlign: TextAlign.center),
                    )
                  : _ExportRows(products: products),
            ),
            _SectionTitle(
              title: s.get('exports.process.title'),
              subtitle: s.get('exports.process.subtitle'),
            ),
            for (final (index, (icon, key)) in steps.indexed)
              ListTile(
                leading: CircleAvatar(
                  backgroundColor: _exportGreen.withValues(alpha: 0.1),
                  foregroundColor: _exportGreen,
                  child: Icon(icon),
                ),
                title: Text(
                  '${index + 1}. ${s.get('exports.steps.$key.title')}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text(s.get('exports.steps.$key.desc')),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  Text(
                    s.get('exports.certifications'),
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  for (final c in _certifications)
                    Chip(
                      label: Text(c, style: const TextStyle(fontSize: 12)),
                      backgroundColor: Colors.white,
                      side: const BorderSide(color: AppColors.border),
                    ),
                ],
              ),
            ),
            _SectionTitle(
              title: s.get('exports.destinations.title'),
              subtitle: s.get('exports.destinations.subtitle'),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final (flag, city) in _destinations)
                    Chip(
                      avatar: Text(flag),
                      label: Text(city),
                      backgroundColor: Colors.white,
                      side: const BorderSide(color: AppColors.border),
                    ),
                ],
              ),
            ),
            Container(
              margin: const EdgeInsets.fromLTRB(16, 24, 16, 0),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: _exportGreen,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                children: [
                  Text(
                    s.get('exports.cta.title'),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    s.get('exports.cta.body'),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.white.withValues(alpha: 0.85), height: 1.4),
                  ),
                  const SizedBox(height: 14),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: _exportGreen,
                    ),
                    onPressed: () => openExternalUrl('mailto:exports@onesource.shop'),
                    icon: const Icon(Icons.mail_outline_rounded),
                    label: Text(s.get('exports.cta.button')),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Hero extends StatelessWidget {
  const _Hero({this.image});

  final String? image;

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      height: 230,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: _exportGreen,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (image != null)
            CachedNetworkImage(
              imageUrl: image!,
              fit: BoxFit.cover,
              errorWidget: (_, __, ___) => const SizedBox.shrink(),
            ),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.bottomCenter,
                end: Alignment.topCenter,
                colors: [Color(0xE6064E3B), Color(0x33064E3B)],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Text(
                  s.get('exports.hero.kicker').toUpperCase(),
                  style: const TextStyle(
                    color: Color(0xFFA7F3D0),
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  s.get('exports.hero.title'),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    height: 1.2,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  s.get('exports.hero.subtitle'),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.85), fontSize: 12.5),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 26, 16, 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.35)),
        ],
      ),
    );
  }
}

/// Export products grouped by commodity (first title segment), like the website.
class _ExportRows extends ConsumerWidget {
  const _ExportRows({required this.products});

  final List<Product> products;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = context.tr;
    final groups = <String, List<Product>>{};
    for (final p in products) {
      final name = p.id.startsWith('drink-')
          ? s.get('exports.products.drinks')
          : s.productTitle(p).split('–').first.trim();
      groups.putIfAbsent(name, () => []).add(p);
    }
    final rows = <(String, List<Product>)>[];
    final leftovers = <Product>[];
    for (final entry in groups.entries) {
      if (entry.value.length >= 4) {
        rows.add((entry.key, entry.value));
      } else {
        leftovers.addAll(entry.value);
      }
    }
    if (leftovers.isNotEmpty) rows.add((s.get('exports.products.more'), leftovers));

    return Column(
      children: [
        for (final (title, items) in rows)
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                  child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                ),
                SizedBox(
                  height: 236,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (context, i) => SizedBox(
                      width: 156,
                      child: PopularProductCard(
                        product: items[i],
                        onAdd: () => addToCartWithFeedback(context, ref, items[i]),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class ExportOrderScreen extends ConsumerStatefulWidget {
  const ExportOrderScreen({super.key});

  @override
  ConsumerState<ExportOrderScreen> createState() => _ExportOrderScreenState();
}

class _ExportOrderScreenState extends ConsumerState<ExportOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _company = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _country = TextEditingController();
  final _city = TextEditingController();
  final _address = TextEditingController();
  final _notes = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(authServiceProvider).user;
      _email.text = user?.email ?? '';
      final meta = user?.userMetadata?['full_name'];
      if (meta is String) _name.text = meta;
    });
  }

  @override
  void dispose() {
    for (final c in [_name, _company, _email, _phone, _country, _city, _address, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit(List<({Product product, int quantity})> items, double subtotal) async {
    if (!_formKey.currentState!.validate() || items.isEmpty) return;
    final s = context.tr;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      String? opt(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();
      final order = await apiClientProvider.placeOrder(
        CreateOrderPayload(
          orderType: 'export',
          userId: ref.read(authServiceProvider).user?.id,
          email: _email.text.trim(),
          fullName: _name.text.trim(),
          phone: opt(_phone),
          addressLine1: _address.text.trim(),
          addressLine2: opt(_company),
          city: _city.text.trim(),
          district: _country.text.trim(),
          notes: opt(_notes),
          subtotal: subtotal,
          deliveryFee: 0,
          total: subtotal,
          items: [
            for (final i in items)
              CreateOrderItem(
                productId: i.product.id,
                title: s.productTitle(i.product),
                image: i.product.image,
                unitPrice: i.product.price,
                quantity: i.quantity,
              ),
          ],
        ),
      );
      final cart = ref.read(cartProvider.notifier);
      for (final i in items) {
        cart.remove(i.product.id);
      }
      if (!mounted) return;
      context.go('/checkout/confirmation/${order.id}?type=export');
    } catch (e) {
      setState(() => _error = e is ApiException
          ? e.message
          : context.tr.get('exports.confirmation.submitFailed'));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final formatPrice = ref.watch(formatPriceProvider);
    final items = [
      for (final i in ref.watch(cartProvider))
        if (isExportProduct(i.product)) (product: i.product, quantity: i.quantity),
    ];
    final subtotal = items.fold<double>(0, (sum, i) => sum + i.product.price * i.quantity);
    String? required(String? v) =>
        v == null || v.trim().isEmpty ? s.get('app.form.required') : null;

    if (items.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(s.get('exports.confirmation.badge'))),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('✈', style: TextStyle(fontSize: 44)),
                const SizedBox(height: 12),
                Text(
                  s.get('exports.confirmation.emptyTitle'),
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                Text(
                  s.get('exports.confirmation.emptyText'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textMuted),
                ),
                const SizedBox(height: 18),
                FilledButton(
                  onPressed: () => context.go('/exports'),
                  child: Text(s.get('exports.confirmation.browse')),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(s.get('exports.confirmation.title'))),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              s.get('exports.confirmation.subtitle'),
              style: const TextStyle(color: AppColors.textMuted, height: 1.4),
            ),
            const SizedBox(height: 16),
            Text(
              s.get('exports.confirmation.orderSummary'),
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
            ),
            const SizedBox(height: 8),
            for (final i in items)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: ProductThumbnail(image: i.product.image, size: 52),
                title: Text(
                  s.productTitle(i.product),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(s.t('cart.qty', {'n': i.quantity})),
                trailing: Text(
                  formatPrice(i.product.price * i.quantity),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(s.get('exports.confirmation.estimatedTotal'),
                    style: const TextStyle(fontWeight: FontWeight.w800)),
                Text(formatPrice(subtotal),
                    style: const TextStyle(fontWeight: FontWeight.w800, color: _exportGreen)),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              s.get('exports.confirmation.freightNotice'),
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.35),
            ),
            TextButton(
              onPressed: () => context.go('/exports'),
              child: Text(s.get('exports.confirmation.addMore')),
            ),
            const Divider(height: 28),
            Text(s.get('exports.confirmation.buyerDetails'),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            Text(s.get('exports.confirmation.buyerHint'),
                style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            const SizedBox(height: 10),
            TextFormField(
              controller: _name,
              decoration: InputDecoration(
                labelText: s.get('auth.fullName'),
                hintText: s.get('exports.confirmation.namePlaceholder'),
              ),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _company,
              decoration: InputDecoration(
                labelText: s.get('exports.confirmation.company'),
                hintText: s.get('exports.confirmation.companyPlaceholder'),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: s.get('auth.email'),
                hintText: s.get('exports.confirmation.emailPlaceholder'),
              ),
              validator: (v) => v == null || !v.contains('@') ? s.get('app.form.validEmail') : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: s.get('checkout.phone'),
                hintText: s.get('exports.confirmation.phonePlaceholder'),
              ),
            ),
            const Divider(height: 28),
            Text(s.get('exports.confirmation.destination'),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            Text(s.get('exports.confirmation.destinationHint'),
                style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
            const SizedBox(height: 10),
            TextFormField(
              controller: _country,
              decoration: InputDecoration(
                labelText: s.get('exports.confirmation.country'),
                hintText: s.get('exports.confirmation.countryPlaceholder'),
              ),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _city,
              decoration: InputDecoration(
                labelText: s.get('checkout.city'),
                hintText: s.get('exports.confirmation.cityPlaceholder'),
              ),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address,
              decoration: InputDecoration(
                labelText: s.get('exports.confirmation.deliveryAddress'),
                hintText: s.get('exports.confirmation.addressPlaceholder'),
              ),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notes,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: s.get('exports.confirmation.requirements'),
                hintText: s.get('exports.confirmation.requirementsPlaceholder'),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
            ],
            const SizedBox(height: 18),
            ElevatedButton(
              onPressed: _submitting ? null : () => _submit(items, subtotal),
              child: Text(s.get(_submitting
                  ? 'exports.confirmation.submitting'
                  : 'exports.confirmation.confirm')),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
