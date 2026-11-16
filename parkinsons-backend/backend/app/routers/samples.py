import os
import shutil
import sys
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "..", "ml"))

from app.core.config import settings
from app.core.deps import get_current_verified_user
from app.database import get_db, User, Sample, Report, BatchReport, AuditLog
from app.schemas.sample import SampleOut, ReportOut, BatchAnalyzeRequest, BatchReportOut
from app.report_generator import generate_pdf_report, generate_batch_pdf_report
from app.services.email_service import send_report_email

router = APIRouter(tags=["Parkinson Analysis"])

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)


def _require_profile(user: User):
    if not user.profile_completed or not user.profile:
        raise HTTPException(status_code=403, detail="Please complete your patient profile before using the analysis feature.")


def _validate_upload(file: UploadFile):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Allowed: {settings.ALLOWED_IMAGE_EXTENSIONS}")
    if file.content_type not in settings.ALLOWED_IMAGE_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported content type '{file.content_type}'")


@router.post("/samples", response_model=SampleOut)
async def upload_sample(
    drawing_type: str = Form("handwriting"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    _require_profile(current_user)

    _validate_upload(file)

    # Enforce max upload size by reading in chunks and counting bytes
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    ext = os.path.splitext(file.filename)[1] or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(UPLOADS_DIR, filename)

    size = 0
    with open(save_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                buffer.close()
                os.remove(save_path)
                raise HTTPException(status_code=413, detail=f"File too large. Max size is {settings.MAX_UPLOAD_SIZE_MB}MB")
            buffer.write(chunk)

    db_sample = Sample(user_id=current_user.id, image_path=save_path, drawing_type=drawing_type)
    db.add(db_sample)
    db.add(AuditLog(user_id=current_user.id, action="sample_uploaded", detail=f"drawing_type={drawing_type}"))
    db.commit()
    db.refresh(db_sample)
    return db_sample


@router.post("/samples/{sample_id}/analyze", response_model=ReportOut)
def analyze_sample(
    sample_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    sample = db.query(Sample).filter(Sample.id == sample_id, Sample.user_id == current_user.id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    from inference import get_predictor

    try:
        predictor = get_predictor("handwriting")
        result = predictor.predict(sample.image_path)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Model not available yet: {e}. Train the model first (see ml/train_cnn_fixed.py and ml/train_classical.py).",
        )

    db_report = Report(
        sample_id=sample.id,
        predicted_label=result["predicted_label"],
        confidence=result["confidence"],
        severity_band=result["severity_band"],
        cnn_score=result["cnn_score"],
        classical_score=result["classical_score"],
        tremor_index=result["features"]["tremor_index"],
        smoothness_score=result["features"]["smoothness_score"],
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    profile = current_user.profile
    pdf_path = generate_pdf_report(
        patient={"name": profile.full_name, "age": profile.age, "gender": profile.gender},
        sample_image_path=sample.image_path,
        result={**result, "generated_at": str(db_report.generated_at)},
        report_id=db_report.id,
    )
    db_report.pdf_path = pdf_path
    db.add(AuditLog(user_id=current_user.id, action="sample_analyzed", detail=f"sample_id={sample_id}, label={result['predicted_label']}"))
    db.commit()
    db.refresh(db_report)

    # Email the report in the background so the API responds immediately
    background_tasks.add_task(
        send_report_email, db, current_user.id, current_user.email, pdf_path,
        result["predicted_label"], result["confidence"],
    )

    return db_report


@router.post("/samples/batch-analyze", response_model=BatchReportOut)
def batch_analyze_samples(
    payload: BatchAnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    """
    Analyzes multiple samples together (e.g. 5 spiral + 5 wave uploads) as one
    batch. Each sample is run through the model individually and gets its own
    Report row, exactly as with /samples/{id}/analyze. The final result is
    then decided by MAJORITY VOTE across those individual predictions - not
    by averaging confidence and thresholding - so a single unusual or
    poorly-photographed drawing can't flip the overall result on its own.
    """
    sample_ids = payload.sample_ids

    samples = (
        db.query(Sample)
        .filter(Sample.id.in_(sample_ids), Sample.user_id == current_user.id)
        .all()
    )
    if len(samples) != len(sample_ids):
        raise HTTPException(status_code=404, detail="One or more samples were not found or don't belong to you.")

    # Preserve a consistent, deterministic order regardless of DB return order
    samples_by_id = {s.id: s for s in samples}
    samples = [samples_by_id[sid] for sid in sample_ids]

    from inference import get_predictor
    predictor = get_predictor("handwriting")

    individual_reports = []
    votes_parkinson = 0
    votes_healthy = 0
    confidences, cnn_scores, classical_scores, tremors, smoothness = [], [], [], [], []

    for sample in samples:
        try:
            result = predictor.predict(sample.image_path)
        except FileNotFoundError as e:
            raise HTTPException(
                status_code=503,
                detail=f"Model not available yet: {e}. Train the model first (see ml/train_cnn_fixed.py and ml/train_classical.py).",
            )

        db_report = Report(
            sample_id=sample.id,
            predicted_label=result["predicted_label"],
            confidence=result["confidence"],
            severity_band=result["severity_band"],
            cnn_score=result["cnn_score"],
            classical_score=result["classical_score"],
            tremor_index=result["features"]["tremor_index"],
            smoothness_score=result["features"]["smoothness_score"],
        )
        db.add(db_report)
        db.flush()  # assigns db_report.id without committing the whole transaction yet
        individual_reports.append(db_report)

        if result["predicted_label"] == "parkinson":
            votes_parkinson += 1
        else:
            votes_healthy += 1

        confidences.append(result["confidence"])
        cnn_scores.append(result["cnn_score"])
        classical_scores.append(result["classical_score"])
        tremors.append(result["features"]["tremor_index"])
        smoothness.append(result["features"]["smoothness_score"])

    total = len(samples)
    final_label = "parkinson" if votes_parkinson > votes_healthy else "healthy"
    avg_confidence = sum(confidences) / total
    avg_cnn = sum(cnn_scores) / total
    avg_classical = sum(classical_scores) / total
    avg_tremor = sum(tremors) / total
    avg_smoothness = sum(smoothness) / total

    if avg_confidence < 35:
        severity_band = "Low likelihood"
    elif avg_confidence < 65:
        severity_band = "Moderate likelihood"
    else:
        severity_band = "High likelihood (pronounced motor signal)" if avg_tremor > 0.7 else "High likelihood"

    batch_report = BatchReport(
        user_id=current_user.id,
        final_label=final_label,
        votes_parkinson=votes_parkinson,
        votes_healthy=votes_healthy,
        total_samples=total,
        avg_confidence=round(avg_confidence, 2),
        avg_cnn_score=round(avg_cnn, 2),
        avg_classical_score=round(avg_classical, 2),
        avg_tremor_index=round(avg_tremor, 4),
        avg_smoothness_score=round(avg_smoothness, 2),
        severity_band=severity_band,
    )
    db.add(batch_report)
    db.flush()

    for r in individual_reports:
        r.batch_report_id = batch_report.id

    db.add(AuditLog(
        user_id=current_user.id,
        action="batch_analyzed",
        detail=f"sample_ids={sample_ids}, final_label={final_label}, votes={votes_parkinson}P/{votes_healthy}H",
    ))
    db.commit()
    db.refresh(batch_report)

    # Generate a combined PDF (with ALL sample images + individual verdicts,
    # not just the first one) + send email in the background. This is wrapped
    # so a PDF/email hiccup never costs the user their (already-saved) batch
    # result - worst case they just don't get the PDF/email this run.
    try:
        profile = current_user.profile

        # One entry per uploaded drawing, in submission order, with its own
        # individual verdict - this is what makes all 10 images show up in
        # the PDF instead of just samples[0].
        samples_payload = [
            {
                "image_path": sample.image_path,
                "predicted_label": report.predicted_label,
                "confidence": report.confidence,
                "drawing_type": sample.drawing_type,
            }
            for sample, report in zip(samples, individual_reports)
        ]

        pdf_path = generate_batch_pdf_report(
            patient={"name": profile.full_name, "age": profile.age, "gender": profile.gender},
            samples=samples_payload,
            result={
                "predicted_label": final_label,
                "confidence": batch_report.avg_confidence,
                "severity_band": severity_band,
                "cnn_score": batch_report.avg_cnn_score,
                "classical_score": batch_report.avg_classical_score,
                "features": {
                    "tremor_index": batch_report.avg_tremor_index,
                    "smoothness_score": batch_report.avg_smoothness_score,
                },
                "generated_at": str(batch_report.generated_at),
                "votes_parkinson": votes_parkinson,
                "votes_healthy": votes_healthy,
                "total_samples": total,
                "disclaimer": (
                    f"This is an AI-assisted screening estimate based on {total} handwriting/drawing "
                    "samples (majority vote), not a medical diagnosis. Please consult a neurologist "
                    "for clinical evaluation."
                ),
            },
            report_id=batch_report.id,
        )
        batch_report.pdf_path = pdf_path
        db.commit()
        db.refresh(batch_report)

        background_tasks.add_task(
            send_report_email, db, current_user.id, current_user.email, pdf_path,
            final_label, batch_report.avg_confidence,
        )
    except Exception as e:
        print(f"Warning: batch PDF/email generation failed (batch result was still saved): {e}")

    return batch_report


@router.get("/batch-reports/{batch_report_id}", response_model=BatchReportOut)
def get_batch_report(
    batch_report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    """Fetch a combined batch result by its own ID, including all individual
    per-sample reports that made up the majority vote."""
    batch_report = (
        db.query(BatchReport)
        .filter(BatchReport.id == batch_report_id, BatchReport.user_id == current_user.id)
        .first()
    )
    if not batch_report:
        raise HTTPException(status_code=404, detail="Batch report not found")
    return batch_report


@router.post("/batch-reports/{batch_report_id}/email", response_model=dict)
def email_batch_report(
    batch_report_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    batch_report = (
        db.query(BatchReport)
        .filter(BatchReport.id == batch_report_id, BatchReport.user_id == current_user.id)
        .first()
    )
    if not batch_report or not batch_report.pdf_path:
        raise HTTPException(status_code=404, detail="Batch report not found")

    background_tasks.add_task(
        send_report_email, db, current_user.id, current_user.email, batch_report.pdf_path,
        batch_report.final_label, batch_report.avg_confidence,
    )
    return {"message": "Report is being emailed to your registered address."}


@router.get("/batch-reports/{batch_report_id}/pdf")
def download_batch_report_pdf(
    batch_report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    batch_report = (
        db.query(BatchReport)
        .filter(BatchReport.id == batch_report_id, BatchReport.user_id == current_user.id)
        .first()
    )
    if not batch_report or not batch_report.pdf_path or not os.path.exists(batch_report.pdf_path):
        raise HTTPException(status_code=404, detail="Report PDF not found")
    return FileResponse(batch_report.pdf_path, media_type="application/pdf", filename=f"batch_report_{batch_report_id}.pdf")


@router.get("/reports/{report_id}", response_model=ReportOut)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    """
    Fetch a single report by its own ID (not the sample ID). Used by the frontend's
    Result page right after /analyze returns, and when opening a report from Records.
    """
    report = (
        db.query(Report)
        .join(Sample, Report.sample_id == Sample.id)
        .filter(Report.id == report_id, Sample.user_id == current_user.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/samples/{sample_id}/image")
def get_sample_image(
    sample_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    """
    Serves the raw uploaded drawing file so the frontend can display it on the
    Result page. Ownership-checked the same way as every other sample/report route.
    """
    sample = db.query(Sample).filter(Sample.id == sample_id, Sample.user_id == current_user.id).first()
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")
    if not sample.image_path or not os.path.exists(sample.image_path):
        raise HTTPException(status_code=404, detail="Image file not found on disk")
    return FileResponse(sample.image_path)


@router.post("/reports/{report_id}/email", response_model=dict)
def email_report(
    report_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    report = (
        db.query(Report)
        .join(Sample, Report.sample_id == Sample.id)
        .filter(Report.id == report_id, Sample.user_id == current_user.id)
        .first()
    )
    if not report or not report.pdf_path:
        raise HTTPException(status_code=404, detail="Report not found")

    background_tasks.add_task(
        send_report_email, db, current_user.id, current_user.email, report.pdf_path,
        report.predicted_label, report.confidence,
    )
    return {"message": "Report is being emailed to your registered address."}
