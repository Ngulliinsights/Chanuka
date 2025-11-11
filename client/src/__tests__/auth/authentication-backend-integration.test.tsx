/**
 * Authentication Backend Integration Tests
 * Comprehensive tests for the enhanced authentication system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider, useAuth } from '../../hooks/use-auth';
import { OAuthLogin } from '../../components/auth/OAuthLogin';
import { SessionManager } from '../../components/auth/SessionManager';
import { authBackendService } from '../