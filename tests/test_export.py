from allotment.domain import Selection
from allotment.adapters.export import CsvJsonExport


def test_csv_export_contains_only_selected(sample_pool):
    sel = Selection(candidate_ids=["c0", "c2"], realised_probabilities={})
    res = CsvJsonExport("csv").provision(sample_pool, sel, {})
    assert res.kind == "export"
    assert "c0" in res.export and "c2" in res.export and "c1" not in res.export.splitlines()[1:][0]
