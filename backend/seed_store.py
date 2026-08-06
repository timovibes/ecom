"""
Seed script — logs in as an admin user and bulk-creates categories + products
so the store front end has real content to show instead of an empty grid.

Usage:
    pip install requests
    python seed_store.py

Configure the constants below (or set them as environment variables of the
same name) before running.
"""

import os
import random
import sys

import requests

BASE_URL = os.environ.get("STORE_API_BASE_URL", "http://localhost:8002")
ADMIN_EMAIL = os.environ.get("STORE_ADMIN_EMAIL", "Admin@gmail.com")
ADMIN_PASSWORD = os.environ.get("STORE_ADMIN_PASSWORD", "123456789")

# How many products to create per category.
PRODUCTS_PER_CATEGORY = 12

CATALOG = {
    "Electronics": [
        "Wireless Earbuds", "Bluetooth Speaker", "27-inch Monitor", "Mechanical Keyboard",
        "Wireless Mouse", "USB-C Hub", "Portable Power Bank", "Smart Watch",
        "Noise Cancelling Headphones", "Webcam 1080p", "Laptop Stand", "HDMI Cable 2m",
    ],
    "Home & Kitchen": [
        "Stainless Steel Kettle", "Non-stick Frying Pan Set", "Ceramic Dinner Set",
        "French Press Coffee Maker", "Cutting Board Set", "Electric Blender",
        "Toaster 2-Slice", "Knife Block Set", "Storage Container Set", "Table Lamp",
        "Throw Pillow Set", "Cotton Bath Towel Set",
    ],
    "Clothing": [
        "Men's Cotton T-Shirt", "Women's Denim Jacket", "Unisex Hoodie", "Slim Fit Chinos",
        "Running Shorts", "Wool Sweater", "Rain Jacket", "Leather Belt",
        "Canvas Sneakers", "Baseball Cap", "Ankle Socks 3-Pack", "Linen Shirt",
    ],
    "Books": [
        "The Midnight Library", "Atomic Habits", "Sapiens: A Brief History of Humankind",
        "Project Hail Mary", "The Silent Patient", "Educated: A Memoir",
        "Dune", "The Psychology of Money", "Where the Crawdads Sing",
        "Klara and the Sun", "The Four Winds", "Deep Work",
    ],
    "Sports & Outdoors": [
        "Yoga Mat", "Adjustable Dumbbell Set", "Running Shoes", "Camping Tent 2-Person",
        "Insulated Water Bottle", "Resistance Bands Set", "Cycling Helmet",
        "Hiking Backpack 30L", "Jump Rope", "Foam Roller", "Sleeping Bag", "Sports Duffel Bag",
    ],
    "Beauty & Personal Care": [
        "Vitamin C Serum", "Electric Toothbrush", "Hair Dryer", "Facial Cleanser",
        "Moisturizing Body Lotion", "Sunscreen SPF 50", "Beard Trimmer", "Perfume 100ml",
        "Makeup Brush Set", "Shampoo & Conditioner Set", "Nail Care Kit", "Lip Balm 3-Pack",
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
        # created by a concurrent run / race — fetch again
        resp = session.get(f"{BASE_URL}/api/v1/categories/")
        resp.raise_for_status()
        for cat in resp.json():
            if cat["name"] == name:
                return cat["id"]
    resp.raise_for_status()


def create_product(session: requests.Session, name: str, category_id: int, category_name: str) -> bool:
    price_minor = random.randint(500, 15000) * 10  # e.g. 5,000 - 150,000 (KES cents)
    stock = random.choice([0, 3, 5, 8, 12, 20, 40])
    payload = {
        "name": name,
        "description": f"{name} — a great pick from our {category_name} range. "
                        f"Quality checked and ready to ship.",
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

    total_created = 0
    for category_name, product_names in CATALOG.items():
        print(f"Category: {category_name}")
        category_id = get_or_create_category(session, category_name)

        for name in product_names[:PRODUCTS_PER_CATEGORY]:
            ok = create_product(session, name, category_id, category_name)
            if ok:
                total_created += 1
                print(f"  + {name}")

    print(f"\nDone. Created {total_created} products across {len(CATALOG)} categories.")


if __name__ == "__main__":
    main()