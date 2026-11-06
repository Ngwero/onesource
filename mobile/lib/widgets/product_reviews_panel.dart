import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../models/product.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import 'rating_stars.dart';

/// Lists real reviews and allows submit only for verified delivered purchases.
class ProductReviewsPanel extends ConsumerStatefulWidget {
  const ProductReviewsPanel({super.key, required this.product});

  final Product product;

  @override
  ConsumerState<ProductReviewsPanel> createState() => _ProductReviewsPanelState();
}

class _ProductReviewsPanelState extends ConsumerState<ProductReviewsPanel> {
  List<Map<String, dynamic>> _reviews = [];
  Map<String, dynamic>? _eligibility;
  bool _loading = true;
  bool _submitting = false;
  int _rating = 5;
  final _title = TextEditingController();
  final _body = TextEditingController();
  String? _error;
  String? _thanks;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final reviews = await apiClientProvider.fetchProductReviews(widget.product.id);
    Map<String, dynamic> eligibility = {
      'eligible': false,
      'reason': 'sign_in',
      'orderId': null,
    };
    final session = ref.read(authStateProvider).valueOrNull?.session;
    if (session != null) {
      eligibility = await apiClientProvider.fetchReviewEligibility(widget.product.id);
    }
    if (!mounted) return;
    setState(() {
      _reviews = reviews;
      _eligibility = eligibility;
      _loading = false;
    });
  }

  Future<void> _submit() async {
    final orderId = _eligibility?['orderId'] as String? ?? _eligibility?['order_id'] as String?;
    if (orderId == null || _body.text.trim().isEmpty) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final review = await apiClientProvider.submitProductReview(
        widget.product.id,
        orderId: orderId,
        rating: _rating,
        title: _title.text,
        body: _body.text.trim(),
      );
      if (!mounted) return;
      setState(() {
        _reviews = [review, ..._reviews];
        _thanks = context.tr.get('reviews.thanks');
        _eligibility = {'eligible': false, 'reason': 'already_reviewed', 'orderId': null};
        _body.clear();
        _title.clear();
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String _eligibilityCopy(AppStrings s) {
    final reason = _eligibility?['reason'] as String?;
    return switch (reason) {
      'sign_in' => s.get('reviews.signInToReview'),
      'no_purchase' => s.get('reviews.buyToReview'),
      'already_reviewed' => s.get('reviews.alreadyReviewed'),
      'unavailable' => s.get('reviews.unavailable'),
      _ => s.get('reviews.empty'),
    };
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final product = widget.product;
    final verified = product.hasVerifiedRating;
    final avg = verified
        ? product.rating
        : (_reviews.isEmpty
            ? 0.0
            : _reviews.fold<double>(0, (sum, r) => sum + ((r['rating'] as num?)?.toDouble() ?? 0)) /
                _reviews.length);
    final count = verified ? product.reviewCount : _reviews.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_loading)
          Text(s.get('common.loading'), style: const TextStyle(color: AppColors.textMuted))
        else if (count > 0) ...[
          RatingStars(rating: avg, reviewCount: count),
          const SizedBox(height: 8),
          Text(
            s.t('app.product.ratedBy', {'count': '$count'}),
            style: const TextStyle(color: AppColors.textMuted, fontSize: 14),
          ),
        ] else
          Text(
            s.get('reviews.empty'),
            style: const TextStyle(color: AppColors.textMuted, fontSize: 14),
          ),
        const SizedBox(height: 16),
        Text(s.get('reviews.write'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        const SizedBox(height: 8),
        if (_thanks != null)
          Text(_thanks!, style: const TextStyle(color: AppColors.darkGreen, fontSize: 14))
        else if (_eligibility?['eligible'] == true) ...[
          Text(s.get('reviews.verifiedOnly'), style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
          const SizedBox(height: 8),
          DropdownButtonFormField<int>(
            value: _rating,
            decoration: InputDecoration(labelText: s.get('reviews.ratingLabel')),
            items: [5, 4, 3, 2, 1]
                .map((n) => DropdownMenuItem(value: n, child: Text('$n ★')))
                .toList(),
            onChanged: (v) => setState(() => _rating = v ?? 5),
          ),
          TextField(
            controller: _title,
            decoration: InputDecoration(labelText: s.get('reviews.titleLabel')),
          ),
          TextField(
            controller: _body,
            maxLines: 4,
            maxLength: 4000,
            decoration: InputDecoration(labelText: s.get('reviews.bodyLabel')),
          ),
          if (_error != null)
            Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
          const SizedBox(height: 8),
          FilledButton(
            onPressed: _submitting || _body.text.trim().isEmpty ? null : _submit,
            style: FilledButton.styleFrom(backgroundColor: AppColors.darkGreen),
            child: Text(_submitting ? s.get('common.loading') : s.get('reviews.submit')),
          ),
        ] else
          Text(
            _eligibilityCopy(s),
            style: const TextStyle(color: AppColors.textMuted, fontSize: 14),
          ),
        if (_reviews.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text(s.get('product.topReviews'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
          const SizedBox(height: 10),
          for (final review in _reviews)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      RatingStars(rating: (review['rating'] as num?)?.toDouble() ?? 0, size: 12),
                      if ((review['title'] as String?)?.isNotEmpty == true) ...[
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            review['title'] as String,
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (review['verified_purchase'] != false)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        s.get('reviews.verifiedPurchase'),
                        style: const TextStyle(fontSize: 11, color: AppColors.darkGreen, fontWeight: FontWeight.w600),
                      ),
                    ),
                  const SizedBox(height: 4),
                  Text(
                    '${review['body'] ?? ''}',
                    style: const TextStyle(height: 1.45, fontSize: 13, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
        ],
      ],
    );
  }
}
