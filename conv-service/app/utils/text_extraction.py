"""
Text extraction utilities for RAG indexing.
Supports PDF, DOCX, TXT, and basic OCR for scanned images.
"""
import logging
from pathlib import Path
from typing import Optional
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


def extract_text(file_path: Path) -> str:
    """
    Extract text from a file based on its extension.
    
    Args:
        file_path: Path to document file
        
    Returns:
        Extracted text content
        
    Raises:
        ValueError: If file type is not supported
    """
    suffix = file_path.suffix.lower()
    
    if suffix == '.pdf':
        return extract_text_from_pdf(file_path)
    elif suffix in ['.docx', '.doc']:
        return extract_text_from_docx(file_path)
    elif suffix == '.txt':
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {suffix}")


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
