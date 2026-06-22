from fastapi.testclient import TestClient
from allotment.api.app import create_app

H = {"Authorization": "Bearer dev-token-change-me"}
CSV = "id,contact,gender,age\n" + "\n".join(
    f"c{i},c{i}@x.org,{'F' if i%2==0 else 'M'},{'young' if i%4<2 else 'old'}" for i in range(40))


def test_full_flow():
    c = TestClient(create_app())
    a = c.post("/api/assemblies", json={"name": "T", "question": "Q?"}, headers=H).json()
    c.post(f"/api/assemblies/{a['assembly_id']}/pool",
           json={"csv": CSV, "feature_columns": ["gender", "age"]}, headers=H)
    d = c.post(f"/api/assemblies/{a['assembly_id']}/draw",
               json={"panel_size": 10, "panel_count": 15, "seed": 5,
                     "targets": [{"feature": "gender", "value": "F", "min": 5, "max": 5},
                                 {"feature": "gender", "value": "M", "min": 5, "max": 5}]},
               headers=H)
    assert d.status_code == 200
    body = d.json()
    assert len(body["selection"]["candidate_ids"]) == 10
    assert body["quota_fill"]["gender=F"] == 5
    hand = c.post(f"/api/draws/{body['draw_id']}/handoff",
                  json={"target": "export", "fmt": "json"}, headers=H)
    assert hand.json()["kind"] == "export"
