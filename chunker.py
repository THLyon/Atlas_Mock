import sys
import json
from sentence_transformers import SentenceTransformer, util
import nltk
from nltk.tokenize import sent_tokenize
from docx import Document

nltk.download('punkt')

model = SentenceTransformer("all-MiniLM-L6-v2")

def load_docx(file_path):
    doc = Document(file_path)
    return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

def semantic_chunk(text, max_tokens=500, threshold=0.75):
    sentences = sent_tokenize(text)
    chunks, current = [], []

    for sent in sentences:
        emb = model.encode(sent, convert_to_tensor=True)
        if current:
            sim = util.pytorch_cos_sim(emb, model.encode(current[-1], convert_to_tensor=True))
            if sim.item() < threshold or len(" ".join(current).split()) > max_tokens:
                chunks.append(" ".join(current))
                current = [sent]
            else:
                current.append(sent)
        else:
            current.append(sent)
    if current:
        chunks.append(" ".join(current))

    return [{"id": i, "text": chunk, "tokens": len(chunk.split())} for i, chunk in enumerate(chunks)]

if __name__ == "__main__":
    file_path = sys.argv[1]

    try:
        text = load_docx(file_path)
        if not text.strip():
            print("No text extracted from the DOCX file.")
            sys.exit(1)

        print(f"Extracted {len(text)} characters of raw text.")

        output = semantic_chunk(text)

        print(f"Chunked into {len(output)} chunks.")

        # Write to file (optional: enable this if you want .json file to persist)
        with open("chunk_output.json", "w") as f:
            json.dump(output, f, indent=2)

        # Also print to terminal for redirect compatibility
        print(json.dumps(output, indent=2))

    except Exception as e:
        print(f"Error during chunking: {str(e)}")
        sys.exit(1)
