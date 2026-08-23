import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def admin_headers(client):
    client.post("/api/v1/auth/signup", json={
        "email": "admin@test.com",
        "password": "adminpass123",
        "full_name": "Admin User",
    })
    # Promote to admin directly via the test DB session, since signup never grants it.
    from app.models.user import User
    session = TestingSessionLocal()
    user = session.query(User).filter(User.email == "admin@test.com").first()
    user.is_admin = True
    session.commit()
    session.close()

    res = client.post("/api/v1/auth/login", params={"email": "admin@test.com", "password": "adminpass123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def user_headers(client):
    client.post("/api/v1/auth/signup", json={
        "email": "user@test.com",
        "password": "userpass123",
        "full_name": "Regular User",
    })
    res = client.post("/api/v1/auth/login", params={"email": "user@test.com", "password": "userpass123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}