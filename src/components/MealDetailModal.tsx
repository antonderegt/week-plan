import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Ingredient, Recipe } from '../types';
import Modal from './Modal';

interface MealDetailModalProps {
  isOpen: boolean;
  recipe: Recipe | null;
  ingredients: Ingredient[];
  onClose: () => void;
  onRemove?: () => void;
  durationDays?: number;
  maxDuration?: number;
  onChangeDuration?: (days: number) => void;
}

export default function MealDetailModal({
  isOpen,
  recipe,
  ingredients,
  onClose,
  onRemove,
  durationDays,
  maxDuration,
  onChangeDuration
}: MealDetailModalProps) {
  const navigate = useNavigate();

  if (!recipe) {
    return <Modal title="Meal details" isOpen={isOpen} onClose={onClose}>No recipe selected.</Modal>;
  }

  const ingredientMap = new Map(ingredients.map((item) => [item.id, item]));

  return (
    <Modal
      title={recipe.name}
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" onClick={() => { navigate('/recipes', { state: { editRecipeId: recipe.id } }); onClose(); }}>
            Edit recipe
          </button>
          {onRemove ? (
            <button type="button" className="danger" onClick={onRemove}>
              Remove from week
            </button>
          ) : null}
        </div>
      }
    >
      <div className="modal-scroll-content">
      {onChangeDuration !== undefined && durationDays !== undefined && (
        <div className="detail-section duration-control">
          <h4>Days</h4>
          <div className="duration-stepper">
            <button type="button" onClick={() => onChangeDuration(durationDays - 1)} disabled={durationDays <= 1}>−</button>
            <span>{durationDays}</span>
            <button type="button" onClick={() => onChangeDuration(durationDays + 1)} disabled={durationDays >= (maxDuration ?? durationDays)}>+</button>
          </div>
        </div>
      )}
      <div className="detail-section">
        <h4>Ingredients</h4>
        {recipe.ingredients.length === 0 ? (
          <p>No ingredients added.</p>
        ) : (
          <ul>
            {recipe.ingredients.map((item) => {
              const ingredient = ingredientMap.get(item.ingredientId);
              const name = ingredient?.name ?? 'Unknown ingredient';
              return (
                <li key={`${item.ingredientId}-${item.unit}`}>
                  {item.quantity} {item.unit} {name}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="detail-section">
        <h4>Steps</h4>
        {recipe.steps.length === 0 ? (
          <p>No steps added.</p>
        ) : (
          <ol>
            {recipe.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        )}
      </div>
      </div>
    </Modal>
  );
}
