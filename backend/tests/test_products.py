def test_list_products_empty(client):
    res = client.get("/api/v1/products/")
    assert res.status_code == 200
    assert res.json() == []


def test_create_product_requires_admin(client, user_headers):
    res = client.post("/api/v1/products/", json={
        "name": "Trench Coat",
        "price_minor": 15000,
        "stock_quantity": 10,
    }, headers=user_headers)
    assert res.status_code == 403


def test_admin_can_create_product(client, admin_headers):
    res = client.post("/api/v1/products/", json={
        "name": "Trench Coat",
        "price_minor": 15000,
        "stock_quantity": 10,
    }, headers=admin_headers)
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "Trench Coat"
    assert body["average_rating"] is None
    assert body["review_count"] == 0


def test_get_nonexistent_product_404s(client):
    res = client.get("/api/v1/products/9999")
    assert res.status_code == 404


def test_admin_can_delete_product(client, admin_headers):
    create_res = client.post("/api/v1/products/", json={
        "name": "To Delete",
        "price_minor": 5000,
        "stock_quantity": 1,
    }, headers=admin_headers)
    product_id = create_res.json()["id"]

    delete_res = client.delete(f"/api/v1/products/{product_id}", headers=admin_headers)
    assert delete_res.status_code == 204

    get_res = client.get(f"/api/v1/products/{product_id}")
    assert get_res.status_code == 404