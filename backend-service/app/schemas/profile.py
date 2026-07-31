from pydantic import BaseModel, Field


class AddressSchema(BaseModel):
    label: str = "default"
    value: str
    is_default: bool = False


class ProfileResponse(BaseModel):
    name: str | None
    phone: str | None
    addresses: list[AddressSchema]
    # LLM-managed preferences, read-only; the customer can view and clear them.
    memory: str | None = None


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    addresses: list[AddressSchema] = []
