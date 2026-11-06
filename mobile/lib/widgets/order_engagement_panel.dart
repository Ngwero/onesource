import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/order.dart';
import '../providers/cart_provider.dart';
import '../services/api_client.dart';

/// Returns / support FAQ / reorder — degrades when API tables or flags are off.
class OrderEngagementPanel extends ConsumerStatefulWidget {
  const OrderEngagementPanel({super.key, required this.order});

  final Order order;

  @override
  ConsumerState<OrderEngagementPanel> createState() => _OrderEngagementPanelState();
}

class _OrderEngagementPanelState extends ConsumerState<OrderEngagementPanel> {
  final _reasonCtrl = TextEditingController();
  final _chatCtrl = TextEditingController();
  List<Map<String, dynamic>> _faq = const [];
  String? _threadId;
  List<Map<String, dynamic>> _messages = const [];
  String? _status;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    apiClientProvider.fetchSupportFaq().then((items) {
      if (mounted) setState(() => _faq = items);
    });
  }

  @override
  void dispose() {
    _reasonCtrl.dispose();
    _chatCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (widget.order.status == 'delivered') ...[
          FilledButton(
            onPressed: _busy
                ? null
                : () async {
                    setState(() => _busy = true);
                    try {
                      final lines = await apiClientProvider.reorderDeliveredOrder(widget.order.id);
                      for (final line in lines) {
                        ref.read(cartProvider.notifier).add(line.product, quantity: line.quantity);
                      }
                      if (context.mounted) context.go('/cart');
                    } catch (e) {
                      setState(() => _status = e.toString());
                    } finally {
                      if (mounted) setState(() => _busy = false);
                    }
                  },
            child: Text(s.get('orders.reorder')),
          ),
          const SizedBox(height: 12),
        ],
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            boxShadow: softCardShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(s.get('returns.title'), style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 6),
              Text(s.get('returns.noRefundNote'), style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
              const SizedBox(height: 10),
              TextField(
                controller: _reasonCtrl,
                maxLines: 3,
                decoration: InputDecoration(hintText: s.get('returns.reason')),
              ),
              const SizedBox(height: 8),
              OutlinedButton(
                onPressed: _busy
                    ? null
                    : () async {
                        final reason = _reasonCtrl.text.trim();
                        if (reason.isEmpty) return;
                        setState(() => _busy = true);
                        try {
                          final item = widget.order.orderItems.isNotEmpty ? widget.order.orderItems.first : null;
                          await apiClientProvider.submitReturnRequest(
                            orderId: widget.order.id,
                            reason: reason,
                            orderItemId: item?.id,
                            productId: item?.productId,
                          );
                          setState(() {
                            _status = s.get('returns.submitted');
                            _reasonCtrl.clear();
                          });
                        } catch (e) {
                          setState(() => _status = e.toString());
                        } finally {
                          if (mounted) setState(() => _busy = false);
                        }
                      },
                child: Text(s.get('returns.submit')),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            boxShadow: softCardShadow,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(s.get('support.faqTitle'), style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              for (final item in _faq)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${item['question'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                      Text('${item['answer'] ?? ''}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                    ],
                  ),
                ),
              const SizedBox(height: 8),
              Text(s.get('support.chatTitle'), style: const TextStyle(fontWeight: FontWeight.w800)),
              if (_threadId == null)
                TextButton(
                  onPressed: _busy
                      ? null
                      : () async {
                          setState(() => _busy = true);
                          final id = await apiClientProvider.openSupportThread(orderId: widget.order.id);
                          if (id != null) {
                            final msgs = await apiClientProvider.fetchSupportMessages(id);
                            setState(() {
                              _threadId = id;
                              _messages = msgs;
                            });
                          }
                          if (mounted) setState(() => _busy = false);
                        },
                  child: Text(s.get('support.startChat')),
                )
              else ...[
                for (final m in _messages)
                  Align(
                    alignment: m['senderRole'] == 'customer' ? Alignment.centerRight : Alignment.centerLeft,
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: m['senderRole'] == 'customer' ? AppColors.darkGreen : AppColors.leafPale,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '${m['body'] ?? ''}',
                        style: TextStyle(
                          color: m['senderRole'] == 'customer' ? Colors.white : AppColors.text,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _chatCtrl,
                        decoration: InputDecoration(hintText: s.get('support.messagePlaceholder')),
                      ),
                    ),
                    IconButton(
                      onPressed: _busy
                          ? null
                          : () async {
                              final body = _chatCtrl.text.trim();
                              if (body.isEmpty || _threadId == null) return;
                              setState(() => _busy = true);
                              final ok = await apiClientProvider.postSupportMessage(_threadId!, body);
                              if (ok) {
                                _chatCtrl.clear();
                                final msgs = await apiClientProvider.fetchSupportMessages(_threadId!);
                                setState(() => _messages = msgs);
                              }
                              if (mounted) setState(() => _busy = false);
                            },
                      icon: const Icon(Icons.send_rounded),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        if (_status != null) ...[
          const SizedBox(height: 8),
          Text(_status!, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
        ],
      ],
    );
  }
}
