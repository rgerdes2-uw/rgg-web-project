import { Button, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <Container className="page-shell py-5">
      <h1>Page not found</h1>
      <p>The requested route does not exist.</p>
      <Button as={Link} to="/" variant="outline-primary">
        Return home
      </Button>
    </Container>
  );
}
