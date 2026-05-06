import { Router } from 'express';
import mongoose from 'mongoose';
import Project, { IColumn } from '../models/Project';
import Task from '../models/Task';

const router = Router();

const DEFAULT_COLUMNS: IColumn[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'in-review', label: 'In Review' },
  { id: 'done', label: 'Done' },
];

const isValidObjectId = (value: string) => mongoose.isValidObjectId(value);

const validateColumns = (columns: unknown): { columns?: IColumn[]; message?: string } => {
  if (!Array.isArray(columns)) {
    return { message: 'columns must be an array' };
  }

  if (columns.length < 2 || columns.length > 8) {
    return { message: 'columns must contain between 2 and 8 items' };
  }

  const normalized: IColumn[] = [];
  const ids = new Set<string>();

  for (const column of columns) {
    if (!column || typeof column !== 'object') {
      return { message: 'Each column must be an object' };
    }

    const { id, label } = column as { id?: unknown; label?: unknown };

    if (typeof id !== 'string' || !id.trim()) {
      return { message: 'Column ids must be non-empty strings' };
    }

    if (typeof label !== 'string' || !label.trim()) {
      return { message: 'Column labels must be non-empty strings' };
    }

    const trimmedId = id.trim();
    if (ids.has(trimmedId)) {
      return { message: 'Column ids must be unique' };
    }

    ids.add(trimmedId);
    normalized.push({ id: trimmedId, label: label.trim() });
  }

  return { columns: normalized };
};

router.get('/', async (_req, res, next) => {
  try {
    const projects = await Project.find().sort({ createdAt: 1 });
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, columns } = req.body as { name?: unknown; columns?: unknown };

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'name is required' });
    }

    const resolvedColumns =
      columns === undefined ? { columns: DEFAULT_COLUMNS.map((column) => ({ ...column })) } : validateColumns(columns);
    if (!Array.isArray(resolvedColumns.columns)) {
      return res.status(400).json({ message: resolvedColumns.message ?? 'Invalid columns' });
    }

    const project = await Project.create({
      name: name.trim(),
      columns: resolvedColumns.columns,
    });

    return res.status(201).json(project);
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid project id' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.json(project);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid project id' });
    }

    const update: Partial<{ name: string; columns: IColumn[] }> = {};
    const { name, columns } = req.body as { name?: unknown; columns?: unknown };

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'name must be a non-empty string' });
      }
      update.name = name.trim();
    }

    if (columns !== undefined) {
      const validated = validateColumns(columns);
      if (!Array.isArray(validated.columns)) {
        return res.status(400).json({ message: validated.message ?? 'Invalid columns' });
      }
      update.columns = validated.columns;
    }

    const project = await Project.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    return res.json(project);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid project id' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const count = await Project.countDocuments();
    if (count <= 1) {
      return res.status(400).json({ message: 'Cannot delete the only project' });
    }

    await Project.findByIdAndDelete(id);
    await Task.deleteMany({ projectId: id });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
