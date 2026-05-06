import { useEffect, useMemo, useState } from 'react';
import { CanvasData, CanvasDrawing } from '../CanvasDrawing/CanvasDrawing';
import { Column, Tag, Task, TaskMutation } from '../../types';
import './TaskModal.css';

const renderSketchPreview = (imageData: string) => {
  try {
    const data = JSON.parse(imageData) as CanvasData;
    if (data.version !== 2 || !data.strokes?.length) {
      return <div className="task-modal__sketch-fallback">Empty sketch</div>;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const stroke of data.strokes) {
      if (stroke.eraser) continue;
      for (const pt of stroke.points) {
        if (pt.x < minX) minX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y > maxY) maxY = pt.y;
      }
    }

    if (!isFinite(minX)) {
      return <div className="task-modal__sketch-fallback">Empty sketch</div>;
    }

    const pad = 20;
    const vbX = minX - pad;
    const vbY = minY - pad;
    const vbW = Math.max(maxX - minX + pad * 2, 1);
    const vbH = Math.max(maxY - minY + pad * 2, 1);

    return (
      <svg
        className="task-modal__sketch-preview"
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ background: '#f9f9fc' }}
      >
        {data.strokes.map((stroke, i) =>
          stroke.points.length > 1 ? (
            <polyline
              key={i}
              fill="none"
              stroke={stroke.eraser ? '#f9f9fc' : stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
            />
          ) : stroke.points.length === 1 ? (
            <circle
              key={i}
              cx={stroke.points[0].x}
              cy={stroke.points[0].y}
              r={stroke.width / 2}
              fill={stroke.eraser ? '#f9f9fc' : stroke.color}
            />
          ) : null,
        )}
      </svg>
    );
  } catch {
    return <div className="task-modal__sketch-fallback">Preview unavailable</div>;
  }
};

interface TaskModalProps {
  task: Task | null;
  tags: Tag[];
  columns: Column[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, data: TaskMutation) => Promise<Task>;
  onDelete: (taskId: string) => Promise<void>;
  onAddSketch: (taskId: string, imageData: string) => Promise<Task>;
  onDeleteSketch: (taskId: string, sketchId: string) => Promise<Task>;
  onOpenTagManager: () => void;
}

export const TaskModal = ({
  task,
  tags,
  columns,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onAddSketch,
  onDeleteSketch,
  onOpenTagManager,
}: TaskModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [editingSketchId, setEditingSketchId] = useState<string | null>(null);
  const [initialSketchData, setInitialSketchData] = useState<string | null>(null);

  useEffect(() => {
    if (!task) {
      return;
    }

    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setSelectedTagIds(task.tags.map((tag) => tag._id));
    setShowCanvas(false);
    setEditingSketchId(null);
    setInitialSketchData(null);
  }, [task]);

  const selectedTags = useMemo(
    () => tags.filter((tag) => selectedTagIds.includes(tag._id)),
    [selectedTagIds, tags],
  );

  if (!isOpen || !task) {
    return null;
  }

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((item) => item !== tagId) : [...current, tagId],
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(task._id, {
        title,
        description,
        status,
        tags: selectedTagIds,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSketch = async (imageData: string) => {
    if (editingSketchId) {
      await onDeleteSketch(task._id, editingSketchId);
    }

    await onAddSketch(task._id, imageData);
    setShowCanvas(false);
    setEditingSketchId(null);
    setInitialSketchData(null);
  };

  return (
    <div className="task-modal__overlay" role="dialog" aria-modal="true">
      <div className="task-modal">
        <div className="task-modal__header">
          <input value={title} onChange={(event) => setTitle(event.target.value)} aria-label="Task title" />
          <button className="task-modal__close" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="task-modal__grid">
          <section className="task-modal__section">
            <label>
              <span>Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                placeholder="Add notes, acceptance criteria, or drawing ideas"
              />
            </label>

            <label>
              <span>Status</span>
              {columns.length ? (
                <div className="task-modal__status-list">
                  {columns.map((column) => (
                    <button
                      key={column.id}
                      type="button"
                      className={`task-modal__status-button ${status === column.id ? 'task-modal__status-button--active' : ''}`}
                      onClick={() => setStatus(column.id)}
                    >
                      {column.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="task-modal__hint">No columns available.</div>
              )}
            </label>

            <div>
              <div className="task-modal__section-title-row">
                <span>Tags</span>
                <button type="button" className="task-modal__inline-button" onClick={onOpenTagManager}>
                  + Add tag
                </button>
              </div>
              <div className="task-modal__tag-list">
                {tags.map((tag) => (
                  <button
                    key={tag._id}
                    type="button"
                    className={`task-modal__tag ${selectedTagIds.includes(tag._id) ? 'task-modal__tag--active' : ''}`}
                    style={{ '--tag-color': tag.color } as React.CSSProperties}
                    onClick={() => toggleTag(tag._id)}
                  >
                    <span className="task-modal__tag-dot" />
                    {tag.name}
                  </button>
                ))}
              </div>
              {selectedTags.length ? (
                <p className="task-modal__hint">Selected: {selectedTags.map((tag) => tag.name).join(', ')}</p>
              ) : (
                <p className="task-modal__hint">No tags selected.</p>
              )}
            </div>

            <div className="task-modal__actions">
              <button type="button" className="task-modal__primary" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
              <button type="button" className="task-modal__danger" onClick={() => void onDelete(task._id)}>
                Delete task
              </button>
            </div>
          </section>

          <section className="task-modal__section task-modal__section--drawing">
            <div className="task-modal__section-title-row">
              <span>Sketches</span>
              <button
                type="button"
                className="task-modal__inline-button"
                onClick={() => {
                  setShowCanvas(true);
                  setEditingSketchId(null);
                  setInitialSketchData(null);
                }}
              >
                New sketch
              </button>
            </div>

            {showCanvas ? (
              <CanvasDrawing
                initialData={initialSketchData}
                onCancel={() => {
                  setShowCanvas(false);
                  setEditingSketchId(null);
                  setInitialSketchData(null);
                }}
                onSave={(imageData) => void handleSaveSketch(imageData)}
              />
            ) : (
              <div className="task-modal__sketch-grid">
                {task.sketches.length ? (
                  task.sketches.map((sketch) => (
                    <div key={sketch._id} className="task-modal__sketch-card">
                      <button
                        type="button"
                        className="task-modal__sketch-button"
                        onClick={() => {
                          setShowCanvas(true);
                          setEditingSketchId(sketch._id);
                          setInitialSketchData(sketch.imageData);
                        }}
                      >
                        {renderSketchPreview(sketch.imageData)}
                      </button>
                      <div className="task-modal__sketch-meta">
                        <span>{new Date(sketch.createdAt).toLocaleString()}</span>
                        <button type="button" onClick={() => void onDeleteSketch(task._id, sketch._id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="task-modal__empty-state">No sketches yet. Create one to capture stylus notes.</div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
