def test_full_autonomous_soc_e2e_flow(client):
    # 1. Login
    login_resp = client.post("/api/auth/login", json={
        "username_or_email": "analyst",
        "password": "AnalystPass123!"
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Run Brute-Force Attack Simulation
    sim_resp = client.post("/api/simulations/run", json={"scenario": "BRUTE_FORCE"}, headers=headers)
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert sim_data["scenario"] == "BRUTE_FORCE"
    assert sim_data["status"] == "COMPLETED"
    assert sim_data["events_generated"] > 0
    assert sim_data["incidents_generated"] > 0

    # 3. Verify Incidents Created
    inc_resp = client.get("/api/incidents", headers=headers)
    assert inc_resp.status_code == 200
    inc_list = inc_resp.json()["items"]
    assert len(inc_list) > 0
    target_inc = inc_list[0]
    assert "INC-" in target_inc["incident_number"]
    assert target_inc["severity"] in ["HIGH", "CRITICAL"]

    # 4. Inspect Incident Detail
    inc_id = target_inc["id"]
    detail_resp = client.get(f"/api/incidents/{inc_id}", headers=headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert len(detail["events"]) > 0
    assert len(detail["mitre_techniques"]) > 0
    assert any(m["technique_id"] == "T1110" for m in detail["mitre_techniques"])

    # 5. Add Analyst Note
    note_resp = client.post(f"/api/incidents/{inc_id}/notes", json={
        "note": "Analyst verified anomalous brute-force cluster from 198.51.100.45"
    }, headers=headers)
    assert note_resp.status_code == 200
    assert "Analyst verified" in note_resp.json()["note"]

    # 6. Execute Simulated Containment
    contain_resp = client.post(f"/api/incidents/{inc_id}/contain", json={
        "containment_type": "ISOLATE_HOST",
        "reason": "Suspicious privilege elevation following brute force"
    }, headers=headers)
    assert contain_resp.status_code == 200
    contain_data = contain_resp.json()
    assert contain_data["status"] == "CONTAINED"
    assert contain_data["is_simulation_only"] is True

    # 7. Check Audit Logs
    audit_resp = client.get("/api/audit/logs", headers=headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()["items"]
    assert len(logs) > 0
    assert any(l["action"] == "simulated_containment" for l in logs)
