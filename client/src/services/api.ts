/**
 * Main API Service
 * Provides a simple interface for making HTTP requests using the global API client
 */

import { globalApiClient } from '@client/core/api/client';

export const api = {
    /**
     * Get the base URL for constructing URLs
     */
    getBaseUrl(): string {
        return globalApiClient.getConfig().baseUrl;
    },

    /**
     * Make a GET request
     */
    async get<T>(endpoint: string): Promise<T> {
        const response = await globalApiClient.get<T>(endpoint);
        return response.data;
    },

    /**
     * Make a POST request
     */
    async post<T>(endpoint: string, data?: any): Promise<T> {
        const response = await globalApiClient.post<T>(endpoint, data);
        return response.data;
    },

    /**
     * Make a PUT request
     */
    async put<T>(endpoint: string, data?: any): Promise<T> {
        const response = await globalApiClient.put<T>(endpoint, data);
        return response.data;
    },

    /**
     * Make a PATCH request
     */
    async patch<T>(endpoint: string, data?: any): Promise<T> {
        const response = await globalApiClient.patch<T>(endpoint, data);
        return response.data;
    },

    /**
     * Make a DELETE request
     */
    async delete<T>(endpoint: string): Promise<T> {
        const response = await globalApiClient.delete<T>(endpoint);
        return response.data;
    }
};