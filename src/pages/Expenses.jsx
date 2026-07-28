import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Table,
} from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import TransactionEntryModal, {
  TransactionFields,
} from '../components/TransactionEntryModal';
import CategoryFormModal from '../components/CategoryFormModal';
import {
  getCategoryTextColor,
  loadCategories,
  saveCategories,
} from '../data/categories';

const STORAGE_KEY = 'budget-tracker-expenses';
const PAGE_SIZE = 15;

const emptyExpense = {
  date: new Date().toISOString().slice(0, 10),
  title: '',
  category: 'Food',
  amount: '',
  notes: '',
};
const emptyIncome = { ...emptyExpense, category: 'Income' };

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatAmount(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export default function Expenses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [expenses, setExpenses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
    } catch {
      return [];
    }
  });
  const [categories, setCategories] = useState(loadCategories);
  const [newExpense, setNewExpense] = useState(emptyExpense);
  const [newIncome, setNewIncome] = useState(emptyIncome);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [editExpense, setEditExpense] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [visibleRows, setVisibleRows] = useState(PAGE_SIZE);
  const [titleSearch, setTitleSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(
    () => searchParams.get('category') ?? '',
  );
  const [sortOption, setSortOption] = useState(
    () => searchParams.get('sort') ?? 'date-desc',
  );
  const tableScrollRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  const expenseCategories = useMemo(
    () => categories.filter((category) => !category.isIncome),
    [categories],
  );

  const filteredExpenses = useMemo(() => {
    const normalizedSearch = titleSearch.trim().toLowerCase();
    const filtered = expenses.filter(
      (expense) =>
        (!normalizedSearch ||
          expense.title.toLowerCase().includes(normalizedSearch)) &&
        (!startDate || expense.date >= startDate) &&
        (!endDate || expense.date <= endDate) &&
        (!categoryFilter || expense.category === categoryFilter),
    );

    return filtered.sort((a, b) => {
      if (sortOption === 'date-asc') {
        return (
          a.date.localeCompare(b.date) ||
          Number(a.createdAt ?? 0) - Number(b.createdAt ?? 0)
        );
      }
      if (sortOption === 'amount-desc') {
        return (
          Number(b.amount) - Number(a.amount) ||
          b.date.localeCompare(a.date)
        );
      }
      if (sortOption === 'amount-asc') {
        return (
          Number(a.amount) - Number(b.amount) ||
          b.date.localeCompare(a.date)
        );
      }
      return (
        b.date.localeCompare(a.date) ||
        Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0)
      );
    });
  }, [
    expenses,
    titleSearch,
    startDate,
    endDate,
    categoryFilter,
    sortOption,
  ]);

  useEffect(() => {
    setVisibleRows(PAGE_SIZE);
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0;
    }
  }, [titleSearch, startDate, endDate, categoryFilter, sortOption]);

  function updateNewExpense(event) {
    const { name, value } = event.target;
    setNewExpense((current) => ({ ...current, [name]: value }));
  }

  function updateNewIncome(event) {
    const { name, value } = event.target;
    setNewIncome((current) => ({ ...current, [name]: value }));
  }

  function addExpense(event) {
    event.preventDefault();
    const timestamp = Date.now();
    const category = newExpense.category.trim();
    setExpenses((current) => [
      ...current,
      {
        ...newExpense,
        title: newExpense.title.trim(),
        category,
        notes: newExpense.notes.trim(),
        amount: Number(newExpense.amount),
        id: crypto.randomUUID?.() ?? String(timestamp),
        createdAt: timestamp,
      },
    ]);
    setNewExpense({ ...emptyExpense });
    setShowAddExpense(false);
  }

  function addIncome(event) {
    event.preventDefault();
    const timestamp = Date.now();
    const income = {
      ...newIncome,
      title: newIncome.title.trim(),
      category: 'Income',
      notes: newIncome.notes.trim(),
      amount: Number(newIncome.amount),
      id: crypto.randomUUID?.() ?? String(timestamp),
      createdAt: timestamp,
    };
    setExpenses((current) => [...current, income]);
    setNewIncome({ ...emptyIncome });
    setShowAddIncome(false);
  }

  function openDetails(expense) {
    setSelectedExpense(expense);
    setEditExpense({ ...expense });
    setIsEditing(false);
  }

  function closeDetails() {
    setSelectedExpense(null);
    setEditExpense(null);
    setIsEditing(false);
    setIsConfirmingDelete(false);
  }

  function updateEditExpense(event) {
    const { name, value } = event.target;
    setEditExpense((current) => ({ ...current, [name]: value }));
  }

  function saveExpense(event) {
    event.preventDefault();
    const category = editExpense.category.trim();
    const updatedExpense = {
      ...editExpense,
      title: editExpense.title.trim(),
      category,
      notes: editExpense.notes.trim(),
      amount: Number(editExpense.amount),
    };
    setExpenses((current) =>
      current.map((expense) =>
        expense.id === updatedExpense.id ? updatedExpense : expense,
      ),
    );
    closeDetails();
  }

  function addCategory(category) {
    setCategories((current) =>
      [...current.filter((item) => !item.isIncome), category, ...current.filter((item) => item.isIncome)]
        .map((item, index, all) =>
          index === all.findIndex((candidate) => candidate.id === item.id)
            ? item
            : null,
        )
        .filter(Boolean),
    );
    setNewExpense((current) => ({ ...current, category: category.name }));
    setShowAddCategory(false);
  }

  function deleteExpense() {
    setExpenses((current) =>
      current.filter((expense) => expense.id !== selectedExpense.id),
    );
    closeDetails();
  }

  function loadMoreExpenses(event) {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    if (
      scrollHeight - scrollTop - clientHeight < 80 &&
      visibleRows < filteredExpenses.length
    ) {
      setVisibleRows((current) =>
        Math.min(current + PAGE_SIZE, filteredExpenses.length),
      );
    }
  }

  function clearFilters() {
    setTitleSearch('');
    setStartDate('');
    setEndDate('');
    setCategoryFilter('');
    setSortOption('date-desc');
    setSearchParams({});
  }

  const filtersAreActive =
    titleSearch ||
    startDate ||
    endDate ||
    categoryFilter ||
    sortOption !== 'date-desc';

  return (
    <Container className="page-shell py-5">
      <div className="expense-page-heading mb-4">
        <div>
          <h1 className="mb-1">Expenses</h1>
          <p className="lead mb-0">Track and review your expenses.</p>
        </div>
        <div className="transaction-actions">
          <Button
            className="income-button"
            onClick={() => setShowAddIncome(true)}
          >
            + Income
          </Button>
          <Button
            className="expense-primary-button"
            onClick={() => setShowAddExpense(true)}
          >
            + Expense
          </Button>
          <Button
            className="category-button"
            onClick={() => setShowAddCategory(true)}
          >
            + Category
          </Button>
        </div>
      </div>

      <Card className="expense-filter-card mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={6} lg={2}>
              <Form.Group controlId="expense-title-filter">
                <Form.Label>Search title</Form.Label>
                <Form.Control
                  type="search"
                  value={titleSearch}
                  onChange={(event) => setTitleSearch(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={6} md={3} lg={2}>
              <Form.Group controlId="expense-start-date-filter">
                <Form.Label>From</Form.Label>
                <Form.Control
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={6} md={3} lg={2}>
              <Form.Group controlId="expense-end-date-filter">
                <Form.Label>To</Form.Label>
                <Form.Control
                  min={startDate || undefined}
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6} lg={3}>
              <Form.Group controlId="expense-category-filter">
                <Form.Label>Category</Form.Label>
                <Form.Select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6} lg={3}>
              <Form.Group controlId="expense-sort">
                <Form.Label>Sort by</Form.Label>
                <Form.Select
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value)}
                >
                  <option value="date-desc">Date: newest first</option>
                  <option value="date-asc">Date: oldest first</option>
                  <option value="amount-desc">Amount: highest first</option>
                  <option value="amount-asc">Amount: lowest first</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <div className="d-flex justify-content-end mt-3">
            <Button
              className="clear-filters-button"
              disabled={!filtersAreActive}
              size="sm"
              variant="outline-secondary"
              onClick={clearFilters}
            >
              Clear filters
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card className="expense-table-card">
        <Card.Body className="p-0">
          <div className="expense-table-heading">
            <h2 className="h5 mb-0">Your expenses</h2>
          </div>
          {filteredExpenses.length === 0 ? (
            <Alert className="expense-empty-state m-3" variant="light">
              {expenses.length === 0
                ? 'No expenses yet. Add your first expense.'
                : 'No expenses match the selected filters.'}
            </Alert>
          ) : (
            <div
              className="expense-table-scroll table-responsive"
              onScroll={loadMoreExpenses}
              ref={tableScrollRef}
            >
              <Table className="expense-table align-middle mb-0" hover>
                <thead>
                  <tr>
                    <th scope="col">
                      Date{' '}
                      {sortOption.startsWith('date') && (
                        <span
                          aria-label={
                            sortOption === 'date-desc'
                              ? 'sorted descending'
                              : 'sorted ascending'
                          }
                        >
                          {sortOption === 'date-desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </th>
                    <th scope="col">Title</th>
                    <th scope="col">Category</th>
                    <th className="text-end" scope="col">
                      Amount{' '}
                      {sortOption.startsWith('amount') && (
                        <span
                          aria-label={
                            sortOption === 'amount-desc'
                              ? 'sorted descending'
                              : 'sorted ascending'
                          }
                        >
                          {sortOption === 'amount-desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </th>
                    <th className="text-end" scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.slice(0, visibleRows).map((expense) => (
                    <tr key={expense.id}>
                      <td className="text-nowrap">{formatDate(expense.date)}</td>
                      <td className="fw-semibold">{expense.title}</td>
                      <td>
                        <span
                          className="expense-category"
                          style={{
                            backgroundColor:
                              categories.find(
                                (category) => category.name === expense.category,
                              )?.color ?? '#64748b',
                            color: getCategoryTextColor(
                              categories.find(
                                (category) => category.name === expense.category,
                              )?.color ?? '#64748b',
                            ),
                          }}
                        >
                          {expense.category}
                        </span>
                      </td>
                      <td className="text-end fw-semibold text-nowrap">
                        {formatAmount(expense.amount)}
                      </td>
                      <td className="text-end text-nowrap">
                        <Button
                          aria-label={`View details and actions for ${expense.title}`}
                          className="details-button action-menu-button"
                          size="sm"
                          title="View details and actions"
                          variant="outline-secondary"
                          onClick={() => openDetails(expense)}
                        >
                          <svg
                            aria-hidden="true"
                            fill="currentColor"
                            height="18"
                            viewBox="0 0 16 16"
                            width="18"
                          >
                            <circle cx="8" cy="2.5" r="1.5" />
                            <circle cx="8" cy="8" r="1.5" />
                            <circle cx="8" cy="13.5" r="1.5" />
                          </svg>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <TransactionEntryModal
        categories={expenseCategories}
        entry={newExpense}
        idPrefix="add-expense"
        show={showAddExpense}
        submitLabel="Add expense"
        title="Add an expense"
        onAddCategory={() => setShowAddCategory(true)}
        onChange={updateNewExpense}
        onHide={() => setShowAddExpense(false)}
        onSubmit={addExpense}
      />

      <TransactionEntryModal
        categories={categories}
        entry={newIncome}
        fixedCategory="Income"
        idPrefix="add-income"
        show={showAddIncome}
        submitLabel="Add income"
        title="Add income"
        onChange={updateNewIncome}
        onHide={() => setShowAddIncome(false)}
        onSubmit={addIncome}
      />

      <CategoryFormModal
        existingCategories={categories}
        show={showAddCategory}
        onHide={() => setShowAddCategory(false)}
        onSave={addCategory}
      />

      {/* Expense details and editing */}
      <Modal
        centered
        show={Boolean(selectedExpense)}
        onHide={closeDetails}
      >
        <Modal.Header closeButton>
          <Modal.Title>{isEditing ? 'Edit expense' : 'Expense details'}</Modal.Title>
        </Modal.Header>
        {selectedExpense && (
          <Form onSubmit={saveExpense}>
            <Modal.Body>
              {isConfirmingDelete ? (
                <Alert className="mb-0" variant="danger">
                  <Alert.Heading className="h5">Delete this expense?</Alert.Heading>
                  <p className="mb-0">
                    <strong>{selectedExpense.title}</strong> will be permanently
                    removed. This action cannot be undone.
                  </p>
                </Alert>
              ) : isEditing ? (
                <TransactionFields
                  categories={expenseCategories}
                  entry={editExpense}
                  fixedCategory={
                    selectedExpense.category === 'Income' ? 'Income' : undefined
                  }
                  idPrefix="edit-expense"
                  onChange={updateEditExpense}
                />
              ) : (
                <dl className="expense-details mb-0">
                  <div>
                    <dt>Date</dt>
                    <dd>{formatDate(selectedExpense.date)}</dd>
                  </div>
                  <div>
                    <dt>Title</dt>
                    <dd>{selectedExpense.title}</dd>
                  </div>
                  <div>
                    <dt>Category</dt>
                    <dd>{selectedExpense.category}</dd>
                  </div>
                  <div>
                    <dt>Amount</dt>
                    <dd>{formatAmount(selectedExpense.amount)}</dd>
                  </div>
                  <div className="expense-notes">
                    <dt>Notes</dt>
                    <dd>
                      {selectedExpense.notes || (
                        <span className="text-body-secondary">No notes added.</span>
                      )}
                    </dd>
                  </div>
                </dl>
              )}
            </Modal.Body>
            <Modal.Footer>
              {isConfirmingDelete ? (
                <>
                  <Button
                    type="button"
                    variant="light"
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    Keep expense
                  </Button>
                  <Button type="button" variant="danger" onClick={deleteExpense}>
                    Delete expense
                  </Button>
                </>
              ) : isEditing ? (
                <>
                  <Button
                    className="me-auto"
                    type="button"
                    variant="outline-danger"
                    onClick={() => setIsConfirmingDelete(true)}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="light"
                    onClick={() => {
                      setEditExpense({ ...selectedExpense });
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button className="expense-primary-button" type="submit">
                    Save changes
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="light" onClick={closeDetails}>
                    Close
                  </Button>
                  <Button
                    className="expense-primary-button"
                    type="button"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit expense
                  </Button>
                </>
              )}
            </Modal.Footer>
          </Form>
        )}
      </Modal>
    </Container>
  );
}
