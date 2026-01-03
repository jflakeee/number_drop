import 'package:flutter/material.dart';

class GameConfig {
  // Grid settings
  static const int gridCols = 5;
  static const int gridRows = 8;
  static const double cellSize = 60.0;
  static const double gridPadding = 20.0;

  // Starting numbers
  static const List<int> startNumbers = [2, 4];

  // Score multipliers
  static const double comboMultiplier = 1.5;

  // Animation durations (seconds for Flame)
  static const double dropDuration = 0.2;
  static const double mergeDuration = 0.15;
  static const double spawnDuration = 0.1;

  // Theme colors
  static const Color primaryColor = Color(0xFFF96D00);
  static const Color darkColor = Color(0xFF222831);
  static const Color lightColor = Color(0xFFF2F2F2);
  static const Color successColor = Color(0xFF27AE60);
  static const Color dangerColor = Color(0xFFE74C3C);
}

class BlockColors {
  final Color main;
  final Color light;
  final Color dark;

  const BlockColors({
    required this.main,
    required this.light,
    required this.dark,
  });
}

final Map<int, BlockColors> blockColorMap = {
  2: const BlockColors(
    main: Color(0xFFFFE082),
    light: Color(0xFFFFECB3),
    dark: Color(0xFFFFCA28),
  ),
  4: const BlockColors(
    main: Color(0xFFFFD54F),
    light: Color(0xFFFFE082),
    dark: Color(0xFFFFB300),
  ),
  8: const BlockColors(
    main: Color(0xFF81C784),
    light: Color(0xFFA5D6A7),
    dark: Color(0xFF4CAF50),
  ),
  16: const BlockColors(
    main: Color(0xFFE57373),
    light: Color(0xFFEF9A9A),
    dark: Color(0xFFD32F2F),
  ),
  32: const BlockColors(
    main: Color(0xFFF06292),
    light: Color(0xFFF48FB1),
    dark: Color(0xFFC2185B),
  ),
  64: const BlockColors(
    main: Color(0xFFFFB74D),
    light: Color(0xFFFFCC80),
    dark: Color(0xFFF57C00),
  ),
  128: const BlockColors(
    main: Color(0xFFBA68C8),
    light: Color(0xFFCE93D8),
    dark: Color(0xFF8E24AA),
  ),
  256: const BlockColors(
    main: Color(0xFF64B5F6),
    light: Color(0xFF90CAF9),
    dark: Color(0xFF1976D2),
  ),
  512: const BlockColors(
    main: Color(0xFF4FC3F7),
    light: Color(0xFF81D4FA),
    dark: Color(0xFF0288D1),
  ),
  1024: const BlockColors(
    main: Color(0xFF4DB6AC),
    light: Color(0xFF80CBC4),
    dark: Color(0xFF00897B),
  ),
  2048: const BlockColors(
    main: Color(0xFFFFD700),
    light: Color(0xFFFFE44D),
    dark: Color(0xFFFFA000),
  ),
};

BlockColors getBlockColors(int value) {
  return blockColorMap[value] ??
      const BlockColors(
        main: Color(0xFFCDC1B4),
        light: Color(0xFFD8CFC4),
        dark: Color(0xFFBBADA0),
      );
}

Color getTextColor(int value) {
  if (value <= 4) {
    return const Color(0xFF5D4E37);
  }
  return Colors.white;
}

double getFontSize(int value) {
  if (value < 100) return 26;
  if (value < 1000) return 20;
  return 16;
}
