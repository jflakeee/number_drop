import 'package:flame/components.dart';
import 'package:flame/effects.dart';
import 'package:flutter/material.dart';
import '../config.dart';

class GameBlock extends PositionComponent {
  int _value;
  late RectangleComponent _mainBlock;
  late RectangleComponent _highlight;
  late TextComponent _label;

  static const double _blockMargin = 2.0; // Same margin as cell background

  GameBlock({
    required int value,
    super.position,
  })  : _value = value,
        super(
          size: Vector2.all(GameConfig.cellSize),
          anchor: Anchor.center,
        );

  int get value => _value;

  @override
  Future<void> onLoad() async {
    await super.onLoad();
    _buildBlock();
  }

  void _buildBlock() {
    final blockSize = GameConfig.cellSize - _blockMargin * 2;
    final colors = getBlockColors(_value);

    // Main block - centered in the cell
    _mainBlock = RectangleComponent(
      size: Vector2.all(blockSize),
      position: Vector2.all(_blockMargin),
      paint: Paint()..color = colors.main,
    );
    add(_mainBlock);

    // Highlight at top
    _highlight = RectangleComponent(
      size: Vector2(blockSize - 8, 12),
      position: Vector2(_blockMargin + 4, _blockMargin + 4),
      paint: Paint()..color = colors.light.withValues(alpha: 0.5),
    );
    add(_highlight);

    // Border for high-value blocks
    if (_value >= 512) {
      add(RectangleComponent(
        size: Vector2.all(blockSize),
        position: Vector2.all(_blockMargin),
        paint: Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3
          ..color = const Color(0xFFFFD700),
      ));
    }

    // Label
    final fontSize = getFontSize(_value);
    _label = TextComponent(
      text: _value.toString(),
      position: Vector2(GameConfig.cellSize / 2, GameConfig.cellSize / 2),
      anchor: Anchor.center,
      textRenderer: TextPaint(
        style: TextStyle(
          fontFamily: 'Arial',
          fontSize: fontSize,
          fontWeight: FontWeight.bold,
          color: getTextColor(_value),
        ),
      ),
    );
    add(_label);
  }

  void setValue(int newValue) {
    _value = newValue;
    final colors = getBlockColors(_value);
    final fontSize = getFontSize(_value);

    _mainBlock.paint.color = colors.main;
    _highlight.paint.color = colors.light.withValues(alpha: 0.5);

    _label.text = _value.toString();
    _label.textRenderer = TextPaint(
      style: TextStyle(
        fontFamily: 'Arial',
        fontSize: fontSize,
        fontWeight: FontWeight.bold,
        color: getTextColor(_value),
      ),
    );
  }

  void playMergeAnimation({VoidCallback? onComplete}) {
    add(
      ScaleEffect.to(
        Vector2.all(1.15),
        EffectController(duration: GameConfig.mergeDuration / 2),
        onComplete: () {
          add(
            ScaleEffect.to(
              Vector2.all(1.0),
              EffectController(duration: GameConfig.mergeDuration / 2),
              onComplete: onComplete,
            ),
          );
        },
      ),
    );
  }

  void playSpawnAnimation() {
    scale = Vector2.zero();
    add(
      ScaleEffect.to(
        Vector2.all(1.0),
        EffectController(
          duration: GameConfig.spawnDuration,
          curve: Curves.easeOutBack,
        ),
      ),
    );
  }

  void playDropAnimation(Vector2 targetPosition, {VoidCallback? onComplete}) {
    add(
      MoveEffect.to(
        targetPosition,
        EffectController(
          duration: GameConfig.dropDuration,
          curve: Curves.bounceOut,
        ),
        onComplete: onComplete,
      ),
    );
  }

  void playMoveToAnimation(Vector2 targetPosition, {VoidCallback? onComplete}) {
    add(
      MoveEffect.to(
        targetPosition,
        EffectController(
          duration: GameConfig.mergeDuration,
          curve: Curves.easeIn,
        ),
        onComplete: onComplete,
      ),
    );
  }

  void playExplosionAnimation({VoidCallback? onComplete}) {
    add(
      ScaleEffect.to(
        Vector2.all(1.5),
        EffectController(duration: 0.2),
      ),
    );
    add(
      OpacityEffect.to(
        0,
        EffectController(duration: 0.2),
        onComplete: () {
          removeFromParent();
          onComplete?.call();
        },
      ),
    );
  }
}
