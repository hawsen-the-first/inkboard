import { Project } from '../types';

export const fetchProjects = async (): Promise<Project[]> => {
  const res = await fetch('/api/projects');
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json() as Promise<Project[]>;
};

export const createProject = async (name: string): Promise<Project> => {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create project');
  return res.json() as Promise<Project>;
};

export const updateProject = async (
  id: string,
  data: { name?: string; columns?: { id: string; label: string }[] },
): Promise<Project> => {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update project');
  return res.json() as Promise<Project>;
};

export const deleteProject = async (id: string): Promise<void> => {
  const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
};
