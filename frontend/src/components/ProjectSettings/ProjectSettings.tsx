import { useEffect, useMemo, useState } from 'react';
import { Column, Project } from '../../types';
import './ProjectSettings.css';

interface ProjectSettingsProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: { name?: string; columns?: Column[] }) => Promise<Project>;
  onDelete: (id: string) => Promise<void>;
  canDelete: boolean;
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'column'
  );
}

const getUniqueColumnId = (label: string, existingIds: string[]) => {
  const base = slugify(label);
  const ids = new Set(existingIds);
  let candidate = base;
  let counter = 2;

  while (ids.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
};

export const ProjectSettings = ({ project, isOpen, onClose, onUpdate, onDelete, canDelete }: ProjectSettingsProps) => {
  const [name, setName] = useState(project.name);
  const [columns, setColumns] = useState<Column[]>(project.columns);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName(project.name);
    setColumns(project.columns);
    setError(null);
    setIsSaving(false);
  }, [isOpen, project]);

  const canRemoveColumns = columns.length > 2;
  const canAddColumns = columns.length < 8;
  const nextNewColumnId = useMemo(
    () => getUniqueColumnId('New Column', columns.map((column) => column.id)),
    [columns],
  );

  if (!isOpen) {
    return null;
  }

  const handleSave = async () => {
    const trimmedName = name.trim();
    const normalizedColumns = columns.map((column) => ({ ...column, label: column.label.trim(), id: column.id.trim() }));

    if (!trimmedName) {
      setError('Project name is required.');
      return;
    }

    if (normalizedColumns.length < 2 || normalizedColumns.length > 8) {
      setError('Projects need between 2 and 8 columns.');
      return;
    }

    if (normalizedColumns.some((column) => !column.label || !column.id)) {
      setError('Each column needs a name.');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(project._id, { name: trimmedName, columns: normalizedColumns });
      onClose();
    } catch {
      setError('Unable to save project settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || !window.confirm(`Delete project “${project.name}”?`)) {
      return;
    }

    try {
      await onDelete(project._id);
      onClose();
    } catch {
      setError('Unable to delete project.');
    }
  };

  return (
    <div className="project-settings__overlay" role="dialog" aria-modal="true">
      <div className="project-settings">
        <div className="project-settings__header">
          <h2>Project Settings</h2>
          <button type="button" className="project-settings__close" onClick={onClose} aria-label="Close project settings">
            ×
          </button>
        </div>

        <label className="project-settings__field">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" />
        </label>

        <section className="project-settings__section">
          <div className="project-settings__section-header">
            <span>Columns</span>
            <button
              type="button"
              className="project-settings__secondary"
              onClick={() =>
                setColumns((current) => [...current, { id: nextNewColumnId, label: 'New Column' }])
              }
              disabled={!canAddColumns}
            >
              ＋ Add column
            </button>
          </div>

          <div className="project-settings__columns">
            {columns.map((column) => (
              <div key={column.id} className="project-settings__column-row">
                <input
                  value={column.label}
                  onChange={(event) =>
                    setColumns((current) =>
                      current.map((item) =>
                        item.id === column.id ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                  placeholder="Column name"
                />
                <button
                  type="button"
                  className="project-settings__remove"
                  onClick={() => setColumns((current) => current.filter((item) => item.id !== column.id))}
                  disabled={!canRemoveColumns}
                  aria-label={`Remove ${column.label}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>

        {error ? <div className="project-settings__error">{error}</div> : null}

        <div className="project-settings__actions">
          {canDelete ? (
            <button type="button" className="project-settings__danger" onClick={() => void handleDelete()}>
              Delete project
            </button>
          ) : (
            <span className="project-settings__note">At least one project must remain.</span>
          )}
          <button type="button" className="project-settings__primary" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};
