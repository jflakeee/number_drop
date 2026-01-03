import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _keyPrefix = 'numberdrop_';
  static const String _keyBestScore = '${_keyPrefix}best_score';
  static const String _keyCoins = '${_keyPrefix}coins';
  static const String _keySettings = '${_keyPrefix}settings';
  static const String _keyGameSave = '${_keyPrefix}game_save';

  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // Best Score
  static int getBestScore() {
    return _prefs?.getInt(_keyBestScore) ?? 0;
  }

  static Future<void> setBestScore(int score) async {
    await _prefs?.setInt(_keyBestScore, score);
  }

  // Coins
  static int getCoins() {
    return _prefs?.getInt(_keyCoins) ?? 500;
  }

  static Future<void> setCoins(int coins) async {
    await _prefs?.setInt(_keyCoins, coins);
  }

  // Settings
  static GameSettings getSettings() {
    final json = _prefs?.getString(_keySettings);
    if (json != null) {
      return GameSettings.fromJson(jsonDecode(json));
    }
    return GameSettings();
  }

  static Future<void> setSettings(GameSettings settings) async {
    await _prefs?.setString(_keySettings, jsonEncode(settings.toJson()));
  }

  // Game Save
  static GameSave? getGameSave() {
    final json = _prefs?.getString(_keyGameSave);
    if (json != null) {
      return GameSave.fromJson(jsonDecode(json));
    }
    return null;
  }

  static Future<void> setGameSave(GameSave save) async {
    await _prefs?.setString(_keyGameSave, jsonEncode(save.toJson()));
  }

  static Future<void> clearGameSave() async {
    await _prefs?.remove(_keyGameSave);
  }
}

class GameSettings {
  final bool soundEnabled;
  final bool musicEnabled;
  final bool vibrationEnabled;
  final double soundVolume;
  final double musicVolume;

  GameSettings({
    this.soundEnabled = true,
    this.musicEnabled = true,
    this.vibrationEnabled = true,
    this.soundVolume = 1.0,
    this.musicVolume = 0.7,
  });

  factory GameSettings.fromJson(Map<String, dynamic> json) {
    return GameSettings(
      soundEnabled: json['soundEnabled'] ?? true,
      musicEnabled: json['musicEnabled'] ?? true,
      vibrationEnabled: json['vibrationEnabled'] ?? true,
      soundVolume: (json['soundVolume'] ?? 1.0).toDouble(),
      musicVolume: (json['musicVolume'] ?? 0.7).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'soundEnabled': soundEnabled,
      'musicEnabled': musicEnabled,
      'vibrationEnabled': vibrationEnabled,
      'soundVolume': soundVolume,
      'musicVolume': musicVolume,
    };
  }

  GameSettings copyWith({
    bool? soundEnabled,
    bool? musicEnabled,
    bool? vibrationEnabled,
    double? soundVolume,
    double? musicVolume,
  }) {
    return GameSettings(
      soundEnabled: soundEnabled ?? this.soundEnabled,
      musicEnabled: musicEnabled ?? this.musicEnabled,
      vibrationEnabled: vibrationEnabled ?? this.vibrationEnabled,
      soundVolume: soundVolume ?? this.soundVolume,
      musicVolume: musicVolume ?? this.musicVolume,
    );
  }
}

class GameSave {
  final List<List<int?>> gridData;
  final int score;
  final int nextValue;
  final int coins;
  final DateTime timestamp;

  GameSave({
    required this.gridData,
    required this.score,
    required this.nextValue,
    required this.coins,
    required this.timestamp,
  });

  factory GameSave.fromJson(Map<String, dynamic> json) {
    return GameSave(
      gridData: (json['gridData'] as List)
          .map((row) => (row as List).map((v) => v as int?).toList())
          .toList(),
      score: json['score'] ?? 0,
      nextValue: json['nextValue'] ?? 2,
      coins: json['coins'] ?? 500,
      timestamp: DateTime.parse(json['timestamp']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'gridData': gridData,
      'score': score,
      'nextValue': nextValue,
      'coins': coins,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}
