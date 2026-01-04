/**
 * Ad Service - Implements user-friendly ad policy from design doc (lines 11-24)
 *
 * === AD POLICY (광고 정책) ===
 *
 * ALLOWED (허용):
 * - Fixed banner ads at top/bottom only (화면 상하단 고정 광고만)
 * - Rewarded ads ONLY when user clicks ad button (버튼 눌렀을때만)
 * - Ad icon visible on buttons that trigger ads (광고 아이콘 표시)
 *
 * PROHIBITED (금지):
 * - Time-based automatic ads (일정시간 지날때 광고표시 금지)
 * - Unconditional/random ads (무조건적인 광고 표시 금지)
 * - Ads on level up (레벨업 할때 광고표시 금지)
 * - Ads on stage clear (스테이지 클리어 할때 광고표시 금지)
 * - Interstitial/popup ads (전면 광고 금지)
 * - Ads that interrupt gameplay (게임 방해 광고 금지)
 *
 * PRINCIPLE: Ads should be MINIMAL and PREDICTABLE (광고 최소화, 예측 가능)
 */

// Ad types allowed by policy
type BannerPosition = 'top' | 'bottom';
type AllowedAdType = 'banner' | 'rewarded'; // Only these types allowed

interface AdCallbacks {
  onRewarded?: () => void;
  onFailed?: (error: string) => void;
  onClosed?: () => void;
  onLoading?: () => void;
}

interface AdConfig {
  bannerTopId: string;
  bannerBottomId: string;
  rewardedId: string;
  rewardCoins: number;
  enableBannerAds: boolean;
  enableRewardedAds: boolean;
}

const DEFAULT_CONFIG: AdConfig = {
  bannerTopId: 'ca-app-pub-xxx/banner-top',
  bannerBottomId: 'ca-app-pub-xxx/banner-bottom',
  rewardedId: 'ca-app-pub-xxx/rewarded',
  rewardCoins: 50,
  enableBannerAds: false,  // Disabled by default for minimal ads
  enableRewardedAds: true,
};

class AdServiceClass {
  private isInitialized = false;
  private isAdLoading = false;
  private bannerVisible: { top: boolean; bottom: boolean } = { top: false, bottom: false };
  private config: AdConfig = DEFAULT_CONFIG;
  private lastRewardTime: number = 0;
  private rewardCooldown: number = 30000; // 30 second cooldown

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // TODO: Initialize AdMob SDK for Capacitor
      // import { AdMob } from '@capacitor-community/admob';
      // await AdMob.initialize();

      this.isInitialized = true;
      console.log('AdService initialized');
    } catch (error) {
      console.error('Failed to initialize AdService:', error);
    }
  }

  configure(config: Partial<AdConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getRewardAmount(): number {
    return this.config.rewardCoins;
  }

  isRewardedAdAvailable(): boolean {
    if (!this.config.enableRewardedAds) return false;
    if (this.isAdLoading) return false;

    const now = Date.now();
    return now - this.lastRewardTime >= this.rewardCooldown;
  }

  getRewardCooldownRemaining(): number {
    const elapsed = Date.now() - this.lastRewardTime;
    const remaining = Math.max(0, this.rewardCooldown - elapsed);
    return Math.ceil(remaining / 1000);
  }

  async showBanner(position: BannerPosition): Promise<void> {
    if (!this.config.enableBannerAds) {
      console.log('Banner ads disabled');
      return;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // TODO: Show banner ad with AdMob
      this.bannerVisible[position] = true;
      console.log(`Banner shown at ${position}`);
    } catch (error) {
      console.error(`Failed to show ${position} banner:`, error);
    }
  }

  async hideBanner(position: BannerPosition): Promise<void> {
    if (!this.bannerVisible[position]) return;

    try {
      // TODO: Hide banner ad
      this.bannerVisible[position] = false;
      console.log(`Banner hidden at ${position}`);
    } catch (error) {
      console.error(`Failed to hide ${position} banner:`, error);
    }
  }

  async showRewarded(callbacks: AdCallbacks): Promise<void> {
    if (!this.config.enableRewardedAds) {
      callbacks.onFailed?.('Rewarded ads disabled');
      return;
    }

    if (this.isAdLoading) {
      callbacks.onFailed?.('Ad loading...');
      return;
    }

    if (!this.isRewardedAdAvailable()) {
      const remaining = this.getRewardCooldownRemaining();
      callbacks.onFailed?.(`${remaining}s`);
      return;
    }

    if (!this.isInitialized) {
      await this.initialize();
    }

    this.isAdLoading = true;
    callbacks.onLoading?.();

    try {
      // TODO: Show rewarded ad with AdMob
      // Simulate ad viewing (2 seconds)
      console.log('Showing rewarded ad...');

      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.1) {
            resolve();
          } else {
            reject(new Error('Ad unavailable'));
          }
        }, 2000);
      });

      this.lastRewardTime = Date.now();
      this.isAdLoading = false;

      console.log(`Reward: +${this.config.rewardCoins} coins`);
      callbacks.onRewarded?.();

    } catch (error) {
      this.isAdLoading = false;
      const message = error instanceof Error ? error.message : 'Ad failed';
      console.error('Rewarded ad error:', message);
      callbacks.onFailed?.(message);
    }
  }

  isBannerVisible(position: BannerPosition): boolean {
    return this.bannerVisible[position];
  }

  isBannerAdsEnabled(): boolean {
    return this.config.enableBannerAds;
  }

  isLoading(): boolean {
    return this.isAdLoading;
  }

  // === POLICY ENFORCEMENT METHODS ===

  /**
   * Check if showing an ad is allowed in current context
   * Returns false for prohibited scenarios (level up, stage clear, etc.)
   */
  isAdAllowedInContext(context: 'levelUp' | 'stageClear' | 'gameOver' | 'userAction'): boolean {
    // PROHIBITED contexts - never show ads
    if (context === 'levelUp') return false;
    if (context === 'stageClear') return false;
    if (context === 'gameOver') return false;

    // ALLOWED - only on explicit user action
    return context === 'userAction';
  }

  /**
   * PROHIBITED: Interstitial ads are not allowed by policy
   * This method exists to prevent accidental implementation
   */
  showInterstitial(): never {
    throw new Error('POLICY VIOLATION: Interstitial ads are prohibited (전면 광고 금지)');
  }

  /**
   * PROHIBITED: Time-based automatic ads are not allowed
   * This method exists to prevent accidental implementation
   */
  scheduleTimedAd(_delayMs: number): never {
    throw new Error('POLICY VIOLATION: Time-based ads are prohibited (일정시간 광고 금지)');
  }

  /**
   * Get policy summary for debugging/logging
   */
  getPolicySummary(): string {
    return `
Ad Policy Status:
- Banner Ads: ${this.config.enableBannerAds ? 'ENABLED (top/bottom only)' : 'DISABLED'}
- Rewarded Ads: ${this.config.enableRewardedAds ? 'ENABLED (user-triggered only)' : 'DISABLED'}
- Interstitial Ads: PROHIBITED
- Time-based Ads: PROHIBITED
- Level Up/Stage Clear Ads: PROHIBITED
    `.trim();
  }
}

export const AdService = new AdServiceClass();
export type { AdCallbacks, AdConfig, BannerPosition, AllowedAdType };
