import Phaser from 'phaser';
import { GAME_CONFIG } from '@game/config';
import { statisticsService } from '@services/StatisticsService';
import { achievementService } from '@services/AchievementService';

export class StatsScene extends Phaser.Scene {
  private currentTab: 'stats' | 'achievements' = 'stats';
  private contentContainer!: Phaser.GameObjects.Container;
  private tabButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'StatsScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const { COLORS } = GAME_CONFIG;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.LIGHT);

    // Header
    this.add.rectangle(width / 2, 50, width, 100, COLORS.DARK);

    // Title
    this.add.text(width / 2, 40, '통계 & 업적', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '24px',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0.5);

    // Back button
    const backBtn = this.add.text(30, 40, '←', {
      fontSize: '32px',
      color: '#FFFFFF',
    });
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    // Tab buttons
    this.createTabs();

    // Content container
    this.contentContainer = this.add.container(0, 0);

    // Show initial tab
    this.showTab('stats');
  }

  private createTabs(): void {
    const { width } = this.cameras.main;
    const tabY = 110;

    // Stats tab
    const statsTab = this.createTabButton(width / 4, tabY, '📊 통계', 'stats');
    this.tabButtons.push(statsTab);

    // Achievements tab
    const achievementsTab = this.createTabButton((width * 3) / 4, tabY, '🏆 업적', 'achievements');
    this.tabButtons.push(achievementsTab);
  }

  private createTabButton(x: number, y: number, text: string, tab: 'stats' | 'achievements'): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const { width } = this.cameras.main;

    const bg = this.add.graphics();
    bg.fillStyle(this.currentTab === tab ? 0xF96D00 : 0x393E46, 1);
    bg.fillRoundedRect(-width / 4 + 10, -20, width / 2 - 20, 40, 8);
    container.add(bg);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5, 0.5);
    container.add(label);

    const hitArea = this.add.rectangle(0, 0, width / 2 - 20, 40, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.showTab(tab));
    container.add(hitArea);

    container.setData('bg', bg);
    container.setData('tab', tab);

    return container;
  }

  private updateTabStyles(): void {
    const { width } = this.cameras.main;
    this.tabButtons.forEach(tabContainer => {
      const bg = tabContainer.getData('bg') as Phaser.GameObjects.Graphics;
      const tab = tabContainer.getData('tab') as string;
      bg.clear();
      bg.fillStyle(this.currentTab === tab ? 0xF96D00 : 0x393E46, 1);
      bg.fillRoundedRect(-width / 4 + 10, -20, width / 2 - 20, 40, 8);
    });
  }

  private showTab(tab: 'stats' | 'achievements'): void {
    this.currentTab = tab;
    this.updateTabStyles();
    this.contentContainer.removeAll(true);

    if (tab === 'stats') {
      this.showStatsContent();
    } else {
      this.showAchievementsContent();
    }
  }

  private showStatsContent(): void {
    const { width } = this.cameras.main;
    const stats = statisticsService.getStats();
    const startY = 160;
    const rowHeight = 50;

    // Stats rows
    const statsData = [
      { icon: '🎮', label: '총 게임 수', value: stats.totalGames.toLocaleString() },
      { icon: '📊', label: '평균 점수', value: statisticsService.getAverageScore().toLocaleString() },
      { icon: '🏆', label: '최고 점수', value: stats.bestScore.toLocaleString() },
      { icon: '🔢', label: '최고 블록', value: stats.highestBlock.toLocaleString() },
      { icon: '🔄', label: '총 병합 수', value: stats.totalMerges.toLocaleString() },
      { icon: '🔥', label: '최대 콤보', value: `${stats.maxCombo}콤보` },
      { icon: '⏱️', label: '총 플레이 시간', value: statisticsService.getFormattedPlayTime() },
      { icon: '⭐', label: '연속 접속', value: `${stats.consecutiveDays}일` },
    ];

    statsData.forEach((stat, index) => {
      const y = startY + index * rowHeight;

      // Row background
      const rowBg = this.add.graphics();
      rowBg.fillStyle(index % 2 === 0 ? 0xFFFFFF : 0xF5F5F5, 1);
      rowBg.fillRect(20, y, width - 40, rowHeight - 5);
      this.contentContainer.add(rowBg);

      // Icon
      const icon = this.add.text(40, y + rowHeight / 2 - 2, stat.icon, {
        fontSize: '20px',
      });
      icon.setOrigin(0, 0.5);
      this.contentContainer.add(icon);

      // Label
      const label = this.add.text(80, y + rowHeight / 2 - 2, stat.label, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#333333',
      });
      label.setOrigin(0, 0.5);
      this.contentContainer.add(label);

      // Value
      const value = this.add.text(width - 40, y + rowHeight / 2 - 2, stat.value, {
        fontFamily: 'Arial Black, Arial',
        fontSize: '16px',
        color: '#F96D00',
        fontStyle: 'bold',
      });
      value.setOrigin(1, 0.5);
      this.contentContainer.add(value);
    });

    // Weekly chart section
    const chartY = startY + statsData.length * rowHeight + 30;
    this.createWeeklyChart(chartY);
  }

  private createWeeklyChart(startY: number): void {
    const { width } = this.cameras.main;
    const recentData = statisticsService.getRecentDaysData(7);

    // Chart title
    const title = this.add.text(width / 2, startY, '📈 최근 7일 활동', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#333333',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.contentContainer.add(title);

    // Chart area
    const chartY = startY + 30;
    const chartHeight = 100;
    const barWidth = 35;
    const maxGames = Math.max(...recentData.map(d => d.games), 1);

    const chartBg = this.add.graphics();
    chartBg.fillStyle(0xF5F5F5, 1);
    chartBg.fillRoundedRect(20, chartY, width - 40, chartHeight + 40, 8);
    this.contentContainer.add(chartBg);

    recentData.forEach((day, index) => {
      const x = 50 + index * ((width - 100) / 7);
      const barHeight = maxGames > 0 ? (day.games / maxGames) * chartHeight : 0;

      // Bar
      const bar = this.add.graphics();
      bar.fillStyle(0xF96D00, 1);
      bar.fillRoundedRect(x - barWidth / 2, chartY + chartHeight - barHeight + 10, barWidth, barHeight, 4);
      this.contentContainer.add(bar);

      // Games count
      if (day.games > 0) {
        const countText = this.add.text(x, chartY + chartHeight - barHeight + 5, day.games.toString(), {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#F96D00',
          fontStyle: 'bold',
        });
        countText.setOrigin(0.5, 1);
        this.contentContainer.add(countText);
      }

      // Date label
      const dateLabel = this.add.text(x, chartY + chartHeight + 25, day.date, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#666666',
      });
      dateLabel.setOrigin(0.5, 0.5);
      this.contentContainer.add(dateLabel);
    });
  }

  private showAchievementsContent(): void {
    const { width } = this.cameras.main;
    const achievements = achievementService.getAchievements();
    const startY = 160;
    const rowHeight = 70;

    // Progress header
    const unlocked = achievementService.getUnlockedCount();
    const total = achievementService.getTotalCount();
    const progressText = this.add.text(width / 2, startY, `${unlocked} / ${total} 달성`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '18px',
      color: '#F96D00',
    });
    progressText.setOrigin(0.5, 0.5);
    this.contentContainer.add(progressText);

    // Progress bar
    const progressBarBg = this.add.graphics();
    progressBarBg.fillStyle(0xE0E0E0, 1);
    progressBarBg.fillRoundedRect(40, startY + 25, width - 80, 10, 5);
    this.contentContainer.add(progressBarBg);

    const progressBar = this.add.graphics();
    progressBar.fillStyle(0xF96D00, 1);
    const progressWidth = ((width - 80) * unlocked) / total;
    progressBar.fillRoundedRect(40, startY + 25, progressWidth, 10, 5);
    this.contentContainer.add(progressBar);

    // Achievement list
    const listStartY = startY + 60;

    // Sort: unlocked first, then by condition value
    const sortedAchievements = [...achievements].sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return a.condition.value - b.condition.value;
    });

    sortedAchievements.forEach((achievement, index) => {
      const y = listStartY + index * rowHeight;

      // Row background
      const rowBg = this.add.graphics();
      rowBg.fillStyle(achievement.unlocked ? 0xFFF8E1 : 0xF5F5F5, 1);
      rowBg.fillRoundedRect(20, y, width - 40, rowHeight - 5, 8);
      if (achievement.unlocked) {
        rowBg.lineStyle(2, 0xFFD700, 1);
        rowBg.strokeRoundedRect(20, y, width - 40, rowHeight - 5, 8);
      }
      this.contentContainer.add(rowBg);

      // Icon
      const icon = this.add.text(50, y + rowHeight / 2 - 2, achievement.icon, {
        fontSize: '28px',
      });
      icon.setOrigin(0.5, 0.5);
      if (!achievement.unlocked) icon.setAlpha(0.4);
      this.contentContainer.add(icon);

      // Name
      const name = this.add.text(85, y + 15, achievement.name, {
        fontFamily: 'Arial Black, Arial',
        fontSize: '14px',
        color: achievement.unlocked ? '#333333' : '#999999',
        fontStyle: 'bold',
      });
      name.setOrigin(0, 0);
      this.contentContainer.add(name);

      // Description
      const desc = this.add.text(85, y + 35, achievement.description, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: achievement.unlocked ? '#666666' : '#AAAAAA',
      });
      desc.setOrigin(0, 0);
      this.contentContainer.add(desc);

      // Reward
      const rewardBg = this.add.graphics();
      rewardBg.fillStyle(achievement.unlocked ? 0xFFD700 : 0xCCCCCC, 1);
      rewardBg.fillRoundedRect(width - 80, y + 20, 50, 25, 5);
      this.contentContainer.add(rewardBg);

      const rewardText = this.add.text(width - 55, y + 32, `+${achievement.reward}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: achievement.unlocked ? '#333333' : '#666666',
        fontStyle: 'bold',
      });
      rewardText.setOrigin(0.5, 0.5);
      this.contentContainer.add(rewardText);

      // Progress bar for achievements with targets
      if (!achievement.unlocked && achievement.target && achievement.progress !== undefined) {
        const progressPercent = Math.min(achievement.progress / achievement.target, 1);
        const pbWidth = 120;
        const pbHeight = 6;
        const pbX = 85;
        const pbY = y + 50;

        const pbBg = this.add.graphics();
        pbBg.fillStyle(0xE0E0E0, 1);
        pbBg.fillRoundedRect(pbX, pbY, pbWidth, pbHeight, 3);
        this.contentContainer.add(pbBg);

        if (progressPercent > 0) {
          const pbFill = this.add.graphics();
          pbFill.fillStyle(0xF96D00, 1);
          pbFill.fillRoundedRect(pbX, pbY, pbWidth * progressPercent, pbHeight, 3);
          this.contentContainer.add(pbFill);
        }

        const progressLabel = this.add.text(pbX + pbWidth + 5, pbY + 3, `${achievement.progress}/${achievement.target}`, {
          fontFamily: 'Arial',
          fontSize: '10px',
          color: '#999999',
        });
        progressLabel.setOrigin(0, 0.5);
        this.contentContainer.add(progressLabel);
      }
    });
  }
}
