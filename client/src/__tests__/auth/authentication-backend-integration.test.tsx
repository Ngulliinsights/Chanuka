/**
 * Authentication Backend Integration Tests
 * Comprehensive tests for the enhanced authentication system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider, useAuth } from '@client/hooks/useAuth';
import { OAuthLogin } from '@client/components/auth/OAuthLogin';
import { SessionManager } from '@client/components/auth/SessionManager';
import { authService } from '../