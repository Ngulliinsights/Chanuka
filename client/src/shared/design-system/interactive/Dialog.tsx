/**
 * Dialog component placeholder
 */

import React from 'react';

export interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const Dialog: React.FC<DialogProps> = ({ children }) => {
  return <div>{children}</div>;
};

export const DialogTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div>{children}</div>;
};

export const DialogContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="dialog-content">{children}</div>;
};

export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="dialog-header">{children}</div>;
};

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <h2 className="dialog-title">{children}</h2>;
};

export const DialogDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <p className="dialog-description">{children}</p>;
};