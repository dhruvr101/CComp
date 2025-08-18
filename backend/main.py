import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, auth, firestore

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

class SignupRequest(BaseModel):
    uid: str
    name: str
    email: str
    role: str = "admin"  # default

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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)