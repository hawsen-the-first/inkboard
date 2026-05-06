import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  fetchProjects,
  updateProject as updateProjectRequest,
} from '../api/projects';
import {
  addSketch as addSketchRequest,
  createTask as createTaskRequest,
  deleteSketch as deleteSketchRequest,
  deleteTask as deleteTaskRequest,
  fetchTasks,
  reorderTasks as reorderTasksRequest,
  updateTask as updateTaskRequest,
} from '../api/tasks';
import {
  createTag as createTagRequest,
  deleteTag as deleteTagRequest,
  fetchTags,
} from '../api/tags';
import { Column, Project, Tag, Task, TaskMutation } from '../types';

interface UseTasksResult {
  projects: Project[];
  activeProject: Project | null;
  tasks: Task[];
  tags: Tag[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setActiveProjectId: (id: string) => void;
  createProject: (name: string) => Promise<Project>;
  updateProject: (id: string, data: Partial<{ name: string; columns: Column[] }>) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  createTask: (data: TaskMutation) => Promise<Task>;
  updateTask: (id: string, data: TaskMutation) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (nextTasks: Task[], updates: { id: string; order: number; status: string }[]) => Promise<void>;
  addSketch: (taskId: string, imageData: string) => Promise<Task>;
  deleteSketch: (taskId: string, sketchId: string) => Promise<Task>;
  createTag: (name: string, color: string) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
}

export const useTasks = (): UseTasksResult => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const skipProjectReloadRef = useRef(false);

  const activeProject = useMemo(
    () => projects.find((project) => project._id === activeProjectId) ?? null,
    [activeProjectId, projects],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [projectData, tagData] = await Promise.all([fetchProjects(), fetchTags()]);
      const nextActiveProjectId =
        activeProjectId && projectData.some((project) => project._id === activeProjectId)
          ? activeProjectId
          : projectData[0]?._id ?? null;
      const taskData = nextActiveProjectId ? await fetchTasks(nextActiveProjectId) : [];

      skipProjectReloadRef.current = true;
      setProjects(projectData);
      setTags(tagData);
      setTasks(taskData);
      setActiveProjectIdState(nextActiveProjectId);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load data');
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const [projectData, tagData] = await Promise.all([fetchProjects(), fetchTags()]);
        const initialProjectId = projectData[0]?._id ?? null;
        const taskData = initialProjectId ? await fetchTasks(initialProjectId) : [];

        if (cancelled) {
          return;
        }

        skipProjectReloadRef.current = true;
        setProjects(projectData);
        setTags(tagData);
        setTasks(taskData);
        setActiveProjectIdState(initialProjectId);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeProjectId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    if (skipProjectReloadRef.current) {
      skipProjectReloadRef.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const taskData = await fetchTasks(activeProjectId);
        if (cancelled) {
          return;
        }

        setTasks(taskData);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load tasks');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeProjectId]);

  const setActiveProjectId = useCallback((id: string) => {
    setActiveProjectIdState((current) => (current === id ? current : id));
  }, []);

  const createProject = useCallback(async (name: string) => {
    try {
      const project = await createProjectRequest(name);
      setProjects((current) => [...current, project]);
      setTasks([]);
      setActiveProjectIdState(project._id);
      setError(null);
      return project;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create project');
      throw err;
    }
  }, []);

  const updateProject = useCallback(async (id: string, data: Partial<{ name: string; columns: Column[] }>) => {
    try {
      const project = await updateProjectRequest(id, data);
      setProjects((current) => current.map((item) => (item._id === id ? project : item)));
      setError(null);
      return project;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update project');
      throw err;
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      await deleteProjectRequest(id);
      const remainingProjects = projects.filter((project) => project._id !== id);
      setProjects(remainingProjects);
      setError(null);

      if (activeProjectId === id) {
        setTasks([]);
        setActiveProjectIdState(remainingProjects[0]?._id ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete project');
      throw err;
    }
  }, [activeProjectId, projects]);

  const createTask = useCallback(async (data: TaskMutation) => {
    if (!activeProject) {
      throw new Error('No active project selected');
    }

    try {
      const task = await createTaskRequest({
        ...data,
        projectId: activeProject._id,
        status: data.status ?? activeProject.columns[0]?.id ?? 'todo',
      });
      setTasks((current) => [...current, task]);
      setError(null);
      return task;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create task');
      throw err;
    }
  }, [activeProject]);

  const updateTask = useCallback(async (id: string, data: TaskMutation) => {
    try {
      const task = await updateTaskRequest(id, data);
      setTasks((current) => current.map((item) => (item._id === id ? task : item)));
      setError(null);
      return task;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update task');
      throw err;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const snapshot = tasks;
    setTasks((current) => current.filter((task) => task._id !== id));

    try {
      await deleteTaskRequest(id);
      setError(null);
    } catch (err) {
      setTasks(snapshot);
      setError(err instanceof Error ? err.message : 'Unable to delete task');
      throw err;
    }
  }, [tasks]);

  const moveTask = useCallback(async (nextTasks: Task[], updates: { id: string; order: number; status: string }[]) => {
    const snapshot = tasks;
    setTasks(nextTasks);

    try {
      await reorderTasksRequest(updates);
      setError(null);
    } catch (err) {
      setTasks(snapshot);
      setError(err instanceof Error ? err.message : 'Unable to move task');
      throw err;
    }
  }, [tasks]);

  const addSketch = useCallback(async (taskId: string, imageData: string) => {
    try {
      const task = await addSketchRequest(taskId, imageData);
      setTasks((current) => current.map((item) => (item._id === taskId ? task : item)));
      setError(null);
      return task;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save sketch');
      throw err;
    }
  }, []);

  const deleteSketch = useCallback(async (taskId: string, sketchId: string) => {
    try {
      const task = await deleteSketchRequest(taskId, sketchId);
      setTasks((current) => current.map((item) => (item._id === taskId ? task : item)));
      setError(null);
      return task;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete sketch');
      throw err;
    }
  }, []);

  const createTag = useCallback(async (name: string, color: string) => {
    try {
      const tag = await createTagRequest(name, color);
      setTags((current) => [...current, tag]);
      setError(null);
      return tag;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create tag');
      throw err;
    }
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    const previousTasks = tasks;
    const previousTags = tags;

    setTags((current) => current.filter((tag) => tag._id !== id));
    setTasks((current) => current.map((task) => ({ ...task, tags: task.tags.filter((tag) => tag._id !== id) })));

    try {
      await deleteTagRequest(id);
      setError(null);
    } catch (err) {
      setTags(previousTags);
      setTasks(previousTasks);
      setError(err instanceof Error ? err.message : 'Unable to delete tag');
      throw err;
    }
  }, [tags, tasks]);

  return {
    projects,
    activeProject,
    tasks,
    tags,
    loading,
    error,
    refresh,
    setActiveProjectId,
    createProject,
    updateProject,
    deleteProject,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    addSketch,
    deleteSketch,
    createTag,
    deleteTag,
  };
};
