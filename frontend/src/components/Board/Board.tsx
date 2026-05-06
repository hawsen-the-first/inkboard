import { useEffect, useMemo, useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Column as BoardColumn } from '../Column/Column';
import { Column, Task } from '../../types';
import './Board.css';

interface BoardProps {
  columns: Column[];
  tasks: Task[];
  allTasks: Task[];
  onOpenTask: (taskId: string) => void;
  onQuickAdd: (status: string, title: string) => void;
  onMoveTask: (nextTasks: Task[], updates: { id: string; order: number; status: string }[]) => void;
  onDeleteTask: (taskId: string) => void;
}

export const Board = ({ columns, tasks, allTasks, onOpenTask, onQuickAdd, onMoveTask, onDeleteTask }: BoardProps) => {
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    if (!columns.length) {
      setActiveTab('');
      return;
    }

    if (!columns.some((column) => column.id === activeTab)) {
      setActiveTab(columns[0].id);
    }
  }, [activeTab, columns]);

  const groupedTasks = useMemo(() => {
    const grouped = columns.reduce<Record<string, Task[]>>((accumulator, column) => {
      accumulator[column.id] = [];
      return accumulator;
    }, {});

    const fallbackColumnId = columns[0]?.id;
    if (!fallbackColumnId) {
      return grouped;
    }

    const columnIds = new Set(columns.map((column) => column.id));
    for (const task of tasks) {
      const columnId = columnIds.has(task.status) ? task.status : fallbackColumnId;
      grouped[columnId].push(task);
    }

    Object.values(grouped).forEach((columnTasks) => {
      columnTasks.sort((left, right) => left.order - right.order || left.createdAt.localeCompare(right.createdAt));
    });

    return grouped;
  }, [columns, tasks]);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceItems = Array.from(groupedTasks[source.droppableId] ?? []);
    const destinationItems =
      source.droppableId === destination.droppableId
        ? sourceItems
        : Array.from(groupedTasks[destination.droppableId] ?? []);
    const [movedTask] = sourceItems.splice(source.index, 1);

    if (!movedTask) {
      return;
    }

    const updatedTask = { ...movedTask, status: destination.droppableId };
    destinationItems.splice(destination.index, 0, updatedTask);

    const recalculatedSource = sourceItems.map((task, index) => ({ ...task, order: index }));
    const recalculatedDestination = destinationItems.map((task, index) => ({ ...task, order: index }));
    const updateMap = new Map<string, Task>(allTasks.map((task) => [task._id, task]));

    recalculatedSource.forEach((task) => updateMap.set(task._id, task));
    recalculatedDestination.forEach((task) => updateMap.set(task._id, task));

    const updates = [...recalculatedSource, ...recalculatedDestination]
      .filter((task, index, items) => items.findIndex((item) => item._id === task._id) === index)
      .map((task) => ({ id: task._id, order: task.order, status: task.status }));

    const nextTasks = Array.from(updateMap.values()).sort((left, right) => left.order - right.order);
    onMoveTask(nextTasks, updates);
  };

  if (!columns.length) {
    return (
      <section className="board">
        <div className="board__empty">This project has no columns yet.</div>
      </section>
    );
  }

  return (
    <section className="board">
      <div className="board__tabs" role="tablist" aria-label="Columns">
        {columns.map((column) => (
          <button
            key={column.id}
            className={`board__tab ${activeTab === column.id ? 'board__tab--active' : ''}`}
            onClick={() => setActiveTab(column.id)}
            type="button"
          >
            {column.label}
          </button>
        ))}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="board__columns">
          {columns.map((column) => (
            <div
              key={column.id}
              className={`board__column-shell ${activeTab === column.id ? 'board__column-shell--active' : ''}`}
            >
              <BoardColumn
                column={column}
                tasks={groupedTasks[column.id] ?? []}
                onOpenTask={onOpenTask}
                onQuickAdd={onQuickAdd}
                onDeleteTask={onDeleteTask}
              />
            </div>
          ))}
        </div>
      </DragDropContext>
    </section>
  );
};
