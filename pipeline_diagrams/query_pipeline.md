                        ┌─────────────────────────────┐
                        │  User Query (POST /query)   │
                        └────────────┬────────────────┘
                                     │
                           ┌─────────▼─────────┐
                           │ classifyQueryIntent│ ←── (fact, definition, summary, etc.)
                           └─────────┬─────────┘
                                     │
        ┌────────────────────────────┴────────────────────────────┐
        │                                                         │
   Narrow intent (fact/definition)                          Broad intent (summary/clause)
        │                                                         │
┌───────▼───────┐                                           ┌─────▼ ────────────────────────┐
│ sentence-level│                                           │ sectionId required            │
│ dense search  │                                           │ fetch raw section text        │
└───────┬───────┘                                           └──────────┬────────────────────┘
        │                                                             │
        │                                                      ┌──────▼──────┐
        │                                                      │ dynamicChunkText (py) │
        │                                                      └──────┬──────┘
        │                                                      ┌──────▼────────┐
        │                                                      │ embedChunksAndSearch │
        │                                                      └──────┬────────┘
        │                                                             │
        └───────────────┬─────────────────────────────────────────────┘
                        │
                ┌───────▼───────┐
                │ compressChunks│ ←– optional prompt compressor (T5-small)
                └───────┬───────┘
                        │
                ┌───────▼───────┐
                │ Return Results│ → intent + top chunks + optional summary
                └───────────────┘
