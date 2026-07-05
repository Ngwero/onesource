import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/hero_slide.dart';
import '../services/api_client.dart';

final heroSlidesProvider = FutureProvider<List<HeroSlide>>((ref) {
  return apiClientProvider.fetchHeroSlides();
});
