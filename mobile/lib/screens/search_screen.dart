import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../config/theme.dart';
import '../providers/cart_provider.dart';
import '../providers/products_provider.dart';
import '../providers/search_catalog_provider.dart';
import '../providers/search_provider.dart';
import '../widgets/search_result_tile.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key, this.initialQuery});

  final String? initialQuery;

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  late final TextEditingController _controller;
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialQuery ?? '');
    _focusNode = FocusNode();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(searchCatalogProvider.future);
      ref.read(searchProvider.notifier).setQuery(_controller.text);
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    setState(() {});
    ref.read(searchProvider.notifier).setQuery(value);
  }

  void _applySuggestion(String term) {
    _controller.text = term;
    _controller.selection = TextSelection.collapsed(offset: term.length);
    ref.read(searchProvider.notifier).setQuery(term);
  }

  @override
  Widget build(BuildContext context) {
    final search = ref.watch(searchProvider);

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
              hintText: 'Search fresh produce…',
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
      body: _buildBody(search),
    );
  }

  Widget _buildBody(SearchState search) {
    if (search.isLoading && search.results.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.darkGreen),
      );
    }

    if (search.error != null && search.results.isEmpty) {
      return Center(child: Text(search.error.toString()));
    }

    if (search.query.length < 2) {
      return _SuggestionsView(
        suggestions: search.suggestions,
        onTap: _applySuggestion,
      );
    }

    if (search.results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.search_off_rounded, size: 48, color: AppColors.textMuted),
              const SizedBox(height: 12),
              Text('No results for "${search.query}"', textAlign: TextAlign.center),
              const SizedBox(height: 8),
              const Text(
                'Try chicken, mango, tomatoes, or organic',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppColors.textMuted),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
          child: Text(
            '${search.total} result${search.total == 1 ? '' : 's'} for "${search.query}"',
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
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
            itemCount: search.results.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final product = search.results[index];
              return SearchResultTile(
                product: product,
                query: search.query,
                onAdd: () {
                  ref.read(cartProvider.notifier).add(product);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('${product.title} added'),
                      behavior: SnackBarBehavior.floating,
                      backgroundColor: AppColors.darkGreen,
                    ),
                  );
                },
              );
            },
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
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
      children: [
        const Text(
          'Popular searches',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
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
        const Text(
          'Browse by category',
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
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
            title: Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600)),
            trailing: const Icon(Icons.north_east_rounded, size: 18, color: AppColors.textMuted),
            onTap: () => context.push('/category/${c.id}'),
          );
        }).toList(),
      ),
    );
  }
}
