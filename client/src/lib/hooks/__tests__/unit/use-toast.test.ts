/**
 * Unit Tests for useToast Hook
 * Tests the toast notification system with reducer pattern
 */

import { renderHook, act } from '@testing-library/react';

import { useToast } from '../../use-toast';

describe('useToast', () => {
  beforeEach(() => {
    // Clear any existing toasts
    vitest.clearAllTimers();
  });

  it('should initialize with empty toasts array', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast when toast() is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Test Toast',
        description: 'This is a test toast',
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      title: 'Test Toast',
      description: 'This is a test toast',
      open: true,
    });
  });

  it('should dismiss a toast when dismiss() is called', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;

    act(() => {
      const toastResult = result.current.toast({
        title: 'Test Toast',
      });
      toastId = toastResult.id;
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.dismiss(toastId);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it('should remove toast after timeout', async () => {
    vitest.useFakeTimers();

    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({
        title: 'Test Toast',
      });
    });

    expect(result.current.toasts).toHaveLength(1);

    // Fast forward time
    act(() => {
      vitest.advanceTimersByTime(10000);
    });

    expect(result.current.toasts).toHaveLength(0);

    vitest.useRealTimers();
  });

  it('should update toast when update() is called', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;

    act(() => {
      const toastResult = result.current.toast({
        title: 'Initial Title',
      });
      toastId = toastResult.id;
    });

    act(() => {
      result.current.toasts[0].update({
        title: 'Updated Title',
        description: 'Updated Description',
      });
    });

    expect(result.current.toasts[0].title).toBe('Updated Title');
    expect(result.current.toasts[0].description).toBe('Updated Description');
  });

  it('should limit toasts to TOAST_LIMIT', () => {
    const { result } = renderHook(() => useToast());

    // Add more toasts than the limit
    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.toast({
          title: `Toast ${i}`,
        });
      }
    });

    // Should be limited to TOAST_LIMIT (1)
    expect(result.current.toasts).toHaveLength(1);
  });

  it('should handle multiple toasts with different IDs', () => {
    const { result } = renderHook(() => useToast());

    let toastId1: string, toastId2: string;

    act(() => {
      toastId1 = result.current.toast({ title: 'Toast 1' }).id;
      toastId2 = result.current.toast({ title: 'Toast 2' }).id;
    });

    expect(result.current.toasts).toHaveLength(1); // Limited to 1
    expect(result.current.toasts[0].title).toBe('Toast 2'); // Last one wins
  });
});
