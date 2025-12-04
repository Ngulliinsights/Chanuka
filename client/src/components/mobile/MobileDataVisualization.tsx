/**
 * Mobile Data Visualization Components
 * 
 * Responsive data visualization components optimized for small screens.
 * Provides touch-friendly interactions and simplified layouts for mobile devices.
 * 
 * Features:
 * - Touch-optimized chart interactions
 * - Responsive layouts that adapt to screen size
 * - Simplified data presentation for mobile
 * - Accessible fallbacks for complex visualizations
 * - Performance optimized for mobile devices
 */

import { BarChart3, PieChart, TrendingUp, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState, useRef, useEffect, useCallback } from 'react';

import { cn } from '@client/lib/utils';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
  description?: string;
}

export interface ChartData {
  title: string;
  data: DataPoint[];
  type: 'bar' | 'pie' | 'line' | 'metric';
  description?: string;
}

interface MobileChartProps {
  data: ChartData;
  className?: string;
  showLegend?: boolean;
  interactive?: boolean;
  maxHeight?: number;
}

/**
 * Mobile Bar Chart Component
 */
export function MobileBarChart({ 
  data, 
  className, 
  showLegend = true, 
  interactive = true,
  maxHeight = 200 
}: MobileChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const maxValue = Math.max(...data.data.map(d => d.value));

  const handleBarClick = useCallback((index: number) => {
    if (!interactive) return;
    setSelectedIndex(selectedIndex === index ? null : index);
  }, [interactive, selectedIndex]);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {data.title}
        </CardTitle>
        {data.description && (
          <p className="text-sm text-muted-foreground">{data.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3" style={{ maxHeight }}>
          {data.data.map((item, index) => {
            const percentage = (item.value / maxValue) * 100;
            const isSelected = selectedIndex === index;
            
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium truncate flex-1 mr-2">
                    {item.label}
                  </span>
                  <span className="text-muted-foreground">
                    {item.value.toLocaleString()}
                  </span>
                </div>
                <div
                  className={cn(
                    'relative h-6 bg-muted rounded-full overflow-hidden cursor-pointer',
                    'transition-all duration-200',
                    interactive && 'hover:bg-muted/80',
                    isSelected && 'ring-2 ring-primary ring-offset-1'
                  )}
                  onClick={() => handleBarClick(index)}
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleBarClick(index);
                    }
                  }}
                  aria-label={`${item.label}: ${item.value}`}
                >
                  <div
                    className={cn(
                      'h-full transition-all duration-500 ease-out',
                      item.color || 'bg-primary'
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                  {isSelected && item.description && (
                    <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-popover border rounded-md shadow-md text-xs z-10">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {showLegend && selectedIndex !== null && (
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <div className="text-sm font-medium">
              {data.data[selectedIndex].label}
            </div>
            <div className="text-xs text-muted-foreground">
              Value: {data.data[selectedIndex].value.toLocaleString()}
            </div>
            {data.data[selectedIndex].description && (
              <div className="text-xs text-muted-foreground mt-1">
                {data.data[selectedIndex].description}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Mobile Pie Chart Component (Simplified as horizontal bars for better mobile UX)
 */
export function MobilePieChart({ 
  data, 
  className, 
  showLegend = true,
  interactive = true 
}: MobileChartProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const total = data.data.reduce((sum, item) => sum + item.value, 0);

  const handleSegmentClick = useCallback((index: number) => {
    if (!interactive) return;
    setSelectedIndex(selectedIndex === index ? null : index);
  }, [interactive, selectedIndex]);

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PieChart className="h-4 w-4" />
          {data.title}
        </CardTitle>
        {data.description && (
          <p className="text-sm text-muted-foreground">{data.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.data.map((item, index) => {
            const percentage = (item.value / total) * 100;
            const isSelected = selectedIndex === index;
            
            return (
              <div
                key={item.label}
                className={cn(
                  'flex items-center justify-between p-3 rounded-md cursor-pointer',
                  'transition-all duration-200',
                  interactive && 'hover:bg-muted/50',
                  isSelected && 'bg-muted ring-2 ring-primary ring-offset-1'
                )}
                onClick={() => handleSegmentClick(index)}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                onKeyDown={(e) => {
                  if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleSegmentClick(index);
                  }
                }}
                aria-label={`${item.label}: ${percentage.toFixed(1)}%`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className={cn('w-3 h-3 rounded-full flex-shrink-0', item.color || 'bg-primary')}
                  />
                  <span className="font-medium truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {percentage.toFixed(1)}%
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {item.value.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {showLegend && selectedIndex !== null && (
          <div className="mt-4 p-3 bg-muted/50 rounded-md">
            <div className="text-sm font-medium">
              {data.data[selectedIndex].label}
            </div>
            <div className="text-xs text-muted-foreground">
              {((data.data[selectedIndex].value / total) * 100).toFixed(1)}% of total
            </div>
            {data.data[selectedIndex].description && (
              <div className="text-xs text-muted-foreground mt-1">
                {data.data[selectedIndex].description}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Mobile Metric Card Component
 */
interface MobileMetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
    period?: string;
  };
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function MobileMetricCard({
  title,
  value,
  change,
  description,
  icon,
  className
}: MobileMetricCardProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              <p className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
          
          {change && (
            <div className="flex-shrink-0 ml-2">
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium',
                change.type === 'increase' && 'text-green-600',
                change.type === 'decrease' && 'text-red-600',
                change.type === 'neutral' && 'text-muted-foreground'
              )}>
                <TrendingUp className={cn(
                  'h-3 w-3',
                  change.type === 'decrease' && 'rotate-180'
                )} />
                {Math.abs(change.value)}%
              </div>
              {change.period && (
                <div className="text-xs text-muted-foreground mt-1">
                  {change.period}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Mobile Chart Carousel for multiple charts
 */
interface MobileChartCarouselProps {
  charts: ChartData[];
  className?: string;
}

export function MobileChartCarousel({ charts, className }: MobileChartCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < charts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const goToNext = () => {
    setCurrentIndex(Math.min(charts.length - 1, currentIndex + 1));
  };

  if (charts.length === 0) return null;

  const currentChart = charts[currentIndex];

  const renderChart = (chart: ChartData) => {
    switch (chart.type) {
      case 'bar':
        return <MobileBarChart data={chart} />;
      case 'pie':
        return <MobilePieChart data={chart} />;
      default:
        return <MobileBarChart data={chart} />;
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      {/* Chart Container */}
      <div
        className="overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {renderChart(currentChart)}
      </div>

      {/* Navigation */}
      {charts.length > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {charts.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  index === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
                aria-label={`Go to chart ${index + 1}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            disabled={currentIndex === charts.length - 1}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Chart Info */}
      <div className="mt-2 text-center">
        <p className="text-sm text-muted-foreground">
          {currentIndex + 1} of {charts.length}
        </p>
      </div>
    </div>
  );
}