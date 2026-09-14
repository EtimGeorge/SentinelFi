import { create } from 'zustand';
import * as uuid from 'uuid';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onUndo?: () => void;
  undoLabel?: string;
  isUndoToast?: boolean;
}

interface ToastState {
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  addUndoToast: (message: string, onUndo: () => void, duration?: number, undoLabel?: string) => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [], addToast: (message, type, duration = 5000) => {
    const id = uuid.v4();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        }));
      }, duration);
    }
  }, addUndoToast: (message, onUndo, duration = 5000, undoLabel = 'Undo') => {
    const id = uuid.v4();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type: 'success', duration, onUndo, undoLabel, isUndoToast: true }],
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        }));
      }, duration);
    }
  }, removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },
}));

export default useToastStore;
