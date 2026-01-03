import 'dart:math';
import 'package:flame/components.dart';
import 'package:flame/events.dart';
import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'config.dart';
import 'components/block.dart';
import 'components/grid.dart';

enum GameState { menu, playing, paused, gameOver }

class NumberDropGame extends FlameGame
    with TapCallbacks, DragCallbacks, HasCollisionDetection {
  late GameGrid grid;
  late TextComponent scoreText;
  late TextComponent bestScoreText;
  late TextComponent nextBlockText;
  late RectangleComponent nextBlockPreview;
  GameBlock? previewBlock;

  int score = 0;
  int bestScore = 0;
  int combo = 0;
  int nextValue = 2;
  int coins = 500;

  GameState gameState = GameState.playing;
  bool isProcessing = false;
  int? selectedColumn;

  final Random _random = Random();

  // Callbacks for Flutter UI
  Function(int score)? onScoreChanged;
  Function(int bestScore)? onBestScoreChanged;
  Function()? onGameOver;

  @override
  Future<void> onLoad() async {
    await super.onLoad();

    // Calculate grid position to center it
    final gridWidth = GameConfig.gridCols * GameConfig.cellSize;
    final gridX = (size.x - gridWidth) / 2;
    final gridY = 150.0; // Leave space for UI at top

    // Create grid
    grid = GameGrid(gridX: gridX, gridY: gridY);
    add(grid);

    // Create UI components
    _createUI(gridX, gridY, gridWidth);

    // Generate first next block
    _generateNextValue();
  }

  void _createUI(double gridX, double gridY, double gridWidth) {
    // Background
    add(RectangleComponent(
      size: size,
      paint: Paint()..color = GameConfig.darkColor,
      priority: -1,
    ));

    // Score display
    scoreText = TextComponent(
      text: 'Score: 0',
      position: Vector2(20, 20),
      textRenderer: TextPaint(
        style: const TextStyle(
          fontFamily: 'Arial',
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
    );
    add(scoreText);

    // Best score display
    bestScoreText = TextComponent(
      text: 'Best: 0',
      position: Vector2(20, 50),
      textRenderer: TextPaint(
        style: const TextStyle(
          fontFamily: 'Arial',
          fontSize: 18,
          color: Colors.white70,
        ),
      ),
    );
    add(bestScoreText);

    // Coins display
    add(TextComponent(
      text: '🪙 $coins',
      position: Vector2(size.x - 100, 20),
      textRenderer: TextPaint(
        style: const TextStyle(
          fontFamily: 'Arial',
          fontSize: 20,
          fontWeight: FontWeight.bold,
          color: Color(0xFFFFD700),
        ),
      ),
    ));

    // Next block label
    nextBlockText = TextComponent(
      text: 'NEXT',
      position: Vector2(size.x - 80, 60),
      textRenderer: TextPaint(
        style: const TextStyle(
          fontFamily: 'Arial',
          fontSize: 14,
          color: Colors.white70,
        ),
      ),
    );
    add(nextBlockText);

    // Column indicators (arrows)
    for (int col = 0; col < GameConfig.gridCols; col++) {
      final arrowX = gridX + col * GameConfig.cellSize + GameConfig.cellSize / 2;
      add(TextComponent(
        text: '▼',
        position: Vector2(arrowX, gridY - 20),
        anchor: Anchor.center,
        textRenderer: TextPaint(
          style: TextStyle(
            fontSize: 20,
            color: GameConfig.primaryColor.withValues(alpha: 0.7),
          ),
        ),
      ));
    }
  }

  void _generateNextValue() {
    nextValue =
        GameConfig.startNumbers[_random.nextInt(GameConfig.startNumbers.length)];
    _updateNextBlockPreview();
  }

  void _updateNextBlockPreview() {
    // Remove old preview if exists
    previewBlock?.removeFromParent();

    // Create new preview block
    previewBlock = GameBlock(
      value: nextValue,
      position: Vector2(size.x - 60, 100),
    );
    previewBlock!.scale = Vector2.all(0.7);
    add(previewBlock!);
  }

  @override
  void onTapUp(TapUpEvent event) {
    if (gameState != GameState.playing || isProcessing) return;

    final tapPosition = event.canvasPosition;
    final col = grid.getColumnFromX(tapPosition.x);

    if (col >= 0 && col < GameConfig.gridCols) {
      _dropBlock(col);
    }
  }

  void _dropBlock(int col) {
    if (isProcessing) return;

    final lowestRow = grid.getLowestEmptyRow(col);
    if (lowestRow < 0) {
      // Column is full
      return;
    }

    isProcessing = true;
    combo = 0;

    // Create and place block
    final block = GameBlock(value: nextValue);
    final startPos = grid.getCellPosition(col, -1);
    final targetPos = grid.getCellPosition(col, lowestRow);

    block.position = startPos;
    grid.add(block);
    grid.cells[lowestRow][col] = block;

    block.playDropAnimation(
      targetPos,
      onComplete: () {
        _checkMerges(col, lowestRow);
      },
    );

    // Generate next block
    _generateNextValue();
  }

  void _checkMerges(int col, int row) {
    final merge = grid.findMergesFromPosition(col, row);

    if (merge != null) {
      combo++;
      final mergeScore = _calculateMergeScore(merge.value * 2);
      _addScore(mergeScore);

      grid.performMerge(merge, () {
        // After merge, apply gravity
        grid.applyGravity(() {
          // Find the new position of the merged block
          final newRow = grid.getBlockRow(col, merge.value * 2);
          if (newRow >= 0) {
            // Check for chain merges
            _checkMerges(col, newRow);
          } else {
            _finishTurn();
          }
        });
      });
    } else {
      _finishTurn();
    }
  }

  int _calculateMergeScore(int value) {
    int baseScore = value;
    if (combo > 1) {
      baseScore = (baseScore * GameConfig.comboMultiplier).toInt();
    }
    return baseScore;
  }

  void _addScore(int points) {
    score += points;
    scoreText.text = 'Score: $score';
    onScoreChanged?.call(score);

    if (score > bestScore) {
      bestScore = score;
      bestScoreText.text = 'Best: $bestScore';
      onBestScoreChanged?.call(bestScore);
    }
  }

  void _finishTurn() {
    isProcessing = false;

    // Check game over
    if (grid.isTopRowFilled()) {
      _gameOver();
    }
  }

  void _gameOver() {
    gameState = GameState.gameOver;
    onGameOver?.call();

    // Show game over message
    add(TextComponent(
      text: 'GAME OVER',
      position: size / 2,
      anchor: Anchor.center,
      textRenderer: TextPaint(
        style: const TextStyle(
          fontFamily: 'Arial',
          fontSize: 48,
          fontWeight: FontWeight.bold,
          color: Colors.red,
        ),
      ),
    ));

    add(TextComponent(
      text: 'Tap to restart',
      position: Vector2(size.x / 2, size.y / 2 + 50),
      anchor: Anchor.center,
      textRenderer: TextPaint(
        style: const TextStyle(
          fontFamily: 'Arial',
          fontSize: 20,
          color: Colors.white70,
        ),
      ),
    ));
  }

  void restartGame() {
    // Remove all blocks from grid
    for (int row = 0; row < GameConfig.gridRows; row++) {
      for (int col = 0; col < GameConfig.gridCols; col++) {
        final block = grid.cells[row][col];
        block?.removeFromParent();
        grid.cells[row][col] = null;
      }
    }

    // Reset state
    score = 0;
    combo = 0;
    scoreText.text = 'Score: 0';
    gameState = GameState.playing;
    isProcessing = false;

    // Remove game over text
    children.whereType<TextComponent>().where((c) =>
        c.text == 'GAME OVER' || c.text == 'Tap to restart').toList()
        .forEach((c) => c.removeFromParent());

    _generateNextValue();
  }

  // Item: Use bomb to remove a block
  void useBomb(int col, int row) {
    if (coins < 100 || isProcessing) return;
    if (grid.getBlockAt(col, row) == null) return;

    coins -= 100;
    isProcessing = true;

    grid.removeBlock(col, row, () {
      isProcessing = false;
    });
  }

  // Item: Shuffle all blocks
  void useShuffle() {
    if (coins < 100 || isProcessing) return;

    coins -= 100;
    isProcessing = true;

    grid.shuffle(() {
      isProcessing = false;
    });
  }

  // Add coins (e.g., from watching ads)
  void addCoins(int amount) {
    coins += amount;
  }

  @override
  Color backgroundColor() => GameConfig.darkColor;
}
