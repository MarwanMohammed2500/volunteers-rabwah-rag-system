import os
import logging
import asyncio
from typing import List
from dotenv import load_dotenv
from langchain.schema import Document
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore
# from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings
from .exceptions import IndexNotFound

# Load environment variables
_ = load_dotenv(override=True)

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def create_index(index_name: str='non-profit-rag', vect_length: int = 384):
    """
    Creates a Pinecone index with the specified name and vector length.

    Args:
        index_name (str): The name of the index to create. Defaults to 'non-profit-rag'.
        vect_length (int): The length of the vectors in the index. Defaults to 384.

    Returns:
        None
    """
    pinecone = Pinecone(api_key=os.getenv('PINECONE_API_KEY', ""))
    if index_name not in [index["name"] for index in pinecone.list_indexes()]:
        logger.info(f'Creating Index: {index_name}')
        pinecone.create_index(
            name=index_name,
            dimension=vect_length,
            metric='cosine',
            spec=ServerlessSpec(cloud='aws', region='us-east-1')
        )
        logger.info(f'Done Creating Index: {index_name}')

def ensure_namespace_exists(index_name: str, namespace: str) -> bool:
    """
    Checks if a namespace exists in the specified index.
    
    Args:
        index_name (str): The name of the Pinecone index
        namespace (str): The namespace to check
    
    Returns:
        bool: True if namespace exists, False otherwise
    """
    pinecone = Pinecone(api_key=os.getenv('PINECONE_API_KEY', ""))
    index = pinecone.Index(index_name)
    
    existing_namespaces = index.list_namespaces()
    namespace_exists = namespace in existing_namespaces
    
    if namespace_exists:
        logger.info(f'✅ Namespace exists: {namespace}')
    else:
        logger.info(f'📝 Namespace does not exist: {namespace}')
    
    return namespace_exists

def get_existing_namespaces(index_name: str = 'non-profit-rag') -> List[str]:
    """
    Returns list of existing namespaces in the specified index.
    
    Args:
        index_name (str): The name of the Pinecone index
        
    Returns:
        List[str]: List of namespace names
    """
    try:
        pinecone = Pinecone(api_key=os.getenv('PINECONE_API_KEY', ""))
        index = pinecone.Index(index_name)
        
        namespace_objects = index.list_namespaces()
        
        namespace_names = []
        for ns_obj in namespace_objects:
            if hasattr(ns_obj, 'name') and ns_obj.name:
                namespace_names.append(ns_obj.name)
            else:
                namespace_names.append(str(ns_obj))
        
        logger.info(f"📁 Found namespaces: {namespace_names}")
        return namespace_names
        
    except Exception as e:
        logger.error(f"Error getting namespaces: {e}")
        return []

def add_documents_to_pinecone(index_name: str='non-profit-rag', vect_length: int=384, 
                              documents: List[Document]=None, namespace: str = None):
    """
    Adds a list of documents to a Pinecone index. If the index does not exist, it is created first.

    Args:
        index_name (str): The name of the index to add the documents to. Defaults to 'non-profit-rag'.
        vect_length (int): The length of the vectors in the index. Defaults to 384.
        documents (List[Document], optional): The list of documents to add to the index. Defaults to None.
        namespace (str, optional): The namespace to add documents to. Defaults to None.

    Returns:
        None
    """
    try:
        if not documents:
            logger.warning("⚠️ No valid documents found for processing.")
            return
        
        # Ensure an event loop exists in Streamlit's ScriptRunner thread
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.set_event_loop(asyncio.new_event_loop())

        embedding_model = HuggingFaceEmbeddings(
        model_name="intfloat/multilingual-e5-small",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
        )
        pinecone = Pinecone(api_key=os.getenv('PINECONE_API_KEY', ""))
        
        if index_name not in [index_info["name"] for index_info in pinecone.list_indexes()]:
            logger.warning(f"⚠️ Index '{index_name}' does not exist. Create the index first.")
            
            create_index(index_name=index_name, vect_length=vect_length)
            logger.info("✅ Successfully created the index in Pinecone.")
            
        # Check if namespace exists (just for logging)
        namespace_exists = ensure_namespace_exists(index_name, namespace) if namespace else False
        if namespace and not namespace_exists:
            logger.info(f'🆕 Will create namespace: {namespace} when adding documents')
        
        vector_store_kwargs = {
            "index_name": index_name,
            "embedding": embedding_model,
            "pinecone_api_key": os.getenv('PINECONE_API_KEY', "")
        }

        if namespace:
            vector_store_kwargs["namespace"] = namespace
        
        vector_store = PineconeVectorStore(**vector_store_kwargs)
        
        # Only add documents if we have actual content (not empty)
        if documents and len(documents) > 0 and documents[0].page_content.strip():
            vector_store.add_documents(documents=documents)
            action = "created and added to" if namespace and not namespace_exists else "added to"
            logger.info(f"✅ Successfully {action} namespace: {namespace}")
        
    except Exception as e:
        logger.error(f"❌ An error occurred while adding new documents to Pinecone: {e}", exc_info=True)


def delete_vectors_by_source(source_name: str, namespace='__default__'):
    pinecone = Pinecone(api_key=os.getenv('PINECONE_API_KEY', ""))
    index = pinecone.Index("non-profit-rag")
    
    logger.info(f"❌ Deleting vectors with source = '{source_name}'...")
    all_ids = [i for ids in index.list(namespace=namespace) for i in ids]
    batch_size = 100
    matching_ids = []

    for i in range(0, len(all_ids), batch_size):
        batch_ids = all_ids[i:i+batch_size]
        fetched = index.fetch(ids=batch_ids, namespace=namespace)
        for vec_id, data in fetched.vectors.items():
            metadata = data.metadata
            if metadata.get("source") == source_name:
                matching_ids.append(vec_id)

    logger.info(f"[INFO] Found {len(matching_ids)} vectors to delete.")

    if matching_ids:
        delete_batch_size = 1000
        for i in range(0, len(matching_ids), delete_batch_size):
            batch_to_delete = matching_ids[i : i + delete_batch_size]
            index.delete(ids=batch_to_delete, namespace=namespace)
            logger.info(f"[INFO] Deleted {len(batch_to_delete)} vectors...")
        logger.info("[SUCCESS] Deletion complete.")
    else:
        logger.info("No vectors found with that source.")