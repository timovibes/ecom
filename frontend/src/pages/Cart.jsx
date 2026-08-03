import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

export default function Cart() {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function loadCart() {
    client.get("/api/v1/cart/").then((res) => setCart(res.data)).catch(() => setError("Could not load cart"));
  }

  useEffect(loadCart, []);

  async function updateQty(itemId, quantity) {
    if (quantity < 1) return;
    await client.patch(`/api/v1/cart/items/${itemId}`, { quantity });
    loadCart();
  }

  async function removeItem(itemId) {
    await client.delete(`/api/v1/cart/items/${itemId}`);
    loadCart();
  }

  async function checkout() {
    try {
      const res = await client.post("/api/v1/checkout/");
      navigate(`/checkout/${res.data.order_id}`, { state: res.data });
    } catch (err) {
      setError(err.response?.data?.detail || "Checkout failed");
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!cart) return null;

  const total = cart.items.reduce((sum, item) => sum + item.product.price_minor * item.quantity, 0);

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Cart</h2>
      {cart.items.length === 0 && <p className="muted">Your cart is empty.</p>}
      {cart.items.map((item) => (
        <div key={item.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <p>{item.product.name}</p>
            <p className="muted">{(item.product.price_minor / 100).toFixed(2)} {item.product.currency.toUpperCase()} each</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => updateQty(item.id, item.quantity - 1)}>-</button>
            <span>{item.quantity}</span>
            <button onClick={() => updateQty(item.id, item.quantity + 1)}>+</button>
            <button onClick={() => removeItem(item.id)}>Remove</button>
          </div>
        </div>
      ))}
      {cart.items.length > 0 && (
        <div style={{ marginTop: 24, textAlign: "right" }}>
          <p className="price" style={{ fontSize: 18, marginBottom: 12 }}>
            Total: {(total / 100).toFixed(2)} {cart.items[0].product.currency.toUpperCase()}
          </p>
          <button className="primary" onClick={checkout}>Proceed to checkout</button>
        </div>
      )}
    </div>
  );
}