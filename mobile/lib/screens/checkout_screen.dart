import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models/order.dart';
import '../providers/cart_provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/checkout.dart';

final _currency = NumberFormat.currency(symbol: 'UGX ', decimalDigits: 0);

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
  final _city = TextEditingController();
  final _notes = TextEditingController();
  bool _submitting = false;
  String? _error;
  String _paymentMethod = 'cod';

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
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _address.dispose();
    _city.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final items = ref.read(cartProvider);
    if (items.isEmpty) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final subtotal = ref.read(cartSubtotalProvider);
      final totals = calcOrderTotal(subtotal);
      final user = ref.read(authServiceProvider).user;

      final payload = CreateOrderPayload(
        userId: user?.id,
        email: _email.text.trim(),
        fullName: _name.text.trim(),
        phone: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        addressLine1: _address.text.trim(),
        city: _city.text.trim(),
        notes: _notes.text.trim().isEmpty ? null : _notes.text.trim(),
        subtotal: subtotal,
        deliveryFee: totals.delivery.toDouble(),
        total: totals.total,
        items: items
            .map(
              (i) => CreateOrderItem(
                productId: i.product.id,
                title: i.product.title,
                image: i.product.image,
                unitPrice: i.product.price,
                quantity: i.quantity,
              ),
            )
            .toList(),
      );

      final order = await apiClientProvider.placeOrder(payload);
      ref.read(cartProvider.notifier).clear();

      if (!mounted) return;
      context.go('/orders/${order.id}', extra: _paymentMethod);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final subtotal = ref.watch(cartSubtotalProvider);
    final totals = calcOrderTotal(subtotal);

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Full name'),
              validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email'),
              validator: (v) => v == null || !v.contains('@') ? 'Valid email required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Phone'),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address,
              decoration: const InputDecoration(labelText: 'Delivery address'),
              validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _city,
              decoration: const InputDecoration(labelText: 'City / district'),
              validator: (v) => v == null || v.trim().isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notes,
              decoration: const InputDecoration(labelText: 'Delivery notes (optional)'),
              maxLines: 2,
            ),
            const SizedBox(height: 20),
            const Text('Payment method', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
            const SizedBox(height: 8),
            RadioListTile<String>(
              value: 'cod',
              groupValue: _paymentMethod,
              onChanged: (v) => setState(() => _paymentMethod = v!),
              title: const Text('Pay on delivery (cash)'),
              subtitle: const Text('Pay when your order arrives'),
              contentPadding: EdgeInsets.zero,
            ),
            RadioListTile<String>(
              value: 'mobile',
              groupValue: _paymentMethod,
              onChanged: (v) => setState(() => _paymentMethod = v!),
              title: const Text('Mobile money'),
              subtitle: const Text('MTN or Airtel — we\'ll contact you to complete payment'),
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _row('Subtotal', _currency.format(subtotal)),
                    _row('Delivery', totals.delivery == 0 ? 'FREE' : _currency.format(totals.delivery)),
                    const Divider(),
                    _row('Total', _currency.format(totals.total), bold: true),
                  ],
                ),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _submitting ? null : _submit,
              child: Text(_submitting ? 'Placing order…' : 'Place order'),
            ),
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
