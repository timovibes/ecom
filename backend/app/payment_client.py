import uuid
import httpx
from app.config import settings

class PaymentClient:
    def __init__(self):
        self.base_url = settings.payment_api_base_url
        self.secret_key = settings.payment_secret_key

    def create_payment_intent(self, amount_minor: int, currency: str, customer_id: str | None = None,
                               description: str | None = None) -> dict:
        url = f"{self.base_url}/api/v1/payments/payment-intents"
        headers = {"Authorization": f"Bearer {self.secret_key}"}
        payload = {
            "amount_minor": amount_minor,
            "currency": currency,
            "customer_id": customer_id,
            "description": description or "order payment",
            "idempotency_key": str(uuid.uuid4()),
        }
        response = httpx.post(url, json=payload, headers=headers, timeout=15.0)
        response.raise_for_status()
        return response.json()


    def get_payment_intent(self, intent_id: str) -> dict:
        url = f"{self.base_url}/api/v1/payments/payment-intents/{intent_id}"
        headers = {"Authorization": f"Bearer {self.secret_key}"}
        response = httpx.get(url, headers=headers, timeout=15.0)
        response.raise_for_status()
        return response.json()

payment_client = PaymentClient()