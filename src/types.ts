export interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  steps: string[];
}

export interface MealBlock {
  id: string;
  recipeId: string;
  startDayIndex: number; // 0-6, Monday = 0
  durationDays: number; // 1-7, constrained to fit within week
}

export interface Pattern {
  id: string;
  name: string;
  mealBlocks: MealBlock[];
}

export interface Settings {
  id: string; // singleton id: "settings"
  patternStartDate: string; // ISO date string (YYYY-MM-DD)
  patternOrder: string[];
}

export interface DayMealEntry {
  blockId: string;
  recipeId: string;
  isLeftoverDay: boolean;
  dayOffset: number; // 0 = cook day, 1 = first leftover day, etc.
}

export interface ShoppingItem {
  ingredientId: string;
  name: string;
  unit: string;
  quantity: number;
  sources: { recipeId: string; recipeName: string }[];
}

export interface WeekOverride {
  weekStartDate: string; // ISO date (YYYY-MM-DD) of the Monday for that week
  mealBlocks: MealBlock[];
}
