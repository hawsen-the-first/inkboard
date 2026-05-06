import { FormEvent, useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Column as ColumnType, Task } from '../../types';
import { TaskCard } from '../TaskCard/TaskCard';
import './Column.css';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  onOpenTask: (taskId: string) => void;
  onQuickAdd: (status: string, title: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const Column = ({ column, tasks, onOpenTask, onQuickAdd, onDeleteTask }: ColumnProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    onQuickAdd(column.id, title.trim());
    setTitle('');
    setIsAdding(false);
  };

  return (
    <div className="column">
      <div className="column__header">
        <div>
          <h2>{column.label}</h2>
          <p>{tasks.length} tasks</p>
        </div>
        <span className="column__badge">{tasks.length}</span>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`column__list ${snapshot.isDraggingOver ? 'column__list--active' : ''}`}
          >
            {tasks.map((task, index) => (
              <TaskCard
                key={task._id}
                task={task}
                index={index}
                onOpenTask={onOpenTask}
                onDeleteTask={onDeleteTask}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {isAdding ? (
        <form className="column__add-form" onSubmit={handleSubmit}>
          <input autoFocus placeholder="Task title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <div className="column__actions">
            <button type="submit" className="column__primary">Save</button>
            <button type="button" className="column__ghost" onClick={() => setIsAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="column__add-button" type="button" onClick={() => setIsAdding(true)}>
          + Add task
        </button>
      )}
    </div>
  );
};
