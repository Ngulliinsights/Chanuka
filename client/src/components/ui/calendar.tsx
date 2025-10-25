import * as React from "react"
import { ChevronLeft, ChevronRight, AlertCircle } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from '../../lib/utils'
import { buttonVariants } from './button'
import { logger } from '../../utils/browser-logger';
import { DateValidationProps, ValidationState } from './types';
import { validateDate, safeValidateDate } from './validation';
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
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

// Enhanced calendar with date validation
interface EnhancedCalendarProps extends CalendarProps, DateValidationProps {
  onValidationChange?: (state: ValidationState) => void;
  showValidation?: boolean;
  errorMessage?: string;
}

const EnhancedCalendar = React.forwardRef<
  React.ElementRef<typeof DayPicker>,
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

  const validateSelectedDate = React.useCallback((date: Date | undefined): ValidationState => {
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
        // Check if date is in disabled dates
        if (disabledDates.some(disabledDate => 
          disabledDate.toDateString() === date.toDateString()
        )) {
          return {
            isValid: false,
            error: 'This date is not available',
            touched: validationState.touched
          };
        }

        const result = safeValidateDate(date, minDate, maxDate);
        if (!result.success) {
          return {
            isValid: false,
            error: result.error?.message || 'Invalid date selection',
            touched: validationState.touched
          };
        }
      }

      return { isValid: true, touched: validationState.touched };
    } catch (error) {
      logger.error('Calendar validation error:', error);
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
        logger.warn('Calendar recovery failed, suggestions:', suggestions);
      }
    } catch (recoveryError) {
      logger.error('Calendar recovery error:', recoveryError);
    }
  }, [retryCount]);

  const handleSelect = React.useCallback((date: Date | undefined) => {
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
      onSelect?.(date);
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
    <div className="space-y-2">
      <DayPicker
        ref={ref}
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
          IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
          IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        }}
        selected={selected}
        onSelect={handleSelect}
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