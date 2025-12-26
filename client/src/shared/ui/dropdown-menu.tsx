/**
 * Dropdown menu component placeholder
 */

import React from 'react';

export interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  return <div className="dropdown-menu">{children}</div>;
};

export const DropdownMenuTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="dropdown-trigger">{children}</div>;
};

export const DropdownMenuContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="dropdown-content">{children}</div>;
};

export const DropdownMenuItem: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="dropdown-item">{children}</div>;
};