import type { DayMealEntry, Ingredient, MealBlock, Pattern, Recipe, Settings, ShoppingItem } from '../types';
import { fromISODate, getWeekStart } from './date.js';

export function mod(value: number, modulo: number): number {
  if (modulo === 0) return 0;
  return ((value % modulo) + modulo) % modulo;
}

export function getWeekIndex(date: Date, patternStartDate: string): number {
  const weekStart = getWeekStart(date);
  const patternStart = getWeekStart(fromISODate(patternStartDate));
  const diffMs = weekStart.getTime() - patternStart.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return diffWeeks;
}

export function resolvePatternIdForWeek(date: Date, settings: Settings): string | null {
  if (!settings.patternOrder.length || !settings.patternStartDate) return null;
  const weekIndex = getWeekIndex(date, settings.patternStartDate);
  const idx = mod(weekIndex, settings.patternOrder.length);
  return settings.patternOrder[idx] ?? null;
}

export function expandMealBlocks(mealBlocks: MealBlock[]): Record<number, DayMealEntry[]> {
  const dayMap: Record<number, DayMealEntry[]> = {};
  for (const block of mealBlocks) {
    for (let offset = 0; offset < block.durationDays; offset += 1) {
      const dayIndex = block.startDayIndex + offset;
      if (dayIndex < 0 || dayIndex > 6) continue;
      if (!dayMap[dayIndex]) dayMap[dayIndex] = [];
      dayMap[dayIndex].push({
        blockId: block.id,
        recipeId: block.recipeId,
        isLeftoverDay: offset > 0,
        dayOffset: offset
      });
    }
  }
  return dayMap;
}

export function findConflicts(
  mealBlocks: MealBlock[],
  startDayIndex: number,
  durationDays: number
): MealBlock[] {
  const newStart = startDayIndex;
  const newEnd = startDayIndex + durationDays - 1;
  return mealBlocks.filter((block) => {
    const existingStart = block.startDayIndex;
    const existingEnd = block.startDayIndex + block.durationDays - 1;
    return newStart <= existingEnd && newEnd >= existingStart;
  });
}

export function aggregateShoppingList(
  mealBlocks: MealBlock[],
  recipes: Recipe[],
  ingredients: Ingredient[]
): ShoppingItem[] {
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const ingredientMap = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const totals = new Map<string, ShoppingItem>();

  for (const block of mealBlocks) {
    const recipe = recipeMap.get(block.recipeId);
    if (!recipe) continue;
    for (const item of recipe.ingredients) {
      const ingredient = ingredientMap.get(item.ingredientId);
      const name = ingredient?.name ?? 'Unknown ingredient';
      const key = `${name.toLowerCase()}::${item.unit}`;
      const existing = totals.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        if (!existing.sources.some((s) => s.recipeId === recipe.id)) {
          existing.sources.push({ recipeId: recipe.id, recipeName: recipe.name });
        }
      } else {
        totals.set(key, {
          ingredientId: item.ingredientId,
          name,
          unit: item.unit,
          quantity: item.quantity,
          sources: [{ recipeId: recipe.id, recipeName: recipe.name }]
        });
      }
    }
  }

  return Array.from(totals.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getPatternById(patterns: Pattern[], id: string | null): Pattern | null {
  if (!id) return null;
  return patterns.find((pattern) => pattern.id === id) ?? null;
}
