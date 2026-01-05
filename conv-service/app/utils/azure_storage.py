"""
Azure Blob Storage utilities for document uploads.
"""
import logging
from pathlib import Path
from typing import Optional
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient, ContentSettings
from app.core.config import settings

logger = logging.getLogger(__name__)


class AzureBlobUploader:
    """Handles document uploads to Azure Blob Storage."""
    
    def __init__(
        self,
        connection_string: Optional[str] = None,
        container_name: str = "trusted-documents"
    ):
        """
        Initialize the Azure Blob uploader.
        
        Args:
            connection_string: Azure Storage connection string
            container_name: Container to upload documents to
        """
        self.connection_string = connection_string or settings.AZURE_STORAGE_CONNECTION_STRING
        self.container_name = container_name
        
        if not self.connection_string:
            logger.warning("No Azure Storage connection string configured - uploads will be skipped")
            self.blob_service_client = None
        else:
            self.blob_service_client = BlobServiceClient.from_connection_string(
                self.connection_string
            )
            self._ensure_container_exists()
            logger.info(f"AzureBlobUploader initialized: container={container_name}")
    
    def _ensure_container_exists(self):
        """Create the container if it doesn't exist."""
        if not self.blob_service_client:
            return
        
        try:
            container_client = self.blob_service_client.get_container_client(
                self.container_name
            )
            if not container_client.exists():
                container_client.create_container()
                logger.info(f"Created container '{self.container_name}'")
        except Exception as e:
            logger.error(f"Failed to ensure container exists: {e}")
            raise
    
    def upload_file(
        self,
        file_path: Path,
        blob_name: Optional[str] = None
    ) -> Optional[str]:
        """
        Upload a file to Azure Blob Storage.
        
        Args:
            file_path: Path to file to upload
            blob_name: Optional custom blob name (uses filename with timestamp if not provided)
            
        Returns:
            Blob URL if successful, None if no connection configured
        """
        if not self.blob_service_client:
            logger.warning("Skipping blob upload - no connection string configured")
            return None
        
        try:
            # Generate blob name with timestamp prefix to avoid conflicts
            if not blob_name:
                timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
                blob_name = f"{timestamp}-{file_path.name}"
            
            # Determine content type
            content_type = self._get_content_type(file_path)
            
            # Upload file
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            with open(file_path, "rb") as data:
                blob_client.upload_blob(
                    data,
                    overwrite=True,
                    content_settings=ContentSettings(content_type=content_type)
                )
            
            blob_url = blob_client.url
            logger.info(f"Uploaded {file_path.name} to {blob_url}")
            return blob_url
            
        except Exception as e:
            logger.error(f"Failed to upload {file_path.name} to Azure Blob: {e}")
            raise
    
    def _get_content_type(self, file_path: Path) -> str:
        """
        Get content type for a file based on extension.
        
        Args:
            file_path: Path to file
            
        Returns:
            MIME type string
        """
        extension_map = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.txt': 'text/plain'
        }
        return extension_map.get(file_path.suffix.lower(), 'application/octet-stream')
    
    def delete_blob(self, blob_name: str) -> bool:
        """
        Delete a blob from storage.
        
        Args:
            blob_name: Name of blob to delete
            
        Returns:
            True if deleted, False otherwise
        """
        if not self.blob_service_client:
            logger.warning("Cannot delete blob - no connection configured")
            return False
        
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            blob_client.delete_blob()
            logger.info(f"Deleted blob: {blob_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete blob {blob_name}: {e}")
            return False
