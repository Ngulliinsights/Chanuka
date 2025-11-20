import * as React from "react"
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"
import { DayPicker, DateRange } from "react-day-picker"
import { cn } from '@client/lib/utils'
import { buttonVariants } from './button'
import { logger } from '@client/utils/logger';
import { DateValidationProps, ValidationState } from './types';
import { safeValidateDate } from './validation';
import { UIDateError } from './errors';
import { attemptUIRecovery, getUIRecoverySuggestions } from './recovery';

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...props }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
          return <Icon className="h-4 w-4" {...props} />;
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

// Enhanced calendar with date validation
interface EnhancedCalendarProps extends Omit<CalendarProps, 'className' | 'selected' | 'onSelect' | 'disabled'>, DateValidationProps {
  onValidationChange?: (state: ValidationState) => void;
  showValidation?: boolean;
  errorMessage?: string;
  className?: string;
  selected?: Date | DateRange;
  onSelect?: (date: Date | DateRange | undefined) => void;
  disabled?: boolean | ((date: Date) => boolean) | Date[];
}

const EnhancedCalendar = React.forwardRef<
  HTMLDivElement,
  EnhancedCalendarProps
>(({
  className,
  minDate,
  maxDate,
  disabledDates = [],
  required = false,
  format = 'yyyy-MM-dd',
  onValidationChange,
  showValidation = true,
  errorMessage,
  selected,
  onSelect,
  disabled,
  ...props
}, ref) => {
  const [validationState, setValidationState] = React.useState<ValidationState>({
    isValid: true,
    touched: false
  });
  const [retryCount, setRetryCount] = React.useState(0);

  const validateSelectedDate = React.useCallback((date: Date | Date[] | DateRange | undefined): ValidationState => {
    if (!showValidation) {
      return { isValid: true, touched: validationState.touched };
    }

    try {
      if (required && !date) {
        return {
          isValid: false,
          error: 'Date selection is required',
          touched: validationState.touched
        };
      }

      if (date) {
        // Handle DateRange
        if ('from' in date) {
          const range = date as DateRange;
          if (range.from) {
            // Check if from date is in disabled dates
            if (disabledDates.some(disabledDate =>
              disabledDate.toDateString() === range.from!.toDateString()
            )) {
              return {
                isValid: false,
                error: 'Start date is not available',
                touched: validationState.touched
              };
            }

            const result = safeValidateDate(range.from, minDate, maxDate);
            if (!result.success) {
              return {
                isValid: false,
                error: result.error?.message || 'Invalid start date selection',
                touched: validationState.touched
              };
            }
          }
          if (range.to) {
            // Check if to date is in disabled dates
            if (disabledDates.some(disabledDate =>
              disabledDate.toDateString() === range.to!.toDateString()
            )) {
              return {
                isValid: false,
                error: 'End date is not available',
                touched: validationState.touched
              };
            }

            const result = safeValidateDate(range.to, minDate, maxDate);
            if (!result.success) {
              return {
                isValid: false,
                error: result.error?.message || 'Invalid end date selection',
                touched: validationState.touched
              };
            }
          }
        } else {
          // Handle single Date
          const singleDate = date as Date;
          // Check if date is in disabled dates
          if (disabledDates.some(disabledDate =>
            disabledDate.toDateString() === singleDate.toDateString()
          )) {
            return {
              isValid: false,
              error: 'This date is not available',
              touched: validationState.touched
            };
          }

          const result = safeValidateDate(singleDate, minDate, maxDate);
          if (!result.success) {
            return {
              isValid: false,
              error: result.error?.message || 'Invalid date selection',
              touched: validationState.touched
            };
          }
        }
      }

      return { isValid: true, touched: validationState.touched };
    } catch (error) {
      logger.error('Calendar validation error', undefined, error);
      return {
        isValid: false,
        error: 'Date validation error occurred',
        touched: validationState.touched
      };
    }
  }, [showValidation, required, disabledDates, minDate, maxDate, validationState.touched]);

  const handleValidationError = React.useCallback(async (error: UIDateError) => {
    try {
      const recoveryResult = await attemptUIRecovery('enhanced-calendar', error, retryCount);
      
      if (recoveryResult.success) {
        setRetryCount(0);
      } else if (recoveryResult.shouldRetry) {
        setRetryCount(prev => prev + 1);
      } else {
        const suggestions = getUIRecoverySuggestions(error);
        logger.warn('Calendar recovery failed', { suggestions });
      }
    } catch (recoveryError) {
      logger.error('Calendar recovery error', undefined, recoveryError);
    }
  }, [retryCount]);

  const handleSelect = React.useCallback((date: Date | Date[] | undefined) => {
    const newValidationState = {
      ...validateSelectedDate(date),
      touched: true
    };

    setValidationState(newValidationState);
    onValidationChange?.(newValidationState);

    if (!newValidationState.isValid && newValidationState.error) {
      const error = new UIDateError('enhanced-calendar', date, newValidationState.error);
      handleValidationError(error);
    } else {
      onSelect?.(date as Date | DateRange | undefined);
    }
  }, [validateSelectedDate, onValidationChange, onSelect, handleValidationError]);

  // Initial validation on mount if selected date is provided
  React.useEffect(() => {
    if (selected && showValidation) {
      const initialValidation = validateSelectedDate(selected);
      setValidationState(initialValidation);
      onValidationChange?.(initialValidation);
    }
  }, [selected, showValidation, validateSelectedDate, onValidationChange]);

  const hasError = showValidation && validationState.touched && !validationState.isValid;
  const displayError = errorMessage || validationState.error;

  // Create disabled function that includes validation
  const isDateDisabled = React.useCallback((date: Date) => {
    // Check original disabled prop
    if (typeof disabled === 'function' && disabled(date)) {
      return true;
    }
    if (disabled instanceof Date && disabled.toDateString() === date.toDateString()) {
      return true;
    }
    if (Array.isArray(disabled) && disabled.some(d => d.toDateString() === date.toDateString())) {
      return true;
    }

    // Check validation constraints
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    if (disabledDates.some(disabledDate => disabledDate.toDateString() === date.toDateString())) {
      return true;
    }

    return false;
  }, [disabled, minDate, maxDate, disabledDates]);

  return (
    <div ref={ref} className="space-y-2">
      <DayPicker
        showOutsideDays={true}
        className={cn(
          "p-3",
          hasError && "border border-destructive rounded-md",
          className
        )}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
        }}
        components={{
          Chevron: ({ orientation, ...props }) => {
            const Icon = orientation === 'left' ? ChevronLeft : ChevronRight;
            return <Icon className="h-4 w-4" {...props} />;
          },
        }}
        selected={selected as Date | undefined}
        onSelect={handleSelect}
        mode="single"
        disabled={isDateDisabled}
        {...props}
      />
      
      {hasError && displayError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
});
EnhancedCalendar.displayName = "EnhancedCalendar";

export { Calendar, EnhancedCalendar }

