import { useEffect, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { tokenizeCard, confirmPaymentIntent } from "../api/payment";
import client from "../api/client";

function extractErrorMessage(err) {
  const detail = err.response?.data?.detail;
  if (Array.isArray(detail)) {
    // FastAPI validation errors (422) come back as a list of {loc, msg, type}
    return detail.map((d) => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join(", ");
  }
  if (typeof detail === "string") {
    return detail; // HTTPException(detail="...") style errors
  }
  return "Payment could not be processed";
}

function SecureBadge() {
  return (
    <div className="secure-badge">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      <span>Secure checkout — your card details are encrypted</span>
    </div>
  );
}

export default function Checkout() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const intent = location.state; // { payment_intent_id, client_secret, amount_minor, currency }

  const [card, setCard] = useState({ number: "", exp_month: "", exp_year: "", cvc: "" });
  const [status, setStatus] = useState("idle"); // idle | processing | succeeded | declined | error
  const [message, setMessage] = useState("");
  const [orderItems, setOrderItems] = useState(null); // null while unknown, [] if none/unsupported

  useEffect(() => {
    if (!orderId) return;
    client.get(`/api/v1/orders/${orderId}`)
      .then((res) => {
        if (Array.isArray(res.data?.items)) {
          setOrderItems(res.data.items);
        } else {
          setOrderItems([]);
        }
      })
      .catch(() => setOrderItems([]));
  }, [orderId]);

  if (!intent) {
    return <p className="error">No payment info found. Please checkout from your bag again.</p>;
  }

  async function handlePay(e) {
    e.preventDefault();
    setStatus("processing");
    setMessage("");

    try {
      // Step 1: tokenize the card with pk_ — raw card details never touch our own backend
      const method = await tokenizeCard({
        card_number: card.number.replace(/\s/g, ""),
        exp_month: Number(card.exp_month),
        exp_year: Number(card.exp_year),
        cvv: card.cvc,
      });

      // Step 2: confirm the intent with the token, still using pk_
      const result = await confirmPaymentIntent(intent.payment_intent_id, intent.client_secret, method.id);

      // Critical: a decline is still HTTP 200. Check status explicitly, never response.ok alone.
      if (result.status === "succeeded") {
        setStatus("succeeded");
        // Ask our own backend to verify with its sk_ key and finalize the order/stock.
        await client.post(`/api/v1/checkout/orders/${orderId}/sync-payment`);
        setTimeout(() => navigate("/orders"), 1200);
      } else if (result.status === "declined") {
        setStatus("declined");
        setMessage(result.failure_reason || "Card was declined");
        await client.post(`/api/v1/checkout/orders/${orderId}/sync-payment`).catch(() => {});
      } else {
        setStatus("error");
        setMessage(`Unexpected status: ${result.status}`);
      }
    } catch (err) {
      setStatus("error");
      setMessage(extractErrorMessage(err));
    }
  }

  return (
    <div className="checkout-page">
      <h2 className="page-heading">Payment</h2>

      {orderItems && orderItems.length > 0 && (
        <div className="order-summary-items">
          {orderItems.map((item) => (
            <div key={item.id} className="order-summary-item">
              <span>{item.product?.name} {item.quantity > 1 ? `× ${item.quantity}` : ""}</span>
              <span className="muted">
                {((item.unit_price_minor * item.quantity) / 100).toFixed(2)} {intent.currency.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="checkout-summary">
        <span className="muted">Order #{orderId}</span>
        <span className="price checkout-total-price">
          {(intent.amount_minor / 100).toFixed(2)} {intent.currency.toUpperCase()}
        </span>
      </div>

      {status === "succeeded" && <p className="status-message success">Payment succeeded</p>}
      {status === "declined" && <p className="status-message error">Declined: {message}</p>}
      {status === "error" && <p className="status-message error">{message}</p>}

      {status !== "succeeded" && (
        <>
          <form onSubmit={handlePay} className="checkout-form">
            <div className="field">
              <label>Card number</label>
              <input value={card.number}
                onChange={(e) => setCard({ ...card, number: e.target.value })} required />
            </div>
            <div className="field-row">
              <div className="field">
                <label>Month</label>
                <input placeholder="MM" value={card.exp_month}
                  onChange={(e) => setCard({ ...card, exp_month: e.target.value })} required />
              </div>
              <div className="field">
                <label>Year</label>
                <input placeholder="YYYY" value={card.exp_year}
                  onChange={(e) => setCard({ ...card, exp_year: e.target.value })} required />
              </div>
              <div className="field">
                <label>CVC</label>
                <input value={card.cvc}
                  onChange={(e) => setCard({ ...card, cvc: e.target.value })} required />
              </div>
            </div>
            <button className="primary" type="submit" disabled={status === "processing"}>
              {status === "processing" ? "Processing..." : "Pay now"}
            </button>
          </form>
          <SecureBadge />
        </>
      )}
    </div>
  );
}