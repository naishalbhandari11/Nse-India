"""
Authentication utilities for user management and OTP verification
"""

import os
import random
import string
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "change-this-secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 525600))
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

from app.database import get_db, return_db

# Password hashing - Use PBKDF2 for better compatibility
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# JWT token security
security = HTTPBearer()

# Twilio client
twilio_client = None
print(f"[AUTH] Twilio Config - SID: {TWILIO_ACCOUNT_SID[:10]}... Token: {TWILIO_AUTH_TOKEN[:10]}... Phone: {TWILIO_PHONE_NUMBER}")

if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        print("[AUTH] Twilio client initialized successfully")
    except Exception as e:
        print(f"[AUTH] Failed to initialize Twilio client: {e}")
else:
    print("[AUTH] Twilio credentials not found in environment variables")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash - handle both PBKDF2 and simple hash"""
    try:
        # First try PBKDF2 verification
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        print(f"[AUTH] PBKDF2 verification failed: {e}")
        # Try simple SHA256 hash verification (for test users)
        try:
            import hashlib
            simple_hash = hashlib.sha256(plain_password.encode()).hexdigest()
            if simple_hash == hashed_password:
                print("[AUTH] Simple hash verification successful")
                return True
        except Exception as e2:
            print(f"[AUTH] Simple hash verification failed: {e2}")
        
        print(f"[AUTH] All verification methods failed")
        return False

def get_password_hash(password: str) -> str:
    """Hash a password using PBKDF2"""
    try:
        return pwd_context.hash(password)
    except Exception as e:
        print(f"[AUTH] Password hashing error: {e}")
        # Fallback to a simple hash if PBKDF2 fails
        import hashlib
        return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=365)  # default: 1 year
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except InvalidTokenError:
        return None

def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    return ''.join(random.choices(string.digits, k=6))

def send_otp_sms(phone_number: str, otp: str) -> bool:
    """Send OTP via SMS using Twilio"""
    if not twilio_client:
        print(f"[AUTH] Twilio not configured. OTP for {phone_number}: {otp}")
        return True  # For development, assume success
    
    try:
        # Format phone number (ensure it starts with +91 for India)
        if not phone_number.startswith('+'):
            phone_number = '+91' + phone_number.lstrip('0')
        
        message = twilio_client.messages.create(
            body=f"Your NSE Stock Analysis verification code is: {otp}. Valid for 5 minutes.",
            from_=TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        print(f"[AUTH] OTP sent to {phone_number}: {message.sid}")
        return True
    except Exception as e:
        print(f"[AUTH] Failed to send OTP to {phone_number}: {e}")
        return False

def store_otp(phone_number: str, otp: str) -> bool:
    """Store OTP in database with expiration"""
    conn = get_db()
    try:
        cur = conn.cursor()
        
        # Delete any existing OTP for this phone number
        cur.execute("DELETE FROM user_otps WHERE phone_number = %s", (phone_number,))
        
        # Store new OTP with 5-minute expiration
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        cur.execute("""
            INSERT INTO user_otps (phone_number, otp_code, expires_at, created_at)
            VALUES (%s, %s, %s, %s)
        """, (phone_number, otp, expires_at, datetime.utcnow()))
        
        conn.commit()
        cur.close()
        return_db(conn)
        return True
    except Exception as e:
        print(f"[AUTH] Failed to store OTP: {e}")
        try:
            cur.close()
            return_db(conn)
        except:
            pass
        return False

def verify_otp(phone_number: str, otp: str) -> bool:
    """Verify OTP against stored value"""
    conn = get_db()
    try:
        cur = conn.cursor()
        
        print(f"[AUTH] Verifying OTP for {phone_number} with code {otp}")
        
        # Get OTP from database
        cur.execute("""
            SELECT otp_code, expires_at FROM user_otps 
            WHERE phone_number = %s AND expires_at > %s
        """, (phone_number, datetime.utcnow()))
        
        result = cur.fetchone()
        
        if not result:
            print(f"[AUTH] No valid OTP found for {phone_number}")
            cur.close()
            return_db(conn)
            return False
        
        stored_otp, expires_at = result
        print(f"[AUTH] Found OTP: {stored_otp}, expires at: {expires_at}")
        
        if stored_otp == otp:
            # OTP is valid, delete it
            cur.execute("DELETE FROM user_otps WHERE phone_number = %s", (phone_number,))
            conn.commit()
            cur.close()
            return_db(conn)
            print(f"[AUTH] OTP verification successful for {phone_number}")
            return True
        else:
            print(f"[AUTH] OTP mismatch: expected {stored_otp}, got {otp}")
            cur.close()
            return_db(conn)
            return False
        
    except Exception as e:
        print(f"[AUTH] Failed to verify OTP: {e}")
        try:
            cur.close()
            return_db(conn)
        except:
            pass
        return False

def create_user_with_otp(name: str, phone_number: str, email: str, password: str, otp: str) -> bool:
    """Create a new user in the database with OTP verification"""
    conn = get_db()
    try:
        cur = conn.cursor()
        
        # First verify OTP
        if not verify_otp(phone_number, otp):
            return False
        
        # Check if user already exists
        cur.execute("SELECT user_id FROM users WHERE full_name = %s OR email = %s OR phone_number = %s", 
                   (name, email, phone_number))
        if cur.fetchone():
            cur.close()
            return_db(conn)
            return False  # User already exists
        
        # Create new user
        hashed_password = get_password_hash(password)
        cur.execute("""
            INSERT INTO users (full_name, phone_number, email, password_hash, is_verified, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (name.strip(), phone_number.strip(), email.strip(), hashed_password, True, datetime.utcnow()))
        
        conn.commit()
        cur.close()
        return_db(conn)
        return True
    except Exception as e:
        print(f"[AUTH] Failed to create user: {e}")
        try:
            cur.close()
            return_db(conn)
        except:
            pass
        return False

def authenticate_user_with_fullname(full_name: str, password: str) -> Optional[dict]:
    """Authenticate user with full name and password"""
    conn = get_db()
    try:
        cur = conn.cursor()
        
        cur.execute("""
            SELECT user_id, full_name, email, password_hash, is_verified
            FROM users WHERE full_name = %s
        """, (full_name.strip(),))
        
        user = cur.fetchone()
        cur.close()
        return_db(conn)
        
        if user and verify_password(password, user[3]):
            return {
                "user_id": user[0],
                "name": user[1],
                "email": user[2],
                "is_verified": user[4]
            }
        return None
    except Exception as e:
        print(f"[AUTH] Failed to authenticate user: {e}")
        try:
            cur.close()
            return_db(conn)
        except:
            pass
        return None

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_token(credentials.credentials)
        if payload is None:
            raise credentials_exception
        
        full_name: str = payload.get("sub")
        if full_name is None:
            raise credentials_exception
        
        # Get user from database
        conn = get_db()
        cur = conn.cursor()
        cur.execute("""
            SELECT user_id, full_name, email, is_verified
            FROM users WHERE full_name = %s
        """, (full_name.strip(),))
        
        user = cur.fetchone()
        cur.close()
        return_db(conn)
        
        if user is None:
            raise credentials_exception
        
        return {
            "user_id": user[0],
            "name": user[1],
            "email": user[2],
            "is_verified": user[3]
        }
    except Exception as e:
        print(f"[AUTH] Failed to get current user: {e}")
        raise credentials_exception

def get_optional_user(request: Request) -> Optional[dict]:
    """Get current user from session (optional, for templates)"""
    try:
        # Check for Authorization header first
        auth_header = request.headers.get("Authorization")
        token = None
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            # Check for token in cookies (for browser requests)
            token = request.cookies.get("access_token")
        
        if token:
            payload = verify_token(token)
            if payload:
                full_name = payload.get("sub")
                if full_name:
                    conn = get_db()
                    cur = conn.cursor()
                    cur.execute("""
                        SELECT user_id, full_name, email, is_verified
                        FROM users WHERE full_name = %s
                    """, (full_name,))
                    
                    user = cur.fetchone()
                    cur.close()
                    return_db(conn)
                    
                    if user:
                        return {
                            "user_id": user[0],
                            "name": user[1],
                            "email": user[2],
                            "is_verified": user[3]
                        }
        return None
    except Exception as e:
        print(f"[AUTH] Failed to get optional user: {e}")
        return None