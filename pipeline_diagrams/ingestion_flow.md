                     ┌─────────────────────────────┐
                     │ Upload Document (POST /ingest) │
                     └────────────┬────────────────┘
                                  │
                    ┌─────────────▼────────────┐
                    │ parseRawTextFromDocx/pdf │ ← (extract full raw text)
                    └─────────────┬────────────┘
                                  │
                      ┌───────────▼───────────┐
                      │ runSemanticChunker.py │ ← (MiniLM or Sentence-BERT) 
                      │  - sentence chunks    │
                      │  - paragraph chunks   │
                      │  - section chunks     │
                      └───────────┬───────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │ enrichWithLinkingMetadata │ ← (nextId, prevId, parentId)
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   embedChunksMultiLevel   │ ← (OpenAI `text-embedding-3-small`)
                    │   sentence/paragraph/sec  │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────▼───────────────────────────┐
        │ upsertToPinecone (dense) + upsertToMongo (raw + BM25)│
        └─────────────────────────┬───────────────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │ Ingestion Complete│ ← ready for hybrid retrieval
                        └───────────────────┘
