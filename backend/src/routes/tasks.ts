import { Router } from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task';

const router = Router();

const populateTags = 'tags';
const isValidObjectId = (value: string) => mongoose.isValidObjectId(value);

router.get('/', async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = {};
    const { projectId } = req.query;

    if (typeof projectId === 'string' && projectId.trim()) {
      if (!isValidObjectId(projectId)) {
        return res.status(400).json({ message: 'Invalid project id' });
      }
      filter.projectId = projectId;
    }

    const tasks = await Task.find(filter).populate(populateTags).sort({ status: 1, order: 1, createdAt: 1 });
    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

router.put('/reorder', async (req, res, next) => {
  try {
    const tasks = req.body?.tasks;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ message: 'tasks array is required' });
    }

    await Task.bulkWrite(
      tasks.map((task: { id: string; order: number; status: string }) => ({
        updateOne: {
          filter: { _id: task.id },
          update: { $set: { order: task.order, status: task.status } },
        },
      })),
    );

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description = '', status = 'todo', tags = [], order, projectId } = req.body as {
      title?: string;
      description?: string;
      status?: string;
      tags?: string[];
      order?: number;
      projectId?: string | null;
    };

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ message: 'title is required' });
    }

    if (projectId !== undefined && projectId !== null && (typeof projectId !== 'string' || !isValidObjectId(projectId))) {
      return res.status(400).json({ message: 'Invalid project id' });
    }

    const highestOrderTask =
      typeof order === 'number'
        ? null
        : await Task.findOne({ status, ...(projectId ? { projectId } : {}) }).sort({ order: -1 }).select('order').lean();

    const task = await Task.create({
      title: title.trim(),
      description,
      status,
      projectId: typeof projectId === 'string' ? projectId : undefined,
      tags,
      order: typeof order === 'number' ? order : (highestOrderTask?.order ?? -1) + 1,
    });

    const populatedTask = await Task.findById(task._id).populate(populateTags);
    return res.status(201).json(populatedTask);
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    const task = await Task.findById(id).populate(populateTags);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json(task);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    const { title, description, status, tags, order, projectId } = req.body as {
      title?: string;
      description?: string;
      status?: string;
      tags?: string[];
      order?: number;
      projectId?: string | null;
    };

    const update: Record<string, unknown> = {};

    if (typeof title === 'string') update.title = title.trim();
    if (typeof description === 'string') update.description = description;
    if (typeof status === 'string') update.status = status;
    if (Array.isArray(tags)) update.tags = tags;
    if (typeof order === 'number') update.order = order;
    if (typeof projectId === 'string') {
      if (!isValidObjectId(projectId)) {
        return res.status(400).json({ message: 'Invalid project id' });
      }
      update.projectId = projectId;
    }
    if (projectId === null) update.projectId = null;

    const task = await Task.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).populate(
      populateTags,
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.json(task);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    const task = await Task.findByIdAndDelete(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.post('/:id/sketches', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageData } = req.body as { imageData?: string };

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }

    if (!imageData || typeof imageData !== 'string') {
      return res.status(400).json({ message: 'imageData is required' });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.sketches.push({ imageData, createdAt: new Date() });
    await task.save();
    await task.populate(populateTags);

    return res.status(201).json(task);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id/sketches/:sketchId', async (req, res, next) => {
  try {
    const { id, sketchId } = req.params;

    if (!isValidObjectId(id) || !isValidObjectId(sketchId)) {
      return res.status(400).json({ message: 'Invalid identifier' });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const sketch = task.sketches.id(sketchId);

    if (!sketch) {
      return res.status(404).json({ message: 'Sketch not found' });
    }

    sketch.deleteOne();
    await task.save();
    await task.populate(populateTags);

    return res.json(task);
  } catch (error) {
    return next(error);
  }
});

export default router;
