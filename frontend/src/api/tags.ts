import { Tag } from '../types';

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

export const fetchTags = (): Promise<Tag[]> => apiRequest<Tag[]>('/api/tags');

export const createTag = (name: string, color: string): Promise<Tag> =>
  apiRequest<Tag>('/api/tags', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });

export const deleteTag = (id: string): Promise<void> =>
  apiRequest<void>(`/api/tags/${id}`, {
    method: 'DELETE',
  });
