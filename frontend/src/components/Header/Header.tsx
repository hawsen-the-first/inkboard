import { Project, Tag } from '../../types';
import './Header.css';

interface HeaderProps {
  projects: Project[];
  activeProject: Project | null;
  tags: Tag[];
  selectedTagId: string;
  onSelectTag: (id: string) => void;
  onSelectProject: (id: string) => void;
  onNewTask: () => void;
  onManageTags: () => void;
  onOpenProjectSettings: () => void;
  onNewProject: () => void;
}

export const Header = ({
  projects,
  activeProject,
  tags,
  selectedTagId,
  onSelectTag,
  onSelectProject,
  onNewTask,
  onManageTags,
  onOpenProjectSettings,
  onNewProject,
}: HeaderProps) => {
  return (
    <header className="header">
      <div className="header__brand">Inkboard</div>

      <div className="header__group header__group--project">
        <select
          value={activeProject?._id ?? ''}
          onChange={(event) => onSelectProject(event.target.value)}
          aria-label="Select project"
        >
          {projects.map((project) => (
            <option key={project._id} value={project._id}>
              {project.name}
            </option>
          ))}
        </select>
        <button type="button" className="header__icon" onClick={onOpenProjectSettings} aria-label="Open project settings">
          ⚙️
        </button>
      </div>

      <div className="header__group header__group--filters">
        <select value={selectedTagId} onChange={(event) => onSelectTag(event.target.value)} aria-label="Filter by tag">
          <option value="all">All tags</option>
          {tags.map((tag) => (
            <option key={tag._id} value={tag._id}>
              {tag.name}
            </option>
          ))}
        </select>
        <button type="button" className="header__secondary" onClick={onManageTags}>
          Tags
        </button>
      </div>

      <div className="header__actions">
        <button type="button" className="header__secondary" onClick={onNewProject}>
          New project
        </button>
        <button type="button" className="header__primary" onClick={onNewTask}>
          ＋ New task
        </button>
      </div>
    </header>
  );
};
