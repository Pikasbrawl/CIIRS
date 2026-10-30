import time
from typing import Optional, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.database.models import User
from app.schemas.schemas import LoginRequest, Token, UserOut, CitizenRegisterRequest
from app.core.security import verify_password, create_access_token, decode_access_token, get_password_hash

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory rate limiting & failed login attempt tracker (per username/IP)
# { identifier: [timestamp1, timestamp2, ...] }
_failed_attempts: Dict[str, List[float]] = {}
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_SECONDS = 300  # 5 minutes lockout

def _check_rate_limit(identifier: str):
    now = time.time()
    attempts = _failed_attempts.get(identifier, [])
    # Filter attempts in the last LOCKOUT_DURATION_SECONDS
    recent = [t for t in attempts if now - t < LOCKOUT_DURATION_SECONDS]
    _failed_attempts[identifier] = recent
    if len(recent) >= MAX_FAILED_ATTEMPTS:
        remaining = int(LOCKOUT_DURATION_SECONDS - (now - recent[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Security Alert: Excessive failed login attempts. Account temporarily locked for {max(1, remaining)} seconds."
        )

def _record_failed_attempt(identifier: str):
    now = time.time()
    attempts = _failed_attempts.get(identifier, [])
    attempts.append(now)
    _failed_attempts[identifier] = attempts

def _clear_failed_attempts(identifier: str):
    if identifier in _failed_attempts:
        del _failed_attempts[identifier]

def _resolve_portal_for_role(role: str) -> str:
    r = (role or "").upper()
    if r == "CITIZEN":
        return "PUBLIC_CITIZEN"
    elif r in ("ENGINEER", "BACKEND_ENGINEER"):
        return "BACKEND_ENGINEER"
    else:
        return "POLICE_OPERATIONS"

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    identifier = request.username.strip()
    _check_rate_limit(identifier)

    # Search by username, email, or phone_number
    user = db.query(User).filter(
        or_(
            User.username == identifier,
            User.email == identifier,
            User.phone_number == identifier
        )
    ).first()

    if not user:
        _record_failed_attempt(identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Invalid credentials or account does not exist."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account Suspended: This profile has been deactivated by CIIRS administration."
        )

    if not verify_password(request.password, user.hashed_password):
        _record_failed_attempt(identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed: Invalid password entered."
        )

    # Clear failed attempts on successful verification
    _clear_failed_attempts(identifier)

    user_role = (user.role or "").upper()
    target_portal = _resolve_portal_for_role(user_role)

    # Enforce strict server-side Role-Based Portal Access Control
    if request.portal:
        req_portal = request.portal.upper()
        if req_portal == "PUBLIC_CITIZEN" and user_role != "CITIZEN":
            # Notice for staff logging into citizen portal
            # We can allow staff to view public services or prompt
            pass
        elif req_portal == "POLICE_OPERATIONS":
            if user_role == "CITIZEN":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access Denied: Citizen credentials are not authorized for Police / Operations Command Center."
                )
            if user_role in ("ENGINEER", "BACKEND_ENGINEER"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access Denied: Systems Engineering credentials do not have operational Police Dispatch clearance."
                )
        elif req_portal == "BACKEND_ENGINEER":
            if user_role not in ("ENGINEER", "BACKEND_ENGINEER", "ADMIN"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access Denied: Technical Infrastructure Administration is restricted to authorized Backend Systems Engineers."
                )

    access_token = create_access_token(data={
        "sub": user.username,
        "role": user.role,
        "portal": target_portal,
        "id": user.id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "portal": target_portal,
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "role": user.role,
            "badge_number": user.badge_number,
            "department": user.department,
            "portal": target_portal
        }
    }

@router.post("/register-citizen", response_model=Token)
def register_citizen(request: CitizenRegisterRequest, db: Session = Depends(get_db)):
    if not request.full_name or len(request.full_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Full name is required.")
    
    if not request.email or "@" not in request.email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    if not request.phone_number or len(request.phone_number.strip()) < 7:
        raise HTTPException(status_code=400, detail="A valid contact number is required.")

    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    if request.confirm_password and request.password != request.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

    # Check for existing user
    clean_email = request.email.strip().lower()
    clean_phone = request.phone_number.strip()
    existing = db.query(User).filter(
        or_(User.email == clean_email, User.phone_number == clean_phone)
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account is already registered with this email or mobile number."
        )

    # Generate a unique username based on name or email
    base_username = clean_email.split("@")[0].replace(".", "_")
    username = base_username
    counter = 1
    while db.query(User).filter(User.username == username).first():
        username = f"{base_username}_{counter}"
        counter += 1

    hashed = get_password_hash(request.password)
    new_user = User(
        username=username,
        email=clean_email,
        phone_number=clean_phone,
        full_name=request.full_name.strip(),
        role="CITIZEN",
        badge_number=f"CIT-CHD-{int(time.time()) % 10000:04d}",
        department="Chandigarh Resident Citizen",
        hashed_password=hashed,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    target_portal = "PUBLIC_CITIZEN"
    access_token = create_access_token(data={
        "sub": new_user.username,
        "role": new_user.role,
        "portal": target_portal,
        "id": new_user.id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "portal": target_portal,
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "phone_number": new_user.phone_number,
            "role": new_user.role,
            "badge_number": new_user.badge_number,
            "department": new_user.department,
            "portal": target_portal
        }
    }

@router.get("/me")
def get_current_user_profile(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token.")
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Session expired or token is invalid. Please log in again.")

    username = payload["sub"]
    user = db.query(User).filter(User.username == username).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User account not found or inactive.")

    user_role = (user.role or "").upper()
    portal = _resolve_portal_for_role(user_role)

    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "phone_number": user.phone_number,
        "role": user.role,
        "badge_number": user.badge_number,
        "department": user.department,
        "portal": portal
    }

@router.post("/logout")
def logout():
    return {"message": "Session terminated successfully. Logged out of CIIRS Command Network."}

@router.get("/demo-accounts")
def get_demo_accounts():
    """Provides verified demonstration account profiles for the presentation."""
    return [
        {
            "portal": "PUBLIC_CITIZEN",
            "role": "CITIZEN",
            "title": "Citizen Safety Portal",
            "username": "citizen",
            "email": "citizen@ciirs.gov.in",
            "phone": "9876543210",
            "password": "citizen123",
            "name": "Pooja Sharma",
            "badge": "CIT-CHD-8419",
            "description": "Resident Sector 17, community incident reporting and tracking"
        },
        {
            "portal": "POLICE_OPERATIONS",
            "role": "OPERATOR",
            "title": "Police / Operations Portal",
            "username": "operator",
            "email": "operator@ciirs.gov.in",
            "phone": "9812345678",
            "password": "operator123",
            "name": "Senior Control Operator Arjun Singh",
            "badge": "OPR-402",
            "description": "24/7 CCTV surveillance, automated event verification and emergency dispatch"
        },
        {
            "portal": "POLICE_OPERATIONS",
            "role": "POLICE_RESPONDER",
            "title": "Police Responder Lead",
            "username": "police_officer",
            "email": "police@ciirs.gov.in",
            "phone": "9811122233",
            "password": "police123",
            "name": "Inspector Rajesh Sharma",
            "badge": "POL-120",
            "description": "Emergency response coordination and field unit deployment"
        },
        {
            "portal": "BACKEND_ENGINEER",
            "role": "ENGINEER",
            "title": "Backend Systems Engineer",
            "username": "engineer",
            "email": "engineer@ciirs.gov.in",
            "phone": "9877788899",
            "password": "engineer123",
            "name": "Vikram Mehta",
            "badge": "SYS-007",
            "description": "CCTV network diagnostics, AI pipeline status, database and server telemetry"
        }
    ]

@router.get("/users", response_model=List[UserOut])
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.post("/switch-role")
def switch_active_role(role: str, username: str = "operator", db: Session = Depends(get_db)):
    """Convenience endpoint for role state synchronisation."""
    user = db.query(User).filter(User.username == username).first()
    if not user:
        user = db.query(User).first()
    if user:
        user.role = role
        db.commit()
    return {"message": f"Active role updated to {role}", "role": role}
