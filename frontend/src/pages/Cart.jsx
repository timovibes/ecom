import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import client from "../api/client";

export default function Cart() {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");
  const [checkingOut, setCheckingOut] = useState(false);
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
    if (checkingOut) return;
    setCheckingOut(true);
    setError("");
    try {
      const res = await client.post("/api/v1/checkout/");
      navigate(`/checkout/${res.data.order_id}`, { state: res.data });
    } catch (err) {
      setError(err.response?.data?.detail || "Checkout failed");
      setCheckingOut(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!cart) return null;

  const total = cart.items.reduce((sum, item) => sum + item.product.price_minor * item.quantity, 0);

  return (
    <div>
      <h2 className="page-heading">Shopping Bag</h2>

      {cart.items.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-message">Your bag is empty.</p>
          <Link to="/" className="primary">Browse products</Link>
        </div>
      )}

      {cart.items.length > 0 && (
        <div className="cart-list">
          {cart.items.map((item) => (
            <div key={item.id} className="cart-item">
              <div>
                <p className="cart-item-name">{item.product.name}</p>
                <p className="muted">{(item.product.price_minor / 100).toFixed(2)} {item.product.currency.toUpperCase()} each</p>
              </div>
              <div className="cart-item-controls">
                <div className="qty-control">
                  <button
                    onClick={() => updateQty(item.id, item.quantity - 1)}
                    aria-label={`Decrease quantity of ${item.product.name}, currently ${item.quantity}`}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => updateQty(item.id, item.quantity + 1)}
                    aria-label={`Increase quantity of ${item.product.name}, currently ${item.quantity}`}
                  >
                    +
                  </button>
                </div>
                <button
                  className="remove-link"
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remove ${item.product.name} from bag`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cart.items.length > 0 && (
        <div className="cart-summary">
          <p className="cart-total">
            Total: {(total / 100).toFixed(2)} {cart.items[0].product.currency.toUpperCase()}
          </p>
          <button className="primary" onClick={checkout} disabled={checkingOut}>
            {checkingOut ? "Processing..." : "Proceed to checkout"}
          </button>
        </div>
      )}
    </div>
  );
}