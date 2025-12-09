/**
 * Recovery UI Components
 *
 * Provides recovery action buttons and interfaces for error recovery,
 * supporting different variants (buttons, dropdown, modal, inline-actions)
 * with accessibility compliance.
 */

import { RefreshCw, Home, AlertCircle, ChevronDown, X } from 'lucide-react';
import React, { useState } from 'react';

import { AppError } from '../types';
import { RecoveryUIProps, RecoveryAction } from './types';

/**
 * Main Recovery UI Component
 *
 * Renders recovery actions based on variant with proper accessibility
 */
export const RecoveryUI: React.FC<RecoveryUIProps> = ({
  error,
  variant,
  onRetry,
  onRefresh,
  onGoHome,
  onReport,
  onCustomAction,
  isRecovering,
  retryCount,
  maxRetries,
  availableActions,
  className = '',
}) => {
  const baseClassName = `recovery-ui recovery-ui--${variant} ${className}`.trim();

  // Default recovery actions
  const defaultActions: RecoveryAction[] = [
    {
      id: 'retry',
      label: 'Try Again',
      description: retryCount > 0 ? `Retry attempt ${retryCount + 1} of ${maxRetries}` : 'Retry the failed operation',
      icon: <RefreshCw size={16} />,
      variant: 'primary',
      disabled: isRecovering || retryCount >= maxRetries,
      loading: isRecovering,
    },
    {
      id: 'refresh',
      label: 'Refresh Page',
      description: 'Reload the current page',
      icon: <RefreshCw size={16} />,
      variant: 'secondary',
    },
    {
      id: 'home',
      label: 'Go Home',
      description: 'Return to the home page',
      icon: <Home size={16} />,
      variant: 'secondary',
    },
    {
      id: 'report',
      label: 'Report Issue',
      description: 'Send error report to support',
      icon: <AlertCircle size={16} />,
      variant: 'secondary',
    },
  ];

  const actions = availableActions || defaultActions;

  const handleAction = (actionId: string) => {
    switch (actionId) {
      case 'retry':
        onRetry();
        break;
      case 'refresh':
        onRefresh();
        break;
      case 'home':
        onGoHome();
        break;
      case 'report':
        onReport();
        break;
      default:
        onCustomAction?.(actionId);
        break;
    }
  };

  switch (variant) {
    case 'modal':
      return (
        <RecoveryModal
          actions={actions}
          onAction={handleAction}
          error={error}
          className={baseClassName}
        />
      );

    case 'dropdown':
      return (
        <RecoveryDropdown
          actions={actions}
          onAction={handleAction}
          error={error}
          className={baseClassName}
        />
      );

    case 'inline-actions':
      return (
        <RecoveryInlineActions
          actions={actions}
          onAction={handleAction}
          error={error}
          className={baseClassName}
        />
      );

    case 'buttons':
    default:
      return (
        <RecoveryButtons
          actions={actions}
          onAction={handleAction}
          error={error}
          className={baseClassName}
        />
      );
  }
};

/**
 * Recovery Buttons - displays actions as a row of buttons
 */
const RecoveryButtons: React.FC<{
  actions: RecoveryAction[];
  onAction: (actionId: string) => void;
  error: AppError;
  className: string;
}> = ({ actions, onAction, className }) => {
  return (
    <div className={`${className} recovery-buttons`} role="group" aria-label="Recovery actions">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          disabled={action.disabled}
          className={`recovery-button recovery-button--${action.variant} ${action.loading ? 'recovery-button--loading' : ''}`}
          aria-label={action.description || action.label}
          title={action.description}
        >
          {action.loading && <RefreshCw size={14} className="recovery-button__spinner" />}
          {action.icon && !action.loading && action.icon}
          <span className="recovery-button__label">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

/**
 * Recovery Inline Actions - displays actions inline with text
 */
const RecoveryInlineActions: React.FC<{
  actions: RecoveryAction[];
  onAction: (actionId: string) => void;
  error: AppError;
  className: string;
}> = ({ actions, onAction, className }) => {
  const primaryAction = actions.find(a => a.variant === 'primary' && !a.disabled);
  const secondaryActions = actions.filter(a => a.variant !== 'primary' || a.disabled);

  return (
    <div className={`${className} recovery-inline-actions`}>
      <span className="recovery-inline-actions__text">
        What would you like to do?
      </span>
      <div className="recovery-inline-actions__buttons">
        {primaryAction && (
          <button
            onClick={() => onAction(primaryAction.id)}
            disabled={primaryAction.disabled}
            className={`recovery-inline-button recovery-inline-button--primary ${primaryAction.loading ? 'recovery-inline-button--loading' : ''}`}
            aria-label={primaryAction.description || primaryAction.label}
          >
            {primaryAction.loading && <RefreshCw size={14} className="recovery-inline-button__spinner" />}
            {primaryAction.icon && !primaryAction.loading && primaryAction.icon}
            {primaryAction.label}
          </button>
        )}
        {secondaryActions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            disabled={action.disabled}
            className={`recovery-inline-button recovery-inline-button--secondary ${action.loading ? 'recovery-inline-button--loading' : ''}`}
            aria-label={action.description || action.label}
          >
            {action.icon && !action.loading && action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Recovery Dropdown - displays actions in a dropdown menu
 */
const RecoveryDropdown: React.FC<{
  actions: RecoveryAction[];
  onAction: (actionId: string) => void;
  error: AppError;
  className: string;
}> = ({ actions, onAction, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (actionId: string) => {
    onAction(actionId);
    setIsOpen(false);
  };

  return (
    <div className={`${className} recovery-dropdown`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="recovery-dropdown__trigger"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Recovery options"
      >
        <span>Recovery Options</span>
        <ChevronDown size={16} className={`recovery-dropdown__arrow ${isOpen ? 'recovery-dropdown__arrow--open' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="recovery-dropdown__backdrop" onClick={() => setIsOpen(false)} />
          <div className="recovery-dropdown__menu" role="menu">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                disabled={action.disabled}
                className={`recovery-dropdown__item ${action.loading ? 'recovery-dropdown__item--loading' : ''}`}
                role="menuitem"
                aria-label={action.description || action.label}
              >
                {action.loading && <RefreshCw size={14} className="recovery-dropdown__item-spinner" />}
                {action.icon && !action.loading && action.icon}
                <div className="recovery-dropdown__item-content">
                  <span className="recovery-dropdown__item-label">{action.label}</span>
                  {action.description && (
                    <span className="recovery-dropdown__item-description">{action.description}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Recovery Modal - displays actions in a modal dialog
 */
const RecoveryModal: React.FC<{
  actions: RecoveryAction[];
  onAction: (actionId: string) => void;
  error: AppError;
  className: string;
}> = ({ actions, onAction, error, className }) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleAction = (actionId: string) => {
    onAction(actionId);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="recovery-modal__backdrop" onClick={() => setIsOpen(false)} />
      <div
        className={`${className} recovery-modal`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recovery-modal-title"
        aria-describedby="recovery-modal-description"
      >
        <div className="recovery-modal__header">
          <h3 id="recovery-modal-title" className="recovery-modal__title">
            Recovery Options
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="recovery-modal__close"
            aria-label="Close recovery options"
          >
            <X size={20} />
          </button>
        </div>

        <div id="recovery-modal-description" className="recovery-modal__description">
          An error occurred. Choose how you'd like to proceed:
        </div>

        <div className="recovery-modal__content">
          <div className="recovery-modal__error-info">
            <strong>Error:</strong> {error.message}
          </div>

          <div className="recovery-modal__actions" role="group" aria-label="Recovery actions">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                disabled={action.disabled}
                className={`recovery-modal__action recovery-modal__action--${action.variant} ${action.loading ? 'recovery-modal__action--loading' : ''}`}
                aria-label={action.description || action.label}
              >
                {action.loading && <RefreshCw size={16} className="recovery-modal__action-spinner" />}
                {action.icon && !action.loading && action.icon}
                <div className="recovery-modal__action-content">
                  <span className="recovery-modal__action-label">{action.label}</span>
                  {action.description && (
                    <span className="recovery-modal__action-description">{action.description}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default RecoveryUI;