/**
 * useSitemap Hook
 * Integrates sitemap service with React component lifecycle
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { createQueryErrorHandler, createMutationErrorHandler } from '@client/infrastructure/error';
import { sitemapService } from '../services/sitemap';

export const useSitemap = () => {
  return useQuery({
    queryKey: ['sitemap'],
    queryFn: () => sitemapService.fetchSitemap(),
    staleTime: 1000 * 60 * 60 * 12, // 12 hours
    ...createQueryErrorHandler(),
  });
};

export const useSitemapValidation = () => {
  return useQuery({
    queryKey: ['sitemap-validation'],
    queryFn: () => sitemapService.validateSitemap(),
    staleTime: 1000 * 60 * 60, // 1 hour
    ...createQueryErrorHandler(),
  });
};

export const useGenerateSitemap = () => {
  return useMutation({
    mutationFn: () => sitemapService.generateSitemap(),
    ...createMutationErrorHandler(),
  });
};
