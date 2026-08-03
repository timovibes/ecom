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
      <h2 style={{ marginBottom: 20 }}>Order history</h2>
      {orders.length === 0 && <p className="muted">No orders yet.</p>}
      {orders.map((o) => (
        <div key={o.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <p>Order #{o.id}</p>
            <span className="badge">{o.status.toUpperCase()}</span>
          </div>
          <p className="price" style={{ marginTop: 8 }}>
            {(o.total_amount_minor / 100).toFixed(2)} {o.currency.toUpperCase()}
          </p>
          <p className="muted">{new Date(o.created_at).toLocaleString()}</p>
          {o.payment?.failure_reason && <p className="error" style={{ marginTop: 8 }}>{o.payment.failure_reason}</p>}
        </div>
      ))}
    </div>
  );
}