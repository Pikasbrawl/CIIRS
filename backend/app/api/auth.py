from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.database.models import User
from app.schemas.schemas import LoginRequest, Token, UserOut
from app.core.security import verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role, "id": user.id})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "badge_number": user.badge_number,
            "department": user.department
        }
    }

@router.get("/users", response_model=list[UserOut])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/switch-role")
def switch_active_role(role: str, username: str = "operator", db: Session = Depends(get_db)):
    """Convenience endpoint for quick role demonstration during hackathon presentation."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = db.query(User).first()
    if user:
        user.role = role
        db.commit()
    return {"message": f"Active role updated to {role}", "role": role}
