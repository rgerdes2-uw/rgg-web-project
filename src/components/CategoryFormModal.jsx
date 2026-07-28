import { useEffect, useState } from 'react';
import { Alert, Button, Col, Form, Modal, Row } from 'react-bootstrap';

const emptyCategory = {
  name: '',
  color: '#d94d91',
  budgetLimit: '',
  period: 'monthly',
};

export default function CategoryFormModal({
  categoryToEdit,
  existingCategories,
  onHide,
  onSave,
  show,
}) {
  const [category, setCategory] = useState(emptyCategory);
  const [error, setError] = useState('');

  useEffect(() => {
    if (show) {
      setCategory(
        categoryToEdit
          ? {
              name: categoryToEdit.name,
              color: categoryToEdit.color,
              budgetLimit:
                Number(categoryToEdit.budgetLimit) > 0
                  ? String(categoryToEdit.budgetLimit)
                  : '',
              period: categoryToEdit.period ?? 'monthly',
            }
          : { ...emptyCategory },
      );
      setError('');
    }
  }, [show, categoryToEdit]);

  function updateCategory(event) {
    const { name, value } = event.target;
    setCategory((current) => ({ ...current, [name]: value }));
    setError('');
  }

  function submitCategory(event) {
    event.preventDefault();
    const name = category.name.trim();
    if (
      existingCategories.some(
        (existing) =>
          existing.id !== categoryToEdit?.id &&
          existing.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setError('A category with this name already exists.');
      return;
    }

    onSave({
      ...category,
      id: categoryToEdit?.id ?? crypto.randomUUID?.() ?? `${Date.now()}`,
      name,
      budgetLimit: Number(category.budgetLimit),
      isIncome: false,
    });
  }

  return (
    <Modal
      centered
      className="category-form-modal"
      show={show}
      onHide={onHide}
    >
      <Form onSubmit={submitCategory}>
        <Modal.Header closeButton>
          <Modal.Title>
            {categoryToEdit ? 'Edit category' : 'Create a category'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Row className="g-3">
            <Col xs={12}>
              <Form.Group controlId="category-name">
                <Form.Label>Category name</Form.Label>
                <Form.Control
                  required
                  autoFocus
                  maxLength={40}
                  name="name"
                  placeholder="e.g. Pet care"
                  value={category.name}
                  onChange={updateCategory}
                />
              </Form.Group>
            </Col>
            <Col sm={5}>
              <Form.Group controlId="category-color">
                <Form.Label>Color</Form.Label>
                <div className="category-color-control">
                  <Form.Control
                    aria-label="Category color"
                    name="color"
                    type="color"
                    value={category.color}
                    onChange={updateCategory}
                  />
                  <span>{category.color.toUpperCase()}</span>
                </div>
              </Form.Group>
            </Col>
            <Col sm={7}>
              <Form.Group controlId="category-budget-limit">
                <Form.Label>Budget limit</Form.Label>
                <Form.Control
                  required
                  min="0.01"
                  name="budgetLimit"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={category.budgetLimit}
                  onChange={updateCategory}
                />
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="category-budget-period">
                <Form.Label>Budget period</Form.Label>
                <Form.Select
                  name="period"
                  value={category.period}
                  onChange={updateCategory}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </Form.Select>
                <Form.Text>
                  This period will be used for budget calculations and reports.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button className="budget-primary-button" type="submit">
            {categoryToEdit ? 'Save changes' : 'Create category'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
