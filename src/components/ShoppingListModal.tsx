import type { ShoppingItem } from '../types';
import Modal from './Modal';

interface ShoppingListModalProps {
  isOpen: boolean;
  items: ShoppingItem[];
  onClose: () => void;
  onGoToRecipe: (recipeId: string) => void;
}

export default function ShoppingListModal({ isOpen, items, onClose, onGoToRecipe }: ShoppingListModalProps) {
  return (
    <Modal
      title="Shopping list"
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      {items.length === 0 ? (
        <p>No meals planned for this week.</p>
      ) : (
        <ul className="shopping-list">
          {items.map((item) => (
            <li key={`${item.ingredientId}-${item.unit}`}>
              <div className="shopping-list-item">
                <div className="shopping-list-main">
                  <span>{item.name}</span>
                  <span>
                    {item.quantity} {item.unit}
                  </span>
                </div>
                {item.sources.length > 0 && (
                  <div className="shopping-list-sources">
                    {item.sources.map((source) => (
                      <button
                        key={source.recipeId}
                        type="button"
                        className="recipe-chip"
                        onClick={() => onGoToRecipe(source.recipeId)}
                      >
                        {source.recipeName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
