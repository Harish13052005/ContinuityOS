def test_register_and_login(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "secret123",
    })
    assert r.status_code == 201
    r = client.post("/api/v1/auth/login", data={"username": "test@example.com", "password": "secret123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_create_and_list_projects(client):
    # Register and login first
    r = client.post("/api/v1/auth/register", json={
        "email": "test2@example.com",
        "full_name": "Test User 2",
        "password": "secret123",
    })
    assert r.status_code == 201
    r = client.post("/api/v1/auth/login", data={"username": "test2@example.com", "password": "secret123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    
    # Use token for authenticated requests
    r = client.post(
        "/api/v1/projects", 
        json={"name": "Demo", "description": "desc"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 201
    r = client.get(
        "/api/v1/projects", 
        headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
    assert len(r.json()) >= 1