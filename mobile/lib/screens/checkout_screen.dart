import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/order.dart';
import '../providers/cart_provider.dart';
import '../providers/currency_provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/checkout.dart';
import '../utils/user_facing_error.dart';
import 'exports_screens.dart' show isExportProduct;

enum _Payment { cash, mobileMoney }

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _address2 = TextEditingController();
  final _city = TextEditingController();
  final _district = TextEditingController();
  final _notes = TextEditingController();
  _Payment _payment = _Payment.cash;
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
      if (mounted) _city.text = context.tr.get('checkout.defaultCity');
    });
  }

  @override
  void dispose() {
    for (final c in [_name, _email, _phone, _address, _address2, _city, _district, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final items = ref.read(cartProvider).where((i) => !isExportProduct(i.product)).toList();
    if (items.isEmpty) return;
    final s = context.tr;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final subtotal = items.fold<double>(0, (sum, i) => sum + i.lineTotal);
      final totals = calcOrderTotal(subtotal);
      final user = ref.read(authServiceProvider).user;
      String? opt(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();
      final paymentNote = _payment == _Payment.mobileMoney
          ? s.get('checkout.mobileMoney')
          : s.get('checkout.payOnDelivery');
      final notes = [opt(_notes), '${s.get('checkout.payment')}: $paymentNote']
          .whereType<String>()
          .join('\n');

      final payload = CreateOrderPayload(
        userId: user?.id,
        email: _email.text.trim(),
        fullName: _name.text.trim(),
        phone: opt(_phone),
        addressLine1: _address.text.trim(),
        addressLine2: opt(_address2),
        city: _city.text.trim(),
        district: opt(_district),
        notes: notes,
        subtotal: subtotal,
        deliveryFee: totals.delivery.toDouble(),
        total: totals.total,
        items: items
            .map(
              (i) => CreateOrderItem(
                productId: i.product.id,
                title: s.productTitle(i.product),
                image: i.product.image,
                unitPrice: i.product.price,
                quantity: i.quantity,
              ),
            )
            .toList(),
      );

      final order = await apiClientProvider.placeOrder(payload);
      final cart = ref.read(cartProvider.notifier);
      for (final i in items) {
        cart.remove(i.product.id);
      }

      if (!mounted) return;
      final pay = _payment == _Payment.mobileMoney ? 'momo' : 'cod';
      context.go('/checkout/confirmation/${order.id}?pay=$pay');
    } catch (e) {
      setState(() => _error = formatCheckoutError(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final formatPrice = ref.watch(formatPriceProvider);
    final allItems = ref.watch(cartProvider);
    final items = allItems.where((i) => !isExportProduct(i.product)).toList();
    final exportCount = allItems.length - items.length;
    final subtotal = items.fold<double>(0, (sum, i) => sum + i.lineTotal);
    final totals = calcOrderTotal(subtotal);
    final user = ref.watch(authStateProvider).value?.session?.user;
    String? required(String? v) =>
        v == null || v.trim().isEmpty ? s.get('app.form.required') : null;

    return Scaffold(
      appBar: AppBar(title: Text(s.get('checkout.title'))),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(s.get('checkout.subtitle'), style: const TextStyle(color: AppColors.textMuted)),
            if (user == null) ...[
              const SizedBox(height: 12),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.person_outline_rounded),
                  title: Text(s.get('checkout.guestHint'), style: const TextStyle(fontSize: 13)),
                  trailing: TextButton(
                    onPressed: () => context.push('/login'),
                    child: Text(s.get('auth.signIn')),
                  ),
                ),
              ),
            ],
            if (exportCount > 0) ...[
              const SizedBox(height: 12),
              Card(
                color: const Color(0xFFECFDF5),
                child: ListTile(
                  leading: const Icon(Icons.flight_takeoff_rounded, color: Color(0xFF064E3B)),
                  title: Text(s.get('app.checkout.exportSeparate'), style: const TextStyle(fontSize: 13)),
                  trailing: TextButton(
                    onPressed: () => context.push('/exports/confirmation'),
                    child: Text(s.get('exports.confirmation.badge')),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 16),
            Text(s.get('checkout.delivery'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            TextFormField(
              controller: _name,
              decoration: InputDecoration(labelText: s.get('auth.fullName')),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(labelText: s.get('auth.email')),
              validator: (v) => v == null || !v.contains('@') ? s.get('app.form.validEmail') : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: s.get('checkout.phone'),
                hintText: s.get('checkout.phonePlaceholder'),
              ),
              validator: _payment == _Payment.mobileMoney ? required : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address,
              decoration: InputDecoration(labelText: s.get('checkout.address')),
              validator: required,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address2,
              decoration: InputDecoration(labelText: s.get('checkout.address2')),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _city,
                    decoration: InputDecoration(labelText: s.get('checkout.city')),
                    validator: required,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _district,
                    decoration: InputDecoration(labelText: s.get('checkout.district')),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notes,
              decoration: InputDecoration(labelText: s.get('checkout.notes')),
              maxLines: 2,
            ),
            const SizedBox(height: 20),
            Text(s.get('checkout.payment'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            Card(
              child: Column(
                children: [
                  RadioListTile<_Payment>(
                    value: _Payment.cash,
                    groupValue: _payment,
                    onChanged: (v) => setState(() => _payment = v!),
                    secondary: const Icon(Icons.payments_outlined),
                    title: Text(s.get('checkout.payOnDelivery'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(s.get('checkout.payOnDeliveryHint')),
                  ),
                  const Divider(height: 1),
                  RadioListTile<_Payment>(
                    value: _Payment.mobileMoney,
                    groupValue: _payment,
                    onChanged: (v) => setState(() => _payment = v!),
                    secondary: const Icon(Icons.phone_iphone_rounded),
                    title: Text(s.get('checkout.mobileMoney'), style: const TextStyle(fontWeight: FontWeight.w700)),
                    subtitle: Text(s.get('checkout.mobileMoneyHint')),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(s.get('checkout.orderSummary'), style: const TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 8),
                    for (final i in items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 3),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${i.quantity} × ${s.productTitle(i.product)}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13),
                              ),
                            ),
                            Text(formatPrice(i.lineTotal), style: const TextStyle(fontSize: 13)),
                          ],
                        ),
                      ),
                    const Divider(),
                    _row(s.get('cart.subtotal'), formatPrice(subtotal)),
                    _row(
                      s.get('cart.delivery'),
                      totals.delivery == 0 ? s.get('common.free') : formatPrice(totals.delivery.toDouble()),
                    ),
                    const Divider(),
                    _row(s.get('cart.total'), formatPrice(totals.total), bold: true),
                  ],
                ),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13, height: 1.35)),
            ],
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _submitting || items.isEmpty ? null : _submit,
              child: Text(s.get(_submitting ? 'checkout.placingOrder' : 'checkout.placeOrder')),
            ),
            TextButton(
              onPressed: () => context.go('/cart'),
              child: Text(s.get('checkout.backToCart')),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w800 : null)),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.w800 : FontWeight.w600)),
        ],
      ),
    );
  }
}
