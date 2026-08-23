def _create_product(client, admin_headers):
    res = client.post("/api/v1/products/", json={
        "name": "Wool Coat",
        "price_minor": 20000,
        "stock_quantity": 5,
    }, headers=admin_headers)
    return res.json()["id"]


def test_list_reviews_empty(client, admin_headers):
    product_id = _create_product(client, admin_headers)
    res = client.get(f"/api/v1/products/{product_id}/reviews/")
    assert res.status_code == 200
    assert res.json() == []


def test_create_review_requires_auth(client, admin_headers):
    product_id = _create_product(client, admin_headers)
    res = client.post(f"/api/v1/products/{product_id}/reviews/", json={"rating": 5})
    assert res.status_code == 401


def test_authenticated_user_can_review(client, admin_headers, user_headers):
    product_id = _create_product(client, admin_headers)
    res = client.post(f"/api/v1/products/{product_id}/reviews/", json={
        "rating": 4,
        "comment": "Great fit, warm fabric.",
    }, headers=user_headers)
    assert res.status_code == 201
    body = res.json()
    assert body["rating"] == 4
    assert body["user_name"] == "Regular User"


def test_review_reflects_in_product_average(client, admin_headers, user_headers):
    product_id = _create_product(client, admin_headers)
    client.post(f"/api/v1/products/{product_id}/reviews/", json={"rating": 4}, headers=user_headers)

    res = client.get(f"/api/v1/products/{product_id}")
    body = res.json()
    assert body["average_rating"] == 4.0
    assert body["review_count"] == 1


def test_user_cannot_review_same_product_twice(client, admin_headers, user_headers):
    product_id = _create_product(client, admin_headers)
    client.post(f"/api/v1/products/{product_id}/reviews/", json={"rating": 5}, headers=user_headers)
    res = client.post(f"/api/v1/products/{product_id}/reviews/", json={"rating": 3}, headers=user_headers)
    assert res.status_code == 400


def test_review_invalid_rating_rejected(client, admin_headers, user_headers):
    product_id = _create_product(client, admin_headers)
    res = client.post(f"/api/v1/products/{product_id}/reviews/", json={"rating": 7}, headers=user_headers)
    assert res.status_code == 422


def test_review_on_nonexistent_product_404s(client, user_headers):
    res = client.post("/api/v1/products/9999/reviews/", json={"rating": 5}, headers=user_headers)
    assert res.status_code == 404