import React, { useEffect, useRef, useState } from 'react';
import type { Ingredient } from '../types';
import { createId } from '../utils/uuid';
import { toTitleCase } from '../utils/string';
import Modal from './Modal';

interface IngredientEditorProps {
  isOpen: boolean;
  initial?: Ingredient | null;
  onClose: () => void;
  onSave: (ingredient: Ingredient) => void;
}

export default function IngredientEditor({ isOpen, initial, onClose, onSave }: IngredientEditorProps) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name ?? '');
    setUnit(initial?.unit ?? '');
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [isOpen, initial]);

  const canSave = name.trim().length > 0 && unit.trim().length > 0;

  return (
    <Modal
      title={initial ? 'Edit ingredient' : 'Add ingredient'}
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!canSave) return;
              onSave({
                id: initial?.id ?? createId(),
                name: toTitleCase(name.trim()),
                unit: unit.trim()
              });
            }}
            disabled={!canSave}
          >
            Save
          </button>
        </div>
      }
    >
      <div className="form-grid">
        <label>
          Name
          <input ref={nameInputRef} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Default unit
          <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="e.g. g, oz, tbsp" />
        </label>
      </div>
    </Modal>
  );
}
