import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Container, Table } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import CategoryFormModal from '../components/CategoryFormModal';
import {
  getCategoryTextColor,
  loadCategories,
  saveCategories,
} from '../data/categories';

const EXPENSES_KEY = 'budget-tracker-expenses';

function formatAmount(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function loadExpenses() {
  try {
    return JSON.parse(localStorage.getItem(EXPENSES_KEY)) ?? [];
  } catch {
    return [];
  }
}

export default function Budgets() {
  const [searchParams] = useSearchParams();
  const linkedCategoryId = searchParams.get('category');
  const [categories, setCategories] = useState(loadCategories);
  const [expenses, setExpenses] = useState(loadExpenses);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);
  const budgetCategories = categories.filter((category) => !category.isIncome);

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    if (!linkedCategoryId) return;
    document
      .getElementById(`budget-category-${linkedCategoryId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [linkedCategoryId]);

  const categorySummaries = useMemo(() => {
    const today = new Date();
    const todayString = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
    const currentMonth = todayString.slice(0, 7);

    return budgetCategories.map((category) => {
      const categoryExpenses = expenses
        .filter((expense) => expense.category === category.name)
        .sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0),
        );
      const spent = categoryExpenses
        .filter(
          (expense) =>
            expense.date.startsWith(currentMonth) &&
            expense.date <= todayString,
        )
        .reduce((total, expense) => total + Number(expense.amount), 0);

      return {
        category,
        spent,
        remaining:
          Number(category.budgetLimit) > 0
            ? Number(category.budgetLimit) - spent
            : null,
        recentExpenses: categoryExpenses.slice(0, 10),
      };
    });
  }, [budgetCategories, expenses]);

  function addCategory(category) {
    setCategories((current) => [
      ...current.filter((item) => !item.isIncome),
      category,
      ...current.filter((item) => item.isIncome),
    ]);
    setShowAddCategory(false);
  }

  function openCategoryEditor(category) {
    setCategoryToEdit(category);
    setShowAddCategory(true);
  }

  function closeCategoryForm() {
    setShowAddCategory(false);
    setCategoryToEdit(null);
  }

  function saveCategory(category) {
    if (!categoryToEdit) {
      addCategory(category);
      return;
    }

    const previousName = categoryToEdit.name;
    setCategories((current) =>
      current.map((existing) =>
        existing.id === category.id ? category : existing,
      ),
    );
    if (previousName !== category.name) {
      setExpenses((current) =>
        current.map((expense) =>
          expense.category === previousName
            ? { ...expense, category: category.name }
            : expense,
        ),
      );
    }
    closeCategoryForm();
  }

  return (
    <Container className="page-shell budget-page-shell py-5">
      <div className="mb-4">
        <h1 className="mb-1">Budgets</h1>
        <p className="lead mb-0">
          Review your monthly category budgets and recent spending.
        </p>
      </div>

      {budgetCategories.length === 0 ? (
        <Alert className="expense-empty-state" variant="light">
          No budget categories yet. Create your first category below.
        </Alert>
      ) : (
        <div className="budget-card-scroll">
          {categorySummaries.map(
            ({ category, spent, remaining, recentExpenses }) => (
              <Card
                className={`budget-summary-card${
                  linkedCategoryId === category.id
                    ? ' budget-summary-linked'
                    : ''
                }`}
                id={`budget-category-${category.id}`}
                key={category.id}
                style={{ borderTopColor: category.color }}
              >
                <Card.Body>
                  <div className="budget-card-heading">
                    <span
                      className="expense-category budget-category-name"
                      style={{
                        backgroundColor: category.color,
                        color: getCategoryTextColor(category.color),
                      }}
                    >
                      {category.name}
                    </span>
                    <div className="budget-card-actions">
                      <Button
                        aria-label={`Edit ${category.name} category`}
                        className="edit-category-button"
                        size="sm"
                        title="Edit category"
                        variant="outline-secondary"
                        onClick={() => openCategoryEditor(category)}
                      >
                        <svg
                          aria-hidden="true"
                          fill="none"
                          height="16"
                          viewBox="0 0 16 16"
                          width="16"
                        >
                          <path
                            d="M11.7 1.8a1.4 1.4 0 0 1 2 2L6 11.5l-3 .7.7-3 8-7.4Z"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.4"
                          />
                        </svg>
                      </Button>
                    </div>
                  </div>

                  <div className="budget-totals">
                    <div>
                      <span>Spent</span>
                      <strong>{formatAmount(spent)}</strong>
                    </div>
                    <div>
                      <span>Remaining</span>
                      <strong
                        className={
                          remaining !== null && remaining < 0
                            ? 'budget-over'
                            : ''
                        }
                      >
                        {remaining === null
                          ? 'Not set'
                          : formatAmount(remaining)}
                      </strong>
                    </div>
                  </div>

                  <div className="recent-expense-heading">
                    <h3 className="h6 mb-0">Recent expenses</h3>
                    <Button
                      as={Link}
                      className="view-category-expenses"
                      size="sm"
                      to={`/expenses?category=${encodeURIComponent(
                        category.name,
                      )}&sort=date-desc`}
                      variant="outline-secondary"
                    >
                      View all
                    </Button>
                  </div>

                  {recentExpenses.length === 0 ? (
                    <p className="budget-no-expenses mb-0">
                      No expenses in this category yet.
                    </p>
                  ) : (
                    <div className="table-responsive">
                      <Table className="budget-expense-table mb-0" size="sm">
                        <thead>
                          <tr>
                            <th scope="col">Date</th>
                            <th scope="col">Title</th>
                            <th className="text-end" scope="col">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentExpenses.map((expense) => (
                            <tr key={expense.id}>
                              <td className="text-nowrap">
                                {formatDate(expense.date)}
                              </td>
                              <td>{expense.title}</td>
                              <td className="text-end text-nowrap fw-semibold">
                                {formatAmount(expense.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            ),
          )}
        </div>
      )}

      <div className="budget-add-category">
        <Button
          className="budget-primary-button"
          onClick={() => {
            setCategoryToEdit(null);
            setShowAddCategory(true);
          }}
        >
          + Category
        </Button>
      </div>

      <CategoryFormModal
        categoryToEdit={categoryToEdit}
        existingCategories={categories}
        show={showAddCategory}
        onHide={closeCategoryForm}
        onSave={saveCategory}
      />
    </Container>
  );
}
