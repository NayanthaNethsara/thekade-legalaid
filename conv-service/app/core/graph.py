from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.user import User
from app.services.kafka import KafkaService

from app.repositories.user import UserRepository

class GraphContext:
    def __init__(
        self,
        message: Dict[str, Any],
        db: Session,
        kafka_service: KafkaService
    ):
        self.message = message
        self.db = db
        self.kafka_service = kafka_service
        self.user_repo = UserRepository(db)
        self.user: Optional[User] = None

class Node(ABC):
    @abstractmethod
    async def process(self, context: GraphContext) -> Optional['Node']:
        """
        Process the current step.
        Returns the next Node to execute, or None if the flow ends.
        """
        pass

class NodeGraph:
    async def run(self, context: GraphContext, start_node: Node):
        current_node = start_node
        while current_node:
            current_node = await current_node.process(context)
