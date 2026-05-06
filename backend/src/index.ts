import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { connectDB } from './db';
import Project from './models/Project';
import projectsRouter from './routes/projects';
import tasksRouter from './routes/tasks';
import tagsRouter from './routes/tags';

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

const seedDefaultProject = async () => {
  const count = await Project.countDocuments();
  if (count === 0) {
    await Project.create({
      name: 'My Board',
      columns: [
        { id: 'todo', label: 'To Do' },
        { id: 'in-progress', label: 'In Progress' },
        { id: 'in-review', label: 'In Review' },
        { id: 'done', label: 'Done' },
      ],
    });
    console.log('Seeded default project');
  }
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/tags', tagsRouter);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);

  if (error instanceof Error && 'code' in error && error.code === 11000) {
    return res.status(409).json({ message: 'Duplicate record' });
  }

  const message = error instanceof Error ? error.message : 'Internal server error';
  return res.status(500).json({ message });
});

const start = async () => {
  try {
    await connectDB();
    await seedDefaultProject();
    app.listen(PORT, () => {
      console.log(`Inkboard API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server', error);
    process.exit(1);
  }
};

void start();
