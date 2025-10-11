import React from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigationPreferences } from '@/hooks/use-navigation-preferences';
import { useLocation } from 'react-router-dom';
import { logger } from '../utils/logger.js';

interface FavoritePageButtonProps {
  path?: string;
  title?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

const FavoritePageButton: React.FC<FavoritePageButtonProps> = ({
  path,
  title,
  variant = 'ghost',
  size = 'sm',
  className = '',
}) => {
  const location = useLocation();
  const { isFavorite, toggleFavorite, addToFavorites } = useNavigationPreferences();
  
  const currentPath = path || location.pathname;
  const pageTitle = title || document.title || currentPath;
  const isCurrentlyFavorite = isFavorite(currentPath);

  const handleToggleFavorite = () => {
    if (isCurrentlyFavorite) {
      toggleFavorite(currentPath);
    } else {
      // When adding to favorites, we might want to track the page title too
      addToFavorites(currentPath);
      // You could extend this to also store the title in a separate mapping
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleFavorite}
      className={`${className} ${isCurrentlyFavorite ? 'text-yellow-500' : 'text-muted-foreground'}`}
      title={isCurrentlyFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star 
        className={`h-4 w-4 ${isCurrentlyFavorite ? 'fill-current' : ''}`} 
      />
      {size !== 'sm' && (
        <span className="ml-2">
          {isCurrentlyFavorite ? 'Favorited' : 'Add to Favorites'}
        </span>
      )}
    </Button>
  );
};

export default FavoritePageButton;