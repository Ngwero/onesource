import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/hero_slide.dart';
import '../services/api_client.dart';

final heroSlidesProvider =
    FutureProvider.family<List<HeroSlide>, String>((ref, placement) {
  return apiClientProvider.fetchHeroSlides(placement: placement);
});
