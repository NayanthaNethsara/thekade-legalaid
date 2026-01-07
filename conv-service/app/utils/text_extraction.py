"""
Text extraction utilities for RAG indexing.
Supports PDF, DOCX, TXT, and basic OCR for scanned images.
"""
import logging
import io
from pathlib import Path
from typing import Optional, Union
import pypdf
from docx import Document

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_path: Path) -> str:
    """
    Extract text from a PDF file.
    
    Args:
        pdf_path: Path to PDF file
        
    Returns:
        Extracted text content
    """
    try:
        text_parts = []
        with open(pdf_path, 'rb') as f:
            reader = pypdf.PdfReader(f)
            logger.info(f"Extracting text from {pdf_path.name} ({len(reader.pages)} pages)")
            
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text()
                if page_text.strip():
                    text_parts.append(page_text)
                else:
                    logger.warning(f"Page {page_num} appears empty - might need OCR")
        
        full_text = "\n\n".join(text_parts)
        logger.info(f"Extracted {len(full_text)} characters from {pdf_path.name}")
        return full_text
        
    except Exception as e:
        logger.error(f"Failed to extract text from {pdf_path}: {e}")
        raise


def extract_text_from_docx(docx_path: Path) -> str:
    """
    Extract text from a DOCX file.
    
    Args:
        docx_path: Path to DOCX file
        
    Returns:
        Extracted text content
    """
    try:
        doc = Document(docx_path)
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        full_text = "\n\n".join(paragraphs)
        logger.info(f"Extracted {len(full_text)} characters from {docx_path.name}")
        return full_text
        
    except Exception as e:
        logger.error(f"Failed to extract text from {docx_path}: {e}")
        raise


def extract_text_from_txt(txt_path: Path) -> str:
    """
    Extract text from a TXT file.
    
    Args:
        txt_path: Path to TXT file
        
    Returns:
        File content
    """
    try:
        with open(txt_path, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
        logger.info(f"Read {len(text)} characters from {txt_path.name}")
        return text
        
    except Exception as e:
        logger.error(f"Failed to read text from {txt_path}: {e}")
        raise


def extract_text(file_path_or_bytes: Union[Path, bytes], filename: Optional[str] = None) -> str:
    """
    Extract text from a file based on its extension.
    Can accept either a file path or bytes with a filename.
    
    Args:
        file_path_or_bytes: Path to document file or bytes content
        filename: Required if providing bytes, used to determine file type
        
    Returns:
        Extracted text content
        
    Raises:
        ValueError: If file type is not supported
    """
    # Handle bytes input
    if isinstance(file_path_or_bytes, bytes):
        if not filename:
            raise ValueError("filename is required when providing bytes")
        
        suffix = Path(filename).suffix.lower()
        
        if suffix == '.pdf':
            return extract_text_from_pdf_bytes(file_path_or_bytes)
        elif suffix in ['.docx', '.doc']:
            return extract_text_from_docx_bytes(file_path_or_bytes)
        elif suffix == '.txt':
            return extract_text_from_txt_bytes(file_path_or_bytes)
        else:
            raise ValueError(f"Unsupported file type: {suffix}")
    
    # Handle Path input
    file_path = file_path_or_bytes
    suffix = file_path.suffix.lower()
    
    if suffix == '.pdf':
        return extract_text_from_pdf(file_path)
    elif suffix in ['.docx', '.doc']:
        return extract_text_from_docx(file_path)
    elif suffix == '.txt':
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Extract text from PDF bytes.
    
    Args:
        pdf_bytes: PDF file content as bytes
        
    Returns:
        Extracted text content
    """
    try:
        text_parts = []
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        logger.info(f"Extracting text from PDF bytes ({len(reader.pages)} pages)")
        
        for page_num, page in enumerate(reader.pages, 1):
            page_text = page.extract_text()
            if page_text.strip():
                text_parts.append(page_text)
            else:
                logger.warning(f"Page {page_num} appears empty - might need OCR")
        
        full_text = "\n\n".join(text_parts)
        logger.info(f"Extracted {len(full_text)} characters from PDF bytes")
        return full_text
        
    except Exception as e:
        logger.error(f"Failed to extract text from PDF bytes: {e}")
        raise


def extract_text_from_docx_bytes(docx_bytes: bytes) -> str:
    """
    Extract text from DOCX bytes.
    
    Args:
        docx_bytes: DOCX file content as bytes
        
    Returns:
        Extracted text content
    """
    try:
        doc = Document(io.BytesIO(docx_bytes))
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        full_text = "\n\n".join(paragraphs)
        logger.info(f"Extracted {len(full_text)} characters from DOCX bytes")
        return full_text
        
    except Exception as e:
        logger.error(f"Failed to extract text from DOCX bytes: {e}")
        raise


def extract_text_from_txt_bytes(txt_bytes: bytes) -> str:
    """
    Extract text from TXT bytes.
    
    Args:
        txt_bytes: TXT file content as bytes
        
    Returns:
        File content
    """
    try:
        text = txt_bytes.decode('utf-8', errors='ignore')
        logger.info(f"Read {len(text)} characters from TXT bytes")
        return text
        
    except Exception as e:
        logger.error(f"Failed to read text from TXT bytes: {e}")
        raise


def normalize_text(text: str) -> str:
    """
    Normalize extracted text by removing excessive whitespace
    and fixing common extraction artifacts.
    
    Args:
        text: Raw extracted text
        
    Returns:
        Normalized text
    """
    # Replace multiple spaces with single space
    text = ' '.join(text.split())
    
    # Fix common PDF extraction issues
    text = text.replace('\x00', '')  # Remove null bytes
    text = text.replace('\ufffd', '')  # Remove replacement characters
    
    return text.strip()
