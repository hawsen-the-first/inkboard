import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { CanvasData } from '../CanvasDrawing/CanvasDrawing';
import { Task } from '../../types';
import './TaskCard.css';

const renderSketchPreview = (imageData: string): ReactElement | null => {
  try {
    const data = JSON.parse(imageData) as CanvasData;
    if (data.version !== 2 || !data.strokes?.length) return null;

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
    if (!isFinite(minX)) return null;

    const pad = 20;
    return (
      <svg
        className="task-card__sketch"
        viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`}
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
    return null;
  }
};

interface TaskCardProps {
  task: Task;
  index: number;
  onOpenTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskCard = ({ task, index, onOpenTask, onDeleteTask }: TaskCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const pressTimerRef = useRef<number>();
  const preview = useMemo(() => (task.sketches[0] ? renderSketchPreview(task.sketches[0].imageData) : null), [task.sketches]);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) {
        window.clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`task-card ${snapshot.isDragging ? 'task-card--dragging' : ''}`}
          onClick={() => onOpenTask(task._id)}
          onContextMenu={(event) => {
            event.preventDefault();
            setMenuOpen(true);
          }}
          onTouchStart={() => {
            pressTimerRef.current = window.setTimeout(() => setMenuOpen(true), 600);
          }}
          onTouchEnd={() => {
            if (pressTimerRef.current) {
              window.clearTimeout(pressTimerRef.current);
            }
          }}
          onTouchMove={() => {
            if (pressTimerRef.current) {
              window.clearTimeout(pressTimerRef.current);
            }
          }}
        >
          <div className="task-card__top-row">
            <h3>{task.title}</h3>
            {task.sketches.length ? <span className="task-card__sketch-count">{task.sketches.length} sketch</span> : null}
          </div>

          {task.tags.length ? (
            <div className="task-card__tags">
              {task.tags.map((tag) => (
                <span
                  key={tag._id}
                  className="task-card__tag"
                  style={{ background: `${tag.color}26`, color: tag.color, borderLeft: `3px solid ${tag.color}` }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}

          {preview ? <div className="task-card__preview">{preview}</div> : null}

          <div className="task-card__footer">
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
            <span>{task.description ? 'Has notes' : 'Tap to edit'}</span>
          </div>

          {menuOpen ? (
            <div className="task-card__menu" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => onDeleteTask(task._id)}>
                Delete task
              </button>
              <button type="button" className="task-card__menu-close" onClick={() => setMenuOpen(false)}>
                Close
              </button>
            </div>
          ) : null}
        </article>
      )}
    </Draggable>
  );
};
