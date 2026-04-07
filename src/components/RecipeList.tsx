import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { Recipe } from '../types';
import RecipeEditor from './RecipeEditor';
import { useData } from '../store/DataContext';

export default function RecipeList() {
  const { recipes, ingredients, upsertRecipe, removeRecipe } = useData();
  const location = useLocation();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (recipe: Recipe) => {
    setEditing(recipe);
    setEditorOpen(true);
  };

  useEffect(() => {
    const id = (location.state as { editRecipeId?: string } | null)?.editRecipeId;
    if (!id || !recipes.length) return;
    const recipe = recipes.find((r) => r.id === id);
    if (recipe) openEdit(recipe);
  }, [location.state, recipes]);

  const handleSave = async (recipe: Recipe) => {
    await upsertRecipe(recipe);
    setEditorOpen(false);
  };

  const handleDelete = async (recipe: Recipe) => {
    const confirmed = window.confirm(`Delete ${recipe.name}?`);
    if (!confirmed) return;
    await removeRecipe(recipe.id);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Recipes</h2>
          <p>Manage recipes and their ingredients.</p>
        </div>
        <button type="button" onClick={openNew}>
          Add recipe
        </button>
      </div>
      <div className="card">
        {recipes && recipes.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Ingredients</th>
                <th>Steps</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((recipe) => (
                <tr key={recipe.id}>
                  <td>{recipe.name}</td>
                  <td>{recipe.ingredients.length}</td>
                  <td>{recipe.steps.length}</td>
                  <td className="actions">
                    <button type="button" className="ghost" onClick={() => openEdit(recipe)}>
                      Edit
                    </button>
                    <button type="button" className="ghost danger" onClick={() => handleDelete(recipe)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">No recipes yet. Add your first recipe.</p>
        )}
      </div>
      <RecipeEditor
        isOpen={editorOpen}
        initial={editing}
        ingredients={ingredients}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
