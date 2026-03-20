/**
 * Integration Context
 */

import { createContext } from 'react';

import type { IntegrationContextValue } from '../types';

export const IntegrationContext = createContext<IntegrationContextValue | null>(null);
