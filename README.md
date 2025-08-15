# Atlas: Legal Industry focused Modular MCP RAG AI Systemy

## Summary

This application is a **real-time Modular Model-Context Protocol (MCP) Retrieval-Augmented Generation (RAG)** pipeline featuring LLM-driven semantic chunking, multi-level embeddings, intelligent routing, hybrid retrieval (dense + sparse), and rehydration, with dynamic prompt compression at query time.

This application demonstrates an MCP-inspired modular architecture for intelligent document ingestion and retrieval. It dynamically segments documents into semantically coherent chunks, indexes them at multiple granularities, and retrieves contextually relevant information based on query intent ... all in real time.

***Note***: Automatic namespace creation from incoming chunked documents is disabled.
All namespaces must be created manually by the user, ensuring a predictable and tightly controlled environment.

### Core Features:

- LLM-Driven Context-Aware Chunking
   * Uses a lightweight transformer to segment .docx or .txt files into meaningful sentences, paragraphs, and sections.

- Multi-Level Embedding
   * Generates embeddings at sentence, paragraph, and section levels for flexible retrieval.

- Intelligent routing
  
- Hybrid Retrieval (Dense + Sparse)
   * Combines Pinecone vector search (dense) with MongoDB BM25 (sparse) for optimal coverage.

- Dynamic Prompt Compression
   * Summarizes and compresses retrieved chunks on-the-fly to fit into model context windows.

- Metadata-Aware Rehydration
   * Chunks include:
      * parentParagraphId,
      * prevChunkId,
      * nextChunkId
   * ... for reconstructing larger sections when needed.

## Initial app setup

### 1. Prerequisites

   - Ensure you have the following installed:
   - Node.js (v18 or higher) & npm
   - Python (v3.9 or higher)
   - MongoDB (local or Atlas)
   - Pinecone account & API key
   - OpenAI API key
   - pip and virtualenv for Python dependencies

### 2. Clone the Repository
### 3. Install Node.js Dependencies
   - npm install
### 4. Set Up Python Environment for Chunker
   - cd python
   - python -m venv venv
   - source venv/bin/activate  # Mac/Linux
   - venv\Scripts\activate     # Windows
   - pip install -r requirements.txt
   - cd ..
### 5. Environment Variables
   - Create a .env file in the project root:
     ### APIs
      - OPENAI_API_KEY=your_openai_api_key
      - PINECONE_API_KEY=your_pinecone_api_key
     ### Mongo
       MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname
### 6. Start the Server
   - npm start
### 7. Try questions like: 
   - define feeder entity
   - What funding sources must be exhausted before requiring Limited Partners to return distributions?
   - define indemnification
   - _feel free to run sections of the document in your favorite model to create a few questions for youself_