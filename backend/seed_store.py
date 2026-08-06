"""
Seed script — logs in as an admin user and bulk-creates categories + products
so the store front end has real content to show instead of an empty grid.

Safe to re-run: existing products (matched by name) are skipped instead of
being created again.

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
PRODUCTS_PER_CATEGORY = 16

CATALOG = {
    "Electronics": [
        "Wireless Earbuds", "Bluetooth Speaker", "27-inch Monitor", "Mechanical Keyboard",
        "Wireless Mouse", "USB-C Hub", "Portable Power Bank", "Smart Watch",
        "Noise Cancelling Headphones", "Webcam 1080p", "Laptop Stand", "HDMI Cable 2m",
        "Wireless Charger Pad", "External SSD 1TB", "Smart Plug", "Action Camera",
    ],
    "Home & Kitchen": [
        "Stainless Steel Kettle", "Non-stick Frying Pan Set", "Ceramic Dinner Set",
        "French Press Coffee Maker", "Cutting Board Set", "Electric Blender",
        "Toaster 2-Slice", "Knife Block Set", "Storage Container Set", "Table Lamp",
        "Throw Pillow Set", "Cotton Bath Towel Set", "Air Fryer", "Rice Cooker",
        "Dish Rack", "Laundry Basket",
    ],
    "Clothing": [
        "Men's Cotton T-Shirt", "Women's Denim Jacket", "Unisex Hoodie", "Slim Fit Chinos",
        "Running Shorts", "Wool Sweater", "Rain Jacket", "Leather Belt",
        "Canvas Sneakers", "Baseball Cap", "Ankle Socks 3-Pack", "Linen Shirt",
        "Summer Dress", "Track Pants", "Denim Shorts", "Flannel Shirt",
    ],
    "Books": [
        "The Midnight Library", "Atomic Habits", "Sapiens: A Brief History of Humankind",
        "Project Hail Mary", "The Silent Patient", "Educated: A Memoir",
        "Dune", "The Psychology of Money", "Where the Crawdads Sing",
        "Klara and the Sun", "The Four Winds", "Deep Work",
        "Ikigai", "Thinking, Fast and Slow", "The Alchemist", "Zero to One",
    ],
    "Sports & Outdoors": [
        "Yoga Mat", "Adjustable Dumbbell Set", "Running Shoes", "Camping Tent 2-Person",
        "Insulated Water Bottle", "Resistance Bands Set", "Cycling Helmet",
        "Hiking Backpack 30L", "Jump Rope", "Foam Roller", "Sleeping Bag", "Sports Duffel Bag",
        "Football", "Skipping Mat", "Fishing Rod", "Camping Chair",
    ],
    "Beauty & Personal Care": [
        "Vitamin C Serum", "Electric Toothbrush", "Hair Dryer", "Facial Cleanser",
        "Moisturizing Body Lotion", "Sunscreen SPF 50", "Beard Trimmer", "Perfume 100ml",
        "Makeup Brush Set", "Shampoo & Conditioner Set", "Nail Care Kit", "Lip Balm 3-Pack",
        "Hair Straightener", "Body Wash", "Face Mask Set", "Deodorant 2-Pack",
    ],
    "Toys & Games": [
        "Building Blocks Set", "Board Game Classic Pack", "Remote Control Car",
        "Puzzle 1000 Pieces", "Plush Teddy Bear", "Action Figure Set",
        "Card Game Deck", "Kids Art Supplies Kit", "Toy Kitchen Set", "Building Robot Kit",
        "Wooden Train Set", "Water Gun", "Kite", "Bubble Maker",
        "Doll House", "Kids Bicycle Helmet",
    ],
    "Office & Stationery": [
        "Notebook A5 Ruled", "Ballpoint Pen Pack", "Desk Organizer", "Sticky Notes Set",
        "Highlighter Set", "Stapler", "Whiteboard Markers", "File Folders Pack",
        "Desk Calendar", "Scissors", "Correction Tape", "Push Pins Box",
        "Clipboard", "Envelope Pack", "Label Maker", "Ring Binder",
    ],
}

# Extra products with odd-cent prices (e.g. .01 / .02 / .03) to check
# rounding/display behaviour on the frontend. Named normally so they don't
# stand out as obvious test data in the UI.
ODD_CENT_TEST_PRODUCTS = [
    {"name": "Wireless Charging Cable", "category": "Electronics", "price_minor": 901},
    {"name": "Bamboo Cutting Board", "category": "Home & Kitchen", "price_minor": 1902},
    {"name": "Fleece Zip Hoodie", "category": "Clothing", "price_minor": 4903},
    {"name": "The Night Circus", "category": "Books", "price_minor": 9901},
    {"name": "Adjustable Yoga Block", "category": "Sports & Outdoors", "price_minor": 14902},
    {"name": "Rose Water Toner", "category": "Beauty & Personal Care", "price_minor": 19903},
]


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


def get_existing_product_names(session: requests.Session) -> set[str]:
    resp = session.get(f"{BASE_URL}/api/v1/products/")
    resp.raise_for_status()
    return {p["name"] for p in resp.json()}


def rename_existing_test_products(session: requests.Session) -> None:
    """One-time fix: renames any leftover 'Test Product X.XX' rows (from an
    older version of this script) to normal names, matched by price_minor.
    Prices are left untouched since the odd-cent values are needed for
    rounding/display testing."""
    resp = session.get(f"{BASE_URL}/api/v1/products/", params={"limit": 100})
    resp.raise_for_status()
    products = resp.json()

    targets = [p for p in products if p["name"].startswith("Test Product ")]
    if not targets:
        return

    print(f"Renaming {len(targets)} old test-named product(s)...")
    for p in targets:
        new_name = next(
            (i["name"] for i in ODD_CENT_TEST_PRODUCTS if i["price_minor"] == p["price_minor"]),
            None,
        )
        if not new_name:
            continue
        resp = session.patch(f"{BASE_URL}/api/v1/products/{p['id']}", json={"name": new_name})
        if resp.status_code == 200:
            print(f"  - renamed '{p['name']}' -> '{new_name}'")
        else:
            print(f"  ! failed to rename '{p['name']}' (id={p['id']}): {resp.status_code} {resp.text}")


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


def create_product(
    session: requests.Session,
    name: str,
    category_id: int,
    category_name: str,
    price_minor: int | None = None,
) -> bool:
    if price_minor is None:
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

    rename_existing_test_products(session)

    existing_names = get_existing_product_names(session)
    print(f"Found {len(existing_names)} existing product(s) — these will be skipped.\n")

    total_created = 0
    total_skipped = 0
    category_ids = {}

    for category_name, product_names in CATALOG.items():
        print(f"Category: {category_name}")
        category_id = get_or_create_category(session, category_name)
        category_ids[category_name] = category_id

        for name in product_names[:PRODUCTS_PER_CATEGORY]:
            if name in existing_names:
                total_skipped += 1
                continue
            ok = create_product(session, name, category_id, category_name)
            if ok:
                existing_names.add(name)
                total_created += 1
                print(f"  + {name}")

    print("\nOdd-cent test products:")
    for item in ODD_CENT_TEST_PRODUCTS:
        name = item["name"]
        if name in existing_names:
            total_skipped += 1
            continue
        category_name = item["category"]
        category_id = category_ids.get(category_name) or get_or_create_category(session, category_name)
        ok = create_product(session, name, category_id, category_name, price_minor=item["price_minor"])
        if ok:
            existing_names.add(name)
            total_created += 1
            print(f"  + {name}")

    print(f"\nDone. Created {total_created} product(s), skipped {total_skipped} already-existing product(s).")


if __name__ == "__main__":
    main()