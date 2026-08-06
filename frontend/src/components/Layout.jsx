import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--black)", padding: "16px 0" }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/" className="brand" style={{ fontSize: 20 }}>STORE</Link>
          <nav style={{ display: "flex", gap: 20, alignItems: "center" }}>
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
      <main className="container" style={{ padding: "32px 0" }}>
        <Outlet />
      </main>
    </div>
  );
}