from pydantic import BaseModel, Field, computed_field

_CONVERSATION_ID = Field(
    min_length=1,
    max_length=64,
    pattern=r"^[A-Za-z0-9_-]+$",
    description="Conversation that owns this cart; one cart per conversation.",
)


class CartItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    image_url: str | None = None


class Cart(BaseModel):
    items: list[CartItem] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total_price(self) -> float:
        return sum(item.price * item.quantity for item in self.items)


class AddItemRequest(BaseModel):
    conversation_id: str = _CONVERSATION_ID
    item: CartItem


class UpdateItemRequest(BaseModel):
    conversation_id: str = _CONVERSATION_ID
    product_id: str
    quantity: int = Field(ge=0)
