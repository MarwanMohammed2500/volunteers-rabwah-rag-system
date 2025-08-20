# RAG Assistant

## Introduction
A Retrieval-Augmented Generation (RAG) system designed to provide intelligent customer support for Rabwah's volunteering administration, powered by Google Gemini and Pinecone.

---

## Features

- **Document Management**: Upload and process PDFs, Word docs (.docx), and text (.txt) files
- **Web Content Integration**: Extract and index content from Youtube URLs
- **Conversational AI**: Two interface modes:
  - **Admin Interface**: For knowledge base management
  - **User Interface**: For end-user interactions
- **Vector Search**: Pinecone-powered semantic search
- **Multi-turn Conversations**: Context-aware chat history
---

## Technology Stack

| Component          | Technology                          |
|--------------------|-------------------------------------|
| LLM                | Google Gemini 2.5 Flash             |
| Embeddings         | Google's embedding-001              |
| Vector Database    | Pinecone (Serverless)               |
| Framework          | LangChain                           |
| Frontend           | NodeJS                              |
| Containers         | Docker                              |

> **Suggestion:** Use OpenAI's Chatbot instead of Google's, it yields much better results (gpt-4o to be precise)

---

## Prerequisites
- Python 3.11+
- Docker (for containerized deployment)
- API Keys:
  - Google Generative AI API key (If using OpenAI's LLM Model, then use an OpenAI API key instead)
  - Pinecone API key

## Installation

### For Development and code maintenance

1. Create and activate a virtual environment:
```bash
# Clone the repo
git clone https://github.com/MarwanMohammed2500/volunteers-rabwah-rag-system.git
cd volunteers-rabwah-rag-system
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file with your API keys:
```env
GOOGLE_API_KEY=your_google_api_key (OR OPENAI_API_KEY=your_openai_api_key)
PINECONE_API_KEY=your_pinecone_api_key
```

4. Run the applications:
```bash
# In separate terminals
cd volunteers-rabwah-rag-system/Docker
sudo docker compose up
```

## Usage

### Admin Interface (ragbot.com:8000/admin)
- Upload documents (PDF, DOCX, TXT)
- Process YouTube URLs
- Monitor document processing status
- Manage knowledge base content

### User Interface
- Natural language Q&A
- Context-aware conversations
- Knowledge-based responses

### Admin Credentials
Username: admin1 | Password: ragadminuser2025
To change the admin creds, please modify src/admin_auth.yaml, to change creds the password, make sure to run this python script first:
```python
import streamlit_authenticator as stauth # pip install streamlit-authenticator first
hashed_pass = stauth.Hasher().hash("your-password-here")
print(hashed_pass) # This output is what you should use in admin_auth.yaml
```

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
   index_name = "non-profit-rag"  # Change index name if needed
   vect_length = 768              # Match your embedding model
   ```

2. **Search Parameters** (`ai_agent.py`/`full_chain.py`):
   ```python
   search_kwargs={
       "k": 10,                  # Number of results
       "fetch_k": 10,            # Initial pool size
       "score_threshold": 0.3    # MMR diversity parameter
   }
   ```

---

## Troubleshooting

**Common Issues:**

1. **Missing API Keys**:
   - Ensure `.env` file exists with correct keys
   - Verify keys have proper permissions

2. **Pinecone Index Not Found**:
   - Run `create_index()` from `Vector_db.py` first (Uploading files automatically creates an index though if the index doesn't exist)

3. **Document Processing Failures**:
   - Check file formats (supports PDF, DOCX, TXT)
   - Verify URL accessibility

## Contact
Project Maintainer: [Marwan Mohammed](mailto:marwanmohammed056@gmail.com)  
[Portfolio](https://marwan-mohammed-portfoli-442cb.web.app/)

# Important Notes
- Please update all API Keys to Rabwah's own API Keys, that means changing Pinecone's API key and google/openai api key