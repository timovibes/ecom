"""
Backfills image_url on existing products by searching Unsplash for a photo
matching the product's name.

Demo-tier Unsplash apps are limited to 50 requests/hour, so this script
processes a safe batch (45) per run. Re-run it again after an hour if it
reports remaining products.

Usage:
    pip install requests python-dotenv
    python backfill_product_images.py
"""

import os
import sys
import time

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.environ.get("STORE_API_BASE_URL", "http://localhost:8002")
ADMIN_EMAIL = os.environ.get("STORE_ADMIN_EMAIL", "Admin@gmail.com")
ADMIN_PASSWORD = os.environ.get("STORE_ADMIN_PASSWORD", "123456789")
UNSPLASH_ACCESS_KEY = os.environ.get("UNSPLASH_ACCESS_KEY")

MAX_REQUESTS_PER_RUN = 45  # stay under the 50/hour demo-tier limit


def login(session: requests.Session) -> str:
    resp = session.post(
        f"{BASE_URL}/api/v1/auth/login",
        params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if resp.status_code != 200:
        print(f"Login failed ({resp.status_code}): {resp.text}")
        sys.exit(1)
    token = resp.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    return token


def get_existing_products(session: requests.Session) -> list[dict]:
    all_products = []
    skip = 0
    page_size = 100
    while True:
        resp = session.get(
            f"{BASE_URL}/api/v1/products/",
            params={"limit": page_size, "skip": skip},
        )
        resp.raise_for_status()
        page = resp.json()
        all_products.extend(page)
        if len(page) < page_size:
            break
        skip += page_size
    return all_products


def search_unsplash_image(name: str) -> str | None:
    resp = requests.get(
        "https://api.unsplash.com/search/photos",
        params={"query": name, "per_page": 1, "orientation": "squarish"},
        headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"},
    )
    if resp.status_code == 403:
        print("  ! Unsplash rate limit hit — stopping this run.")
        return "RATE_LIMITED"
    if resp.status_code != 200:
        print(f"  ! Unsplash search failed for '{name}': {resp.status_code}")
        return None
    results = resp.json().get("results", [])
    if not results:
        return None
    return results[0]["urls"]["small"]


def main():
    if not UNSPLASH_ACCESS_KEY:
        print("Missing UNSPLASH_ACCESS_KEY in your .env file.")
        sys.exit(1)

    session = requests.Session()
    print(f"Logging in as {ADMIN_EMAIL} at {BASE_URL} ...")
    login(session)
    print("Logged in.\n")

    products = get_existing_products(session)
    missing_images = [p for p in products if not p.get("image_url")]
    print(f"{len(missing_images)} product(s) missing an image.\n")

    updated = 0
    requests_used = 0

    for p in missing_images:
        if requests_used >= MAX_REQUESTS_PER_RUN:
            break

        image_url = search_unsplash_image(p["name"])
        requests_used += 1

        if image_url == "RATE_LIMITED":
            break
        if not image_url:
            continue

        resp = session.patch(f"{BASE_URL}/api/v1/products/{p['id']}", json={"image_url": image_url})
        if resp.status_code == 200:
            print(f"  + {p['name']}")
            updated += 1
        else:
            print(f"  ! failed to update '{p['name']}': {resp.status_code} {resp.text}")

        time.sleep(0.5)  # be polite to the API

    remaining = len(missing_images) - updated
    print(f"\nDone. Updated {updated} product(s) with an image.")
    if remaining > 0:
        print(f"{remaining} product(s) still need images — re-run this script again in about an hour.")


if __name__ == "__main__":
    main()