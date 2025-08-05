import os
import logging
from typing import List
from dotenv import load_dotenv
from langchain.schema import Document
from langchain_community.document_loaders import WebBaseLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (TextLoader, PyPDFLoader, Docx2txtLoader)

# Load environment variables
_ = load_dotenv(override=True)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(message)s')
logger = logging.getLogger(__name__)

def splitting_documents(documents: list[Document], chunk_size: int = 1500, chunk_overlap: int = 300) -> list[Document]:
    """
    Splits a list of documents into smaller sub-documents based on a specified character chunk size.

    Args:
        documents (list[Document]): The list of documents to split.
        chunk_size (int): The maximum number of characters in each sub-document. Defaults to 1500.
        chunk_overlap (int): The number of characters to keep the same between sub-documents. Defaults to 300.

    Returns:
        list[Document]: A list of the sub-documents.
    """
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size,chunk_overlap=chunk_overlap)
    return text_splitter.split_documents(documents)

def loading_url(url: str=None) -> list[Document]:
    """
    Loads a document from a URL and returns it as a list of Document objects.

    Args:
        url (str): The URL of the document to load.

    Returns:
        list[Document]: A list of Document objects representing the loaded document.
    """
    logger.info(f"🌐 Loading document from URL: {url}")
    try:
        loader = WebBaseLoader(url)
        documents = loader.load()
        return documents
    except Exception as e:
        logger.error(f"❌ Error loading document from URL {url}: {e}", exc_info=True)
        return []
    
def loading_documents(file_paths: List[str]) -> list[Document]:    
    """
    Loads a collection of documents from a list of file paths and returns them as a list of Document objects.

    Args:
        file_paths (List[str]): A list of file paths to load.

    Returns:
        list[Document]: A list of Document objects representing the loaded documents.

    Supported file formats are .txt, .pdf, .docx
    """
    full_document = []
    for path in file_paths:
        filename = os.path.basename(path)
        logger.info(f"📁 Processing file: {filename}")
        try:
            if path.endswith(".txt"):
                loader = TextLoader(path, encoding="utf-8")
            elif path.endswith(".pdf"):
                loader = PyPDFLoader(path, mode="single")
            elif path.endswith(".docx"):
                loader = Docx2txtLoader(path)
            else:
                logger.warning(f"✖️ Unsupported file format: {path}")
                continue
            
            documents = loader.load()
            documents = [doc.page_content.replace("\n", " ") for doc in documents if doc.page_content.strip()]
            
            full_document.extend(
                Document(page_content=doc, metadata={"source": filename}) for doc in documents
                )
        
        except Exception as e:
            logger.error(f"❌ Error processing file {path}: {e}", exc_info=True)
            continue
    
    return full_document

def loading_data(file_paths: List[str]=None, url: str=None) -> list[Document]:
    """
    Loads documents from a list of file paths and/or a URL, processes them by splitting them into smaller documents
    and returns a list of Document objects.

    Args:
        file_paths (List[str], optional): A list of file paths to load documents from. Defaults to None.
        url (str, optional): A URL to load a document from. Defaults to None.

    Returns:
        list[Document]: A list of Document objects representing the loaded documents.
    """
    full_doc = []
    if url:
        full_doc.extend(loading_url(url))
    if file_paths is not None and len(file_paths) > 0:
        splitting_doc = splitting_documents(loading_documents(file_paths))
        print(f"✅ Length of splitting_doc: {len(splitting_doc)}")
        full_doc.extend(splitting_doc)
    return full_doc