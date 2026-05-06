export interface Column {
  id: string;
  label: string;
}

export interface Project {
  _id: string;
  name: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  _id: string;
  name: string;
  color: string;
}

export interface Sketch {
  _id: string;
  imageData: string;
  createdAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  projectId: string;
  tags: Tag[];
  sketches: Sketch[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskMutation {
  title?: string;
  description?: string;
  status?: string;
  tags?: string[];
  order?: number;
  projectId?: string;
}

export const TAG_COLORS = ['#5865f2', '#e67e22', '#27ae60', '#e74c3c', '#8e44ad', '#16a085', '#d35400', '#c0392b'];
