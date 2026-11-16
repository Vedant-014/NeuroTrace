from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_verified_user
from app.database import get_db, User, PatientProfile
from app.schemas.profile import PatientProfileCreate, PatientProfileUpdate, PatientProfileOut

router = APIRouter(prefix="/profile", tags=["Patient Profile"])


@router.post("", response_model=PatientProfileOut)
def create_profile(
    payload: PatientProfileCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    if current_user.profile:
        raise HTTPException(status_code=400, detail="Profile already exists. Use PUT /profile to update it.")

    profile = PatientProfile(user_id=current_user.id, **payload.model_dump())
    db.add(profile)
    current_user.profile_completed = True
    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=PatientProfileOut)
def get_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    if not current_user.profile:
        raise HTTPException(status_code=404, detail="Profile not completed yet")
    return current_user.profile


@router.put("", response_model=PatientProfileOut)
def update_profile(
    payload: PatientProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_verified_user),
):
    if not current_user.profile:
        raise HTTPException(status_code=404, detail="Profile not found. Create it first with POST /profile.")

    profile = current_user.profile
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile
