def test_signup_creates_user(client):
    res = client.post("/api/v1/auth/signup", json={
        "email": "new@test.com",
        "password": "securepass123",
        "full_name": "New User",
    })
    assert res.status_code in (200, 201)


def test_signup_duplicate_email_fails(client):
    payload = {"email": "dup@test.com", "password": "securepass123", "full_name": "Dup"}
    client.post("/api/v1/auth/signup", json=payload)
    res = client.post("/api/v1/auth/signup", json=payload)
    assert res.status_code >= 400


def test_login_returns_access_token(client):
    client.post("/api/v1/auth/signup", json={
        "email": "login@test.com",
        "password": "securepass123",
        "full_name": "Login Test",
    })
    res = client.post("/api/v1/auth/login", params={"email": "login@test.com", "password": "securepass123"})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password_fails(client):
    client.post("/api/v1/auth/signup", json={
        "email": "wrongpass@test.com",
        "password": "correctpass123",
        "full_name": "Test",
    })
    res = client.post("/api/v1/auth/login", params={"email": "wrongpass@test.com", "password": "wrongpass"})
    assert res.status_code == 401