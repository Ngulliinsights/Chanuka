/**
 * Error Message Component
 * 
 * A component for displaying error messages with retry functionality
 */

import * as React from "react"

import { AlertCircle, RefreshCw } from "lucide-react"

import { cn } from "@client/lib/utils"

import { Button } from "./button"
import { Card, CardContent } from "./card"

interface ErrorMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string
  onRetry?: () => void
  showRetry?: boolean
}

const ErrorMessage = React.forwardRef<HTMLDivElement, ErrorMessageProps>(
  ({ className, message, onRetry, showRetry = true, ...props }, ref) => {
    return (
      <Card ref={ref} className={cn("border-red-200 bg-red-50", className)} {...props}>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Something went wrong</h3>
              <p className="text-red-700">{message}</p>
            </div>
            {showRetry && onRetry && (
              <Button onClick={onRetry} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)
ErrorMessage.displayName = "ErrorMessage"

export { ErrorMessage }