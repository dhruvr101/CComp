import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

import firebase_admin
from firebase_admin import credentials, auth, firestore

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Firebase init
cred = credentials.Certificate("colicit-firebase-adminsdk-fbsvc-3d5bc416c3.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow frontend in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Models ----------

class SignupRequest(BaseModel):
    uid: str
    name: str
    email: str
    role: str = "admin"

class Repository(BaseModel):
    id: str
    name: str
    url: str
    description: str
    language: str
    lastSync: datetime
    status: str
    adminUid: str

class CreateRepositoryRequest(BaseModel):
    name: str
    url: str
    description: str
    language: str
    adminUid: str

class OnboardingSession(BaseModel):
    id: str
    email: EmailStr
    role: str
    repositories: List[str]  # repo IDs
    status: str
    createdAt: datetime
    completedAt: Optional[datetime] = None
    progress: int
    customInstructions: Optional[str] = None
    adminUid: str

class CreateOnboardingRequest(BaseModel):
    email: EmailStr
    role: str
    repositories: List[str]  # repo IDs
    customInstructions: Optional[str] = None
    adminUid: str

class EmployeeSignupRequest(BaseModel):
    uid: str
    name: str
    email: str
    onboarding_token: str

# ---------- Email ----------

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", EMAIL_USER)

def send_onboarding_email(to_email: str, onboarding_link: str, role: str, admin_name: str):
    try:
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "Welcome to the Team! Complete Your Account Setup"

        html_body = f"""
        <html>
        <body>
            <h2>🎉 Welcome to the Team!</h2>
            <p>Your admin <b>{admin_name}</b> invited you as <b>{role}</b>.</p>
            <p>Click below to create your account:</p>
            <a href="{onboarding_link}" style="padding:10px 20px;background:#0e639c;color:white;border-radius:6px;text-decoration:none;">🚀 Start Onboarding</a>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html"))

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        server.quit()
        print(f"✅ Email sent to {to_email}")
        return True
    except Exception as e:
        print("❌ Email failed:", e)
        return False

# ---------- Routes ----------

@app.post("/assign-role")
async def assign_role(data: SignupRequest):
    auth.set_custom_user_claims(data.uid, {"role": data.role})
    db.collection("users").document(data.uid).set({
        "name": data.name,
        "email": data.email,
        "role": data.role
    })
    return {"message": f"Role {data.role} assigned to {data.email}"}

# Repositories

@app.post("/repositories")
async def create_repo(repo: CreateRepositoryRequest):
    repo_id = str(uuid.uuid4())
    repository = Repository(
        id=repo_id,
        name=repo.name,
        url=repo.url,
        description=repo.description,
        language=repo.language,
        lastSync=datetime.now(),
        status="synced",
        adminUid=repo.adminUid
    )
    db.collection("admins").document(repo.adminUid)\
      .collection("repositories").document(repo_id)\
      .set(repository.dict())
    return repository

@app.get("/repositories/{admin_uid}")
async def get_repos(admin_uid: str):
    repos = []
    docs = db.collection("admins").document(admin_uid)\
        .collection("repositories").stream()
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        repos.append(data)
    return repos

@app.delete("/repositories/{admin_uid}/{repo_id}")
async def delete_repository(admin_uid: str, repo_id: str):
    ref = db.collection("admins").document(admin_uid)\
        .collection("repositories").document(repo_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Repository not found")
    ref.delete()
    return {"message": "Repository deleted successfully"}

# Onboarding sessions (create/list/delete, fetch by token, employee-signup)

@app.post("/onboarding-sessions")
async def create_onboarding(session: CreateOnboardingRequest):
    session_id = str(uuid.uuid4())

    # Optional: validate repo IDs exist
    repos_ref = db.collection("admins").document(session.adminUid).collection("repositories")
    existing_ids = {doc.id for doc in repos_ref.stream()}
    for rid in session.repositories:
        if rid not in existing_ids:
            raise HTTPException(status_code=400, detail=f"Repository '{rid}' not found for this admin")

    admin_doc = db.collection("users").document(session.adminUid).get()
    admin_name = admin_doc.to_dict().get("name", "Your Admin") if admin_doc.exists else "Your Admin"

    new_session = OnboardingSession(
        id=session_id,
        email=session.email,
        role=session.role,
        repositories=session.repositories,  # repo IDs
        status="pending",
        createdAt=datetime.now(),
        progress=0,
        customInstructions=session.customInstructions,
        adminUid=session.adminUid
    )

    db.collection("admins").document(session.adminUid)\
      .collection("onboarding_sessions").document(session_id)\
      .set(new_session.dict())

    link = f"http://localhost:5174/employee-signup?token={session_id}"
    send_onboarding_email(session.email, link, session.role, admin_name)
    return new_session

@app.get("/onboarding-sessions/{admin_uid}")
async def list_onboarding_sessions(admin_uid: str):
    sessions = []
    docs = db.collection("admins").document(admin_uid)\
        .collection("onboarding_sessions").order_by("createdAt").stream()
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        sessions.append(data)
    return sessions

@app.delete("/onboarding-sessions/{admin_uid}/{session_id}")
async def delete_onboarding_session(admin_uid: str, session_id: str):
    ref = db.collection("admins").document(admin_uid)\
        .collection("onboarding_sessions").document(session_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Onboarding session not found")
    ref.delete()
    return {"message": "Onboarding session deleted successfully"}

@app.get("/employee-onboarding/{token}")
async def get_employee_onboarding(token: str):
    for admin_doc in db.collection("admins").stream():
        s_ref = admin_doc.reference.collection("onboarding_sessions").document(token)
        s_doc = s_ref.get()
        if s_doc.exists:
            session = s_doc.to_dict()
            admin_uid = admin_doc.id
            admin_user = db.collection("users").document(admin_uid).get()
            admin_info = admin_user.to_dict() if admin_user.exists else {}
            return {
                "id": token,
                "email": session["email"],
                "role": session["role"],
                "repositories": session["repositories"],  # repo IDs
                "customInstructions": session.get("customInstructions"),
                "adminUid": admin_uid,
                "adminName": admin_info.get("name", "Unknown Admin"),
                "adminEmail": admin_info.get("email", "")
            }
    raise HTTPException(status_code=404, detail="Invalid onboarding token")

@app.post("/employee-signup")
async def employee_signup(data: EmployeeSignupRequest):
    # find session
    session_data, admin_uid, ref = None, None, None
    for admin_doc in db.collection("admins").stream():
        tmp_ref = admin_doc.reference.collection("onboarding_sessions").document(data.onboarding_token)
        tmp_doc = tmp_ref.get()
        if tmp_doc.exists:
            session_data = tmp_doc.to_dict()
            admin_uid = admin_doc.id
            ref = tmp_ref
            break

    if not session_data:
        raise HTTPException(status_code=404, detail="Invalid token")

    if session_data["email"] != data.email:
        raise HTTPException(status_code=400, detail="Email mismatch")

    role = session_data["role"]
    auth.set_custom_user_claims(data.uid, {"role": "employee", "job_role": role})

    db.collection("users").document(data.uid).set({
        "name": data.name,
        "email": data.email,
        "role": "employee",
        "job_role": role,
        "invitedBy": admin_uid,
        "onboardingSessionId": data.onboarding_token,
        "signupDate": datetime.now()
    })

    ref.update({"status": "in_progress", "employeeUid": data.uid, "startedAt": datetime.now()})

    return {
        "message": "Employee signup complete",
        "session": {
            "id": data.onboarding_token,
            "role": role,
            "repositories": session_data["repositories"],
            "customInstructions": session_data.get("customInstructions"),
        }
    }