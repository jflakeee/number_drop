export const GAME_CONFIG = {
  // Grid settings
  GRID_COLS: 5,
  GRID_ROWS: 8,
  CELL_SIZE: 60,
  GRID_PADDING: 20,

  // Block settings (Benchmark-matched colors)
  BLOCK_COLORS: {
    2: 0x90EE90,    // 연두색 (Light Green)
    4: 0x4ECDC4,    // 초록색 (Teal)
    8: 0x45B7D1,    // 청록색 (Cyan)
    16: 0x5D6BE8,   // 파란색 (Blue)
    32: 0xE8875D,   // 주황색 (Orange)
    64: 0xE85D8C,   // 분홍색 (Pink)
    128: 0x7BA3A8,  // 청회색 (Gray-Teal)
    256: 0xE85DA8,  // 분홍색 (Magenta)
    512: 0x5DE87B,  // 초록색 (Green)
    1024: 0x888888, // 회색 (Gray)
    2048: 0xFF8C00, // 주황색 특수 (Orange Special)
    4096: 0x9B59B6, // 보라색 특수 (Purple Special)
  } as Record<number, number>,

  // Text colors (dark for light backgrounds, light for dark)
  TEXT_COLORS: {
    2: 0x5D4E37,    // Dark text for light green
    4: 0x5D4E37,    // Dark text for teal
    8: 0xFFFFFF,
    16: 0xFFFFFF,
    32: 0xFFFFFF,
    64: 0xFFFFFF,
    128: 0xFFFFFF,
    256: 0xFFFFFF,
    512: 0xFFFFFF,
    1024: 0xFFFFFF,
    2048: 0xFFFFFF,
    4096: 0xFFFFFF,
  } as Record<number, number>,

  // Starting numbers
  START_NUMBERS: [2, 4],

  // Score multipliers
  COMBO_MULTIPLIER: 1.5,

  // Animation durations (ms)
  DROP_DURATION: 200,
  MERGE_DURATION: 150,
  SPAWN_DURATION: 100,

  // Theme colors
  COLORS: {
    PRIMARY: 0xF96D00,
    DARK: 0x222831,
    LIGHT: 0xF2F2F2,
    SUCCESS: 0x27AE60,
    DANGER: 0xE74C3C,
  },
};

export const AD_CONFIG = {
  // AdMob IDs (replace with real IDs in production)
  BANNER_TOP: 'ca-app-pub-xxxxx/xxxxx',
  BANNER_BOTTOM: 'ca-app-pub-xxxxx/xxxxx',
  REWARDED: 'ca-app-pub-xxxxx/xxxxx',

  // Banner sizes (60px banner + 10px padding)
  BANNER_HEIGHT: 70,
};
