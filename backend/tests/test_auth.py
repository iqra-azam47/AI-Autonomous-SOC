def test_login_success(client):
    response = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "AdminPass123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "admin"
    assert data["user"]["role_name"] == "ADMIN"

def test_login_failure_bad_credentials(client):
    response = client.post("/api/auth/login", json={
        "username_or_email": "admin",
        "password": "WrongPassword!"
    })
    assert response.status_code == 401

def test_get_current_user_profile(client):
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "analyst",
        "password": "AnalystPass123!"
    })
    token = login_resp.json()["access_token"]

    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["username"] == "analyst"
    assert me_data["role_name"] == "ANALYST"

def test_cors_origin_normalization():
    from app.core.config import Settings
    s = Settings(CORS_ORIGINS="https://frontend.onrender.com/, http://localhost:5173 / ")
    # Must contain origin without trailing slash per RFC 6454 browser serialization
    assert "https://frontend.onrender.com" in s.cors_origins_list

