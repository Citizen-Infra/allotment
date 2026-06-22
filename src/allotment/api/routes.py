import json, secrets
from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, Depends, HTTPException
from allotment.api.auth import require_operator
from allotment.api.schemas import CreateAssembly, UploadPool, RunDraw, Handoff
from allotment.config import get_settings
from allotment.db.session import make_session
from allotment.db.repo import AssemblyRepo
from allotment.domain import QuotaConfig
from allotment.pool_csv import parse_pool_csv, PoolValidationError
from allotment.quotas import precheck_feasibility
from allotment.selection_core.audit import run_draw, build_audit_record
from allotment.selection_core.panels import InfeasibleError
from allotment.adapters.export import CsvJsonExport
from allotment.adapters.harmonica import HarmonicaAdapter

router = APIRouter(prefix="/api", dependencies=[Depends(require_operator)])


def _repo():
    s = make_session()
    try:
        yield AssemblyRepo(s)
        s.commit()
    finally:
        s.close()


@router.post("/assemblies")
def create_assembly(body: CreateAssembly, repo=Depends(_repo)):
    a = repo.create_assembly(body.name, body.question)
    return {"assembly_id": a.id}


@router.post("/assemblies/{assembly_id}/pool")
def upload_pool(assembly_id: str, body: UploadPool, repo=Depends(_repo)):
    try:
        pool = parse_pool_csv(body.csv, body.feature_columns, body.id_column, body.contact_column)
    except PoolValidationError as e:
        raise HTTPException(422, detail=e.errors)
    days = get_settings().pool_retention_days
    repo.save_pool(assembly_id, pool, purge_after=datetime.now(UTC) + timedelta(days=days))
    return {"candidate_count": len(pool.candidates),
            "features": [f.model_dump() for f in pool.features]}


@router.post("/assemblies/{assembly_id}/draw")
def draw(assembly_id: str, body: RunDraw, repo=Depends(_repo)):
    pool = repo.get_pool(assembly_id)
    if pool is None:
        raise HTTPException(404, detail="pool not found (uploaded? purged?)")
    config = QuotaConfig(panel_size=body.panel_size, targets=body.targets)
    warnings = precheck_feasibility(pool, config)
    seed = body.seed if body.seed is not None else secrets.randbelow(2**31)
    try:
        result = run_draw(pool, config, body.panel_count, seed)
    except InfeasibleError as e:
        raise HTTPException(422, detail={"error": str(e), "warnings": warnings})
    audit = build_audit_record(pool, config, result)
    row = repo.save_draw(assembly_id, config, result, audit.model_dump_json())
    return {"draw_id": row.id, "selection": result.selection.model_dump(),
            "quota_fill": result.quota_fill, "audit": audit.model_dump(mode="json"),
            "warnings": warnings}


@router.get("/draws/{draw_id}")
def get_draw(draw_id: str, repo=Depends(_repo)):
    row = repo.get_draw(draw_id)
    if row is None:
        raise HTTPException(404, detail="draw not found")
    return {"selection": json.loads(row.selection_json),
            "audit": json.loads(row.audit_json), "config": json.loads(row.config_json)}


@router.post("/draws/{draw_id}/handoff")
def handoff(draw_id: str, body: Handoff, repo=Depends(_repo)):
    row = repo.get_draw(draw_id)
    if row is None:
        raise HTTPException(404, detail="draw not found")
    pool = repo.get_pool(row.assembly_id)
    if pool is None:
        raise HTTPException(409, detail="pool purged; cannot hand off")
    from allotment.domain import Selection
    selection = Selection(**json.loads(row.selection_json))
    if body.target == "export":
        return CsvJsonExport(body.fmt).provision(pool, selection, {}).model_dump()  # type: ignore[arg-type]
    if body.target == "harmonica":
        s = get_settings()
        adapter = HarmonicaAdapter(s.harmonica_base_url, s.harmonica_api_key)
        return adapter.provision(pool, selection, body.session_config).model_dump()
    raise HTTPException(400, detail="unknown target")
