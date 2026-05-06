import { FormEvent, useState } from 'react';
import { TAG_COLORS, Tag } from '../../types';
import './TagManager.css';

interface TagManagerProps {
  isOpen: boolean;
  tags: Tag[];
  onClose: () => void;
  onCreateTag: (name: string, color: string) => Promise<Tag>;
  onDeleteTag: (id: string) => Promise<void>;
}

export const TagManager = ({ isOpen, tags, onClose, onCreateTag, onDeleteTag }: TagManagerProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    await onCreateTag(name.trim(), color);
    setName('');
    setColor(TAG_COLORS[0]);
  };

  return (
    <div className="tag-manager__overlay" role="dialog" aria-modal="true">
      <div className="tag-manager">
        <div className="tag-manager__header">
          <h2>Manage tags</h2>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="tag-manager__form" onSubmit={handleSubmit}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Tag name" />
          <div className="tag-manager__palette">
            {TAG_COLORS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={`tag-manager__swatch ${color === swatch ? 'tag-manager__swatch--active' : ''}`}
                style={{ background: swatch }}
                onClick={() => setColor(swatch)}
                aria-label={`Choose ${swatch}`}
              />
            ))}
          </div>
          <button type="submit" className="tag-manager__create">
            Create tag
          </button>
        </form>

        <div className="tag-manager__list">
          {tags.map((tag) => (
            <div key={tag._id} className="tag-manager__item">
              <div className="tag-manager__tag-info">
                <span className="tag-manager__tag-color" style={{ background: tag.color }} />
                <span>{tag.name}</span>
              </div>
              <button type="button" onClick={() => void onDeleteTag(tag._id)}>
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
