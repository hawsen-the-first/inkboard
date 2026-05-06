import { Router } from 'express';
import mongoose from 'mongoose';
import Tag from '../models/Tag';
import Task from '../models/Task';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const tags = await Tag.find().sort({ createdAt: 1, name: 1 });
    res.json(tags);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, color = '#6366f1' } = req.body as { name?: string; color?: string };

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'name is required' });
    }

    const existing = await Tag.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
    if (existing) {
      return res.status(409).json({ message: 'Tag already exists' });
    }

    const tag = await Tag.create({ name: name.trim(), color });
    return res.status(201).json(tag);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid tag id' });
    }

    const tag = await Tag.findByIdAndDelete(id);

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    await Task.updateMany({ tags: id }, { $pull: { tags: id } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
