from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_current_verified_user, require_admin
from app.database import get_db, User, Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/feedback", tags=["Feedback"])


@router.post("", response_model=FeedbackOut)
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    feedback = Feedback(user_id=current_user.id, rating=payload.rating, comment=payload.comment)
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("", response_model=list[FeedbackOut])
def list_all_feedback(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin-only: view all feedback submitted by all users."""
    return db.query(Feedback).order_by(Feedback.created_at.desc()).all()
