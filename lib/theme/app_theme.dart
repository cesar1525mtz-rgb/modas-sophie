import 'package:flutter/material.dart';

class AppTheme {
  static const Color primary = Color(0xFFFF1493);
  static const Color background = Color(0xFF000000);
  static const Color surface = Color(0xFF121212);

  static ThemeData theme = ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: background,
    colorScheme: const ColorScheme.dark(
      primary: primary,
      surface: surface,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.black,
      centerTitle: true,
    ),
  );
}
