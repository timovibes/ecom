"""
Seed script — logs in as an admin user and bulk-creates fashion categories +
products so the store front end has real content to show.

Safe to re-run: existing products (matched by name) are skipped instead of
being created again.

Usage:
    pip install requests
    python seed_store.py
"""

import os
import random
import sys

import requests

BASE_URL = os.environ.get("STORE_API_BASE_URL", "http://localhost:8002")
ADMIN_EMAIL = os.environ.get("STORE_ADMIN_EMAIL", "Admin@gmail.com")
ADMIN_PASSWORD = os.environ.get("STORE_ADMIN_PASSWORD", "123456789")

PRODUCTS_PER_CATEGORY = 14
STOCK_CHOICES = [3, 5, 8, 12, 20]

CATALOG = {
    "Outerwear": [
        "Structured Wool Coat", "Belted Trench Coat", "Oversized Wool Overcoat",
        "Quilted Field Jacket", "Shearling Collar Coat", "Double-Breasted Peacoat",
        "Longline Rain Jacket", "Cropped Bomber Jacket", "Wool-Blend Car Coat",
        "Draped Cape Coat", "Utility Parka", "Tailored Overshirt Jacket",
        "Cashmere Wrap Coat", "Minimalist Trench",
    ],
    "Knitwear": [
        "Cashmere Turtleneck", "Ribbed Wool Sweater", "Merino Crewneck",
        "Oversized Cable Knit", "Fine-Gauge Cardigan", "Wool-Silk Pullover",
        "Turtleneck Sweater Dress", "Chunky Knit Vest", "Alpaca Blend Sweater",
        "Boat Neck Knit Top", "Cropped Cardigan", "Waffle Knit Sweater",
        "Roll Neck Jumper", "Textured Knit Poncho",
    ],
    "Tailoring": [
        "Silk Wide-Leg Trousers", "Poplin Oversized Shirt", "Tailored Wool Blazer",
        "Pleated Midi Skirt", "Straight-Leg Trousers", "Structured Waistcoat",
        "Silk Button-Down Shirt", "Tapered Wool Trousers", "Double-Breasted Blazer",
        "Wide-Collar Shirt Dress", "Pinstripe Trousers", "Linen Tailored Shirt",
        "Cropped Tailored Trousers", "Satin Slip Dress",
    ],
    "Accessories": [
        "Minimalist Leather Tote", "Brushed Gold Cuff", "Structured Crossbody Bag",
        "Silk Twill Scarf", "Leather Card Holder", "Sculptural Drop Earrings",
        "Wool Felt Fedora", "Leather Belt", "Oversized Sunglasses",
        "Fine Chain Necklace", "Leather Gloves", "Cashmere Scarf",
        "Structured Clutch", "Signet Ring",
    ],
}


def login(session: requests.Session) -> str:
    resp = session.post(
        f"{BASE_URL}/api/v1/auth/login",
        params={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
    )
    if resp.status_code != 200:
        print(f"Login failed ({resp.status_code}): {resp.text}")
        print("Make sure STORE_ADMIN_EMAIL / STORE_ADMIN_PASSWORD are correct")
        print("and that the account has is_admin = true in the database.")
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


def get_or_create_category(session: requests.Session, name: str) -> int:
    resp = session.get(f"{BASE_URL}/api/v1/categories/")
    resp.raise_for_status()
    for cat in resp.json():
        if cat["name"] == name:
            return cat["id"]

    resp = session.post(f"{BASE_URL}/api/v1/categories/", json={"name": name})
    if resp.status_code == 201:
        return resp.json()["id"]
    if resp.status_code == 400:
        resp = session.get(f"{BASE_URL}/api/v1/categories/")
        resp.raise_for_status()
        for cat in resp.json():
            if cat["name"] == name:
                return cat["id"]
    resp.raise_for_status()


def create_product(session: requests.Session, name: str, category_id: int, category_name: str) -> bool:
    price_minor = random.randint(3000, 18000) * 10  # roughly 30,000 - 180,000 KES cents
    stock = random.choice(STOCK_CHOICES)
    payload = {
        "name": name,
        "description": f"{name} — from our {category_name} range. "
                        f"Crafted with quality materials and considered detailing.",
        "price_minor": price_minor,
        "currency": "kes",
        "stock_quantity": stock,
        "category_id": category_id,
    }
    resp = session.post(f"{BASE_URL}/api/v1/products/", json=payload)
    if resp.status_code != 201:
        print(f"  ! failed to create '{name}': {resp.status_code} {resp.text}")
        return False
    return True


def main():
    session = requests.Session()
    print(f"Logging in as {ADMIN_EMAIL} at {BASE_URL} ...")
    login(session)
    print("Logged in.\n")

    existing_names = {p["name"] for p in get_existing_products(session)}
    print(f"Found {len(existing_names)} existing product(s) — these will be skipped.\n")

    total_created = 0
    total_skipped = 0

    for category_name, product_names in CATALOG.items():
        print(f"Category: {category_name}")
        category_id = get_or_create_category(session, category_name)

        for name in product_names[:PRODUCTS_PER_CATEGORY]:
            if name in existing_names:
                total_skipped += 1
                continue
            ok = create_product(session, name, category_id, category_name)
            if ok:
                existing_names.add(name)
                total_created += 1
                print(f"  + {name}")

    print(f"\nDone. Created {total_created} product(s), skipped {total_skipped} already-existing product(s).")


if __name__ == "__main__":
    main()