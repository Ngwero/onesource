import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../services/image_url.dart';
import 'product_thumbnail.dart';

const double _kViewerMaxScale = 4;
const double _kDoubleTapScale = 2.5;

String productImageHeroTag(String base, int index) => '$base-$index';

/// Opens the full-screen pinch / double-tap zoom viewer.
Future<void> openProductImageViewer(
  BuildContext context, {
  required List<String> images,
  int initialIndex = 0,
  String? heroTag,
}) {
  final urls = images.map(resolveImageUrl).where((u) => u.isNotEmpty).toList();
  if (urls.isEmpty) return Future.value();
  return Navigator.of(context).push(
    PageRouteBuilder<void>(
      opaque: false,
      transitionDuration: const Duration(milliseconds: 240),
      reverseTransitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (_, __, ___) => ProductImageViewer(
        images: urls,
        initialIndex: initialIndex.clamp(0, urls.length - 1),
        heroTag: heroTag,
      ),
      transitionsBuilder: (_, animation, __, child) => FadeTransition(
        opacity: animation.drive(CurveTween(curve: Curves.easeOutCubic)),
        child: child,
      ),
    ),
  );
}

/// Full-resolution product image; identical params everywhere so the inline
/// image and the viewer share one memory-cache entry (no flash on Hero flight).
class ProductHiResImage extends StatelessWidget {
  const ProductHiResImage({super.key, required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.contain,
      fadeInDuration: const Duration(milliseconds: 150),
      placeholder: (_, __) => CachedNetworkImage(
        imageUrl: url,
        fit: BoxFit.contain,
        memCacheWidth: 512,
        maxWidthDiskCache: 1024,
        fadeInDuration: Duration.zero,
        placeholder: (_, __) => const Center(
          child: SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.darkGreen),
          ),
        ),
        errorWidget: (_, __, ___) => const SizedBox.shrink(),
      ),
      errorWidget: (_, __, ___) => const Center(
        child: Icon(Icons.image_not_supported_outlined, color: AppColors.textMuted, size: 40),
      ),
    );
  }
}

/// Product image with Instagram-style pinch-to-peek (snaps back to 1x on
/// release) and tap to open [ProductImageViewer].
class ZoomableProductImage extends StatefulWidget {
  const ZoomableProductImage({
    super.key,
    required this.images,
    required this.size,
    this.heroTag,
  });

  final List<String> images;
  final double size;
  final String? heroTag;

  @override
  State<ZoomableProductImage> createState() => _ZoomableProductImageState();
}

class _ZoomableProductImageState extends State<ZoomableProductImage> with SingleTickerProviderStateMixin {
  final _transform = ValueNotifier<Matrix4>(Matrix4.identity());
  late final AnimationController _reset;
  Matrix4 _resetFrom = Matrix4.identity();
  Offset _startFocal = Offset.zero;
  bool _pinching = false;

  @override
  void initState() {
    super.initState();
    _reset = AnimationController(vsync: this, duration: const Duration(milliseconds: 220))
      ..addListener(_tickReset);
  }

  void _tickReset() {
    _transform.value = Matrix4Tween(begin: _resetFrom, end: Matrix4.identity())
        .transform(Curves.easeOutCubic.transform(_reset.value));
  }

  void _onScaleStart(ScaleStartDetails d) {
    if (d.pointerCount < 2) return;
    _reset.stop();
    _startFocal = d.localFocalPoint;
    _pinching = true;
  }

  void _onScaleUpdate(ScaleUpdateDetails d) {
    if (!_pinching) return;
    final s = d.scale.clamp(1.0, _kViewerMaxScale);
    final focal = d.localFocalPoint;
    _transform.value = Matrix4.diagonal3Values(s, s, 1)
      ..setTranslationRaw(focal.dx - _startFocal.dx * s, focal.dy - _startFocal.dy * s, 0);
  }

  void _onScaleEnd(ScaleEndDetails d) {
    if (!_pinching) return;
    _pinching = false;
    _resetFrom = _transform.value.clone();
    _reset.forward(from: 0);
  }

  @override
  void dispose() {
    _reset.dispose();
    _transform.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final url = widget.images.isEmpty ? '' : resolveImageUrl(widget.images.first);
    if (url.isEmpty) {
      return ProductThumbnail(image: '', size: widget.size);
    }

    Widget image = ProductHiResImage(url: url);
    if (widget.heroTag != null) {
      image = Hero(tag: productImageHeroTag(widget.heroTag!, 0), child: image);
    }

    return Semantics(
      button: true,
      label: context.tr.get('app.product.tapToZoom'),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => openProductImageViewer(context, images: widget.images, heroTag: widget.heroTag),
        onScaleStart: _onScaleStart,
        onScaleUpdate: _onScaleUpdate,
        onScaleEnd: _onScaleEnd,
        child: SizedBox(
          width: widget.size,
          height: widget.size,
          child: ValueListenableBuilder<Matrix4>(
            valueListenable: _transform,
            builder: (_, m, child) => Transform(transform: m, child: child),
            child: image,
          ),
        ),
      ),
    );
  }
}

/// Small "Tap to zoom" pill shown on the product image corner.
class ProductZoomHintBadge extends StatelessWidget {
  const ProductZoomHintBadge({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white.withValues(alpha: 0.92),
      shape: const StadiumBorder(side: BorderSide(color: AppColors.border)),
      child: InkWell(
        onTap: onTap,
        customBorder: const StadiumBorder(),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.zoom_in_rounded, size: 16, color: AppColors.darkGreen),
              const SizedBox(width: 4),
              Text(
                context.tr.get('app.product.tapToZoom'),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.darkGreen),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Full-screen gallery: pinch and double-tap zoom to a point, pan while
/// zoomed, snap back under 1×, swipe between photos, swipe down or close.
class ProductImageViewer extends StatefulWidget {
  const ProductImageViewer({
    super.key,
    required this.images,
    this.initialIndex = 0,
    this.heroTag,
  });

  /// Fully-resolved image URLs.
  final List<String> images;
  final int initialIndex;
  final String? heroTag;

  @override
  State<ProductImageViewer> createState() => _ProductImageViewerState();
}

class _ProductImageViewerState extends State<ProductImageViewer> with SingleTickerProviderStateMixin {
  late final PageController _pages = PageController(initialPage: widget.initialIndex);
  late int _index = widget.initialIndex;
  bool _zoomed = false;
  double _dragDy = 0;
  double _dragFrom = 0;
  late final AnimationController _dragBack;

  @override
  void initState() {
    super.initState();
    _dragBack = AnimationController(vsync: this, duration: const Duration(milliseconds: 200))
      ..addListener(() {
        setState(() => _dragDy = _dragFrom * (1 - Curves.easeOut.transform(_dragBack.value)));
      });
  }

  @override
  void dispose() {
    _dragBack.dispose();
    _pages.dispose();
    super.dispose();
  }

  void _onDragEnd(DragEndDetails d) {
    if (_dragDy.abs() > 120 || d.velocity.pixelsPerSecond.dy.abs() > 900) {
      Navigator.of(context).maybePop();
      return;
    }
    _dragFrom = _dragDy;
    _dragBack.forward(from: 0);
  }

  @override
  Widget build(BuildContext context) {
    final s = context.tr;
    final count = widget.images.length;
    final bgOpacity = 1 - (_dragDy.abs() / 400).clamp(0.0, 0.7);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: Colors.black.withValues(alpha: bgOpacity),
        body: Stack(
          children: [
            Positioned.fill(
              child: GestureDetector(
                onVerticalDragStart: _zoomed ? null : (_) => _dragBack.stop(),
                onVerticalDragUpdate: _zoomed ? null : (d) => setState(() => _dragDy += d.delta.dy),
                onVerticalDragEnd: _zoomed ? null : _onDragEnd,
                child: Transform.translate(
                  offset: Offset(0, _dragDy),
                  child: PageView.builder(
                    controller: _pages,
                    physics: _zoomed ? const NeverScrollableScrollPhysics() : null,
                    itemCount: count,
                    onPageChanged: (i) => setState(() {
                      _index = i;
                      _zoomed = false;
                    }),
                    itemBuilder: (_, i) => _ZoomPage(
                      url: widget.images[i],
                      heroTag: widget.heroTag == null ? null : productImageHeroTag(widget.heroTag!, i),
                      active: i == _index,
                      onZoomChanged: (z) {
                        if (i == _index && z != _zoomed) setState(() => _zoomed = z);
                      },
                    ),
                  ),
                ),
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    if (count > 1)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${_index + 1} / $count',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                      ),
                    const Spacer(),
                    IconButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      tooltip: s.get('common.close'),
                      style: IconButton.styleFrom(backgroundColor: Colors.white.withValues(alpha: 0.14)),
                      icon: const Icon(Icons.close_rounded, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: SafeArea(
                top: false,
                child: IgnorePointer(
                  child: AnimatedOpacity(
                    opacity: _zoomed || _dragDy != 0 ? 0 : 1,
                    duration: const Duration(milliseconds: 180),
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Text(
                        s.get('app.product.zoomHint'),
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.75), fontSize: 13),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ZoomPage extends StatefulWidget {
  const _ZoomPage({
    required this.url,
    required this.heroTag,
    required this.active,
    required this.onZoomChanged,
  });

  final String url;
  final String? heroTag;
  final bool active;
  final ValueChanged<bool> onZoomChanged;

  @override
  State<_ZoomPage> createState() => _ZoomPageState();
}

class _ZoomPageState extends State<_ZoomPage> with SingleTickerProviderStateMixin {
  final _controller = TransformationController();
  late final AnimationController _anim;
  Matrix4 _from = Matrix4.identity();
  Matrix4 _to = Matrix4.identity();
  Offset? _doubleTapAt;
  bool _zoomed = false;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 240))
      ..addListener(() {
        _controller.value = Matrix4Tween(begin: _from, end: _to).transform(Curves.easeOutCubic.transform(_anim.value));
      });
    _controller.addListener(_syncZoom);
  }

  @override
  void didUpdateWidget(covariant _ZoomPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active && !widget.active) {
      _anim.stop();
      _zoomed = false;
      _controller.value = Matrix4.identity();
    }
  }

  @override
  void dispose() {
    _anim.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _syncZoom() {
    final zoomed = _controller.value.getMaxScaleOnAxis() > 1.01;
    if (zoomed == _zoomed) return;
    if (mounted) setState(() => _zoomed = zoomed);
    widget.onZoomChanged(zoomed);
  }

  void _animateTo(Matrix4 target) {
    _from = _controller.value.clone();
    _to = target;
    _anim.forward(from: 0);
  }

  void _onDoubleTap() {
    if (_zoomed) {
      _animateTo(Matrix4.identity());
      return;
    }
    final size = context.size ?? Size.zero;
    final p = _doubleTapAt ?? size.center(Offset.zero);
    const k = _kDoubleTapScale;
    _animateTo(Matrix4.diagonal3Values(k, k, 1)..setTranslationRaw(-p.dx * (k - 1), -p.dy * (k - 1), 0));
  }

  @override
  Widget build(BuildContext context) {
    Widget image = ProductHiResImage(url: widget.url);
    if (widget.heroTag != null) image = Hero(tag: widget.heroTag!, child: image);

    return GestureDetector(
      onDoubleTapDown: (d) => _doubleTapAt = d.localPosition,
      onDoubleTap: _onDoubleTap,
      child: InteractiveViewer(
        transformationController: _controller,
        alignment: Alignment.topLeft,
        minScale: 0.8,
        maxScale: _kViewerMaxScale,
        panEnabled: _zoomed,
        onInteractionStart: (_) => _anim.stop(),
        onInteractionEnd: (_) {
          if (_controller.value.getMaxScaleOnAxis() < 0.999) {
            _animateTo(Matrix4.identity());
          }
        },
        child: SizedBox.expand(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 56),
            child: image,
          ),
        ),
      ),
    );
  }
}
