from typing import Any

from pydantic import BaseModel, Field, field_validator


class AddressEntry(BaseModel):
    label: str = Field(description="Address label, e.g. 'home', 'work', 'default'.")
    value: str = Field(description="The full address line.")


class CombinedExtraction(BaseModel):
    name: str | None = Field(default=None, description="Buyer's own real name.")
    phone: str | None = Field(default=None, description="Buyer's own contact number.")
    addresses: list[AddressEntry] = Field(
        default_factory=list, description="Buyer's own delivery addresses."
    )
    gender: str | None = Field(default=None, description="Buyer's gender, if explicitly stated.")
    favourite_items: list[str] = Field(
        default_factory=list, description="Broad favorite categories."
    )
    usual_recipients: list[str] = Field(
        default_factory=list, description="Who they usually buy for and facts about them."
    )
    delivery_notes: str | None = Field(default=None, description="Standing delivery instructions.")
    preferred_language: str | None = Field(
        default=None,
        description="Preferred language tag: si | ta | en | singlish | tanglish.",
    )
    other_preferences: str | None = Field(
        default=None, description="Other recurring preferences/facts."
    )

    def to_memory_dict(self) -> dict[str, Any]:
        """Return only the behavioral preference memory fields as a dict."""
        return {
            "gender": self.gender,
            "favourite_items": self.favourite_items,
            "usual_recipients": self.usual_recipients,
            "delivery_notes": self.delivery_notes,
            "preferred_language": self.preferred_language,
            "other_preferences": self.other_preferences,
        }

    def to_formatted_text(self) -> str:
        """Return a human-readable text representation of the preferences."""
        lines = []
        if self.gender:
            lines.append(f"Gender: {self.gender}")
        if self.favourite_items:
            lines.append(f"Favourite items: {', '.join(self.favourite_items)}")
        if self.usual_recipients:
            recipients = ", ".join(self.usual_recipients)
            lines.append(f"Usual recipients & their facts: {recipients}")
        if self.delivery_notes:
            lines.append(f"Delivery notes: {self.delivery_notes}")
        if self.preferred_language:
            lines.append(f"Preferred language: {self.preferred_language}")
        if self.other_preferences:
            lines.append(f"Other preferences & facts: {self.other_preferences}")
        return "\n".join(lines).strip()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        """Validate and normalize Sri Lankan telephone numbers to include '94' prefix."""
        if not v:
            return None
        digits = "".join(c for c in v if c.isdigit())
        if not digits:
            return None
        if digits.startswith("0") and len(digits) == 10:
            return "94" + digits[1:]
        if digits.startswith("7") and len(digits) == 9:
            return "94" + digits
        return digits
