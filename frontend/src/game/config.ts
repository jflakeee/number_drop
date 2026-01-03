export const GAME_CONFIG = {
  // Grid settings
  GRID_COLS: 5,
  GRID_ROWS: 8,
  CELL_SIZE: 60,
  GRID_PADDING: 20,

  // Block settings
  BLOCK_COLORS: {
    2: 0xEEE4DA,
    4: 0xEDE0C8,
    8: 0xF2B179,
    16: 0xF59563,
    32: 0xF67C5F,
    64: 0xF65E3B,
    128: 0xEDCF72,
    256: 0xEDCC61,
    512: 0xEDC850,
    1024: 0xEDC53F,
    2048: 0xEDC22E,
  } as Record<number, number>,

  // Text colors (dark for light backgrounds, light for dark)
  TEXT_COLORS: {
    2: 0x776E65,
    4: 0x776E65,
    8: 0xF9F6F2,
    16: 0xF9F6F2,
    32: 0xF9F6F2,
    64: 0xF9F6F2,
    128: 0xF9F6F2,
    256: 0xF9F6F2,
    512: 0xF9F6F2,
    1024: 0xF9F6F2,
    2048: 0xF9F6F2,
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

  // Banner sizes
  BANNER_HEIGHT: 50,
};
