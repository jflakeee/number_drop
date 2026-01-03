/**
 * Ad Service - Implements user-friendly ad policy from design doc
 *
 * Ad Policy:
 * - Fixed banner ads (top/bottom) - optional, minimal
 * - Rewarded ads only when user clicks ad button
 * - Ad icon visible on buttons that show ads (predictable)
 * - NO time-based automatic ads
 * - NO unconditional interstitial ads
 * - NO ads on level up or stage clear
 */

type BannerPosition = 'top' | 'bottom';

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

  isLoading(): boolean {
    return this.isAdLoading;
  }
}

export const AdService = new AdServiceClass();
export type { AdCallbacks, AdConfig, BannerPosition };
