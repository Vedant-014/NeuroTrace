import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PatientProfileCreate(BaseModel):
    full_name: str
    age: Optional[int] = Field(default=None, ge=0, le=130)
    gender: Optional[str] = None
    date_of_birth: Optional[datetime.date] = None
    phone_number: Optional[str] = None
    address: Optional[str] = None
    existing_diseases: Optional[str] = None
    family_history_parkinsons: Optional[bool] = False
    current_medications: Optional[str] = None
    medical_history: Optional[str] = None
    smoking_status: Optional[str] = None
    alcohol_consumption: Optional[str] = None
    exercise_habits: Optional[str] = None
    additional_notes: Optional[str] = None


class PatientProfileUpdate(PatientProfileCreate):
    full_name: Optional[str] = None  # all fields optional on update


class PatientProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    full_name: str
    age: Optional[int]
    gender: Optional[str]
    date_of_birth: Optional[datetime.date]
    phone_number: Optional[str]
    address: Optional[str]
    existing_diseases: Optional[str]
    family_history_parkinsons: bool
    current_medications: Optional[str]
    medical_history: Optional[str]
    smoking_status: Optional[str]
    alcohol_consumption: Optional[str]
    exercise_habits: Optional[str]
    additional_notes: Optional[str]
    created_at: datetime.datetime
    updated_at: datetime.datetime
