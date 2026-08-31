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
    const storedEmail = localStorage.getItem("user_email");
    const storedIsAdmin = localStorage.getItem("is_admin") === "true";
    if (storedEmail) setUser({ email: storedEmail, is_admin: storedIsAdmin });
    setLoading(false);
  }, []);

  async function login(email, password) {
    const res = await client.post("/api/v1/auth/login", { email, password });
    localStorage.setItem("access_token", res.data.access_token);
    localStorage.setItem("user_email", email);
    localStorage.setItem("is_admin", res.data.is_admin);
    setUser({ email, is_admin: res.data.is_admin });
  }

  async function signup(email, password, full_name) {
    await client.post("/api/v1/auth/signup", { email, password, full_name });
    await login(email, password);
  }

  function logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("is_admin");
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