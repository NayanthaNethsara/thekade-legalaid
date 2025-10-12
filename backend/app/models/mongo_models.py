"""
MongoDB models for flexible chat and document storage
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId
import uuid

class PyObjectId(ObjectId):
    """Custom ObjectId class for Pydantic v2 compatibility"""
    @classmethod
    def __get_pydantic_json_schema__(cls, _source_type, _handler):
        return {"type": "string"}

    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_after_validator_function(
            cls.validate,
            core_schema.any_schema()
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return v
            raise ValueError("Invalid ObjectId")
        raise ValueError("Invalid ObjectId")

class ChatSessionMongo(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: Optional[str] = None
    summary: Optional[str] = None  # AI-generated summary of the conversation
    metadata: Dict[str, Any] = Field(default_factory=dict)
    message_count: int = 0
    total_tokens: int = 0  # Track token usage
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessageMongo(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # "user", "assistant", "system"
    content: str
    token_count: Optional[int] = None
    
    # RAG-specific fields
    sources: Optional[List[Dict[str, Any]]] = None
    context_used: Optional[str] = None  # The actual context fed to LLM
    
    # Memory management
    is_summarized: bool = False  # Whether this message is part of a summary
    summary_id: Optional[str] = None  # Reference to summary that replaced this
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ConversationSummaryMongo(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    summary_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    summary_content: str
    summarized_message_ids: List[str]  # Original messages that were summarized
    message_range: Dict[str, datetime]  # start_time, end_time
    token_count: int
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DocumentChunkMongo(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    chunk_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_document: str
    chunk_index: int
    content: str
    embedding: Optional[List[float]] = None  # Store embeddings directly in MongoDB
    
    # Document metadata
    document_metadata: Dict[str, Any] = Field(default_factory=dict)
    chunk_metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Processing info
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    embedding_model: Optional[str] = None

class UserProfileMongo(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    
    # Interaction patterns
    total_sessions: int = 0
    total_messages: int = 0
    total_tokens_used: int = 0
    
    # Preferences (learned from interactions)
    preferred_topics: List[str] = Field(default_factory=list)
    response_style_preference: Optional[str] = None  # "detailed", "concise", etc.
    
    # Usage statistics
    first_interaction: Optional[datetime] = None
    last_interaction: Optional[datetime] = None
    most_active_time: Optional[str] = None  # Time of day pattern
    
    # Long-term memory insights
    frequent_queries: List[Dict[str, Any]] = Field(default_factory=list)
    resolved_topics: List[str] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class KnowledgeGraphMongo(BaseModel):
    """For storing relationships between topics, documents, and user queries"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    entity_type: str  # "topic", "document", "query_pattern"
    entity_id: str
    entity_name: str
    
    # Relationships
    related_entities: List[Dict[str, Any]] = Field(default_factory=list)
    relevance_scores: Dict[str, float] = Field(default_factory=dict)
    
    # Usage stats
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)