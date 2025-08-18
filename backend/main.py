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
        
        # TODO: Send email with onboarding link
        onboarding_link = f"http://localhost:3000/onboarding/{session_id}"
        print(f"Onboarding email would be sent to {session_data.email} with link: {onboarding_link}")
        
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