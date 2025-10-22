import { forwardRef, HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes, useState, useCallback, useEffect } from "react"
import { AlertCircle, RefreshCw } from "lucide-react"

import { cn } from '..\..\lib\utils'
import { logger } from '..\..\utils\browser-logger';
import { TableValidationProps, ValidationError } from './types';
import { validateTableData } from './validation';
import { UITableError } from './errors';
import { attemptUIRecovery, getUIRecoverySuggestions } from './recovery';

const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

// Enhanced table with data validation
interface EnhancedTableProps extends HTMLAttributes<HTMLTableElement>, TableValidationProps {
  showValidation?: boolean;
  onRetry?: () => void;
}

const EnhancedTable = forwardRef<HTMLTableElement, EnhancedTableProps>(
  ({ 
    className, 
    data, 
    columns, 
    validateData = true, 
    onValidationError,
    showValidation = true,
    onRetry,
    children,
    ...props 
  }, ref) => {
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [isValidating, setIsValidating] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const handleValidationError = useCallback(async (error: UITableError) => {
      try {
        const recoveryResult = await attemptUIRecovery('enhanced-table', error, retryCount);
        
        if (recoveryResult.success) {
          setRetryCount(0);
          setValidationErrors([]);
        } else if (recoveryResult.shouldRetry) {
          setRetryCount(prev => prev + 1);
        } else {
          const suggestions = getUIRecoverySuggestions(error);
          logger.warn('Table recovery failed, suggestions:', suggestions);
        }
      } catch (recoveryError) {
        logger.error('Table recovery error:', recoveryError);
      }
    }, [retryCount]);

    const validateTableDataInternal = useCallback(async () => {
      if (!validateData || !showValidation || !data || !columns) {
        return;
      }

      setIsValidating(true);
      
      try {
        await validateTableData(data, columns);
        setValidationErrors([]);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Table data validation failed')) {
          const tableError = error as any;
          const errors = tableError.details?.errors || [];
          setValidationErrors(errors);
          onValidationError?.(errors);
          
          const uiError = new UITableError('enhanced-table', 'validation', 'Data validation failed', { errors });
          await handleValidationError(uiError);
        } else {
          logger.error('Table validation error:', error);
          const uiError = new UITableError('enhanced-table', 'validation', 'Validation process failed');
          await handleValidationError(uiError);
        }
      } finally {
        setIsValidating(false);
      }
    }, [validateData, showValidation, data, columns, onValidationError, handleValidationError]);

    const handleRetry = useCallback(() => {
      onRetry?.();
      validateTableDataInternal();
    }, [onRetry, validateTableDataInternal]);

    // Validate data when it changes
    useEffect(() => {
      validateTableDataInternal();
    }, [validateTableDataInternal]);

    const hasErrors = validationErrors.length > 0;
    const errorsByRow = validationErrors.reduce((acc, error) => {
      if (!acc[error.row]) acc[error.row] = [];
      acc[error.row].push(error);
      return acc;
    }, {} as Record<number, ValidationError[]>);

    return (
      <div className="space-y-4">
        {showValidation && hasErrors && (
          <div 
            className="rounded-md bg-destructive/15 p-4 border border-destructive/20"
            role="alert"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-medium text-destructive">
                  Data Validation Errors ({validationErrors.length})
                </h3>
              </div>
              {onRetry && (
                <button
                  onClick={handleRetry}
                  disabled={isValidating}
                  className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3 w-3", isValidating && "animate-spin")} />
                  Retry
                </button>
              )}
            </div>
            <div className="text-xs text-destructive space-y-1 max-h-32 overflow-y-auto">
              {validationErrors.slice(0, 10).map((error, index) => (
                <div key={index}>
                  Row {error.row + 1}, {error.column}: {error.message}
                </div>
              ))}
              {validationErrors.length > 10 && (
                <div className="text-destructive/70">
                  ... and {validationErrors.length - 10} more errors
                </div>
              )}
            </div>
          </div>
        )}

        <div className="relative w-full overflow-auto">
          <table
            ref={ref}
            className={cn(
              "w-full caption-bottom text-sm",
              hasErrors && showValidation && "border-destructive/20",
              className
            )}
            {...props}
          >
            {children}
          </table>
          
          {isValidating && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Validating data...
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);
EnhancedTable.displayName = "EnhancedTable";

// Enhanced table row with error highlighting
const EnhancedTableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement> & {
    rowIndex?: number;
    validationErrors?: ValidationError[];
  }
>(({ className, rowIndex, validationErrors = [], ...props }, ref) => {
  const hasErrors = validationErrors.length > 0;
  
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        hasErrors && "bg-destructive/5 border-destructive/20",
        className
      )}
      title={hasErrors ? `Row has ${validationErrors.length} validation error(s)` : undefined}
      {...props}
    />
  );
});
EnhancedTableRow.displayName = "EnhancedTableRow";

// Enhanced table cell with error highlighting
const EnhancedTableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement> & {
    columnKey?: string;
    validationErrors?: ValidationError[];
  }
>(({ className, columnKey, validationErrors = [], children, ...props }, ref) => {
  const cellErrors = validationErrors.filter(error => error.column === columnKey);
  const hasErrors = cellErrors.length > 0;
  
  return (
    <td
      ref={ref}
      className={cn(
        "p-4 align-middle [&:has([role=checkbox])]:pr-0",
        hasErrors && "bg-destructive/10 border-l-2 border-l-destructive",
        className
      )}
      title={hasErrors ? cellErrors.map(e => e.message).join(', ') : undefined}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {hasErrors && (
          <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
        )}
      </div>
    </td>
  );
});
EnhancedTableCell.displayName = "EnhancedTableCell";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  EnhancedTable,
  EnhancedTableRow,
  EnhancedTableCell,
}
