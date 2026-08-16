import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div>
      <header className="site-header">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/" className="brand">Aurelian</Link>
          <nav className="site-nav">
            <Link to="/">Products</Link>
            <Link to="/cart">Cart</Link>
            {user ? (
              <>
                <Link to="/orders">Orders</Link>
                {user.is_admin && <Link to="/admin">Admin</Link>}
                <button onClick={logout}>Logout</button>
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
      <main className="container" style={{ padding: "64px 0" }}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>© 2026 AURELIAN. All rights reserved.</span>
          <span>Shipping · Returns · Privacy</span>
        </div>
      </footer>
    </div>
  );
}