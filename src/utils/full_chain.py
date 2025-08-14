import os
import asyncio
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_pinecone import PineconeVectorStore
from langchain_openai.embeddings import OpenAIEmbeddings
from langchain.chains import ConversationalRetrievalChain
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI

# Load environment variables
_ = load_dotenv(override=True)

def create_retriever_chain(vectorstore):
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5, "fetch_k": 8, "score_threshold": 0.3})
    
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", 
                                 api_key=os.getenv('GOOGLE_API_KEY', ""))

    # llm = ChatOpenAI(model="gpt-4o", api_key=os.getenv("OPENAI_API_KEY"))
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

embedding_model = GoogleGenerativeAIEmbeddings(model="models/embedding-001",
                                            google_api_key=os.getenv('GOOGLE_API_KEY', ""))
vector_db = PineconeVectorStore(embedding=embedding_model, index_name=index_name)


def get_response(user_query, chat_history):
    processed_history = []
    for msg in chat_history:
        if "human" in msg:
            processed_history.append(("human", msg["human"]))
        elif "ai" in msg:
            processed_history.append(("ai", msg["ai"]))
    
    load_qa_chain = create_retriever_chain(vectorstore=vector_db)
    
    result = load_qa_chain.invoke(
                {
                    "question": user_query,
                    "chat_history": processed_history,
                }
            )
    return result