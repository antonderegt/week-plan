import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { MealBlock } from '../types';
import { addDays, addWeeks, formatWeekRange, getWeekStart } from '../utils/date';
import {
  aggregateShoppingList,
  expandMealBlocks,
  getPatternById,
  resolvePatternIdForWeek
} from '../utils/meal';
import { createId } from '../utils/uuid';
import MealAssignModal from './MealAssignModal';
import MealDetailModal from './MealDetailModal';
import ShoppingListModal from './ShoppingListModal';
import { useData } from '../store/DataContext';

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function WeekView() {
  const { recipes, ingredients, patterns, settings, weekOverrides, loading, upsertPattern, upsertWeekOverride, removeWeekOverride } = useData();

  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [assignDayIndex, setAssignDayIndex] = useState<number | null>(null);
  const [detailBlockId, setDetailBlockId] = useState<string | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);

  const baseDate = addWeeks(new Date(), weekOffset);
  const weekStart = getWeekStart(baseDate);
  const weekLabel = formatWeekRange(weekStart);
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  const resolvedRecipes = recipes ?? [];
  const resolvedIngredients = ingredients ?? [];
  const resolvedPatterns = patterns ?? [];
  const patternId = settings ? resolvePatternIdForWeek(baseDate, settings) : null;
  const pattern = patternId ? getPatternById(resolvedPatterns, patternId) : null;

  const weekOverride = weekOverrides.find((o) => o.weekStartDate === weekStartIso) ?? null;
  const activeMealBlocks = weekOverride ? weekOverride.mealBlocks : (pattern?.mealBlocks ?? []);
  const dayMap = expandMealBlocks(activeMealBlocks);

  const detailBlock = detailBlockId
    ? activeMealBlocks.find((block) => block.id === detailBlockId) ?? null
    : null;

  const detailDurationDays = detailBlock?.durationDays ?? 1;
  const detailMaxDuration = detailBlock ? 7 - detailBlock.startDayIndex : 1;

  const handleAddMeal = (dayIndex: number) => {
    setAssignDayIndex(dayIndex);
  };

  const handleAssignMeal = (recipeId: string, duration: number) => {
    if (assignDayIndex === null) return;
    void saveMealBlock(assignDayIndex, recipeId, duration, []);
    setAssignDayIndex(null);
  };

  const saveMealBlock = async (
    startDayIndex: number,
    recipeId: string,
    durationDays: number,
    removeBlocks: MealBlock[]
  ) => {
    const nextBlocks = activeMealBlocks.filter(
      (block) => !removeBlocks.some((remove) => remove.id === block.id)
    );
    nextBlocks.push({ id: createId(), recipeId, startDayIndex, durationDays });

    if (weekOverride) {
      await upsertWeekOverride({ ...weekOverride, mealBlocks: nextBlocks });
    } else if (pattern) {
      await upsertPattern({ ...pattern, mealBlocks: nextBlocks });
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    const nextBlocks = activeMealBlocks.filter((block) => block.id !== blockId);
    if (weekOverride) {
      await upsertWeekOverride({ ...weekOverride, mealBlocks: nextBlocks });
    } else if (pattern) {
      await upsertPattern({ ...pattern, mealBlocks: nextBlocks });
    }
    setDetailBlockId(null);
  };

  const handleChangeDuration = async (newDuration: number) => {
    if (!detailBlock) return;
    const maxPossible = 7 - detailBlock.startDayIndex;
    const clamped = Math.max(1, Math.min(newDuration, maxPossible));
    const nextBlocks = activeMealBlocks.map((b) =>
      b.id === detailBlock.id ? { ...b, durationDays: clamped } : b
    );
    if (weekOverride) {
      await upsertWeekOverride({ ...weekOverride, mealBlocks: nextBlocks });
    } else if (pattern) {
      await upsertPattern({ ...pattern, mealBlocks: nextBlocks });
    }
  };

  const handleCustomizeWeek = async () => {
    await upsertWeekOverride({ weekStartDate: weekStartIso, mealBlocks: activeMealBlocks.map((b) => ({ ...b })) });
  };

  const handleResetToPattern = async () => {
    await removeWeekOverride(weekStartIso);
  };

  // Drag and drop — only active when weekOverride is set
  const handleDragStart = (blockId: string) => {
    setDragBlockId(blockId);
  };

  const handleDragEnd = () => {
    setDragBlockId(null);
  };

  const handleDrop = async (targetDayIndex: number) => {
    if (dragBlockId === null || !weekOverride) return;

    const sourceBlock = weekOverride.mealBlocks.find((b) => b.id === dragBlockId);
    if (!sourceBlock || sourceBlock.startDayIndex === targetDayIndex) return;

    const nextBlocks = weekOverride.mealBlocks.map((b) =>
      b.id === sourceBlock.id ? { ...b, startDayIndex: targetDayIndex } : b
    );

    setDragBlockId(null);
    await upsertWeekOverride({ ...weekOverride, mealBlocks: nextBlocks });
  };

  const shoppingItems = useMemo(() => {
    return aggregateShoppingList(activeMealBlocks, resolvedRecipes, resolvedIngredients);
  }, [activeMealBlocks, resolvedRecipes, resolvedIngredients]);

  if (loading) {
    return <div className="page">Loading week view...</div>;
  }

  if (!pattern && !weekOverride) {
    return (
      <div className="page">
        <div className="card">
          <h3>Set your pattern start date</h3>
          <p>Go to Settings to define the Week A start date so the app can pick the right pattern.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>Week view</h2>
          <p>
            {weekLabel}
            {weekOverride ? (
              <> &ndash; <span className="week-override-badge">Custom week</span></>
            ) : (
              <> &ndash; Pattern: {pattern?.name ?? 'Unknown'}</>
            )}
          </p>
        </div>
        <div className="week-actions">
          <button type="button" className="ghost" aria-label="Previous week" onClick={() => setWeekOffset((prev) => prev - 1)}>
            Previous week
          </button>
          <button type="button" className="ghost" onClick={() => setWeekOffset(0)}>
            Today
          </button>
          <button type="button" className="ghost" aria-label="Next week" onClick={() => setWeekOffset((prev) => prev + 1)}>
            Next week
          </button>
          {weekOverride ? (
            <button type="button" className="ghost" onClick={() => void handleResetToPattern()}>
              Reset to pattern
            </button>
          ) : (
            <button type="button" className="ghost" onClick={() => void handleCustomizeWeek()}>
              Customize this week
            </button>
          )}
          <button type="button" onClick={() => setShoppingOpen(true)}>
            Generate shopping list
          </button>
        </div>
        <div className="mobile-week-nav">
          <button type="button" className="ghost" aria-label="Previous week" onClick={() => setWeekOffset((prev) => prev - 1)}>
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" className="ghost" aria-label="Shopping list" onClick={() => setShoppingOpen(true)}>
            <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          </button>
          <button type="button" className="ghost" aria-label="Next week" onClick={() => setWeekOffset((prev) => prev + 1)}>
            <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      <div className="week-grid">
        {dayNames.map((label, index) => {
          const dayDate = addDays(weekStart, index);
          const dayEntries = dayMap[index] ?? [];
          const isDragOver = dragBlockId !== null;
          return (
            <div
              key={label}
              className={`day-card${isDragOver ? ' drag-over' : ''}`}
              onDragOver={weekOverride ? (e) => { e.preventDefault(); } : undefined}
              onDrop={weekOverride ? () => void handleDrop(index) : undefined}
            >
              <div className="day-header">
                <h3>{label}</h3>
                <span className="day-date">
                  {dayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              {dayEntries.map((entry) => {
                const mealRecipe = recipes.find((recipe) => recipe.id === entry.recipeId);
                const blockDuration = activeMealBlocks.find((block) => block.id === entry.blockId)?.durationDays ?? 1;
                const subtitle = entry.isLeftoverDay
                  ? `Leftovers (day ${entry.dayOffset + 1} of ${blockDuration})`
                  : 'Cook day';
                const isDraggable = weekOverride !== null && !entry.isLeftoverDay;
                return (
                  <button
                    key={entry.blockId}
                    type="button"
                    className="meal-card"
                    draggable={isDraggable}
                    onDragStart={isDraggable ? () => handleDragStart(entry.blockId) : undefined}
                    onDragEnd={isDraggable ? handleDragEnd : undefined}
                    onClick={() => setDetailBlockId(entry.blockId)}
                  >
                    <div className="meal-title">{mealRecipe?.name ?? 'Unknown recipe'}</div>
                    <div className="meal-subtitle">{subtitle}</div>
                  </button>
                );
              })}
              <button type="button" className="ghost" onClick={() => handleAddMeal(index)}>
                Add meal
              </button>
            </div>
          );
        })}
      </div>

      <MealAssignModal
        isOpen={assignDayIndex !== null}
        dayLabel={assignDayIndex !== null ? dayNames[assignDayIndex] : ''}
        maxDuration={assignDayIndex !== null ? 7 - assignDayIndex : 1}
        recipes={recipes}
        onClose={() => setAssignDayIndex(null)}
        onSave={handleAssignMeal}
      />

      <MealDetailModal
        isOpen={detailBlockId !== null}
        recipe={detailBlock ? recipes.find((recipe) => recipe.id === detailBlock.recipeId) ?? null : null}
        ingredients={ingredients}
        durationDays={detailDurationDays}
        maxDuration={detailMaxDuration}
        onClose={() => setDetailBlockId(null)}
        onRemove={detailBlockId ? () => handleRemoveBlock(detailBlockId) : undefined}
        onChangeDuration={(days: number) => void handleChangeDuration(days)}
      />

      <ShoppingListModal
        isOpen={shoppingOpen}
        items={shoppingItems}
        onClose={() => setShoppingOpen(false)}
        onGoToRecipe={(recipeId) => {
          setShoppingOpen(false);
          navigate('/recipes', { state: { editRecipeId: recipeId } });
        }}
      />
    </div>
  );
}
