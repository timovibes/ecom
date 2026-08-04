import axios from "axios";

const paymentClient = axios.create({
  baseURL: import.meta.env.VITE_PAYMENT_API_BASE_URL,
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_PAYMENT_PUBLISHABLE_KEY}`,
  },
});

export async function tokenizeCard(cardDetails) {
  const res = await paymentClient.post("/api/v1/checkout/payment-methods", cardDetails);
  return res.data; // { id: payment_method_id, ... }
}

export async function confirmPaymentIntent(intentId, clientSecret, paymentMethodId) {
  const res = await paymentClient.post(
    `/api/v1/checkout/payment-intents/${intentId}/confirm`,
    { payment_method_id: paymentMethodId },
    { params: { client_secret: clientSecret } }
  );
  return res.data;
}