import { createContext, useContext, useState, useEffect } from "react";
import client from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoading(false);
      return;
    }
    // No /auth/me endpoint was built, so we trust the stored token
    // and decode the minimal info we saved at login time.
    const stored = localStorage.getItem("user_email");
    if (stored) setUser({ email: stored });
    setLoading(false);
  }, []);

  async function login(email, password) {
    const res = await client.post("/api/v1/auth/login", null, {
      params: { email, password },
    });
    localStorage.setItem("access_token", res.data.access_token);
    localStorage.setItem("user_email", email);
    setUser({ email });
  }

  async function signup(email, password, full_name) {
    await client.post("/api/v1/auth/signup", { email, password, full_name });
    await login(email, password);
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}