import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../data/cosmetics.dart';
import '../data/pharmacy.dart';
import '../i18n/app_strings.dart';
import '../utils/cart_feedback.dart';
import '../providers/products_provider.dart';
import '../providers/search_provider.dart';
import '../utils/kitchen_mode.dart';
import '../utils/responsive.dart';
import '../utils/shop_mode.dart';
import '../utils/user_facing_error.dart';
import '../widgets/brand_loader.dart';
import '../widgets/products_load_more.dart';
import '../widgets/search_result_tile.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({
    super.key,
    this.initialQuery,
    this.mode = ShopMode.fresh,
  });

  final String? initialQuery;
  final ShopMode mode;

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  late final TextEditingController _controller;
  late final FocusNode _focusNode;
  final _scrollController = ScrollController();
  late final InfiniteScrollListener _scrollListener;

  void _loadMore() => ref.read(searchProvider.notifier).loadMore();

  @override
  void initState() {
    super.initState();
    _scrollListener = InfiniteScrollListener(controller: _scrollController, onLoadMore: _loadMore);
    _controller = TextEditingController(text: widget.initialQuery ?? '');
    _focusNode = FocusNode();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(searchShopProvider.notifier).state = widget.mode.name;
      ref.read(searchProvider.notifier).setQuery(_controller.text);
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _scrollListener.dispose();
    _scrollController.dispose();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _resetScroll() {
    if (_scrollController.hasClients) _scrollController.jumpTo(0);
  }

  void _onQueryChanged(String value) {
    setState(() {});
    _resetScroll();
    ref.read(searchProvider.notifier).setQuery(value);
  }

  void _applySuggestion(String term) {
    _controller.text = term;
    _controller.selection = TextSelection.collapsed(offset: term.length);
    _resetScroll();
    ref.read(searchProvider.notifier).setQuery(term);
  }

  @override
  Widget build(BuildContext context) {
    final search = ref.watch(searchProvider);
    final results = search.results.where((p) {
      return switch (widget.mode) {
        ShopMode.kitchen => isKitchenProduct(p),
        ShopMode.cosmetics => isCosmeticsProduct(p),
        ShopMode.pharmacy => isPharmacyProduct(p),
        ShopMode.fresh => !isKitchenProduct(p) && !isCosmeticsProduct(p) && !isPharmacyProduct(p),
      };
    }).toList();
    final s = context.tr;
    final scoped = SearchState(
      query: search.query,
      results: results,
      suggestions: search.suggestions,
      isLoading: search.isLoading,
      error: search.error,
      total: results.length,
      hasMore: search.hasMore,
      isLoadingMore: search.isLoadingMore,
      loadMoreError: search.loadMoreError,
    );

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        backgroundColor: AppColors.canvas,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.pop(),
        ),
        title: Container(
          height: 46,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: TextField(
            controller: _controller,
            focusNode: _focusNode,
            autofocus: true,
            textInputAction: TextInputAction.search,
            onChanged: _onQueryChanged,
            onSubmitted: _onQueryChanged,
            decoration: InputDecoration(
              hintText: s.get(widget.mode.searchHintKey),
              hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 15),
              prefixIcon: const Icon(Icons.search, color: AppColors.textMuted, size: 22),
              suffixIcon: _controller.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20),
                      onPressed: () {
                        _controller.clear();
                        ref.read(searchProvider.notifier).clear();
                        setState(() {});
                      },
                    )
                  : null,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ),
      ),
      body: _buildBody(scoped),
    );
  }

  Widget _buildBody(SearchState search) {
    final s = context.tr;
    if (search.isLoading && search.results.isEmpty) {
      return const Center(child: BrandLoader());
    }

    if (search.error != null && search.results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(formatLoadError(search.error!), textAlign: TextAlign.center),
        ),
      );
    }

    if (search.query.length < 2) {
      return _SuggestionsView(
        suggestions: search.suggestions,
        onTap: _applySuggestion,
      );
    }

    if (search.results.isEmpty && search.hasMore && search.loadMoreError == null) {
      // Matches so far belong to another shop; keep paging until some show up.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _loadMore();
      });
      return const Center(child: BrandLoader());
    }

    if (search.results.isEmpty && search.loadMoreError == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.search_off_rounded, size: 48, color: AppColors.textMuted),
              const SizedBox(height: 12),
              Text(s.t('search.noResults', {'query': search.query}), textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                switch (widget.mode) {
                  ShopMode.kitchen => s.get('kitchen.searchHint'),
                  ShopMode.cosmetics => s.get('cosmetics.searchHint'),
                  ShopMode.pharmacy => s.or('pharmacy.searchHint', 'Try a product name or brand.'),
                  ShopMode.fresh => s.get('search.tryDifferent'),
                },
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textMuted),
              ),
            ],
          ),
        ),
      );
    }

    _scrollListener.scheduleCheck();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
          child: Text(
            s.t('search.forQuery', {'query': search.query}),
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textMuted),
          ),
        ),
        if (search.suggestions.isNotEmpty)
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: search.suggestions.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final term = search.suggestions[i];
                return ActionChip(
                  label: Text(term),
                  onPressed: () => _applySuggestion(term),
                  backgroundColor: Colors.white,
                  side: const BorderSide(color: AppColors.border),
                  labelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                );
              },
            ),
          ),
        Expanded(
          child: CustomScrollView(
            controller: _scrollController,
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final product = search.results[index];
                      return Padding(
                        padding: EdgeInsets.only(
                          bottom: index == search.results.length - 1 ? 0 : 10,
                        ),
                        child: SearchResultTile(
                          product: product,
                          query: search.query,
                          onAdd: () => addToCartWithFeedback(context, ref, product),
                        ),
                      );
                    },
                    childCount: search.results.length,
                  ),
                ),
              ),
              ProductsLoadMoreSliver(
                isLoadingMore: search.isLoadingMore,
                hasMore: search.hasMore,
                itemCount: search.results.length,
                error: search.loadMoreError,
                onRetry: () => ref.read(searchProvider.notifier).retryMore(),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SuggestionsView extends StatelessWidget {
  const _SuggestionsView({required this.suggestions, required this.onTap});

  final List<String> suggestions;
  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    return ListView(
      padding: EdgeInsets.fromLTRB(20, 8, 20, shellBottomPadding(context)),
      children: [
        Text(
          s.get('app.search.popular'),
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
        ),
        const SizedBox(height: 14),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: suggestions.map((term) {
            return ActionChip(
              avatar: const Icon(Icons.trending_up_rounded, size: 16, color: AppColors.darkGreen),
              label: Text(term),
              onPressed: () => onTap(term),
              backgroundColor: Colors.white,
              side: const BorderSide(color: AppColors.border),
              labelStyle: const TextStyle(fontWeight: FontWeight.w600),
            );
          }).toList(),
        ),
        const SizedBox(height: 28),
        Text(
          s.get('app.search.browseByCategory'),
          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
        ),
        const SizedBox(height: 12),
        _CategoryShortcuts(onTap: onTap),
      ],
    );
  }
}

class _CategoryShortcuts extends ConsumerWidget {
  const _CategoryShortcuts({required this.onTap});

  final ValueChanged<String> onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categoriesAsync = ref.watch(categoriesProvider);

    return categoriesAsync.when(
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
      data: (categories) => Column(
        children: categories.take(8).map((c) {
          return ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Text(c.icon, style: const TextStyle(fontSize: 24)),
            title: Text(
              context.tr.categoryName(c.id, c.name),
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            trailing: const Icon(Icons.north_east_rounded, size: 18, color: AppColors.textMuted),
            onTap: () => context.push('/category/${c.id}'),
          );
        }).toList(),
      ),
    );
  }
}
