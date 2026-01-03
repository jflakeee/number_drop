import Phaser from 'phaser';
import { GAME_CONFIG } from '@game/config';
import { Block } from './Block';

interface MergeInfo {
  col: number;
  row: number;
  value: number;
  blocks: { col: number; row: number }[];
}

export class Grid {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private cells: (Block | null)[][];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;

    // Initialize empty grid
    this.cells = Array(GRID_ROWS)
      .fill(null)
      .map(() => Array(GRID_COLS).fill(null));

    // Draw grid background
    this.drawGrid();
  }

  private drawGrid(): void {
    const { GRID_COLS, GRID_ROWS, CELL_SIZE } = GAME_CONFIG;

    const gridWidth = GRID_COLS * CELL_SIZE;
    const gridHeight = GRID_ROWS * CELL_SIZE;
    const padding = 8;
    const radius = 12;

    // Frame graphics
    const frame = this.scene.add.graphics();

    // 1. Outer shadow
    frame.fillStyle(0x000000, 0.3);
    frame.fillRoundedRect(
      this.x - padding + 4,
      this.y - padding + 4,
      gridWidth + padding * 2,
      gridHeight + padding * 2,
      radius
    );

    // 2. Outer gold frame
    frame.fillStyle(0xF9A825, 1); // Golden yellow
    frame.fillRoundedRect(
      this.x - padding,
      this.y - padding,
      gridWidth + padding * 2,
      gridHeight + padding * 2,
      radius
    );

    // 3. Inner darker gold border
    frame.fillStyle(0xF57C00, 1); // Darker orange
    frame.fillRoundedRect(
      this.x - padding + 3,
      this.y - padding + 3,
      gridWidth + padding * 2 - 6,
      gridHeight + padding * 2 - 6,
      radius - 2
    );

    // 4. Grid background (dark)
    frame.fillStyle(0x3D3D3D, 1);
    frame.fillRoundedRect(
      this.x - 2,
      this.y - 2,
      gridWidth + 4,
      gridHeight + 4,
      6
    );

    // 5. Inner highlight (top edge)
    frame.fillStyle(0xFFD54F, 0.6);
    frame.fillRoundedRect(
      this.x - padding + 2,
      this.y - padding + 2,
      gridWidth + padding * 2 - 4,
      8,
      { tl: radius - 1, tr: radius - 1, bl: 0, br: 0 }
    );

    // Cell backgrounds
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cellX = this.x + col * CELL_SIZE + CELL_SIZE / 2;
        const cellY = this.y + row * CELL_SIZE + CELL_SIZE / 2;

        // Cell shadow
        frame.fillStyle(0x2A2A2A, 1);
        frame.fillRoundedRect(
          cellX - CELL_SIZE / 2 + 3,
          cellY - CELL_SIZE / 2 + 3,
          CELL_SIZE - 4,
          CELL_SIZE - 4,
          4
        );

        // Cell background
        frame.fillStyle(0x4A4A4A, 1);
        frame.fillRoundedRect(
          cellX - CELL_SIZE / 2 + 2,
          cellY - CELL_SIZE / 2 + 2,
          CELL_SIZE - 4,
          CELL_SIZE - 4,
          4
        );
      }
    }
  }

  getCellPosition(col: number, row: number): { x: number; y: number } {
    const { CELL_SIZE } = GAME_CONFIG;
    return {
      x: this.x + col * CELL_SIZE + CELL_SIZE / 2,
      y: this.y + row * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  getLowestEmptyRow(col: number): number {
    const { GRID_ROWS } = GAME_CONFIG;

    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      if (this.cells[row][col] === null) {
        return row;
      }
    }

    return -1; // Column is full
  }

  placeBlock(col: number, row: number, block: Block): void {
    this.cells[row][col] = block;
    const pos = this.getCellPosition(col, row);
    block.setPosition(pos.x, pos.y);
  }

  findMerges(): MergeInfo[] {
    const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;
    const merges: MergeInfo[] = [];
    const visited = new Set<string>();

    for (let row = GRID_ROWS - 1; row >= 0; row--) {
      for (let col = 0; col < GRID_COLS; col++) {
        const block = this.cells[row][col];
        if (!block) continue;

        const key = `${col},${row}`;
        if (visited.has(key)) continue;

        const value = block.getValue();
        const adjacent = this.findAdjacentSameValue(col, row, value);

        if (adjacent.length > 0) {
          const allBlocks = [{ col, row }, ...adjacent];
          allBlocks.forEach((b) => visited.add(`${b.col},${b.row}`));

          merges.push({
            col,
            row,
            value,
            blocks: allBlocks,
          });
        }
      }
    }

    return merges;
  }

  // Find merges starting from a specific position (dropped block)
  findMergesFromPosition(anchorCol: number, anchorRow: number): MergeInfo | null {
    const block = this.cells[anchorRow][anchorCol];
    if (!block) return null;

    const value = block.getValue();
    const adjacent = this.findAdjacentSameValue(anchorCol, anchorRow, value);

    if (adjacent.length === 0) return null;

    // Anchor (dropped block) is the merge target
    return {
      col: anchorCol,
      row: anchorRow,
      value,
      blocks: [{ col: anchorCol, row: anchorRow }, ...adjacent],
    };
  }

  private findAdjacentSameValue(
    col: number,
    row: number,
    value: number
  ): { col: number; row: number }[] {
    const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;
    const adjacent: { col: number; row: number }[] = [];
    const directions = [
      { dc: -1, dr: 0 },
      { dc: 1, dr: 0 },
      { dc: 0, dr: -1 },
      { dc: 0, dr: 1 },
    ];

    for (const { dc, dr } of directions) {
      const nc = col + dc;
      const nr = row + dr;

      if (nc >= 0 && nc < GRID_COLS && nr >= 0 && nr < GRID_ROWS) {
        const block = this.cells[nr][nc];
        if (block && block.getValue() === value) {
          adjacent.push({ col: nc, row: nr });
        }
      }
    }

    return adjacent;
  }

  performMerge(merge: MergeInfo, onComplete: () => void): void {
    const targetPos = this.getCellPosition(merge.col, merge.row);
    const newValue = merge.value * 2;

    let completed = 0;
    const totalBlocks = merge.blocks.length;

    merge.blocks.forEach(({ col, row }) => {
      const block = this.cells[row][col];
      if (!block) return;

      if (col === merge.col && row === merge.row) {
        // Target block - just update value
        block.setValue(newValue);
        block.playMergeAnimation(() => {
          completed++;
          if (completed === totalBlocks) {
            onComplete();
          }
        });
      } else {
        // Other blocks - move to target and destroy
        this.cells[row][col] = null;

        this.scene.tweens.add({
          targets: block,
          x: targetPos.x,
          y: targetPos.y,
          duration: GAME_CONFIG.MERGE_DURATION,
          ease: 'Quad.easeIn',
          onComplete: () => {
            block.destroy();
            completed++;
            if (completed === totalBlocks) {
              onComplete();
            }
          },
        });
      }
    });
  }

  applyGravity(onComplete: () => void): void {
    const { GRID_COLS, GRID_ROWS, DROP_DURATION } = GAME_CONFIG;
    let hasMoved = false;
    let animations = 0;

    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = GRID_ROWS - 2; row >= 0; row--) {
        const block = this.cells[row][col];
        if (!block) continue;

        const lowestRow = this.getLowestEmptyRowBelow(col, row);
        if (lowestRow > row) {
          hasMoved = true;
          animations++;

          this.cells[row][col] = null;
          this.cells[lowestRow][col] = block;

          const targetPos = this.getCellPosition(col, lowestRow);

          this.scene.tweens.add({
            targets: block,
            y: targetPos.y,
            duration: DROP_DURATION,
            ease: 'Bounce.easeOut',
            onComplete: () => {
              animations--;
              if (animations === 0) {
                onComplete();
              }
            },
          });
        }
      }
    }

    if (!hasMoved) {
      onComplete();
    }
  }

  private getLowestEmptyRowBelow(col: number, startRow: number): number {
    const { GRID_ROWS } = GAME_CONFIG;

    for (let row = GRID_ROWS - 1; row > startRow; row--) {
      if (this.cells[row][col] === null) {
        return row;
      }
    }

    return startRow;
  }

  isTopRowFilled(): boolean {
    const { GRID_COLS } = GAME_CONFIG;

    for (let col = 0; col < GRID_COLS; col++) {
      if (this.cells[0][col] !== null) {
        return true;
      }
    }

    return false;
  }

  // Find the row of a block with specific value in a column (for tracking after gravity)
  getBlockRow(col: number, value: number): number {
    const { GRID_ROWS } = GAME_CONFIG;

    for (let row = 0; row < GRID_ROWS; row++) {
      const block = this.cells[row][col];
      if (block && block.getValue() === value) {
        return row;
      }
    }

    return -1;
  }

  // Item: Remove a specific block (Bomb)
  removeBlock(col: number, row: number, onComplete: () => void): void {
    const block = this.cells[row][col];
    if (!block) {
      onComplete();
      return;
    }

    // Explosion animation
    this.scene.tweens.add({
      targets: block,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        block.destroy();
        this.cells[row][col] = null;
        this.applyGravity(onComplete);
      },
    });
  }

  // Item: Shuffle all blocks
  shuffle(onComplete: () => void): void {
    const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;
    const blocks: { block: Block; value: number }[] = [];

    // Collect all blocks
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const block = this.cells[row][col];
        if (block) {
          blocks.push({ block, value: block.getValue() });
          this.cells[row][col] = null;
        }
      }
    }

    if (blocks.length === 0) {
      onComplete();
      return;
    }

    // Shuffle values
    const values = blocks.map(b => b.value);
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    // Redistribute blocks from bottom
    let blockIndex = 0;
    const animations: Promise<void>[] = [];

    for (let col = 0; col < GRID_COLS && blockIndex < blocks.length; col++) {
      for (let row = GRID_ROWS - 1; row >= 0 && blockIndex < blocks.length; row--) {
        const { block } = blocks[blockIndex];
        const newValue = values[blockIndex];

        block.setValue(newValue);
        this.cells[row][col] = block;

        const targetPos = this.getCellPosition(col, row);

        animations.push(new Promise<void>(resolve => {
          this.scene.tweens.add({
            targets: block,
            x: targetPos.x,
            y: targetPos.y,
            duration: 300,
            ease: 'Quad.easeInOut',
            onComplete: () => resolve(),
          });
        }));

        blockIndex++;
      }
    }

    Promise.all(animations).then(() => onComplete());
  }

  // Get block at position (for item selection)
  getBlockAt(col: number, row: number): Block | null {
    const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
      return null;
    }
    return this.cells[row][col];
  }

  // Get grid position from world coordinates
  getGridPosition(worldX: number, worldY: number): { col: number; row: number } | null {
    const { GRID_COLS, GRID_ROWS, CELL_SIZE } = GAME_CONFIG;

    const col = Math.floor((worldX - this.x) / CELL_SIZE);
    const row = Math.floor((worldY - this.y) / CELL_SIZE);

    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      return { col, row };
    }
    return null;
  }

  // Check if grid has any blocks
  // Get the maximum block value in the grid
  getMaxBlockValue(): number {
    const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;
    let maxValue = 0;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const block = this.cells[row][col];
        if (block) {
          const value = block.getValue();
          if (value > maxValue) {
            maxValue = value;
          }
        }
      }
    }

    return maxValue;
  }

  hasBlocks(): boolean {
    const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.cells[row][col]) return true;
      }
    }
    return false;
  }

  // Get current grid state for saving
  getState(): { col: number; row: number; value: number }[] {
    const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;
    const blocks: { col: number; row: number; value: number }[] = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const block = this.cells[row][col];
        if (block) {
          blocks.push({ col, row, value: block.getValue() });
        }
      }
    }

    return blocks;
  }

  // Load grid state from saved data
  loadState(blocks: { col: number; row: number; value: number }[]): void {
    // Clear existing blocks
    this.clearAll();

    // Create blocks from saved state
    for (const { col, row, value } of blocks) {
      const pos = this.getCellPosition(col, row);
      const block = new Block(this.scene, pos.x, pos.y, value);
      this.cells[row][col] = block;
    }
  }

  // Clear all blocks from grid
  clearAll(): void {
    const { GRID_COLS, GRID_ROWS } = GAME_CONFIG;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const block = this.cells[row][col];
        if (block) {
          block.destroy();
          this.cells[row][col] = null;
        }
      }
    }
  }
}
