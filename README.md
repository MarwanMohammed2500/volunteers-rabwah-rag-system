# RAG Assistant

A Retrieval-Augmented Generation (RAG) system designed to provide intelligent customer support for non-profit organizations, powered by Google Gemini and Pinecone.

## Features

- **Document Management**: Upload and process PDFs, Word docs, and text files
- **Web Content Integration**: Extract and index content from URLs
- **Conversational AI**: Two interface modes:
  - **Admin Interface**: For knowledge base management
  - **User Interface**: For end-user interactions
- **Vector Search**: Pinecone-powered semantic search
- **Multi-turn Conversations**: Context-aware chat history

## Technology Stack

| Component          | Technology                          |
|--------------------|-------------------------------------|
| LLM                | Google Gemini 2.5 Flash             |
| Embeddings         | Google text-embedding-004           |
| Vector Database    | Pinecone (Serverless)               |
| Framework          | LangChain                           |
| Frontend           | Streamlit                           |
| Deployment         | Docker                              |

## Prerequisites

- Python 3.11+
- Docker (for containerized deployment)
- API Keys:
  - Google Generative AI API key
  - Pinecone API key

## Installation

### Option 1: Docker (Recommended)

```bash
# Build the image
docker build -t rag-app .

# Run the container (maps admin to 8501 and user interface to 8502)
docker run -p 8501:8501 -p 8502:8502 rag-app
```

### Option 2: Local Development

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# OR
.\venv\Scripts\activate  # Windows
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file with your API keys:
```env
GOOGLE_API_KEY=your_google_api_key
PINECONE_API_KEY=your_pinecone_api_key
```

4. Run the applications:
```bash
# In separate terminals
streamlit run src/admin_ui.py  # Admin interface on port 8501
streamlit run src/user_ui.py  # User interface on port 8502
```

## Usage

### Admin Interface (Port 8501)
- Upload documents (PDF, DOCX, TXT)
- Process YouTube URLs
- Monitor document processing status
- Manage knowledge base content

### User Interface (Port 8502)
- Natural language Q&A
- Context-aware conversations
- Knowledge-based responses

## File Structure

```
.
├── src/
│   ├── utils/
│   │   ├── Vector_db.py        # Pinecone operations
│   │   ├── ai_agent.py         # Agent-based Q&A
│   │   ├── full_chain.py       # Conversational chain
│   │   └── Load_data.py        # Document processing
│   ├── admin_ui.py             # Admin interface
│   ├── user_ui.py              # Basic user interface
│   └── user_ui_v2.py           # Enhanced user interface
├── Dockerfile
├── supervisord.conf
├── requirements.txt
├── .env
└── README.md

```

## Configuration

Customize these parameters in the respective files:

1. **Pinecone Index** (`Vector_db.py`):
   ```python
   index_name = "non-profit-rag"  # Change index name as needed
   vect_length = 768              # Match your embedding model
   ```

2. **Search Parameters** (`ai_agent.py`/`full_chain.py`):
   ```python
   search_kwargs={
       "k": 5,                   # Number of results
       "fetch_k": 10,            # Initial pool size
       "alpha": 0.5              # MMR diversity parameter
   }
   ```

## Troubleshooting

**Common Issues:**

1. **Missing API Keys**:
   - Ensure `.env` file exists with correct keys
   - Verify keys have proper permissions

2. **Pinecone Index Not Found**:
   - Run `create_index()` from `Vector_db.py` first

3. **Document Processing Failures**:
   - Check file formats (supports PDF, DOCX, TXT)
   - Verify URL accessibility

## Contact

Project Maintainer: [Osama Abo bakr](mailto:osamaoabobakr12@gmail.com)  
Portofolio: [Portofolio](https://osama-abo-bakr.vercel.app/)