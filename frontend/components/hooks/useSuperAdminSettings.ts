import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { SettingsEntity, UpdateSettingsDto } from '@shared/types/settings';
import { useAuth } from '../context/AuthContext'; // Import useAuth

interface UseSuperAdminSettingsResult {
  settings: SettingsEntity | null;
  loading: boolean;
  error: string | null;
  updateSettings: (dto: UpdateSettingsDto) => Promise<SettingsEntity | null>;
  refetch: () => void;
}

const useSuperAdminSettings = (): UseSuperAdminSettingsResult => {
  const [settings, setSettings] = useState<SettingsEntity | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth(); // Get user

  const fetchSettings = async (signal?: AbortSignal) => { // Accept signal
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<SettingsEntity>('/super/settings', { signal });
      if (!signal?.aborted) {
        setSettings(response.data);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
      if (!signal?.aborted) {
        setError(err.response?.data?.message || err.message || 'Failed to fetch settings.');
        console.error("Error fetching settings:", err);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!user) return; // Guard

    const controller = new AbortController();
    fetchSettings(controller.signal);

    return () => controller.abort();
  }, [user]);

  const updateSettings = async (dto: UpdateSettingsDto): Promise<SettingsEntity | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put<SettingsEntity>('/super/settings', dto);
      setSettings(response.data);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to update settings.');
      console.error("Error updating settings:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { settings, loading, error, updateSettings, refetch: fetchSettings };
};

export default useSuperAdminSettings;
