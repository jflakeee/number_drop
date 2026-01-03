type BannerPosition = 'top' | 'bottom';

interface AdCallbacks {
  onRewarded?: () => void;
  onFailed?: (error: string) => void;
  onClosed?: () => void;
}

class AdServiceClass {
  private isInitialized = false;
  private bannerVisible: { top: boolean; bottom: boolean } = { top: false, bottom: false };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // TODO: Initialize AdMob SDK
    // await AdMob.initialize();

    this.isInitialized = true;
    console.log('AdService initialized');
  }

  async showBanner(position: BannerPosition): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // TODO: Show banner ad
    // await AdMob.showBanner({
    //   adId: position === 'top' ? AD_CONFIG.BANNER_TOP : AD_CONFIG.BANNER_BOTTOM,
    //   position: position === 'top' ? 'top' : 'bottom',
    // });

    this.bannerVisible[position] = true;
    console.log(`Banner shown at ${position}`);
  }

  async hideBanner(position: BannerPosition): Promise<void> {
    if (!this.bannerVisible[position]) return;

    // TODO: Hide banner ad
    // await AdMob.hideBanner();

    this.bannerVisible[position] = false;
    console.log(`Banner hidden at ${position}`);
  }

  async showRewarded(callbacks: AdCallbacks): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // TODO: Show rewarded ad
      // const result = await AdMob.showRewardVideoAd({
      //   adId: AD_CONFIG.REWARDED,
      // });

      // Simulate reward for development
      console.log('Rewarded ad shown');

      // Simulate successful reward
      setTimeout(() => {
        callbacks.onRewarded?.();
      }, 1000);
    } catch (error) {
      callbacks.onFailed?.(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  isBannerVisible(position: BannerPosition): boolean {
    return this.bannerVisible[position];
  }
}

export const AdService = new AdServiceClass();
