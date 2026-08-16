import { useState } from "react";
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

export default function Checkout() {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const intent = location.state; // { payment_intent_id, client_secret, amount_minor, currency }

  const [card, setCard] = useState({ number: "", exp_month: "", exp_year: "", cvc: "" });
  const [status, setStatus] = useState("idle"); // idle | processing | succeeded | declined | error
  const [message, setMessage] = useState("");

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
    <div style={{ maxWidth: 440 }}>
      <h2 style={{ marginBottom: 24 }}>Payment</h2>

      <div className="checkout-summary" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="muted">Order #{orderId}</span>
        <span className="price" style={{ fontSize: 18 }}>
          {(intent.amount_minor / 100).toFixed(2)} {intent.currency.toUpperCase()}
        </span>
      </div>

      {status === "succeeded" && <p className="status-message success">Payment succeeded</p>}
      {status === "declined" && <p className="status-message error">Declined: {message}</p>}
      {status === "error" && <p className="status-message error">{message}</p>}

      {status !== "succeeded" && (
        <form onSubmit={handlePay} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
      )}
    </div>
  );
}