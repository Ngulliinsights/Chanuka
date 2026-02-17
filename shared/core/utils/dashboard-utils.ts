/**
 * Cross-cutting Dashboard Utilities
 * Platform-agnostic utilities for dashboard operations
 */

/**
 * Format chart data for different chart types
 */
export function formatChartData(
    rawData: unknown[],
    chartType: 'line' | 'bar' | 'pie' | 'area',
    labelField: string,
    valueField: string
) {
    const labels = rawData.map(item => item[labelField]);
    const values = rawData.map(item => item[valueField]);

    const baseDataset = {
        label: 'Data',
        data: values,
    };

    switch (chartType) {
        case 'line':
            return {
                labels,
                datasets: [{
                    ...baseDataset,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                }],
            };

        case 'bar':
            return {
                labels,
                datasets: [{
                    ...baseDataset,
                    backgroundColor: '#3b82f6',
                    borderColor: '#1d4ed8',
                    borderWidth: 1,
                }],
            };

        case 'pie':
            return {
                labels,
                datasets: [{
                    ...baseDataset,
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6',
                        '#06b6d4',
                    ],
                }],
            };

        case 'area':
            return {
                labels,
                datasets: [{
                    ...baseDataset,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    borderWidth: 2,
                }],
            };

        default:
            return { labels, datasets: [baseDataset] };
    }
}

/**
 * Calculate widget performance score
 */
export function calculateWidgetPerformanceScore(
    loadTime: number,
    errorRate: number,
    refreshRate: number
): number {
    // Base score
    let score = 100;

    // Penalize slow load times (over 2 seconds)
    if (loadTime > 2000) {
        score -= Math.min(30, (loadTime - 2000) / 100);
    }

    // Penalize high error rates
    score -= errorRate * 50;

    // Penalize frequent refreshes (under 30 seconds)
    if (refreshRate > 0 && refreshRate < 30) {
        score -= (30 - refreshRate) / 2;
    }

    return Math.max(0, Math.round(score));
}

/**
 * Validate dashboard configuration
 */
export function validateDashboardConfig(config: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.id) {
        errors.push('Dashboard ID is required');
    }

    if (!config.name) {
        errors.push('Dashboard name is required');
    }

    if (!config.layout) {
        errors.push('Dashboard layout is required');
    } else {
        if (!Array.isArray(config.layout.widgets)) {
            errors.push('Layout widgets must be an array');
        }

        if (typeof config.layout.columns !== 'number' || config.layout.columns < 1) {
            errors.push('Layout columns must be a positive number');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}



