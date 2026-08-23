import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="empty-state not-found">
      <p className="not-found-code">404</p>
      <h2 className="page-heading">Page not found</h2>
      <p className="empty-state-message">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to="/" className="primary">Back to home</Link>
    </div>
  );
}