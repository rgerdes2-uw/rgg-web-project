import { Container, Nav, Navbar } from 'react-bootstrap';
import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Budgets from './pages/Budgets';
import Expenses from './pages/Expenses';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <>
      <Navbar className="app-header" data-bs-theme="dark" expand="md">
        <Container>
          <Navbar.Brand as={NavLink} className="app-title" to="/">
            Budget Tracker
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-navigation" />
          <Navbar.Collapse id="main-navigation">
            <Nav className="app-nav ms-auto">
              <Nav.Link
                as={NavLink}
                className="app-nav-link dashboard-link"
                to="/"
                end
              >
                Dashboard
              </Nav.Link>
              <Nav.Link
                as={NavLink}
                className="app-nav-link budgets-link"
                to="/budgets"
              >
                Budgets
              </Nav.Link>
              <Nav.Link
                as={NavLink}
                className="app-nav-link expenses-link"
                to="/expenses"
              >
                Expenses
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
