import os
import asyncio
from dotenv import load_dotenv
# from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_pinecone import PineconeVectorStore
from langchain.chains import ConversationalRetrievalChain
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_huggingface import HuggingFaceEmbeddings
import logging
import base64

logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(message)s')
logger = logging.getLogger(__name__)
# Load environment variables
_ = load_dotenv(override=True)

def create_retriever_chain(vectorstore, namespace: str = None):
    # Create retriever with optional namespace
    search_kwargs = {"k": 5, "fetch_k": 8, "score_threshold": 0.3}
    
    # Add namespace to search kwargs if provided
    namespace = base64.urlsafe_b64encode(namespace.replace(" ", "-").lower().encode("utf-8")).decode("ascii") # Pinecone namespaces must be ASCII encoded
    logger.info(f"[FULL CHAIN DEBUG] Namespace: {namespace}")
    if namespace:
        search_kwargs["namespace"] = namespace
    
    retriever = vectorstore.as_retriever(search_kwargs=search_kwargs)
    
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", 
                                 api_key=os.getenv('GOOGLE_API_KEY', ""), temperature=0.3)

    template = """
    You are a professional and knowledgeable AI assistant helping users retrieve information from a book.

    ---

    ### 📚 Context:
    {context}

    ---

    ### ❓ User Question:
    {question}

    ---
    ### ✅ Instructions:
    - Answer In Arabic Language.
    - Answer strictly based on the provided context.
    - Do not make assumptions or fabricate information.
    - Be concise, accurate, and neutral.
    - If the context includes multiple relevant facts, summarize them clearly.
    - If the answer can be summarized in bullet points then do it.
    - If the user shows any signs of gratitude (Like saying thanks, for instance), reply nicely.

    ---

    ### 🧠 Answer (Arabic language):
    """

    prompt = PromptTemplate(
        input_variables=["context", "question"], 
        template=template
    )

    return ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        return_source_documents=True,
        combine_docs_chain_kwargs={"prompt": prompt, "document_variable_name": "context"},
    )


index_name = 'non-profit-rag'
try:
    asyncio.get_running_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())

embedding_model = HuggingFaceEmbeddings(
        model_name="intfloat/multilingual-e5-small",
        model_kwargs={'device': 'cpu'},
        encode_kwargs={'normalize_embeddings': True}
        )
vector_db = PineconeVectorStore(embedding=embedding_model, index_name=index_name)

def get_response(user_query, chat_history, namespace: str = None):
    processed_history = []
    for msg in chat_history:
        if msg["isBot"] == "human" or msg["isBot"] is False:
            processed_history.append(("human", msg["content"]))
        elif msg["isBot"] == "ai" or msg["isBot"] is True:
            processed_history.append(("ai", msg["content"]))
    
    load_qa_chain = create_retriever_chain(vectorstore=vector_db, namespace=namespace)
    
    result = load_qa_chain.invoke(
                {
                    "question": user_query,
                    "chat_history": processed_history,
                }
            )
    return result