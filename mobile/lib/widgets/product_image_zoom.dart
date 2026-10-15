import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../config/theme.dart';
import '../i18n/app_strings.dart';
import '../services/image_url.dart';
import 'product_thumbnail.dart';

const double _kViewerMaxScale = 4;
const double _kViewerMinScale = 0.8;
const double _kDoubleTapScale = 2.5;

String productImageHeroTag(String base, int index) => '$base-$index';

String _tapToZoomLabel(BuildContext context) =>
    context.tr.get('app.product.tapToZoom', fallback: 'Tap to zoom');

/// Wins the gesture arena as soon as a finger lands, so a parent [ScrollView]
/// cannot claim the pointer before a second finger arrives and turn a pinch
/// into a page scroll.
class _EagerScaleRecognizer extends ScaleGestureRecognizer {
  @override
  void addAllowedPointer(PointerDownEvent event) {
    super.addAllowedPointer(event);
    resolve(GestureDisposition.accepted);
  }

  @override
  String get debugDescription => 'eager scale';
}

/// Full-screen scale: a second finger accepts immediately. A single finger is
/// left for the page swipe and the swipe-down dismiss, unless the photo is
/// already zoomed (then that finger pans).
class _ViewerScaleRecognizer extends ScaleGestureRecognizer {
  _ViewerScaleRecognizer({required this.zoomed});

  final bool Function() zoomed;

  @override
  void handleEvent(PointerEvent event) {
    if (!zoomed() && pointerCount < 2 && event is PointerMoveEvent) {
      return;
    }
    super.handleEvent(event);
    if (pointerCount >= 2) {
      resolve(GestureDisposition.accepted);
    }
  }

  @override
  String get debugDescription => 'viewer scale';
}

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
      transitionsBuilder: (_, animation, __, child) {
        final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
        return FadeTransition(
          opacity: curved,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.96, end: 1).animate(curved),
            child: child,
          ),
        );
      },
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

/// Product image with pinch-to-zoom in place (snaps back to 1× on release)
/// and a tap that opens [ProductImageViewer].
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
  Offset _pinchOrigin = Offset.zero;
  double _travel = 0;
  bool _pinching = false;
  Drag? _scrollDrag;

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

  void _endScroll({bool cancel = false, Velocity? velocity}) {
    final drag = _scrollDrag;
    _scrollDrag = null;
    if (drag == null) return;
    if (cancel) {
      drag.cancel();
      return;
    }
    final vy = velocity?.pixelsPerSecond.dy ?? 0;
    drag.end(DragEndDetails(velocity: velocity ?? Velocity.zero, primaryVelocity: vy));
  }

  void _ensureScroll(ScaleUpdateDetails d) {
    if (_scrollDrag != null) return;
    final position = Scrollable.maybeOf(context)?.position;
    if (position is! ScrollPositionWithSingleContext) return;
    _scrollDrag = position.drag(
      DragStartDetails(
        globalPosition: d.focalPoint,
        localPosition: d.localFocalPoint,
        sourceTimeStamp: d.sourceTimeStamp,
      ),
      () => _scrollDrag = null,
    );
  }

  void _onScaleStart(ScaleStartDetails d) {
    if (d.pointerCount >= 2) {
      _reset.stop();
      _pinching = true;
      _pinchOrigin = d.localFocalPoint;
      _endScroll(cancel: true);
    }
  }

  void _onScaleUpdate(ScaleUpdateDetails d) {
    if (d.pointerCount >= 2 || _pinching) {
      _pinching = true;
      _endScroll(cancel: true);
      final s = d.scale.clamp(1.0, _kViewerMaxScale);
      final focal = d.localFocalPoint;
      _transform.value = Matrix4.identity()
        ..translate(focal.dx, focal.dy)
        ..scale(s, s, 1)
        ..translate(-_pinchOrigin.dx, -_pinchOrigin.dy);
      return;
    }

    _travel += d.focalPointDelta.distance;
    if (_travel < kTouchSlop) return;
    _ensureScroll(d);
    _scrollDrag?.update(
      DragUpdateDetails(
        globalPosition: d.focalPoint,
        localPosition: d.localFocalPoint,
        delta: d.focalPointDelta,
        primaryDelta: d.focalPointDelta.dy,
        sourceTimeStamp: d.sourceTimeStamp,
      ),
    );
  }

  void _onScaleEnd(ScaleEndDetails d) {
    if (d.pointerCount > 0) {
      if (d.pointerCount >= 2) _endScroll(cancel: true);
      return;
    }
    final pinched = _pinching;
    final travel = _travel;
    _pinching = false;
    _travel = 0;
    if (pinched) {
      _endScroll(cancel: true);
      _resetFrom = _transform.value.clone();
      _reset.forward(from: 0);
      return;
    }
    if (travel < kTouchSlop) {
      _endScroll(cancel: true);
      openProductImageViewer(context, images: widget.images, heroTag: widget.heroTag);
      return;
    }
    _endScroll(velocity: d.velocity);
  }

  @override
  void dispose() {
    _endScroll(cancel: true);
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
      label: _tapToZoomLabel(context),
      child: RawGestureDetector(
        behavior: HitTestBehavior.opaque,
        gestures: <Type, GestureRecognizerFactory>{
          _EagerScaleRecognizer: GestureRecognizerFactoryWithHandlers<_EagerScaleRecognizer>(
            () => _EagerScaleRecognizer(),
            (_EagerScaleRecognizer instance) {
              instance
                ..onStart = _onScaleStart
                ..onUpdate = _onScaleUpdate
                ..onEnd = _onScaleEnd;
            },
          ),
        },
        child: SizedBox(
          width: widget.size,
          height: widget.size,
          child: Stack(
            fit: StackFit.expand,
            children: [
              ClipRect(
                child: ValueListenableBuilder<Matrix4>(
                  valueListenable: _transform,
                  builder: (_, matrix, child) => Transform(
                    alignment: Alignment.topLeft,
                    transform: matrix,
                    child: child,
                  ),
                  child: image,
                ),
              ),
              const Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: IgnorePointer(child: ProductZoomHintBadge()),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Dark "Tap to zoom" bar shown across the bottom of the product photo.
class ProductZoomHintBadge extends StatelessWidget {
  const ProductZoomHintBadge({super.key, this.onTap});

  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final bar = ColoredBox(
      color: AppColors.darkGreen.withValues(alpha: 0.92),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.zoom_in_rounded, size: 18, color: Colors.white),
            const SizedBox(width: 6),
            Text(
              _tapToZoomLabel(context),
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white),
            ),
          ],
        ),
      ),
    );
    if (onTap == null) return bar;
    return Material(
      color: Colors.transparent,
      child: InkWell(onTap: onTap, child: bar),
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
                    physics: _zoomed ? const NeverScrollableScrollPhysics() : const PageScrollPhysics(),
                    itemCount: count,
                    onPageChanged: (i) => setState(() {
                      _index = i;
                      _zoomed = false;
                    }),
                    itemBuilder: (_, i) => _ZoomPage(
                      url: widget.images[i],
                      index: i,
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
                          color: Colors.black.withValues(alpha: 0.55),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${_index + 1} / $count',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
                        ),
                      ),
                    const Spacer(),
                    Material(
                      color: Colors.black.withValues(alpha: 0.55),
                      shape: const CircleBorder(),
                      child: IconButton(
                        onPressed: () => Navigator.of(context).maybePop(),
                        tooltip: s.get('common.close', fallback: 'Close'),
                        iconSize: 26,
                        icon: const Icon(Icons.close_rounded, color: Colors.white),
                      ),
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
                        s.get('app.product.zoomHint', fallback: 'Pinch or double-tap to zoom'),
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13, fontWeight: FontWeight.w600),
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
    required this.index,
    required this.heroTag,
    required this.active,
    required this.onZoomChanged,
  });

  final String url;
  final int index;
  final String? heroTag;
  final bool active;
  final ValueChanged<bool> onZoomChanged;

  @override
  State<_ZoomPage> createState() => _ZoomPageState();
}

class _ZoomPageState extends State<_ZoomPage> with SingleTickerProviderStateMixin {
  final _matrix = ValueNotifier<Matrix4>(Matrix4.identity());
  late final AnimationController _anim;
  double _scale = 1;
  Offset _translate = Offset.zero;
  double _fromScale = 1;
  double _toScale = 1;
  Offset _fromTranslate = Offset.zero;
  Offset _toTranslate = Offset.zero;
  double _gestureScale = 1;
  Offset _gestureFocal = Offset.zero;
  Offset _gestureTranslate = Offset.zero;
  Offset? _doubleTapAt;
  Size _viewport = Size.zero;
  bool _zoomed = false;

  bool get _isZoomed => _scale > 1.01;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 240))..addListener(_tick);
  }

  @override
  void didUpdateWidget(covariant _ZoomPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active && !widget.active) {
      _anim.stop();
      _scale = 1;
      _translate = Offset.zero;
      _zoomed = false;
      _publish();
    }
  }

  @override
  void dispose() {
    _anim.dispose();
    _matrix.dispose();
    super.dispose();
  }

  void _publish() {
    _matrix.value = Matrix4.identity()
      ..translate(_translate.dx, _translate.dy)
      ..scale(_scale, _scale, 1);
    final zoomed = _isZoomed;
    if (zoomed == _zoomed) return;
    _zoomed = zoomed;
    widget.onZoomChanged(zoomed);
  }

  void _tick() {
    final t = Curves.easeOutCubic.transform(_anim.value);
    _scale = _fromScale + (_toScale - _fromScale) * t;
    _translate = Offset.lerp(_fromTranslate, _toTranslate, t)!;
    _publish();
  }

  Offset _clamped(double scale, Offset translate) {
    if (scale < 1 || _viewport.isEmpty) return translate;
    final maxX = _viewport.width * (scale - 1);
    final maxY = _viewport.height * (scale - 1);
    return Offset(translate.dx.clamp(-maxX, 0), translate.dy.clamp(-maxY, 0));
  }

  void _clamp() {
    _translate = _clamped(_scale, _translate);
  }

  void _animateTo(double scale, Offset translate) {
    _fromScale = _scale;
    _fromTranslate = _translate;
    _toScale = scale;
    _toTranslate = translate;
    _anim.forward(from: 0);
  }

  void _onScaleStart(ScaleStartDetails d) {
    _anim.stop();
    _gestureScale = _scale;
    _gestureFocal = d.localFocalPoint;
    _gestureTranslate = _translate;
  }

  void _onScaleUpdate(ScaleUpdateDetails d) {
    if (!_zoomed && d.pointerCount < 2 && _gestureScale <= 1.01) return;
    final next = (_gestureScale * d.scale).clamp(_kViewerMinScale, _kViewerMaxScale);
    final scene = (_gestureFocal - _gestureTranslate) / _gestureScale;
    _scale = next;
    _translate = d.localFocalPoint - scene * next;
    _clamp();
    _publish();
  }

  void _onScaleEnd(ScaleEndDetails d) {
    if (d.pointerCount > 0) return;
    if (_scale < 0.999) {
      _animateTo(1, Offset.zero);
      return;
    }
    _publish();
  }

  void _onDoubleTap() {
    if (_isZoomed) {
      _animateTo(1, Offset.zero);
      return;
    }
    final size = _viewport.isEmpty ? (context.size ?? Size.zero) : _viewport;
    final p = _doubleTapAt ?? size.center(Offset.zero);
    const k = _kDoubleTapScale;
    final scene = (p - _translate) / _scale;
    _animateTo(k, _clamped(k, p - scene * k));
  }

  @override
  Widget build(BuildContext context) {
    Widget image = ProductHiResImage(url: widget.url);
    if (widget.heroTag != null) image = Hero(tag: widget.heroTag!, child: image);

    return LayoutBuilder(
      builder: (context, constraints) {
        _viewport = constraints.biggest;
        return RawGestureDetector(
          behavior: HitTestBehavior.opaque,
          gestures: <Type, GestureRecognizerFactory>{
            _ViewerScaleRecognizer: GestureRecognizerFactoryWithHandlers<_ViewerScaleRecognizer>(
              () => _ViewerScaleRecognizer(zoomed: () => _zoomed),
              (_ViewerScaleRecognizer instance) {
                instance
                  ..onStart = _onScaleStart
                  ..onUpdate = _onScaleUpdate
                  ..onEnd = _onScaleEnd;
              },
            ),
            DoubleTapGestureRecognizer: GestureRecognizerFactoryWithHandlers<DoubleTapGestureRecognizer>(
              () => DoubleTapGestureRecognizer(),
              (DoubleTapGestureRecognizer instance) {
                instance.onDoubleTapDown = (d) => _doubleTapAt = d.localPosition;
                instance.onDoubleTap = _onDoubleTap;
              },
            ),
          },
          child: ValueListenableBuilder<Matrix4>(
            valueListenable: _matrix,
            builder: (_, matrix, child) => Transform(
              key: ValueKey('product-zoom-${widget.index}'),
              alignment: Alignment.topLeft,
              transform: matrix,
              child: child,
            ),
            child: SizedBox.expand(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 72, 12, 72),
                child: image,
              ),
            ),
          ),
        );
      },
    );
  }
}
