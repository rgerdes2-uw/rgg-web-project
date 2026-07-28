import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import CategoryFormModal from '../components/CategoryFormModal';
import TransactionEntryModal from '../components/TransactionEntryModal';
import {
  loadCategories,
  saveCategories,
} from '../data/categories';

const TRANSACTIONS_KEY = 'budget-tracker-expenses';

function todayString() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
}

function firstOfMonth() {
  return `${todayString().slice(0, 7)}-01`;
}

function emptyTransaction(category) {
  return {
    date: todayString(),
    title: '',
    category,
    amount: '',
    notes: '',
  };
}

function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem(TRANSACTIONS_KEY)) ?? [];
  } catch {
    return [];
  }
}

function formatAmount(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatCompactAmount(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

function formatShortDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function dateKeysBetween(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return [];
  const dates = [];
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function getChartScale(maximum, tickCount = 4) {
  const safeMaximum = Math.max(maximum, 1);
  const roughStep = safeMaximum / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalizedStep = roughStep / magnitude;
  const niceStep =
    normalizedStep <= 1
      ? 1
      : normalizedStep <= 2
        ? 2
        : normalizedStep <= 5
          ? 5
          : 10;
  const step = niceStep * magnitude;
  return {
    maximum: step * tickCount,
    ticks: Array.from({ length: tickCount + 1 }, (_, index) => step * index),
  };
}

function proratedMonthlyLimit(limit, startDate, endDate) {
  if (!limit || !startDate || !endDate || startDate > endDate) return 0;
  const rangeStart = new Date(`${startDate}T00:00:00Z`);
  const rangeEnd = new Date(`${endDate}T00:00:00Z`);
  let cursor = new Date(
    Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1),
  );
  let totalLimit = 0;

  while (cursor <= rangeEnd) {
    const monthStart = new Date(cursor);
    const monthEnd = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
    );
    const overlapStart = rangeStart > monthStart ? rangeStart : monthStart;
    const overlapEnd = rangeEnd < monthEnd ? rangeEnd : monthEnd;
    if (overlapStart <= overlapEnd) {
      const daysInMonth = monthEnd.getUTCDate();
      const coveredDays =
        Math.floor((overlapEnd - overlapStart) / 86400000) + 1;
      totalLimit += Number(limit) * (coveredDays / daysInMonth);
    }
    cursor = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
    );
  }
  return totalLimit;
}

function CashFlowChart({
  categories,
  data,
  endDate,
  onSelectCategory,
  selectedCategoryId,
  startDate,
}) {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const width = 760;
  const height = 320;
  const padding = { top: 24, right: 22, bottom: 42, left: 66 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const dataMaximum = Math.max(
    1,
    ...data.flatMap((point) => [point.income, point.totalExpenses]),
  );
  const scale = getChartScale(dataMaximum);

  function xPosition(index) {
    return padding.left + ((index + 0.5) / Math.max(data.length, 1)) * plotWidth;
  }

  function yPosition(value) {
    return padding.top + plotHeight - (value / scale.maximum) * plotHeight;
  }

  function linePoints() {
    return data
      .map((point, index) => `${xPosition(index)},${yPosition(point.income)}`)
      .join(' ');
  }

  const hasActivity = data.some(
    (point) => point.income || point.totalExpenses,
  );
  const barWidth = Math.min(42, (plotWidth / Math.max(data.length, 1)) * 0.62);
  const tooltipWidth = 174;
  const tooltipX = hoveredPoint
    ? Math.min(
        width - padding.right - tooltipWidth,
        Math.max(padding.left, hoveredPoint.x - tooltipWidth / 2),
      )
    : 0;
  const tooltipY = hoveredPoint
    ? Math.max(4, hoveredPoint.y - 58)
    : 0;

  function showPoint(point, index, amount, label, y) {
    setHoveredPoint({
      amount,
      date: point.label,
      label,
      x: xPosition(index),
      y,
    });
  }

  return (
    <div className="cash-flow-chart-wrap">
      <div className="chart-legend" aria-hidden="true">
        <span><i className="income-legend" />Income</span>
        <span><i className="expense-legend" />Expenses by category</span>
      </div>
      <svg
        aria-label={`Income and expenses from ${startDate} through ${endDate}`}
        className="cash-flow-chart"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {scale.ticks.map((value) => {
          const y = yPosition(value);
          return (
            <g key={value}>
              <line
                className="chart-grid-line"
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
              />
              <text
                className="chart-axis-label"
                textAnchor="end"
                x={padding.left - 10}
                y={y + 4}
              >
                {formatCompactAmount(value)}
              </text>
            </g>
          );
        })}
        {hasActivity && (
          <>
            {data.map((point, index) => {
              let runningTotal = 0;
              return categories.map((category) => {
                const amount = point.categoryExpenses[category.id] ?? 0;
                if (!amount) return null;
                const segmentBottom = yPosition(runningTotal);
                runningTotal += amount;
                const segmentTop = yPosition(runningTotal);
                const isDimmed =
                  selectedCategoryId && selectedCategoryId !== category.id;
                return (
                  <rect
                    aria-label={`${point.label}, ${
                      category.name
                    } expenses ${formatAmount(amount)}`}
                    className={`chart-expense-segment${
                      isDimmed ? ' chart-segment-dimmed' : ''
                    }`}
                    fill={category.color}
                    height={Math.max(0, segmentBottom - segmentTop)}
                    key={`${point.key}-${category.id}`}
                    role="button"
                    tabIndex="0"
                    width={barWidth}
                    x={xPosition(index) - barWidth / 2}
                    y={segmentTop}
                    onBlur={() => setHoveredPoint(null)}
                    onClick={() => onSelectCategory(category.id)}
                    onFocus={() =>
                      showPoint(
                        point,
                        index,
                        amount,
                        category.name,
                        segmentTop,
                      )
                    }
                    onMouseEnter={() =>
                      showPoint(
                        point,
                        index,
                        amount,
                        category.name,
                        segmentTop,
                      )
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              });
            })}
            <polyline
              className="chart-line chart-income-line"
              points={linePoints()}
            />
            {data.map((point, index) =>
              point.income > 0 ? (
                <circle
                  aria-label={`${point.label} income ${formatAmount(
                    point.income,
                  )}`}
                  className="chart-point chart-income-point"
                  cx={xPosition(index)}
                  cy={yPosition(point.income)}
                  key={`income-${point.key}`}
                  r="4"
                  role="button"
                  tabIndex="0"
                  onBlur={() => setHoveredPoint(null)}
                  onFocus={() =>
                    showPoint(
                      point,
                      index,
                      point.income,
                      'Income',
                      yPosition(point.income),
                    )
                  }
                  onMouseEnter={() =>
                    showPoint(
                      point,
                      index,
                      point.income,
                      'Income',
                      yPosition(point.income),
                    )
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ) : null,
            )}
          </>
        )}
        {data.map((point, index) => {
          const labelEvery = Math.max(1, Math.ceil(data.length / 7));
          if (index % labelEvery !== 0 && index !== data.length - 1) return null;
          return (
            <text
              className="chart-axis-label"
              key={`label-${point.key}`}
              textAnchor="middle"
              x={xPosition(index)}
              y={height - 12}
            >
              {point.label}
            </text>
          );
        })}
        {!hasActivity && (
          <text
            className="chart-empty-label"
            textAnchor="middle"
            x={padding.left + plotWidth / 2}
            y={padding.top + plotHeight / 2}
          >
            No activity in this date range
          </text>
        )}
        {hoveredPoint && (
          <g className="chart-tooltip" pointerEvents="none">
            <rect
              height="48"
              rx="6"
              width={tooltipWidth}
              x={tooltipX}
              y={tooltipY}
            />
            <text x={tooltipX + 10} y={tooltipY + 19}>
              {hoveredPoint.label}: {formatAmount(hoveredPoint.amount)}
            </text>
            <text
              className="chart-tooltip-date"
              x={tooltipX + 10}
              y={tooltipY + 37}
            >
              {hoveredPoint.date}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const [categories, setCategories] = useState(loadCategories);
  const expenseCategories = categories.filter((category) => !category.isIncome);
  const [transactions, setTransactions] = useState(loadTransactions);
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(todayString);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [newExpense, setNewExpense] = useState(() =>
    emptyTransaction(expenseCategories[0]?.name ?? ''),
  );
  const [newIncome, setNewIncome] = useState(() => emptyTransaction('Income'));

  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const chartResult = useMemo(() => {
    const dates = dateKeysBetween(startDate, endDate);
    const grouping =
      dates.length <= 45 ? 'daily' : dates.length <= 180 ? 'weekly' : 'monthly';
    const buckets = new Map();
    const dateToBucket = new Map();

    dates.forEach((date, index) => {
      const key =
        grouping === 'daily'
          ? date
          : grouping === 'weekly'
            ? `week-${Math.floor(index / 7)}`
            : date.slice(0, 7);
      if (!buckets.has(key)) {
        const label =
          grouping === 'monthly'
            ? new Intl.DateTimeFormat('en-US', {
                month: 'short',
                year: '2-digit',
                timeZone: 'UTC',
              }).format(new Date(`${date}T00:00:00Z`))
            : formatShortDate(date);
        buckets.set(key, {
          key,
          label,
          income: 0,
          totalExpenses: 0,
          categoryExpenses: {},
        });
      }
      dateToBucket.set(date, key);
    });

    const categoryByName = new Map(
      expenseCategories.map((category) => [category.name, category]),
    );
    transactions.forEach((transaction) => {
      const point = buckets.get(dateToBucket.get(transaction.date));
      if (!point) return;
      if (transaction.category === 'Income') {
        point.income += Number(transaction.amount);
      } else {
        const category = categoryByName.get(transaction.category);
        if (!category) return;
        const amount = Number(transaction.amount);
        point.totalExpenses += amount;
        point.categoryExpenses[category.id] =
          (point.categoryExpenses[category.id] ?? 0) + amount;
      }
    });
    return {
      granularity: grouping,
      points: [...buckets.values()],
    };
  }, [transactions, expenseCategories, startDate, endDate]);

  const rangeTotals = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.date >= startDate && transaction.date <= endDate,
      )
      .reduce(
        (totals, transaction) => {
          if (transaction.category === 'Income') {
            totals.income += Number(transaction.amount);
          } else {
            totals.expenses += Number(transaction.amount);
          }
          return totals;
        },
        { income: 0, expenses: 0 },
      );
  }, [transactions, startDate, endDate]);

  const categorySpending = useMemo(() => {
    const spending = expenseCategories.map((category) => {
      const amount = transactions
        .filter(
          (transaction) =>
            transaction.category === category.name &&
            transaction.date >= startDate &&
            transaction.date <= endDate,
        )
        .reduce((total, transaction) => total + Number(transaction.amount), 0);
      return {
        category,
        amount,
        adjustedLimit: proratedMonthlyLimit(
          category.budgetLimit,
          startDate,
          endDate,
        ),
      };
    });
    const total = spending.reduce((sum, item) => sum + item.amount, 0);
    return spending
      .map((item) => ({
        ...item,
        spendingShare: total ? (item.amount / total) * 100 : 0,
        incomeShare: rangeTotals.income
          ? (item.amount / rangeTotals.income) * 100
          : 0,
        limitUsed: item.adjustedLimit
          ? (item.amount / item.adjustedLimit) * 100
          : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [
    expenseCategories,
    transactions,
    startDate,
    endDate,
    rangeTotals.income,
  ]);

  function updateTransaction(setter) {
    return (event) => {
      const { name, value } = event.target;
      setter((current) => ({ ...current, [name]: value }));
    };
  }

  function saveTransaction(transaction, setTransaction, closeModal) {
    const timestamp = Date.now();
    setTransactions((current) => [
      ...current,
      {
        ...transaction,
        title: transaction.title.trim(),
        notes: transaction.notes.trim(),
        amount: Number(transaction.amount),
        id: crypto.randomUUID?.() ?? String(timestamp),
        createdAt: timestamp,
      },
    ]);
    setTransaction(
      emptyTransaction(
        transaction.category === 'Income'
          ? 'Income'
          : expenseCategories[0]?.name ?? '',
      ),
    );
    closeModal();
  }

  function addCategory(category) {
    setCategories((current) => [
      ...current.filter((item) => !item.isIncome),
      category,
      ...current.filter((item) => item.isIncome),
    ]);
    setNewExpense((current) => ({ ...current, category: category.name }));
    setShowAddCategory(false);
  }

  return (
    <Container className="page-shell dashboard-page-shell py-5">
      <div className="mb-4">
        <h1 className="mb-1">Dashboard</h1>
        <p className="lead mb-0">
          Review your cash flow and spending at a glance.
        </p>
      </div>

      <Card className="quick-tasks-card mb-4">
        <Card.Body>
          <h2 className="h5 mb-3">Quick tasks</h2>
          <div className="quick-task-actions">
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
        </Card.Body>
      </Card>

      <Card className="dashboard-date-card mb-3">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col sm={6} md={3}>
              <Form.Group controlId="dashboard-start-date">
                <Form.Label>From</Form.Label>
                <Form.Control
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    const value = event.target.value;
                    setStartDate(value);
                    if (value > endDate) setEndDate(value);
                  }}
                />
              </Form.Group>
            </Col>
            <Col sm={6} md={3}>
              <Form.Group controlId="dashboard-end-date">
                <Form.Label>To</Form.Label>
                <Form.Control
                  min={startDate}
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Row className="g-3 mb-3">
        <Col md={4}>
          <Card className="dashboard-kpi-card dashboard-income-kpi">
            <Card.Body>
              <span>Income</span>
              <strong>{formatAmount(rangeTotals.income)}</strong>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="dashboard-kpi-card dashboard-expense-kpi">
            <Card.Body>
              <span>Spending</span>
              <strong>{formatAmount(rangeTotals.expenses)}</strong>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="dashboard-kpi-card dashboard-net-kpi">
            <Card.Body>
              <span>Net</span>
              <strong
                className={
                  rangeTotals.income - rangeTotals.expenses < 0
                    ? 'dashboard-negative'
                    : ''
                }
              >
                {formatAmount(rangeTotals.income - rangeTotals.expenses)}
              </strong>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={8}>
          <Card className="dashboard-chart-card h-100">
            <Card.Body>
              <h2 className="h5 mb-1">Income vs. expenses</h2>
              <p className="text-body-secondary mb-3">
                {chartResult.granularity === 'daily'
                  ? 'Daily'
                  : chartResult.granularity === 'weekly'
                    ? 'Weekly'
                    : 'Monthly'}{' '}
                income with expenses stacked by category
              </p>
              <CashFlowChart
                categories={expenseCategories}
                data={chartResult.points}
                endDate={endDate}
                selectedCategoryId={selectedCategoryId}
                startDate={startDate}
                onSelectCategory={(categoryId) =>
                  setSelectedCategoryId((current) =>
                    current === categoryId ? null : categoryId,
                  )
                }
              />
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="dashboard-chart-card h-100">
            <Card.Body>
              <h2 className="h5 mb-1">Spending by category</h2>
              <p className="text-body-secondary mb-3">
                Select a category to highlight its impact
              </p>
              {categorySpending.length === 0 ? (
                <Alert className="dashboard-empty-state" variant="light">
                  No spending categories have been created.
                </Alert>
              ) : (
                <div className="category-spending-list">
                  {categorySpending.map(
                    ({
                      adjustedLimit,
                      amount,
                      category,
                      incomeShare,
                      limitUsed,
                      spendingShare,
                    }) => {
                      const remaining = adjustedLimit - amount;
                      const isOver = adjustedLimit > 0 && remaining < 0;
                      return (
                      <div
                        className={`category-spending-item${
                          selectedCategoryId === category.id
                            ? ' category-spending-selected'
                            : ''
                        }`}
                        key={category.id}
                      >
                        <button
                          aria-pressed={selectedCategoryId === category.id}
                          className="category-highlight-button"
                          type="button"
                          onClick={() =>
                            setSelectedCategoryId((current) =>
                              current === category.id ? null : category.id,
                            )
                          }
                        >
                        <div className="category-spending-label">
                          <span
                            className="category-dot"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                          <strong>{formatAmount(amount)}</strong>
                        </div>
                        <div
                          aria-label={
                            adjustedLimit
                              ? `${category.name}: ${limitUsed.toFixed(
                                  1,
                                )}% of the prorated budget limit`
                              : `${category.name}: no budget limit set`
                          }
                          className={`category-spending-track${
                            isOver ? ' category-budget-over' : ''
                          }`}
                          role="img"
                        >
                          <span
                            style={{
                              backgroundColor: isOver
                                ? '#b42318'
                                : category.color,
                              width: `${Math.min(
                                adjustedLimit ? limitUsed : spendingShare,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="category-budget-detail">
                          <span>
                            {adjustedLimit
                              ? `${formatAmount(
                                  Math.abs(remaining),
                                )} ${isOver ? 'over' : 'remaining'}`
                              : 'No limit set'}
                          </span>
                          <span>
                            {spendingShare.toFixed(1)}% of spending ·{' '}
                            {incomeShare.toFixed(1)}% of income
                          </span>
                        </div>
                        </button>
                        <Link
                          className="category-budget-link"
                          to={`/budgets?category=${encodeURIComponent(
                            category.id,
                          )}`}
                        >
                          View budget
                        </Link>
                      </div>
                    );
                    },
                  )}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <TransactionEntryModal
        categories={expenseCategories}
        entry={newExpense}
        idPrefix="dashboard-expense"
        show={showAddExpense}
        submitLabel="Add expense"
        title="Add an expense"
        onAddCategory={() => setShowAddCategory(true)}
        onChange={updateTransaction(setNewExpense)}
        onHide={() => setShowAddExpense(false)}
        onSubmit={(event) => {
          event.preventDefault();
          saveTransaction(newExpense, setNewExpense, () =>
            setShowAddExpense(false),
          );
        }}
      />

      <TransactionEntryModal
        categories={categories}
        entry={newIncome}
        fixedCategory="Income"
        idPrefix="dashboard-income"
        show={showAddIncome}
        submitLabel="Add income"
        title="Add income"
        onChange={updateTransaction(setNewIncome)}
        onHide={() => setShowAddIncome(false)}
        onSubmit={(event) => {
          event.preventDefault();
          saveTransaction(newIncome, setNewIncome, () =>
            setShowAddIncome(false),
          );
        }}
      />

      <CategoryFormModal
        existingCategories={categories}
        show={showAddCategory}
        onHide={() => setShowAddCategory(false)}
        onSave={addCategory}
      />
    </Container>
  );
}
