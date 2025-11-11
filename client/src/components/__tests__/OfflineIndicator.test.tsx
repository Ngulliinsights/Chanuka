import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { OfflineIndicator } from '../OfflineIndicator';

// Mock dependencies
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('../hooks/useOfflineDetection', () => ({
  useOfflineDetection: jest.fn(),
}));

jest.mock('../utils/backgroundSyncManager', () => ({
  backgroundSyncManager: {
    getSyncStatus: jest.fn(),
    triggerSync: jest.fn(),
  },
}));

const mockUseOfflineDetection = require('../hooks/useOfflineDetection').useOfflineDetection;
const mockBackgroundSyncManager = require('../utils/backgroundSyncManager').backgroundSyncManager;
const mockLogger = require('../../utils/logger').logger;

describe('OfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not render when online and no pending sync', () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: null, lastOfflineTime: null, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 0,
      lastSyncTime: Date.now(),
    });

    render(<OfflineIndicator />);

    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('renders when offline', () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: false, connectionQuality: { type: 'offline' }, lastOnlineTime: null, lastOfflineTime: Date.now(), connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 0,
      lastSyncTime: null,
    });

    render(<OfflineIndicator />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders when online but has pending sync items', () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: Date.now(), lastOfflineTime: Date.now() - 1000 * 60 * 5, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 5,
      lastSyncTime: Date.now() - 1000 * 60 * 5, // 5 minutes ago
    });

    render(<OfflineIndicator />);

    expect(screen.getByText('Syncing...')).toBeInTheDocument();
  });

  it('shows online status when synced', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: Date.now(), lastOfflineTime: null, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 0,
      lastSyncTime: Date.now(),
    });

    render(<OfflineIndicator autoHide={false} />);

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });

  it('displays sync details when showDetails is true', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: Date.now(), lastOfflineTime: Date.now() - 1000 * 60 * 30, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 3,
      lastSyncTime: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    });

    render(<OfflineIndicator showDetails={true} />);

    await waitFor(() => {
      expect(screen.getByText('Pending: 3 actions')).toBeInTheDocument();
      expect(screen.getByText('Last sync: 30 minutes ago')).toBeInTheDocument();
    });
  });

  it('shows sync button when online and has pending items', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: Date.now(), lastOfflineTime: null, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 2,
      lastSyncTime: Date.now(),
    });

    render(<OfflineIndicator />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    });
  });

  it('does not show sync button when offline', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: false, connectionQuality: { type: 'offline' }, lastOnlineTime: null, lastOfflineTime: Date.now(), connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 2,
      lastSyncTime: null,
    });

    render(<OfflineIndicator />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument();
    });
  });

  it('handles manual sync', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: Date.now(), lastOfflineTime: null, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 2,
      lastSyncTime: Date.now(),
    });
    mockBackgroundSyncManager.triggerSync.mockResolvedValue();

    render(<OfflineIndicator />);

    const syncButton = await screen.findByRole('button', { name: /sync now/i });
    fireEvent.click(syncButton);

    expect(mockBackgroundSyncManager.triggerSync).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Syncing...')).toBeInTheDocument();

    // Wait for sync to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sync now/i })).toBeInTheDocument();
    });
  });

  it('shows offline message when not connected', () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: false, connectionQuality: { type: 'offline' }, lastOnlineTime: null, lastOfflineTime: Date.now(), connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 0,
      lastSyncTime: null,
    });

    render(<OfflineIndicator />);

    expect(screen.getByText('Some features may be limited while offline')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: false, connectionQuality: { type: 'offline' }, lastOnlineTime: null, lastOfflineTime: Date.now(), connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 0,
      lastSyncTime: null,
    });

    render(<OfflineIndicator className="custom-class" />);

    const indicator = screen.getByText('Offline').closest('div');
    expect(indicator).toHaveClass('custom-class');
  });

  it('auto-hides after sync completion', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: Date.now(), lastOfflineTime: null, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 0,
      lastSyncTime: Date.now(),
    });

    render(<OfflineIndicator autoHide={true} />);

    // Initially visible
    expect(screen.getByText('Online')).toBeInTheDocument();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Online')).not.toBeInTheDocument();
    });
  });

  it('does not auto-hide when autoHide is false', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: Date.now(), lastOfflineTime: null, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 0,
      lastSyncTime: Date.now(),
    });

    render(<OfflineIndicator autoHide={false} />);

    // Should remain visible
    expect(screen.getByText('Online')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('shows correct status colors', () => {
    // Offline - red
    mockUseOfflineDetection.mockReturnValue({ isOnline: false, connectionQuality: { type: 'offline' }, lastOnlineTime: null, lastOfflineTime: Date.now(), connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 0,
      lastSyncTime: null,
    });

    const { rerender } = render(<OfflineIndicator />);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-red-500');

    // Online with pending - yellow
    mockUseOfflineDetection.mockReturnValue(true);
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 1,
      lastSyncTime: Date.now(),
    });

    rerender(<OfflineIndicator />);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-yellow-500');

    // Online synced - green
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 0,
      lastSyncTime: Date.now(),
    });

    rerender(<OfflineIndicator autoHide={false} />);
    expect(screen.getByTestId('status-indicator')).toHaveClass('bg-green-500');
  });

  it('handles sync status update errors', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: false, connectionQuality: { type: 'offline' }, lastOnlineTime: null, lastOfflineTime: Date.now(), connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockRejectedValue(new Error('Sync error'));

    render(<OfflineIndicator />);

    await waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get sync status', expect.any(Object));
    });
  });

  it('handles manual sync errors', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: Date.now(), lastOfflineTime: null, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 1,
      lastSyncTime: Date.now(),
    });
    mockBackgroundSyncManager.triggerSync.mockRejectedValue(new Error('Sync failed'));

    render(<OfflineIndicator />);

    const syncButton = await screen.findByRole('button', { name: /sync now/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith('Manual sync failed', expect.any(Object));
    });
  });

  it('updates sync status periodically', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: false, connectionQuality: { type: 'offline' }, lastOnlineTime: null, lastOfflineTime: Date.now(), connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 0,
      lastSyncTime: null,
    });

    render(<OfflineIndicator />);

    expect(mockBackgroundSyncManager.getSyncStatus).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(mockBackgroundSyncManager.getSyncStatus).toHaveBeenCalledTimes(2);
  });

  it('shows correct last sync time formatting', async () => {
    const now = Date.now();
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: now, lastOfflineTime: now - 1000 * 60 * 60 * 2, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 1,
      lastSyncTime: now - 1000 * 60 * 60 * 2, // 2 hours ago
    });

    render(<OfflineIndicator showDetails={true} />);

    await waitFor(() => {
      expect(screen.getByText('Last sync: 2 hours ago')).toBeInTheDocument();
    });
  });

  it('shows "Never synced" when no last sync time', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: Date.now(), lastOfflineTime: null, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 1,
      lastSyncTime: null,
    });

    render(<OfflineIndicator showDetails={true} />);

    await waitFor(() => {
      expect(screen.getByText('Last sync: Never synced')).toBeInTheDocument();
    });
  });

  it('disables sync button during syncing', async () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: true, connectionQuality: { type: 'fast' }, lastOnlineTime: Date.now(), lastOfflineTime: null, connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 1,
      lastSyncTime: Date.now(),
    });
    mockBackgroundSyncManager.triggerSync.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<OfflineIndicator />);

    const syncButton = await screen.findByRole('button', { name: /sync now/i });
    fireEvent.click(syncButton);

    expect(syncButton).toBeDisabled();
    expect(syncButton).toHaveTextContent('Syncing...');

    // Wait for sync to complete
    await waitFor(() => {
      expect(syncButton).not.toBeDisabled();
      expect(syncButton).toHaveTextContent('Sync Now');
    });
  });
});

// Helper to add test id to status indicator for testing
// In actual component, we'd need to add data-testid to the status div
describe('OfflineIndicator - Status Indicator', () => {
  it('has accessible status indicator', () => {
    mockUseOfflineDetection.mockReturnValue({ isOnline: false, connectionQuality: { type: 'offline' }, lastOnlineTime: null, lastOfflineTime: Date.now(), connectionAttempts: 0, isReconnecting: false });
    mockBackgroundSyncManager.getSyncStatus.mockResolvedValue({
      queueLength: 0,
      lastSyncTime: null,
    });

    render(<OfflineIndicator />);

    const statusDiv = screen.getByText('Offline').previousElementSibling;
    expect(statusDiv).toHaveClass('w-3', 'h-3', 'rounded-full');
  });
});