import { useEffect, useState } from "react";
import { apiClient } from "../lib/api";

export interface ProjectOption {
  project_id: string;
  project_name: string;
  project_code?: string | null;
  status?: string;
  currency?: string;
}

interface ProjectsDirectoryState {
  projects: ProjectOption[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

let cachedProjects: ProjectOption[] | null = null;
let inflight: Promise<ProjectOption[]> | null = null;
const listeners = new Set<(projects: ProjectOption[], error: string | null) => void>();

async function loadProjects(): Promise<ProjectOption[]> {
  if (cachedProjects) return cachedProjects;
  if (inflight) return inflight;
  inflight = apiClient
    .get("/projects", { params: { limit: 100, sortBy: "project_name", sortOrder: "ASC" } })
    .then((body: any) => {
      const list: ProjectOption[] = body?.projects ?? body?.data ?? (Array.isArray(body) ? body : []);
      cachedProjects = list;
      inflight = null;
      return list;
    })
    .catch(() => {
      inflight = null;
      throw new Error("Failed to load projects");
    });
  return inflight;
}

function broadcast(projects: ProjectOption[], error: string | null) {
  for (const fn of listeners) fn(projects, error);
}

/**
 * Shared, module-cached projects directory for header/sidebar selectors.
 * One request serves every mount point; a reload invalidates all of them.
 */
export function useProjectsDirectory(): ProjectsDirectoryState {
  const [projects, setProjects] = useState<ProjectOption[]>(cachedProjects ?? []);
  const [isLoading, setIsLoading] = useState(!cachedProjects);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const listener = (next: ProjectOption[], nextError: string | null) => {
      setProjects(next);
      setError(nextError);
      setIsLoading(false);
    };
    listeners.add(listener);

    if (cachedProjects) {
      listener(cachedProjects, null);
    } else {
      loadProjects()
        .then((list) => broadcast(list, null))
        .catch(() => broadcast([], "Failed to load projects"));
    }

    return () => {
      listeners.delete(listener);
    };
  }, [tick]);

  const reload = () => {
    cachedProjects = null;
    setIsLoading(true);
    setTick((t) => t + 1);
  };

  return { projects, isLoading, error, reload };
}

export function invalidateProjectsDirectory() {
  cachedProjects = null;
  // Reload eagerly so any mounted selector refreshes on the next broadcast.
  loadProjects()
    .then((list) => broadcast(list, null))
    .catch(() => broadcast([], "Failed to load projects"));
}
