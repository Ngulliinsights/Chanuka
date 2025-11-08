import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from '../use-toast';

// Mock the toast component types
vi.mock('../components/ui/toast', () => ({
  ToastProps: {},
  ToastActionElement: {},
}));

// Mock logger
vi.mock('../utils/browser-logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useToast Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing toasts
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with empty toasts array', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toEqual([]);
    });
  });

  describe('toast function', () => {
    it('should create a toast with basic properties', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({
          title: 'Test Title',
          description: 'Test Description',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        title: 'Test Title',
        description: 'Test Description',
        open: true,
        id: expect.any(String),
      });
    });

    it('should generate unique IDs for each toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'First' });
        toast({ title: 'Second' });
      });

      expect(result.current.toasts).toHaveLength(2);
      expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);
    });

    it('should limit toasts to TOAST_LIMIT', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        for (let i = 0; i < 3; i++) {
          toast({ title: `Toast ${i}` });
        }
      });

      expect(result.current.toasts).toHaveLength(1); // TOAST_LIMIT is 1
    });

    it('should return dismiss and update functions', () => {
      const { result } = renderHook(() => useToast());

      let toastControls: any;
      act(() => {
        toastControls = toast({ title: 'Test' });
      });

      expect(toastControls).toHaveProperty('dismiss');
      expect(toastControls).toHaveProperty('update');
      expect(typeof toastControls.dismiss).toBe('function');
      expect(typeof toastControls.update).toBe('function');
    });
  });

  describe('dismiss functionality', () => {
    it('should dismiss a specific toast', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;
      act(() => {
        const controls = toast({ title: 'Test' });
        toastId = controls.id;
      });

      expect(result.current.toasts[0].open).toBe(true);

      act(() => {
        result.current.dismiss(toastId);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });

    it('should dismiss all toasts when no ID provided', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'First' });
        toast({ title: 'Second' });
      });

      act(() => {
        result.current.dismiss();
      });

      expect(result.current.toasts.every(t => !t.open)).toBe(true);
    });

    it('should automatically remove toast after TOAST_REMOVE_DELAY', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test' });
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.dismiss(result.current.toasts[0].id);
      });

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(1000000); // TOAST_REMOVE_DELAY
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('update functionality', () => {
    it('should update toast properties', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;
      let toastControls: any;
      act(() => {
        toastControls = toast({ title: 'Original' });
        toastId = toastControls.id;
      });

      act(() => {
        toastControls.update({
          id: toastId,
          title: 'Updated Title',
          description: 'Updated Description',
        } as any);
      });

      expect(result.current.toasts[0]).toMatchObject({
        id: toastId,
        title: 'Updated Title',
        description: 'Updated Description',
      });
    });
  });

  describe('onOpenChange callback', () => {
    it('should call dismiss when toast is closed', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test' });
      });

      const toastElement = result.current.toasts[0];

      act(() => {
        toastElement.onOpenChange!(false);
      });

      expect(result.current.toasts[0].open).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty toast options', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({});
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        open: true,
        id: expect.any(String),
      });
    });

    it('should handle toast with action element', () => {
      const { result } = renderHook(() => useToast());
      const mockAction = { type: 'button', props: { children: 'Action' } } as any;

      act(() => {
        toast({
          title: 'Test',
          action: mockAction,
        });
      });

      expect(result.current.toasts[0].action).toBe(mockAction);
    });

    it('should handle multiple dismiss calls gracefully', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;
      act(() => {
        const controls = toast({ title: 'Test' });
        toastId = controls.id;
      });

      act(() => {
        result.current.dismiss(toastId);
        result.current.dismiss(toastId); // Second dismiss should be safe
      });

      expect(result.current.toasts[0].open).toBe(false);
    });
  });

  describe('memory management', () => {
    it('should clean up timeouts on unmount', () => {
      const { result, unmount } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Test' });
      });

      act(() => {
        result.current.dismiss(result.current.toasts[0].id);
      });

      unmount();

      // Should not throw any errors
      expect(() => {
        vi.advanceTimersByTime(1000000);
      }).not.toThrow();
    });

    it('should handle rapid toast creation and dismissal', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        for (let i = 0; i < 10; i++) {
          const controls = toast({ title: `Toast ${i}` });
          result.current.dismiss(controls.id);
        }
      });

      // Fast-forward to clear all timeouts
      act(() => {
        vi.advanceTimersByTime(1000000);
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });
});