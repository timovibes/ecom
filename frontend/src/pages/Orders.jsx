import { useEffect, useState } from "react";
import client from "../api/client";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    client.get("/api/v1/orders/").then((res) => setOrders(res.data)).catch(() => setError("Could not load orders"));
  }, []);

  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 32 }}>Order History</h2>
      {orders.length === 0 && <p className="muted">No orders yet.</p>}

      {orders.length > 0 && (
        <div className="order-list">
          {orders.map((o) => (
            <div key={o.id} className="order-row">
              <div className="order-row-header">
                <span className="order-row-id">Order #{o.id}</span>
                <span className={`badge status-${o.status}`}>{o.status.toUpperCase()}</span>
              </div>
              <p className="price" style={{ marginBottom: 4 }}>
                {(o.total_amount_minor / 100).toFixed(2)} {o.currency.toUpperCase()}
              </p>
              <p className="muted">{new Date(o.created_at).toLocaleString()}</p>
              {o.payment?.failure_reason && <p className="error" style={{ marginTop: 8 }}>{o.payment.failure_reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}