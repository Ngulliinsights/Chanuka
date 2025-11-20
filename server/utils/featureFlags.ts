/**
 * Feature flag service for controlling feature availability
 */
export class FeatureFlags {
  /**
   * Map of feature flags and their status
   * @private - Use accessor methods instead of directly accessing
   */
  private static features: Record<string, boolean> = {
    notifyExperts: false,
    // Add more feature flags as needed
  };

  /**
   * Check if a feature is enabled
   * @param featureName - Name of the feature to check
   * @returns Whether the feature is enabled
   * @throws Error if the feature doesn't exist
   */
  public static isEnabled(featureName: string): boolean {
    this.validateFeatureExists(featureName);
    return this.features[featureName] === true;
  }

  /**
   * Enable a feature
   * @param featureName - Name of the feature to enable
   * @throws Error if the feature doesn't exist
   */
  public static enable(featureName: string): void {
    this.validateFeatureExists(featureName);
    this.features[featureName] = true;
  }

  /**
   * Disable a feature
   * @param featureName - Name of the feature to disable
   * @throws Error if the feature doesn't exist
   */
  public static disable(featureName: string): void {
    this.validateFeatureExists(featureName);
    this.features[featureName] = false;
  }

  /**
   * Toggle a feature's status
   * @param featureName - Name of the feature to toggle
   * @returns The new status of the feature
   * @throws Error if the feature doesn't exist
   */
  public static toggle(featureName: string): boolean {
    this.validateFeatureExists(featureName);
    this.features[featureName] = !this.features[featureName];
    return this.features[featureName];
  }

  /**
   * Register a new feature flag
   * @param featureName - Name of the feature to register
   * @param initialValue - Initial value for the feature flag (default: false)
   * @returns Whether the feature was successfully registered
   */
  public static register(featureName: string, initialValue: boolean = false): boolean {
    if (this.features.hasOwnProperty(featureName)) {
      return false; // Feature already exists
    }

    this.features[featureName] = initialValue;
    return true;
  }

  /**
   * Get all features and their statuses
   * @returns A copy of the features object
   */
  public static getAllFeatures(): Record<string, boolean> {
    return { ...this.features };
  }

  /**
   * Validate that a feature exists
   * @param featureName - Name of the feature to validate
   * @throws Error if the feature doesn't exist
   * @private
   */
  private static validateFeatureExists(featureName: string): void {
    if (!this.features.hasOwnProperty(featureName)) {
      throw new Error(`Feature "${featureName}" is not registered`);
    }
  }
}














































