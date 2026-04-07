import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Ingredient, Recipe, RecipeIngredient } from '../types';
import Modal from './Modal';
import { createId } from '../utils/uuid';
import { useData } from '../store/DataContext';

interface RecipeEditorProps {
  isOpen: boolean;
  ingredients: Ingredient[];
  initial?: Recipe | null;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
}

export default function RecipeEditor({
  isOpen,
  ingredients,
  initial,
  onClose,
  onSave
}: RecipeEditorProps) {
  interface ComboState {
    isOpen: boolean;
    query: string;
    highlightedIndex: number;
    createMode: boolean;
    newIngredientName: string;
    newIngredientUnit: string;
  }

  const { upsertIngredient } = useData();

  const [name, setName] = useState('');
  const [items, setItems] = useState<RecipeIngredient[]>([]);
  const [stepsText, setStepsText] = useState('');
  const [comboStates, setComboStates] = useState<Record<number, ComboState>>({});
  const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null);
  const [pendingCreateFocusIndex, setPendingCreateFocusIndex] = useState<number | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const ingredientInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const quantityInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const newIngredientUnitRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const comboboxWrapperRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const ingredientMap = useMemo(() => new Map(ingredients.map((item) => [item.id, item])), [ingredients]);

  useEffect(() => {
    if (!isOpen) return;
    setName(initial?.name ?? '');
    setItems(initial?.ingredients ?? []);
    setStepsText(initial?.steps?.join('\n') ?? '');
    setComboStates({});
    setPendingFocusIndex(null);
    ingredientInputRefs.current = {};
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [isOpen, initial]);

  useEffect(() => {
    if (pendingFocusIndex === null) return;
    const input = ingredientInputRefs.current[pendingFocusIndex];
    if (!input) return;
    input.focus();
    setComboState(pendingFocusIndex, { isOpen: true });
    setPendingFocusIndex(null);
  }, [pendingFocusIndex]);

  useEffect(() => {
    if (pendingCreateFocusIndex === null) return;
    const input = newIngredientUnitRefs.current[pendingCreateFocusIndex];
    if (!input) return;
    input.focus();
    setPendingCreateFocusIndex(null);
  }, [pendingCreateFocusIndex]);

  const handleAddItem = () => {
    const nextIndex = items.length;
    setItems((prev) => [
      ...prev,
      {
        ingredientId: '',
        quantity: 1,
        unit: ''
      }
    ]);
    setPendingFocusIndex(nextIndex);
  };

  const updateItem = (index: number, updates: Partial<RecipeIngredient>) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return { ...item, ...updates };
      })
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    setComboStates((prev) => {
      const next: Record<number, ComboState> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const parsed = Number(key);
        if (parsed < index) next[parsed] = value;
        if (parsed > index) next[parsed - 1] = value;
      });
      return next;
    });
  };

  const getIngredientName = (ingredientId: string) => ingredientMap.get(ingredientId)?.name ?? '';

  const setComboState = (index: number, nextState: Partial<ComboState>) => {
    setComboStates((prev) => {
      const previous = prev[index] ?? {
        isOpen: false,
        query: getIngredientName(items[index]?.ingredientId ?? ''),
        highlightedIndex: 0,
        createMode: false,
        newIngredientName: '',
        newIngredientUnit: ''
      };
      return {
        ...prev,
        [index]: { ...previous, ...nextState }
      };
    });
  };

  const selectIngredient = (index: number, ingredient: Ingredient) => {
    updateItem(index, {
      ingredientId: ingredient.id,
      unit: ingredient.unit
    });
    setComboState(index, {
      isOpen: false,
      query: ingredient.name,
      highlightedIndex: 0,
      createMode: false,
      newIngredientName: '',
      newIngredientUnit: ''
    });
  };

  const handleCreateIngredient = async (index: number, name: string, unit: string) => {
    const newIngredient: Ingredient = { id: createId(), name: name.trim(), unit: unit.trim() };
    try {
      await upsertIngredient(newIngredient);
    } catch {
      alert('Failed to create ingredient. Please try again.');
      return;
    }
    selectIngredient(index, newIngredient);
    setTimeout(() => {
      quantityInputRefs.current[index]?.focus();
    }, 0);
  };

  const canSave = name.trim().length > 0;

  const getDropdownStyle = (index: number): React.CSSProperties | null => {
    const wrapper = comboboxWrapperRefs.current[index];
    if (!wrapper) return null;
    const rect = wrapper.getBoundingClientRect();
    return { position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, right: 'auto', zIndex: 50 };
  };

  return (
    <Modal
      title={initial ? 'Edit recipe' : 'Add recipe'}
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
              const steps = stepsText
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);
              onSave({
                id: initial?.id ?? createId(),
                name: name.trim(),
                ingredients: items,
                steps
              });
            }}
            disabled={!canSave}
          >
            Save
          </button>
        </div>
      }
    >
      <div
        className="recipe-editor-scroll"
        onScroll={() =>
          setComboStates((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((k) => {
              next[Number(k)] = { ...next[Number(k)], isOpen: false };
            });
            return next;
          })
        }
      >
      <div className="form-grid">
        <label>
          Name
          <input ref={nameInputRef} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
      </div>
      <div className="detail-section">
        <div className="section-header">
          <h4>Ingredients</h4>
          <button type="button" className="ghost" onClick={handleAddItem}>
            Add ingredient
          </button>
        </div>
        {items.length === 0 ? (
          <p className="empty-state">No ingredients added.</p>
        ) : (
          <div className="ingredient-editor">
            {items.map((item, index) => {
              const ingredient = ingredientMap.get(item.ingredientId);
              const ingredientName = ingredient?.name ?? '';
              const comboState = comboStates[index] ?? {
                isOpen: false,
                query: ingredientName,
                highlightedIndex: 0,
                createMode: false,
                newIngredientName: '',
                newIngredientUnit: ''
              };
              const query = comboState.isOpen ? comboState.query : ingredientName;
              const normalizedQuery = comboState.query.trim().toLowerCase();
              const filteredIngredients = normalizedQuery
                ? ingredients.filter((option) => option.name.toLowerCase().includes(normalizedQuery))
                : ingredients;
              const showCreateOption = normalizedQuery.length > 0;
              const createOptionIndex = filteredIngredients.length;
              const totalOptions = filteredIngredients.length + (showCreateOption ? 1 : 0);
              const highlightedIndex =
                totalOptions === 0
                  ? -1
                  : Math.min(comboState.highlightedIndex, totalOptions - 1);
              const listboxId = `ingredient-listbox-${index}`;
              const activeDescendantId =
                highlightedIndex >= 0 ? `ingredient-option-${index}-${highlightedIndex}` : undefined;

              return (
                <div key={`${item.ingredientId}-${index}`} className="ingredient-row">
                  <div
                    className="ingredient-combobox"
                    ref={(el) => { comboboxWrapperRefs.current[index] = el; }}
                    onBlur={(event) => {
                      if ((event.currentTarget as HTMLDivElement).contains(event.relatedTarget as Node)) return;
                      setComboState(index, {
                        isOpen: false,
                        query: ingredientName,
                        highlightedIndex: 0,
                        createMode: false,
                        newIngredientName: '',
                        newIngredientUnit: ''
                      });
                    }}
                  >
                    <input
                      ref={(element) => {
                        ingredientInputRefs.current[index] = element;
                      }}
                      className="ingredient-combobox-input"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={comboState.isOpen}
                      aria-controls={listboxId}
                      aria-activedescendant={activeDescendantId}
                      value={query}
                      onFocus={() =>
                        setComboState(index, {
                          isOpen: true,
                          query: ingredientName,
                          highlightedIndex: Math.max(
                            0,
                            filteredIngredients.findIndex((option) => option.id === item.ingredientId)
                          )
                        })
                      }
                      onChange={(event) =>
                        setComboState(index, {
                          isOpen: true,
                          query: event.target.value,
                          highlightedIndex: 0
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          if (!comboState.isOpen) {
                            setComboState(index, { isOpen: true });
                            return;
                          }
                          if (totalOptions === 0) return;
                          setComboState(index, {
                            highlightedIndex: Math.min(
                              Math.max(0, comboState.highlightedIndex) + 1,
                              totalOptions - 1
                            )
                          });
                        }
                        if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          if (!comboState.isOpen) {
                            setComboState(index, { isOpen: true });
                            return;
                          }
                          if (totalOptions === 0) return;
                          setComboState(index, {
                            highlightedIndex: Math.max(0, comboState.highlightedIndex - 1)
                          });
                        }
                        if (event.key === 'Enter') {
                          if (!comboState.isOpen) return;
                          event.preventDefault();
                          if (showCreateOption && highlightedIndex === createOptionIndex) {
                            setComboState(index, {
                              createMode: true,
                              newIngredientName: comboState.query.trim()
                            });
                            setPendingCreateFocusIndex(index);
                            return;
                          }
                          const selected = filteredIngredients[highlightedIndex];
                          if (!selected) return;
                          selectIngredient(index, selected);
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setComboState(index, {
                            isOpen: false,
                            query: ingredientName,
                            highlightedIndex: 0
                          });
                        }
                      }}
                    />
                    {comboState.isOpen
                      ? createPortal(
                          comboState.createMode ? (
                            <div className="ingredient-combobox-list ingredient-create-form" style={getDropdownStyle(index) ?? {}}>
                              <p className="ingredient-create-label">New ingredient</p>
                              <div className="ingredient-create-fields">
                                <input
                                  value={comboState.newIngredientName}
                                  placeholder="Name"
                                  onChange={(event) => setComboState(index, { newIngredientName: event.target.value })}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      event.preventDefault();
                                      const name = comboState.newIngredientName.trim();
                                      const unit = comboState.newIngredientUnit.trim();
                                      if (name && unit) {
                                        void handleCreateIngredient(index, name, unit);
                                      } else {
                                        // Advance focus to unit field
                                        newIngredientUnitRefs.current[index]?.focus();
                                      }
                                    }
                                    if (event.key === 'Escape') {
                                      event.preventDefault();
                                      setComboState(index, { createMode: false, newIngredientName: '', newIngredientUnit: '' });
                                    }
                                  }}
                                />
                                <input
                                  ref={(element) => { newIngredientUnitRefs.current[index] = element; }}
                                  value={comboState.newIngredientUnit}
                                  placeholder="Unit (e.g. g, tbsp)"
                                  onChange={(event) => setComboState(index, { newIngredientUnit: event.target.value })}
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      const name = comboState.newIngredientName.trim();
                                      const unit = comboState.newIngredientUnit.trim();
                                      if (name && unit) void handleCreateIngredient(index, name, unit);
                                    }
                                    if (event.key === 'Escape') {
                                      event.preventDefault();
                                      setComboState(index, { createMode: false, newIngredientName: '', newIngredientUnit: '' });
                                    }
                                  }}
                                />
                              </div>
                              <div className="ingredient-create-actions">
                                <button
                                  type="button"
                                  className="ghost"
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    setComboState(index, { createMode: false, newIngredientName: '', newIngredientUnit: '' });
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={!comboState.newIngredientName.trim() || !comboState.newIngredientUnit.trim()}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    const name = comboState.newIngredientName.trim();
                                    const unit = comboState.newIngredientUnit.trim();
                                    if (name && unit) void handleCreateIngredient(index, name, unit);
                                  }}
                                >
                                  Create
                                </button>
                              </div>
                            </div>
                          ) : (
                            <ul id={listboxId} role="listbox" className="ingredient-combobox-list" style={getDropdownStyle(index) ?? {}}>
                              {filteredIngredients.map((option, optionIndex) => (
                                <li
                                  key={option.id}
                                  id={`ingredient-option-${index}-${optionIndex}`}
                                  role="option"
                                  aria-selected={optionIndex === highlightedIndex}
                                  className={optionIndex === highlightedIndex ? 'is-active' : undefined}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    selectIngredient(index, option);
                                  }}
                                >
                                  {option.name}
                                </li>
                              ))}
                              {showCreateOption && (
                                <li
                                  id={`ingredient-option-${index}-${createOptionIndex}`}
                                  role="option"
                                  aria-selected={highlightedIndex === createOptionIndex}
                                  className={`ingredient-combobox-create${highlightedIndex === createOptionIndex ? ' is-active' : ''}`}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    setComboState(index, {
                                      createMode: true,
                                      newIngredientName: comboState.query.trim()
                                    });
                                    setPendingCreateFocusIndex(index);
                                  }}
                                >
                                  Create "{comboState.query.trim()}"
                                </li>
                              )}
                            </ul>
                          ),
                          document.body
                        )
                      : null}
                  </div>
                  <input
                    ref={(element) => { quantityInputRefs.current[index] = element; }}
                    type="number"
                    min={0}
                    step="0.1"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                  />
                  <input
                    value={item.unit}
                    onChange={(event) => updateItem(index, { unit: event.target.value })}
                    placeholder={ingredient?.unit ?? 'unit'}
                  />
                  <button type="button" className="ghost danger" onClick={() => removeItem(index)}>
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="detail-section recipe-steps-section">
        <h4>Steps</h4>
        <textarea
          className="recipe-steps-textarea"
          rows={6}
          value={stepsText}
          onChange={(event) => setStepsText(event.target.value)}
          placeholder="One step per line"
        />
      </div>
      </div>
    </Modal>
  );
}
