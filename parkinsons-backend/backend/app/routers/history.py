import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_verified_user
from app.database import get_db, User, Sample, Report, AuditLog
from app.schemas.sample import HistoryItem, SampleOut

router = APIRouter(tags=["History & Records"])


@router.get("/history", response_model=list[HistoryItem])
def get_history(
    drawing_type: Optional[str] = Query(default=None, description="Filter by drawing type (e.g. 'handwriting')"),
    predicted_label: Optional[str] = Query(default=None, description="Filter by 'healthy' or 'parkinson'"),
    search: Optional[str] = Query(default=None, description="Search by severity band text"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    query = db.query(Sample).filter(Sample.user_id == current_user.id)
    if drawing_type:
        query = query.filter(Sample.drawing_type == drawing_type)

    samples = query.order_by(Sample.uploaded_at.desc()).all()

    items = []
    for sample in samples:
        report = sample.report
        if predicted_label and (not report or report.predicted_label != predicted_label):
            continue
        if search and (not report or search.lower() not in (report.severity_band or "").lower()):
            continue
        items.append({"sample": sample, "report": report})
    return items


@router.get("/samples/{sample_id}", response_model=SampleOut)
def get_sample(sample_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_verified_user)):
    sample = db.query(Sample).filter(Sample.id == sample_id, Sample.user_id == current_user.id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    return sample


@router.delete("/samples/{sample_id}", response_model=dict)
def delete_sample(sample_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_verified_user)):
    sample = db.query(Sample).filter(Sample.id == sample_id, Sample.user_id == current_user.id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    # Clean up files from disk
    if sample.report and sample.report.pdf_path and os.path.exists(sample.report.pdf_path):
        os.remove(sample.report.pdf_path)
    if os.path.exists(sample.image_path):
        os.remove(sample.image_path)

    db.add(AuditLog(user_id=current_user.id, action="sample_deleted", detail=f"sample_id={sample_id}"))
    db.delete(sample)
    db.commit()
    return {"message": "Sample and associated report deleted"}


@router.get("/reports/{report_id}/pdf")
def download_report(report_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_verified_user)):
    report = (
        db.query(Report)
        .join(Sample, Report.sample_id == Sample.id)
        .filter(Report.id == report_id, Sample.user_id == current_user.id)
        .first()
    )
    if not report or not report.pdf_path or not os.path.exists(report.pdf_path):
        raise HTTPException(status_code=404, detail="Report PDF not found")
    return FileResponse(report.pdf_path, media_type="application/pdf", filename=f"report_{report_id}.pdf")
