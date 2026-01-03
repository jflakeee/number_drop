import 'package:flame/components.dart';
import 'package:flame/effects.dart';
import 'package:flutter/material.dart';
import '../config.dart';
import 'block.dart';

class MergeInfo {
  final int col;
  final int row;
  final int value;
  final List<GridPosition> blocks;

  MergeInfo({
    required this.col,
    required this.row,
    required this.value,
    required this.blocks,
  });
}

class GridPosition {
  final int col;
  final int row;

  GridPosition(this.col, this.row);

  @override
  bool operator ==(Object other) =>
      other is GridPosition && col == other.col && row == other.row;

  @override
  int get hashCode => col.hashCode ^ row.hashCode;

  @override
  String toString() => '($col, $row)';
}

class GameGrid extends PositionComponent {
  late List<List<GameBlock?>> cells;
  final double gridX;
  final double gridY;

  GameGrid({
    required this.gridX,
    required this.gridY,
  }) : super(position: Vector2(gridX, gridY));

  @override
  Future<void> onLoad() async {
    await super.onLoad();

    // Initialize empty grid
    cells = List.generate(
      GameConfig.gridRows,
      (_) => List.filled(GameConfig.gridCols, null),
    );

    // Draw grid background
    _drawGrid();
  }

  void _drawGrid() {
    final gridWidth = GameConfig.gridCols * GameConfig.cellSize;
    final gridHeight = GameConfig.gridRows * GameConfig.cellSize;
    const padding = 8.0;

    // 1. Outer shadow
    add(RectangleComponent(
      size: Vector2(gridWidth + padding * 2, gridHeight + padding * 2),
      position: Vector2(-padding + 4, -padding + 4),
      paint: Paint()..color = Colors.black.withValues(alpha: 0.3),
    ));

    // 2. Outer gold frame
    add(RectangleComponent(
      size: Vector2(gridWidth + padding * 2, gridHeight + padding * 2),
      position: Vector2(-padding, -padding),
      paint: Paint()..color = const Color(0xFFF9A825),
    ));

    // 3. Inner darker gold border
    add(RectangleComponent(
      size: Vector2(gridWidth + padding * 2 - 6, gridHeight + padding * 2 - 6),
      position: Vector2(-padding + 3, -padding + 3),
      paint: Paint()..color = const Color(0xFFF57C00),
    ));

    // 4. Grid background (dark)
    add(RectangleComponent(
      size: Vector2(gridWidth + 4, gridHeight + 4),
      position: Vector2(-2, -2),
      paint: Paint()..color = const Color(0xFF3D3D3D),
    ));

    // 5. Inner highlight (top edge)
    add(RectangleComponent(
      size: Vector2(gridWidth + padding * 2 - 4, 8),
      position: Vector2(-padding + 2, -padding + 2),
      paint: Paint()..color = const Color(0xFFFFD54F).withValues(alpha: 0.6),
    ));

    // Cell backgrounds - using same coordinate system as blocks
    const cellMargin = 2.0;
    final cellBgSize = GameConfig.cellSize - cellMargin * 2;

    for (int row = 0; row < GameConfig.gridRows; row++) {
      for (int col = 0; col < GameConfig.gridCols; col++) {
        final cellX = col * GameConfig.cellSize;
        final cellY = row * GameConfig.cellSize;

        // Cell background
        add(RectangleComponent(
          size: Vector2.all(cellBgSize),
          position: Vector2(cellX + cellMargin, cellY + cellMargin),
          paint: Paint()..color = const Color(0xFF4A4A4A),
        ));
      }
    }
  }

  Vector2 getCellPosition(int col, int row) {
    return Vector2(
      col * GameConfig.cellSize + GameConfig.cellSize / 2,
      row * GameConfig.cellSize + GameConfig.cellSize / 2,
    );
  }

  int getLowestEmptyRow(int col) {
    for (int row = GameConfig.gridRows - 1; row >= 0; row--) {
      if (cells[row][col] == null) {
        return row;
      }
    }
    return -1; // Column is full
  }

  void placeBlock(int col, int row, GameBlock block) {
    cells[row][col] = block;
    final pos = getCellPosition(col, row);
    block.position = pos;
    add(block);
  }

  MergeInfo? findMergesFromPosition(int anchorCol, int anchorRow) {
    final block = cells[anchorRow][anchorCol];
    if (block == null) return null;

    final value = block.value;
    final adjacent = _findAdjacentSameValue(anchorCol, anchorRow, value);

    if (adjacent.isEmpty) return null;

    return MergeInfo(
      col: anchorCol,
      row: anchorRow,
      value: value,
      blocks: [GridPosition(anchorCol, anchorRow), ...adjacent],
    );
  }

  List<GridPosition> _findAdjacentSameValue(int col, int row, int value) {
    final adjacent = <GridPosition>[];
    final directions = [
      [-1, 0], // left
      [1, 0], // right
      [0, -1], // up
      [0, 1], // down
    ];

    for (final dir in directions) {
      final nc = col + dir[0];
      final nr = row + dir[1];

      if (nc >= 0 &&
          nc < GameConfig.gridCols &&
          nr >= 0 &&
          nr < GameConfig.gridRows) {
        final block = cells[nr][nc];
        if (block != null && block.value == value) {
          adjacent.add(GridPosition(nc, nr));
        }
      }
    }

    return adjacent;
  }

  void performMerge(MergeInfo merge, VoidCallback onComplete) {
    final targetPos = getCellPosition(merge.col, merge.row);
    final newValue = merge.value * 2;

    int completed = 0;
    final totalBlocks = merge.blocks.length;

    for (final pos in merge.blocks) {
      final block = cells[pos.row][pos.col];
      if (block == null) continue;

      if (pos.col == merge.col && pos.row == merge.row) {
        // Target block - update value
        block.setValue(newValue);
        block.playMergeAnimation(onComplete: () {
          completed++;
          if (completed == totalBlocks) {
            onComplete();
          }
        });
      } else {
        // Other blocks - move to target and remove
        cells[pos.row][pos.col] = null;

        block.playMoveToAnimation(
          targetPos,
          onComplete: () {
            block.removeFromParent();
            completed++;
            if (completed == totalBlocks) {
              onComplete();
            }
          },
        );
      }
    }
  }

  void applyGravity(VoidCallback onComplete) {
    bool hasMoved = false;
    int animations = 0;

    for (int col = 0; col < GameConfig.gridCols; col++) {
      for (int row = GameConfig.gridRows - 2; row >= 0; row--) {
        final block = cells[row][col];
        if (block == null) continue;

        final lowestRow = _getLowestEmptyRowBelow(col, row);
        if (lowestRow > row) {
          hasMoved = true;
          animations++;

          cells[row][col] = null;
          cells[lowestRow][col] = block;

          final targetPos = getCellPosition(col, lowestRow);

          block.playDropAnimation(
            targetPos,
            onComplete: () {
              animations--;
              if (animations == 0) {
                onComplete();
              }
            },
          );
        }
      }
    }

    if (!hasMoved) {
      onComplete();
    }
  }

  int _getLowestEmptyRowBelow(int col, int startRow) {
    for (int row = GameConfig.gridRows - 1; row > startRow; row--) {
      if (cells[row][col] == null) {
        return row;
      }
    }
    return startRow;
  }

  bool isTopRowFilled() {
    for (int col = 0; col < GameConfig.gridCols; col++) {
      if (cells[0][col] != null) {
        return true;
      }
    }
    return false;
  }

  bool isColumnFull(int col) {
    return cells[0][col] != null;
  }

  int getBlockRow(int col, int value) {
    for (int row = 0; row < GameConfig.gridRows; row++) {
      final block = cells[row][col];
      if (block != null && block.value == value) {
        return row;
      }
    }
    return -1;
  }

  // Item: Remove a specific block (Bomb)
  void removeBlock(int col, int row, VoidCallback onComplete) {
    final block = cells[row][col];
    if (block == null) {
      onComplete();
      return;
    }

    block.playExplosionAnimation(onComplete: () {
      cells[row][col] = null;
      applyGravity(onComplete);
    });
  }

  // Item: Shuffle all blocks
  void shuffle(VoidCallback onComplete) {
    final blocks = <GameBlock>[];
    final values = <int>[];

    // Collect all blocks
    for (int row = 0; row < GameConfig.gridRows; row++) {
      for (int col = 0; col < GameConfig.gridCols; col++) {
        final block = cells[row][col];
        if (block != null) {
          blocks.add(block);
          values.add(block.value);
          cells[row][col] = null;
        }
      }
    }

    if (blocks.isEmpty) {
      onComplete();
      return;
    }

    // Shuffle values
    values.shuffle();

    // Redistribute blocks from bottom
    int blockIndex = 0;
    int animationsRemaining = blocks.length;

    for (int col = 0;
        col < GameConfig.gridCols && blockIndex < blocks.length;
        col++) {
      for (int row = GameConfig.gridRows - 1;
          row >= 0 && blockIndex < blocks.length;
          row--) {
        final block = blocks[blockIndex];
        final newValue = values[blockIndex];

        block.setValue(newValue);
        cells[row][col] = block;

        final targetPos = getCellPosition(col, row);

        block.add(
          MoveEffect.to(
            targetPos,
            EffectController(
              duration: 0.3,
              curve: Curves.easeInOut,
            ),
            onComplete: () {
              animationsRemaining--;
              if (animationsRemaining == 0) {
                onComplete();
              }
            },
          ),
        );

        blockIndex++;
      }
    }
  }

  GameBlock? getBlockAt(int col, int row) {
    if (col < 0 ||
        col >= GameConfig.gridCols ||
        row < 0 ||
        row >= GameConfig.gridRows) {
      return null;
    }
    return cells[row][col];
  }

  GridPosition? getGridPosition(double worldX, double worldY) {
    final localX = worldX - gridX;
    final localY = worldY - gridY;

    final col = (localX / GameConfig.cellSize).floor();
    final row = (localY / GameConfig.cellSize).floor();

    if (col >= 0 &&
        col < GameConfig.gridCols &&
        row >= 0 &&
        row < GameConfig.gridRows) {
      return GridPosition(col, row);
    }
    return null;
  }

  bool hasBlocks() {
    for (int row = 0; row < GameConfig.gridRows; row++) {
      for (int col = 0; col < GameConfig.gridCols; col++) {
        if (cells[row][col] != null) return true;
      }
    }
    return false;
  }

  // Get column from world X coordinate
  int getColumnFromX(double worldX) {
    final localX = worldX - gridX;
    final col = (localX / GameConfig.cellSize).floor();
    return col.clamp(0, GameConfig.gridCols - 1);
  }
}
