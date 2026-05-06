import { Task, TaskMutation } from '../types';

const apiRequest = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => {
  const response = await fetch(input, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};

export const fetchTasks = (projectId?: string): Promise<Task[]> => {
  const query = projectId ? `?${new URLSearchParams({ projectId }).toString()}` : '';
  return apiRequest<Task[]>(`/api/tasks${query}`);
};

export const createTask = (data: TaskMutation): Promise<Task> =>
  apiRequest<Task>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateTask = (id: string, data: TaskMutation): Promise<Task> =>
  apiRequest<Task>(`/api/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteTask = (id: string): Promise<void> =>
  apiRequest<void>(`/api/tasks/${id}`, {
    method: 'DELETE',
  });

export const reorderTasks = (tasks: { id: string; order: number; status: string }[]): Promise<void> =>
  apiRequest<void>('/api/tasks/reorder', {
    method: 'PUT',
    body: JSON.stringify({ tasks }),
  });

export const addSketch = (taskId: string, imageData: string): Promise<Task> =>
  apiRequest<Task>(`/api/tasks/${taskId}/sketches`, {
    method: 'POST',
    body: JSON.stringify({ imageData }),
  });

export const deleteSketch = (taskId: string, sketchId: string): Promise<Task> =>
  apiRequest<Task>(`/api/tasks/${taskId}/sketches/${sketchId}`, {
    method: 'DELETE',
  });
