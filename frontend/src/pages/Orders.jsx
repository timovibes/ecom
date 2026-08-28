import { useEffect, useState } from "react";
import client from "../api/client";

function StatusTimeline({ events }) {
  return (
    <div className="status-timeline">
      {events.map((e, i) => (
        <div key={i} className="status-timeline-step">
          <span className={`status-timeline-dot status-${e.status}`} />
          <div className="status-timeline-step-info">
            <span className={`badge status-${e.status}`}>{e.status.toUpperCase()}</span>
            <span className="muted status-timeline-date">
              {new Date(e.created_at).toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    client.get("/api/v1/orders/").then((res) => setOrders(res.data)).catch(() => setError("Could not load orders"));
  }, []);

  if (error) return <p className="error">{error}</p>;

  function toggleExpanded(id) {
    setExpandedId((current) => (current === id ? null : id));
  }

  return (
    <div>
      <h2 className="page-heading">Order History</h2>
      {orders.length === 0 && <p className="muted">No orders yet.</p>}

      {orders.length > 0 && (
        <div className="order-list">
          {orders.map((o) => {
            const isExpanded = expandedId === o.id;
            return (
              <div key={o.id} className="order-row">
                <button
                  className="order-row-header order-row-header-btn"
                  onClick={() => toggleExpanded(o.id)}
                  aria-expanded={isExpanded}
                >
                  <span className="order-row-id">Order #{o.id}</span>
                  <span className={`badge status-${o.status}`}>{o.status.toUpperCase()}</span>
                  <span className="order-row-toggle">{isExpanded ? "Hide tracking" : "Track order"}</span>
                </button>
                <p className="price order-row-price">
                  {(o.total_amount_minor / 100).toFixed(2)} {o.currency.toUpperCase()}
                </p>
                <p className="muted">{new Date(o.created_at).toLocaleString()}</p>
                {o.payment?.failure_reason && <p className="error order-row-failure">{o.payment.failure_reason}</p>}

                {isExpanded && o.status_history?.length > 0 && (
                  <StatusTimeline events={o.status_history} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}