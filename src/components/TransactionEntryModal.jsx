import { Button, Col, Form, Modal, Row } from 'react-bootstrap';

function CategoryField({
  categories,
  entry,
  idPrefix,
  onAddCategory,
  onChange,
}) {
  function chooseCategory(event) {
    if (event.target.value === '__create_category__') {
      onAddCategory?.();
      return;
    }
    onChange(event);
  }

  return (
    <Form.Group controlId={`${idPrefix}-transaction-category`}>
      <Form.Label>Category</Form.Label>
      <Form.Select
        required
        name="category"
        value={entry.category}
        onChange={chooseCategory}
      >
        {categories.map((category) => (
          <option key={category.id} value={category.name}>
            {category.name}
          </option>
        ))}
        {onAddCategory && (
          <option value="__create_category__">+ Create new category</option>
        )}
      </Form.Select>
    </Form.Group>
  );
}

export function TransactionFields({
  categories,
  entry,
  fixedCategory,
  idPrefix,
  onAddCategory,
  onChange,
}) {
  return (
    <Row className="g-3">
      <Col md={6}>
        <Form.Group controlId={`${idPrefix}-transaction-title`}>
          <Form.Label>Title</Form.Label>
          <Form.Control
            required
            maxLength={60}
            name="title"
            placeholder={fixedCategory === 'Income' ? 'e.g. Paycheck' : 'e.g. Groceries'}
            value={entry.title}
            onChange={onChange}
          />
        </Form.Group>
      </Col>
      <Col md={6}>
        <Form.Group controlId={`${idPrefix}-transaction-date`}>
          <Form.Label>Date</Form.Label>
          <Form.Control
            required
            type="date"
            name="date"
            value={entry.date}
            onChange={onChange}
          />
        </Form.Group>
      </Col>
      <Col md={6}>
        {fixedCategory ? (
          <Form.Group controlId={`${idPrefix}-transaction-category`}>
            <Form.Label>Category</Form.Label>
            <div title="Income category cannot be changed.">
              <Form.Control
                aria-describedby={`${idPrefix}-fixed-category-description`}
                className="fixed-category-field"
                disabled
                value={fixedCategory}
              />
            </div>
            <span
              className="visually-hidden"
              id={`${idPrefix}-fixed-category-description`}
            >
              Income category cannot be changed.
            </span>
          </Form.Group>
        ) : (
          <CategoryField
            categories={categories}
            entry={entry}
            idPrefix={idPrefix}
            onAddCategory={onAddCategory}
            onChange={onChange}
          />
        )}
      </Col>
      <Col md={6}>
        <Form.Group controlId={`${idPrefix}-transaction-amount`}>
          <Form.Label>Amount</Form.Label>
          <Form.Control
            required
            min="0.01"
            step="0.01"
            type="number"
            inputMode="decimal"
            name="amount"
            placeholder="0.00"
            value={entry.amount}
            onChange={onChange}
          />
        </Form.Group>
      </Col>
      <Col xs={12}>
        <Form.Group controlId={`${idPrefix}-transaction-notes`}>
          <Form.Label>Notes</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            maxLength={500}
            name="notes"
            placeholder="Add any extra details (optional)"
            value={entry.notes}
            onChange={onChange}
          />
        </Form.Group>
      </Col>
    </Row>
  );
}

export default function TransactionEntryModal({
  categories,
  entry,
  fixedCategory,
  idPrefix,
  onAddCategory,
  onChange,
  onHide,
  onSubmit,
  show,
  submitLabel,
  title,
}) {
  return (
    <Modal
      centered
      className="transaction-entry-modal"
      show={show}
      onHide={onHide}
    >
      <Form onSubmit={onSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <TransactionFields
            categories={categories}
            entry={entry}
            fixedCategory={fixedCategory}
            idPrefix={idPrefix}
            onAddCategory={onAddCategory}
            onChange={onChange}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="light" onClick={onHide}>
            Cancel
          </Button>
          <Button className="expense-primary-button" type="submit">
            {submitLabel}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
