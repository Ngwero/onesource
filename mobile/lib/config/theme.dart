import 'package:flutter/material.dart';

/// Bundled in pubspec.yaml — do not use google_fonts here (wrong asset path on device).
const _fontFamily = 'Gabarito';

TextStyle _gabarito({
  double? fontSize,
  FontWeight? fontWeight,
  Color? color,
}) {
  return TextStyle(
    fontFamily: _fontFamily,
    fontSize: fontSize,
    fontWeight: fontWeight,
    color: color,
  );
}

/// One Source official brand palette (brand guidelines).
class AppColors {
  // Neutrals — not true black/white
  static const canvas = Color(0xFFF3F2EE);
  static const surface = Color(0xFFFAF9F6);
  static const muted = Color(0xFFF3F2EE);
  static const border = Color(0xFFE3E1DA);
  static const text = Color(0xFF1C1C1C);
  static const textMuted = Color(0xFF5C5C58);
  static const ink = Color(0xFF1C1C1C);

  // Primary colors
  static const darkGreen = Color(0xFF2E5E4A);
  static const lemonGreen = Color(0xFFB4CF5A);
  static const amber = Color(0xFFF0C947);

  // Semantic aliases (used across widgets)
  static const leaf = darkGreen;
  static const leafDark = Color(0xFF244A3B);
  static const leafLight = lemonGreen;
  static const leafPale = Color(0xFFEDF3E0);
  static const accent = darkGreen;
  static const accentHover = leafDark;
  static const accentLight = leafPale;
  static const highlight = amber;
  static const lemon = lemonGreen;
  static const deal = Color(0xFFC9920F);

  static const cardRadius = 20.0;
  static const pillRadius = 28.0;
}

/// Reusable brand gradients for surfaces, buttons, and image pads.
class AppGradients {
  static const brand = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.darkGreen, AppColors.leafDark],
  );

  static const brandVibrant = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.leafDark, AppColors.darkGreen, Color(0xFF3A7359)],
    stops: [0.0, 0.55, 1.0],
  );

  static const canvas = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFF8F7F2), AppColors.canvas, Color(0xFFEEEDE8)],
    stops: [0.0, 0.45, 1.0],
  );

  static const lemonAccent = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.lemonGreen, AppColors.amber],
  );

  static const productPad = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFFEDF5E4), Color(0xFFF4F0DC), Color(0xFFE8F0DE)],
  );

  static const heroOverlay = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.transparent, Color(0xCC244A3B)],
    stops: [0.38, 1.0],
  );

  static const marquee = LinearGradient(
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
    colors: [Color(0xFFEBF3DF), Color(0xFFF7F4E6), Color(0xFFEBF3DF)],
  );

  static const navSelected = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.darkGreen, Color(0xFF3D6E56)],
  );

  static const authBackground = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Colors.white, Color(0xFFF4F8EE), AppColors.canvas],
  );

  static const searchAccent = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [AppColors.darkGreen, Color(0xFF3A7359)],
  );
}

ThemeData buildAppTheme() {
  final base = ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.darkGreen,
      primary: AppColors.darkGreen,
      onPrimary: Colors.white,
      secondary: AppColors.amber,
      onSecondary: AppColors.text,
      surface: AppColors.surface,
      onSurface: AppColors.text,
    ),
    scaffoldBackgroundColor: AppColors.canvas,
  );

  final textTheme = base.textTheme.apply(
    fontFamily: _fontFamily,
    bodyColor: AppColors.text,
    displayColor: AppColors.text,
  );

  return base.copyWith(
    textTheme: textTheme,
    primaryTextTheme: base.primaryTextTheme.apply(fontFamily: _fontFamily),
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.canvas,
      foregroundColor: AppColors.text,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: _gabarito(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: AppColors.text,
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppColors.cardRadius),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppColors.pillRadius),
        borderSide: const BorderSide(color: AppColors.darkGreen, width: 1.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.darkGreen,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: _gabarito(fontWeight: FontWeight.w700, fontSize: 14),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.darkGreen,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: _gabarito(fontWeight: FontWeight.w700, fontSize: 14),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.darkGreen,
        textStyle: _gabarito(fontWeight: FontWeight.w600, fontSize: 14),
      ),
    ),
  );
}

/// Soft card shadow used across the shop UI.
List<BoxShadow> get softCardShadow => [
      BoxShadow(
        color: AppColors.darkGreen.withValues(alpha: 0.08),
        blurRadius: 20,
        offset: const Offset(0, 8),
      ),
    ];

