// /frontend/lib/formAutoSave.ts
/**
 * Form Auto-Save Utility
 * 
 * Automatically saves form data to localStorage to prevent data loss
 * during session timeouts or browser crashes.
 */

export interface AutoSaveConfig {
  key: string;
  debounceMs?: number;
  onSave?: (data: any) => void;
  onRestore?: (data: any) => void;
}

class FormAutoSave {
  private saveTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFAULT_DEBOUNCE_MS = 2000; // 2 seconds

  /**
   * Save form data to localStorage with debouncing
   */
  save(key: string, data: any, debounceMs: number = this.DEFAULT_DEBOUNCE_MS) {
    // Clear existing timeout for this key
    const existingTimeout = this.saveTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      try {
        const saveData = {
          data,
          timestamp: Date.now(),
          version: '1.0',
        };
        localStorage.setItem(`autosave_${key}`, JSON.stringify(saveData));
        console.log(`[AutoSave] Saved form data for key: ${key}`);
      } catch (error) {
        console.error(`[AutoSave] Failed to save form data for ${key}:`, error);
      }
    }, debounceMs);

    this.saveTimeouts.set(key, timeout);
  }

  /**
   * Restore form data from localStorage
   */
  restore<T = any>(key: string, maxAgeMs: number = 24 * 60 * 60 * 1000): T | null {
    try {
      const savedJson = localStorage.getItem(`autosave_${key}`);
      if (!savedJson) return null;

      const saved = JSON.parse(savedJson);
      const age = Date.now() - saved.timestamp;

      if (age > maxAgeMs) {
        console.log(`[AutoSave] Saved data for ${key} is too old (${Math.round(age / 1000 / 60)} minutes), discarding`);
        this.clear(key);
        return null;
      }

      console.log(`[AutoSave] Restored form data for key: ${key} (age: ${Math.round(age / 1000)} seconds)`);
      return saved.data as T;
    } catch (error) {
      console.error(`[AutoSave] Failed to restore form data for ${key}:`, error);
      return null;
    }
  }

  /**
   * Clear saved form data
   */
  clear(key: string) {
    localStorage.removeItem(`autosave_${key}`);
    const timeout = this.saveTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.saveTimeouts.delete(key);
    }
    console.log(`[AutoSave] Cleared saved data for key: ${key}`);
  }

  /**
   * List all auto-saved form keys
   */
  listSaved(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('autosave_')) {
        keys.push(key.replace('autosave_', ''));
      }
    }
    return keys;
  }

  /**
   * Clear all auto-saved forms older than specified age
   */
  clearOld(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000) {
    const keys = this.listSaved();
    let cleared = 0;

    keys.forEach(key => {
      try {
        const savedJson = localStorage.getItem(`autosave_${key}`);
        if (!savedJson) return;

        const saved = JSON.parse(savedJson);
        const age = Date.now() - saved.timestamp;

        if (age > maxAgeMs) {
          this.clear(key);
          cleared++;
        }
      } catch (error) {
        console.error(`[AutoSave] Error checking age for ${key}:`, error);
      }
    });

    if (cleared > 0) {
      console.log(`[AutoSave] Cleared ${cleared} old auto-saves`);
    }

    return cleared;
  }
}

export const formAutoSave = new FormAutoSave();

/**
 * React Hook for form auto-save
 * 
 * Usage:
 * ```tsx
 * const { autoSave, restoreData, clearData } = useFormAutoSave('create-project');
 * 
 * // In form change handler:
 * const handleChange = (field, value) => {
 *   setFormData(prev => ({ ...prev, [field]: value }));
 *   autoSave({ ...formData, [field]: value });
 * };
 * 
 * // On component mount:
 * useEffect(() => {
 *   const restored = restoreData();
 *   if (restored && confirm('Restore previous draft?')) {
 *     setFormData(restored);
 *   }
 * }, []);
 * 
 * // After successful submit:
 * clearData();
 * ```
 */
export function useFormAutoSave(key: string, config?: Partial<AutoSaveConfig>) {
  const autoSave = (data: any) => {
    formAutoSave.save(key, data, config?.debounceMs);
    config?.onSave?.(data);
  };

  const restoreData = <T = any>(maxAgeMs?: number): T | null => {
    const data = formAutoSave.restore<T>(key, maxAgeMs);
    if (data) {
      config?.onRestore?.(data);
    }
    return data;
  };

  const clearData = () => {
    formAutoSave.clear(key);
  };

  return { autoSave, restoreData, clearData };
}

// Auto-cleanup on page load
if (typeof window !== 'undefined') {
  // Clear auto-saves older than 7 days on app load
  setTimeout(() => {
    formAutoSave.clearOld(7 * 24 * 60 * 60 * 1000);
  }, 5000);
}
