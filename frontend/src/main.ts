import Phaser from 'phaser';
import { BootScene } from '@game/scenes/BootScene';
import { MenuScene } from '@game/scenes/MenuScene';
import { GameScene } from '@game/scenes/GameScene';
import { GameOverScene } from '@game/scenes/GameOverScene';
import { LeaderboardScene } from '@game/scenes/LeaderboardScene';
import { SettingsScene } from '@game/scenes/SettingsScene';
import { StatsScene } from '@game/scenes/StatsScene';
import './index.css';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 390,
  height: 844,
  parent: 'root',
  backgroundColor: '#222831',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, GameOverScene, LeaderboardScene, SettingsScene, StatsScene],
};

new Phaser.Game(config);
