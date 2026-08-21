import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div>
      <header className="site-header">
        <div className="container site-header-inner">
          <Link to="/" className="brand">Aurelian</Link>
          <nav className="site-nav">
            <Link to="/shop">Products</Link>
            <Link to="/cart">Cart</Link>
            {user ? (
              <>
                <Link to="/orders">Orders</Link>
                {user.is_admin && <Link to="/admin">Admin</Link>}
                <button onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/signup">Signup</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="container site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container site-footer-inner">
          <span>© 2026 AURELIAN. All rights reserved.</span>
          <span>Shipping · Returns · Privacy</span>
        </div>
      </footer>
    </div>
  );
}