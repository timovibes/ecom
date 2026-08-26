import { createContext, useContext, useState, useCallback } from "react";
import client from "../api/client";
import { useAuth } from "./AuthContext";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  const refreshWishlist = useCallback(() => {
    if (!user) {
      setItems([]);
      return;
    }
    client.get("/api/v1/wishlist/")
      .then((res) => setItems(res.data.items || []))
      .catch(() => setItems([]));
  }, [user]);

  const addToWishlist = useCallback((productId) => {
    return client.post(`/api/v1/wishlist/${productId}`)
      .then((res) => setItems(res.data.items || []));
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    return client.delete(`/api/v1/wishlist/${productId}`)
      .then((res) => setItems(res.data.items || []));
  }, []);

  const isWishlisted = useCallback(
    (productId) => items.some((item) => item.product_id === productId),
    [items]
  );

  return (
    <WishlistContext.Provider
      value={{ items, refreshWishlist, addToWishlist, removeFromWishlist, isWishlisted }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}