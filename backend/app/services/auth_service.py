from app.repositories.user import UserRepository
from app.core.security import hash_password, verify_password, create_access_token

class AuthService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    def register_user(self, email: str, password: str):
        if self.user_repo.get_by_email(email):
            raise ValueError("Email already registered")
        hashed = hash_password(password)
        return self.user_repo.create(email, hashed)

    def login_user(self, email: str, password: str):
        user = self.user_repo.get_by_email(email)
        if not user or not verify_password(password, user.hashed_password):
            raise ValueError("Invalid credentials")
        token = create_access_token({"sub": str(user.id)})
        return token
