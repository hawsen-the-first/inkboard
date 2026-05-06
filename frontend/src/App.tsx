import { useMemo, useState } from 'react';
import { Board } from './components/Board/Board';
import { Header } from './components/Header/Header';
import { ProjectSettings } from './components/ProjectSettings/ProjectSettings';
import { TagManager } from './components/TagManager/TagManager';
import { TaskModal } from './components/TaskModal/TaskModal';
import { useTasks } from './hooks/useTasks';
import './App.css';

const App = () => {
  const {
    projects,
    activeProject,
    tasks,
    tags,
    loading,
    error,
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
  } = useTasks();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<string>('all');
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);

  const selectedTask = useMemo(
    () => tasks.find((task) => task._id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );

  const filteredTasks = useMemo(() => {
    if (selectedTagId === 'all') {
      return tasks;
    }

    return tasks.filter((task) => task.tags.some((tag) => tag._id === selectedTagId));
  }, [selectedTagId, tasks]);

  const handleNewTask = async () => {
    if (!activeProject) {
      return;
    }

    const task = await createTask({
      title: 'New task',
      description: '',
      status: activeProject.columns[0]?.id ?? 'todo',
    });
    setSelectedTaskId(task._id);
  };

  const handleQuickAdd = async (status: string, title: string) => {
    await createTask({ title, status });
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
  };

  const handleNewProject = async () => {
    const name = window.prompt('Project name', 'Untitled project');
    if (!name?.trim()) {
      return;
    }

    await createProject(name.trim());
  };

  const handleDeleteProject = async (projectId: string) => {
    await deleteProject(projectId);
    setSelectedTaskId(null);
  };

  return (
    <div className="app-shell">
      <Header
        projects={projects}
        activeProject={activeProject}
        tags={tags}
        selectedTagId={selectedTagId}
        onSelectTag={setSelectedTagId}
        onSelectProject={(id) => {
          setSelectedTaskId(null);
          setActiveProjectId(id);
        }}
        onNewTask={() => void handleNewTask()}
        onManageTags={() => setIsTagManagerOpen(true)}
        onOpenProjectSettings={() => setIsProjectSettingsOpen(true)}
        onNewProject={() => void handleNewProject()}
      />

      {error ? <div className="app-banner app-banner--error">{error}</div> : null}
      {loading ? <div className="app-banner">Loading inkboard…</div> : null}

      <Board
        columns={activeProject?.columns ?? []}
        tasks={filteredTasks}
        allTasks={tasks}
        onOpenTask={setSelectedTaskId}
        onQuickAdd={(status, title) => void handleQuickAdd(status, title)}
        onMoveTask={(nextTasks, updates) => void moveTask(nextTasks, updates)}
        onDeleteTask={(taskId) => void handleDeleteTask(taskId)}
      />

      <TaskModal
        task={selectedTask}
        tags={tags}
        columns={activeProject?.columns ?? []}
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTaskId(null)}
        onSave={(taskId, data) => updateTask(taskId, data)}
        onDelete={(taskId) => handleDeleteTask(taskId)}
        onAddSketch={(taskId, imageData) => addSketch(taskId, imageData)}
        onDeleteSketch={(taskId, sketchId) => deleteSketch(taskId, sketchId)}
        onOpenTagManager={() => setIsTagManagerOpen(true)}
      />

      {activeProject ? (
        <ProjectSettings
          project={activeProject}
          isOpen={isProjectSettingsOpen}
          onClose={() => setIsProjectSettingsOpen(false)}
          onUpdate={updateProject}
          onDelete={handleDeleteProject}
          canDelete={projects.length > 1}
        />
      ) : null}

      <TagManager
        isOpen={isTagManagerOpen}
        tags={tags}
        onClose={() => setIsTagManagerOpen(false)}
        onCreateTag={(name, color) => createTag(name, color)}
        onDeleteTag={(id) => deleteTag(id)}
      />
    </div>
  );
};

export default App;
