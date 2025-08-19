import os
from dotenv import load_dotenv

# Force-load the .env file
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

print("GOOGLE_APPLICATION_CREDENTIALS =", os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
