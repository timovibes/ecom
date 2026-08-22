import { createContext, useContext, useState, useCallback } from "react";
import client from "../api/client";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refreshCart = useCallback(() => {
    if (!user) {
      setCount(0);
      return;
    }
    client.get("/api/v1/cart/")
      .then((res) => {
        const total = (res.data.items || []).reduce((sum, item) => sum + item.quantity, 0);
        setCount(total);
      })
      .catch(() => setCount(0));
  }, [user]);

  return (
    <CartContext.Provider value={{ count, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}