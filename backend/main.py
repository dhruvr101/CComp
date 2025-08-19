import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import firebase_admin
from firebase_admin import credentials, auth, firestore
from typing import List, Optional
import uuid
from datetime import datetime
from fastapi import Body
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# Load Firebase Admin SDK
cred = credentials.Certificate("colicit-firebase-adminsdk-fbsvc-3d5bc416c3.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

app = FastAPI()

# Allow frontend (React) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev, allow all; later restrict
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class SignupRequest(BaseModel):
    uid: str
    name: str
    email: str
    role: str = "admin"  # default

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
    adminUid: str  # Track which admin created this repo

class OnboardingSession(BaseModel):
    id: str
    email: EmailStr
    role: str
    repositories: List[str]
    status: str
    createdAt: datetime
    completedAt: Optional[datetime] = None
    progress: int
    customInstructions: Optional[str] = None
    adminUid: str  # Track which admin created this session

class CreateOnboardingRequest(BaseModel):
    email: EmailStr
    role: str
    repositories: List[str]
    customInstructions: Optional[str] = None
    adminUid: str  # Track which admin is creating this

class EmployeeSignupRequest(BaseModel):
    uid: str
    name: str
    email: str
    onboarding_token: str

# Email configuration (you'll need to set these environment variables)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "your-email@gmail.com")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "your-app-password")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@yourcompany.com")

def send_onboarding_email(to_email: str, onboarding_link: str, role: str):
    """Send onboarding email to new employee"""
    try:
        msg = MIMEMultipart()
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = "Welcome to the Team! Complete Your Account Setup"
        
        html_body = f"""
        <html>
        <head></head>
        <body>
            <h2>🎉 Welcome to the Team!</h2>
            <p>You've been invited to join our company as a <strong>{role}</strong>.</p>
            
            <p>To get started, please click the link below to create your account and begin your personalized onboarding:</p>
            
            <p style="margin: 20px 0;">
                <a href="{onboarding_link}" 
                   style="background-color: #0e639c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    🚀 Create Account & Start Onboarding
                </a>
            </p>
            
            <p><strong>What happens next?</strong></p>
            <ul>
                <li>Create your account with this email address</li>
                <li>Complete a personalized walkthrough of our codebase</li>
                <li>Learn about the repositories you'll be working with</li>
                <li>Get familiar with our development environment</li>
            </ul>
            
            <p>If you have any questions, please don't hesitate to reach out to your manager.</p>
            
            <p>Welcome aboard! 🎉</p>
            
            <hr>
            <p style="font-size: 12px; color: #666;">
                This link is unique to you and will expire once used. If you didn't expect this email, please contact your administrator.
            </p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_body, 'html'))
        
        # Send email
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(EMAIL_USER, EMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(FROM_EMAIL, to_email, text)
        server.quit()
        
        print(f"✅ Onboarding email sent successfully to {to_email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {str(e)}")
        return False

@app.post("/assign-role")
async def assign_role(data: SignupRequest):
    try:
        # Give user role via custom claims
        auth.set_custom_user_claims(data.uid, {"role": data.role})

        # Save role in Firestore
        db.collection("users").document(data.uid).set({
            "name": data.name,
            "email": data.email,
            "role": data.role
        })

        return {"message": f"Role {data.role} assigned to {data.email}"}
    except Exception as e:
        print("assign-role error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/complete-onboarding/{admin_uid}/{session_id}")
async def complete_onboarding(admin_uid: str, session_id: str, data: dict = Body(...)):
    """
    Called when an invited employee signs up.
    - data = { "uid": "<firebase-uid>", "name": "John Doe", "email": "john@company.com" }
    """
    try:
        # 1. Get the onboarding session
        session_ref = (
            db.collection("admins")
            .document(admin_uid)
            .collection("onboarding_sessions")
            .document(session_id)
        )
        session_doc = session_ref.get()

        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Onboarding session not found")

        session_data = session_doc.to_dict()

        # 2. Assign role from session (not admin!)
        role = session_data["role"]

        # 3. Set custom claims in Firebase Auth
        auth.set_custom_user_claims(data["uid"], {"role": role})

        # 4. Create user record in Firestore
        db.collection("users").document(data["uid"]).set({
            "name": data.get("name", ""),
            "email": data["email"],
            "role": role,
            "invitedBy": admin_uid,
            "onboardingSessionId": session_id,
        })

        # 5. Update onboarding session status → in_progress
        session_ref.update({
            "status": "in_progress",
            "startedAt": datetime.now(),
        })

        return {"message": f"Onboarding completed. Role {role} assigned to {data['email']}"}

    except Exception as e:
        print("complete_onboarding error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/repositories/{admin_uid}")
async def get_repositories(admin_uid: str):
    try:
        repos_ref = db.collection("admins").document(admin_uid).collection("repositories")
        docs = repos_ref.stream()
        repositories = []
        for doc in docs:
            repo_data = doc.to_dict()
            repo_data["id"] = doc.id
            # Convert Firestore timestamp to datetime if needed
            if "lastSync" in repo_data and hasattr(repo_data["lastSync"], "timestamp"):
                repo_data["lastSync"] = repo_data["lastSync"].timestamp()
            repositories.append(repo_data)
        return repositories
    except Exception as e:
        print("get_repositories error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/repositories")
async def create_repository(repo_data: CreateRepositoryRequest):
    try:
        repo_id = str(uuid.uuid4())
        repository = Repository(
            id=repo_id,
            name=repo_data.name,
            url=repo_data.url,
            description=repo_data.description,
            language=repo_data.language,
            lastSync=datetime.now(),
            status="syncing",
            adminUid=repo_data.adminUid
        )
        
        # Save to Firestore
        db.collection("admins").document(repo_data.adminUid).collection("repositories").document(repo_id).set(repository.dict())
        
        # TODO: Implement actual repository syncing logic here
        # For now, simulate sync completion after a delay
        
        return repository
    except Exception as e:
        print("create_repository error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/repositories/{admin_uid}/{repo_id}")
async def delete_repository(admin_uid: str, repo_id: str):
    try:
        repo_ref = db.collection("admins").document(admin_uid).collection("repositories").document(repo_id)
        repo_doc = repo_ref.get()
        
        if not repo_doc.exists:
            raise HTTPException(status_code=404, detail="Repository not found")
        
        repo_ref.delete()
        return {"message": "Repository deleted successfully"}
    except Exception as e:
        print("delete_repository error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/onboarding-sessions/{admin_uid}")
async def get_onboarding_sessions(admin_uid: str):
    try:
        sessions_ref = db.collection("admins").document(admin_uid).collection("onboarding_sessions")
        docs = sessions_ref.stream()
        sessions = []
        for doc in docs:
            session_data = doc.to_dict()
            session_data["id"] = doc.id
            # Convert Firestore timestamp to datetime if needed
            if "createdAt" in session_data and hasattr(session_data["createdAt"], "timestamp"):
                session_data["createdAt"] = session_data["createdAt"].timestamp()
            if "completedAt" in session_data and session_data["completedAt"] and hasattr(session_data["completedAt"], "timestamp"):
                session_data["completedAt"] = session_data["completedAt"].timestamp()
            sessions.append(session_data)
        return sessions
    except Exception as e:
        print("get_onboarding_sessions error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/onboarding-sessions")
async def create_onboarding_session(session_data: CreateOnboardingRequest):
    try:
        session_id = str(uuid.uuid4())
        
        # Validate repositories exist for this admin
        repos_ref = db.collection("admins").document(session_data.adminUid).collection("repositories")
        repos_docs = repos_ref.stream()
        admin_repo_names = [doc.to_dict().get("name") for doc in repos_docs]
        
        for repo_name in session_data.repositories:
            if repo_name not in admin_repo_names:
                raise HTTPException(status_code=400, detail=f"Repository '{repo_name}' not found")
        
        session = OnboardingSession(
            id=session_id,
            email=session_data.email,
            role=session_data.role,
            repositories=session_data.repositories,
            status="pending",
            createdAt=datetime.now(),
            progress=0,
            customInstructions=session_data.customInstructions,
            adminUid=session_data.adminUid
        )
        
        # Save to Firestore
        db.collection("admins").document(session_data.adminUid).collection("onboarding_sessions").document(session_id).set(session.dict())
        
        # Send actual email with onboarding link
        onboarding_link = f"http://localhost:5174/employee-signup?token={session_id}"
        
        # Try to send email, but don't fail if email service is not configured
        email_sent = send_onboarding_email(session_data.email, onboarding_link, session_data.role)
        
        if email_sent:
            print(f"✅ Onboarding email sent to {session_data.email}")
        else:
            print(f"⚠️ Email service not configured. Manual link: {onboarding_link}")
        
        return session
    except Exception as e:
        print("create_onboarding_session error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/onboarding-sessions/{admin_uid}/{session_id}")
async def get_onboarding_session(admin_uid: str, session_id: str):
    try:
        session_ref = db.collection("admins").document(admin_uid).collection("onboarding_sessions").document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Onboarding session not found")
        
        session_data = session_doc.to_dict()
        session_data["id"] = session_doc.id
        return session_data
    except Exception as e:
        print("get_onboarding_session error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/employee-onboarding/{token}")
async def get_employee_onboarding_session(token: str):
    """Get onboarding session by token for employee signup"""
    try:
        print(f"🔍 Looking up employee onboarding session for token: {token}")
        
        # Search for onboarding session across all admins using the session ID as token
        admins_ref = db.collection("admins")
        
        for admin_doc in admins_ref.stream():
            admin_uid = admin_doc.id
            print(f"🔍 Checking admin: {admin_uid}")
            session_ref = admin_doc.reference.collection("onboarding_sessions").document(token)
            session_doc = session_ref.get()
            
            if session_doc.exists:
                session_data = session_doc.to_dict()
                print(f"✅ Found session for admin {admin_uid}: {session_data}")
                
                # Check if session is still valid (pending status)
                if session_data.get("status") != "pending":
                    print(f"❌ Session status is {session_data.get('status')}, not pending")
                    raise HTTPException(status_code=400, detail="Onboarding session is no longer valid")
                
                # Return session data for employee signup
                result = {
                    "id": token,
                    "email": session_data["email"],
                    "role": session_data["role"],
                    "repositories": session_data["repositories"],
                    "customInstructions": session_data.get("customInstructions"),
                    "adminUid": admin_uid
                }
                
                # Try to get admin name/info
                try:
                    admin_user_ref = db.collection("users").document(admin_uid)
                    admin_user_doc = admin_user_ref.get()
                    if admin_user_doc.exists:
                        admin_data = admin_user_doc.to_dict()
                        result["adminName"] = admin_data.get("name", "Unknown Admin")
                        result["adminEmail"] = admin_data.get("email", "")
                except Exception as admin_err:
                    print(f"⚠️ Could not fetch admin info: {admin_err}")
                
                print(f"✅ Returning session data: {result}")
                return result
        
        print(f"❌ No session found for token: {token}")
        raise HTTPException(status_code=404, detail="Invalid onboarding token")
    except Exception as e:
        print("get_employee_onboarding_session error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/employee-signup")
async def employee_signup(data: EmployeeSignupRequest):
    """Complete employee signup with onboarding token"""
    try:
        # First, get the onboarding session to validate token and get admin info
        token = data.onboarding_token
        admins_ref = db.collection("admins")
        admin_uid = None
        session_data = None
        
        for admin_doc in admins_ref.stream():
            admin_uid = admin_doc.id
            session_ref = admin_doc.reference.collection("onboarding_sessions").document(token)
            session_doc = session_ref.get()
            
            if session_doc.exists:
                session_data = session_doc.to_dict()
                break
        
        if not session_data:
            raise HTTPException(status_code=404, detail="Invalid onboarding token")
        
        # Verify email matches
        if session_data["email"] != data.email:
            raise HTTPException(status_code=400, detail="Email does not match invitation")
        
        # Check if session is still valid
        if session_data.get("status") != "pending":
            raise HTTPException(status_code=400, detail="Onboarding session is no longer valid")
        
        # Set custom claims in Firebase Auth as employee
        role = session_data["role"]
        auth.set_custom_user_claims(data.uid, {"role": "employee", "job_role": role})
        
        # Create user record in Firestore
        db.collection("users").document(data.uid).set({
            "name": data.name,
            "email": data.email,
            "role": "employee",
            "job_role": role,
            "invitedBy": admin_uid,
            "onboardingSessionId": token,
            "signupDate": datetime.now()
        })
        
        # Update onboarding session status
        session_ref = (
            db.collection("admins")
            .document(admin_uid)
            .collection("onboarding_sessions")
            .document(token)
        )
        session_ref.update({
            "status": "in_progress",
            "startedAt": datetime.now(),
            "employeeUid": data.uid
        })
        
        return {
            "message": f"Employee signup completed. Role {role} assigned to {data.email}",
            "session": {
                "id": token,
                "role": role,
                "repositories": session_data["repositories"],
                "customInstructions": session_data.get("customInstructions")
            }
        }
        
    except Exception as e:
        print("employee_signup error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/onboarding-sessions/{admin_uid}/{session_id}/progress")
async def update_onboarding_progress(admin_uid: str, session_id: str, progress: int):
    try:
        session_ref = db.collection("admins").document(admin_uid).collection("onboarding_sessions").document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Onboarding session not found")
        
        update_data = {"progress": progress}
        
        if progress >= 100:
            update_data["status"] = "completed"
            update_data["completedAt"] = datetime.now()
        elif progress > 0:
            update_data["status"] = "in_progress"
        
        session_ref.update(update_data)
        
        # Return updated session
        updated_doc = session_ref.get()
        session_data = updated_doc.to_dict()
        session_data["id"] = updated_doc.id
        return session_data
    except Exception as e:
        print("update_onboarding_progress error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/onboarding-sessions/{admin_uid}/{session_id}")
async def delete_onboarding_session(admin_uid: str, session_id: str):
    try:
        session_ref = db.collection("admins").document(admin_uid).collection("onboarding_sessions").document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Onboarding session not found")
        
        session_ref.delete()
        return {"message": "Onboarding session deleted successfully"}
    except Exception as e:
        print("delete_onboarding_session error:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)