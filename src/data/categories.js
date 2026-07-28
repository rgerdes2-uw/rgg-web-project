export const CATEGORIES_KEY = 'budget-tracker-categories';

const DEFAULT_CATEGORY_NAMES = [
  'Food',
  'Housing',
  'Transportation',
  'Utilities',
  'Health',
  'Entertainment',
  'Shopping',
  'Other',
];

const DEFAULT_COLORS = [
  '#d97706',
  '#7c3aed',
  '#2563eb',
  '#0891b2',
  '#dc2626',
  '#db2777',
  '#4f46e5',
  '#64748b',
];

function categoryId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const INCOME_CATEGORY = {
  id: 'income',
  name: 'Income',
  color: '#24855b',
  budgetLimit: null,
  period: null,
  isIncome: true,
};

export const DEFAULT_CATEGORIES = DEFAULT_CATEGORY_NAMES.map((name, index) => ({
  id: categoryId(name),
  name,
  color: DEFAULT_COLORS[index],
  budgetLimit: 0,
  period: 'monthly',
  isIncome: false,
}));

export function loadCategories() {
  try {
    const stored = JSON.parse(localStorage.getItem(CATEGORIES_KEY));
    const normalized = Array.isArray(stored)
      ? stored.map((category, index) =>
          typeof category === 'string'
            ? {
                id: categoryId(category),
                name: category,
                color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
                budgetLimit: 0,
                period: 'monthly',
                isIncome: category === 'Income',
              }
            : category,
        )
      : DEFAULT_CATEGORIES;

    const withoutIncome = normalized.filter(
      (category) => category.name !== 'Income',
    );
    return [...withoutIncome, INCOME_CATEGORY];
  } catch {
    return [...DEFAULT_CATEGORIES, INCOME_CATEGORY];
  }
}

export function saveCategories(categories) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function getCategoryTextColor(hexColor) {
  const hex = hexColor.replace('#', '');
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;
  return luminance > 155 ? '#332a32' : '#ffffff';
}

export function formatBudgetPeriod(period) {
  return {
    weekly: 'week',
    monthly: 'month',
    quarterly: 'quarter',
    yearly: 'year',
  }[period] ?? period;
}
