import os
import asyncio
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_pinecone import PineconeVectorStore
from langchain_openai.embeddings import OpenAIEmbeddings
from langchain.chains import ConversationalRetrievalChain
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from gensim.models import Word2Vec, KeyedVectors
from langchain.embeddings.base import Embeddings
import numpy as np
from nltk.tokenize import sent_tokenize, word_tokenize
import nltk
nltk.download('punkt_tab')

# Load environment variables
_ = load_dotenv(override=True)

class AraVecEmbeddings(Embeddings):
    def __init__(self, model: str):
        self.model = model.wv

    def embed_documents(self, text):
        embeddings = []
        for text in texts:
            sent_tokenized = sent_tokenize(text)
            words = [word_tokenize(sent) for sent in sent_tokenized]
            word_vectors = [self.model[word] for word in words if word in self.model]
            if word_vectors:
                avg_vector = np.mean(word_vectors, axis=0)
                embeddings.append([float(x) for x in avg_vector]) # Average word vectors
            else:
                embeddings.append(np.zeros(self.model.vector_size).tolist()) # Handle empty or OOV texts
        return embeddings

    def embed_query(self, text: str):
        sent_tokenized = sent_tokenize(text)
        words = [token for sent in sent_tokenized for token in word_tokenize(sent)]
        word_vectors = [self.model[word] for word in words if word in self.model]
        if word_vectors:
            avg_vector = np.mean(word_vectors, axis=0)
            return [float(x) for x in avg_vector]
        else:
            return [0.0] * self.model.vector_size

def create_retriever_chain(vectorstore):
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5, "fetch_k": 10, "score_threshold": 0.3, "alpha":0.5})
    
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


index_name = 'non-profit-rag-100'
try:
    asyncio.get_running_loop()
except RuntimeError:
    asyncio.set_event_loop(asyncio.new_event_loop())
    
embedding_model = Word2Vec.load("models/full_grams_cbow_100_twitter/full_grams_cbow_100_twitter.mdl")
embedding_function = AraVecEmbeddings(embedding_model)

# embedding_model = OpenAIEmbeddings(model="text-embedding-ada-002", openai_api_key=os.getenv('OPENAI_API_KEY'))
vector_db = PineconeVectorStore(embedding=embedding_function, index_name=index_name)


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