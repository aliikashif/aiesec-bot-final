# AIESEC Multi-Portfolio RAG Chatbot

A document-based AI assistant built to help AIESEC members find answers across portfolio documentation, policies and learning resources.

Developed by **Ali Kashif**, the project was recognized as a **Good Case Practice (GCP)** and shared across AIESEC International for broader adoption.

## Why I built it

AIESEC members work with information spread across multiple documents and portfolios. Finding a relevant policy, understanding a process or answering an onboarding question can mean searching through several PDFs.

I built this assistant to bring that information into a conversational interface. Users select a portfolio, ask a question and receive an answer supported by retrieved document passages, with source references they can check themselves.

## Features

- **Portfolio-specific retrieval:** Separate contexts for Finance & Legal, Business Development, Exchange and Member Experience.
- **Document-grounded answers:** Retrieves relevant passages from the document collection to provide context for the language model.
- **Source references:** Lets users inspect the documents supporting an answer.
- **Confidence indicator:** Labels retrieval confidence using similarity scores from the retrieved passages.
- **Streaming responses:** Displays answers progressively as they are generated.
- **Document browser and summaries:** Helps users explore the available material beyond individual chat responses.
- **Administration tools:** Includes authenticated upload, deletion and summarization endpoints for managing the document collection.
- **Feedback collection:** Allows users to provide feedback on answers.

## How it works

1. **Prepare documents:** PDFs are organized into portfolio folders and their text is extracted.
2. **Create searchable passages:** Text is split into overlapping chunks and converted into embeddings using Google's embedding API.
3. **Store embeddings:** Chunks and their metadata are stored in Supabase PostgreSQL using pgvector.
4. **Retrieve context:** A user's question is embedded and matched against relevant passages, filtered by portfolio.
5. **Generate an answer:** A Groq-hosted language model uses the retrieved context to generate a response.
6. **Show supporting information:** The interface displays the answer, sources and a retrieval-confidence label.

The system uses retrieval-augmented generation (RAG). It does not train or fine-tune a language model on the documents.

## Technology stack

| Component | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS, React Router |
| Backend | Python, FastAPI, Uvicorn |
| Retrieval pipeline | LangChain, PDF text extraction, portfolio metadata filtering |
| Embeddings | Google Gemini embedding API |
| Answer generation | Groq-hosted language model |
| Vector storage | Supabase PostgreSQL and pgvector |
| Administration | JWT-based authentication for management endpoints |
| Hosting | Vercel frontend and Render backend |

## My contribution

I developed the application from an initial prototype into a deployed frontend and backend, using AI-assisted development tools throughout the process. My work included defining the portfolio workflows, organizing the document collection, developing the chat and source-viewing experience, integrating the retrieval pipeline, testing responses and troubleshooting deployment and API issues.

The project gave me practical experience with document retrieval, API integration, vector databases and the challenges of making an AI application useful to a specific community.

## Repository structure

| Path | Purpose |
|---|---|
| `frontend/src/` | Chat interface, document browser, administration pages and reusable components |
| `backend/main.py` | FastAPI routes and request handling |
| `backend/rag.py` | Retrieval, answer generation and confidence scoring |
| `backend/ingest.py` | PDF ingestion, chunking and vector storage |
| `backend/portfolios.py` | Portfolio definitions and configuration |
| `backend/auth.py` | Administrator token creation and verification |
| `backend/generate_summaries.py` | Document summarization |
| `backend/documents/` | Document inputs organized by portfolio |

## Local development

The commands below describe the repository's development entry points. You will need your own API credentials and a PostgreSQL database with pgvector enabled. They are not a verified one-command deployment recipe; database permissions and any additional tables used by administration or feedback features must also be configured.

### Backend

From the repository root, create and activate a Python virtual environment. The repository specifies Python 3.11.9 in `backend/runtime.txt`.

```bash
cd backend
python -m pip install -r requirements.txt
```

Create a private `backend/.env` file with your own values:

```dotenv
GROQ_API_KEY=YOUR_GROQ_API_KEY
GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY
SUPABASE_DB_URL=YOUR_POSTGRES_CONNECTION_STRING
ADMIN_PASSWORD=YOUR_UNIQUE_ADMIN_PASSWORD
ADMIN_JWT_SECRET=YOUR_RANDOM_JWT_SECRET
ADMIN_PANEL_ENABLED=true
```

An optional `GOOGLE_API_KEY_BACKUP` variable is supported. Never commit real credentials.

Place only approved documents in the appropriate portfolio folders under `backend/documents/`. Ingest them into your own database, then start the API from the `backend` directory:

```bash
python ingest.py
python -m uvicorn main:app --reload --port 8000
```

### Frontend

In a separate terminal, from the repository root:

```bash
cd frontend
npm ci
```

Create `frontend/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000
```

Start the development server:

```bash
npm run dev
```

Open the local address printed by Vite. For a production frontend build, use `npm run build` and configure the deployed API address separately.

## Limitations and document privacy

- Answers depend on the quality, coverage and currency of the document collection. Users should check the cited sources for important decisions.
- The confidence label measures retrieval similarity; it is **not a calibrated probability that an answer is correct**.
- Portfolio filtering organizes retrieval. It is not a substitute for user authorization or document-access controls.
- API availability, quotas and model configuration can affect response time and functionality.
- Public portfolio copies should use fictional documents or material explicitly approved for redistribution. Access to an internal document does not automatically grant permission to publish it.
- The current document-listing and download routes do not require administrator authentication. Review access controls before hosting confidential material.

## Author

**Ali Kashif** — BS Bioinformatics, National University of Sciences and Technology (NUST)

[GitHub](https://github.com/aliikashif) · [LinkedIn](https://www.linkedin.com/in/ali-kashif0)
