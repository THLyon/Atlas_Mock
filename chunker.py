# import sys
# import json
# from sentence_transformers import SentenceTransformer, util
# import nltk
# from nltk.tokenize import sent_tokenize
# from docx import Document
# import re

# nltk.download('punkt')

# model = SentenceTransformer("all-MiniLM-L6-v2")

# def load_docx(file_path):
#     doc = Document(file_path)
#     return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])


# def clean_text(text: str) -> str:
#     text = text.replace('\t', ' ').replace('\n', ' ')            # Remove tabs/newlines
#     text = re.sub(r'\s{2,}', ' ', text)                          # Collapse multiple spaces
#     text = re.sub(r'^\s*[\d]+\s*$', '', text)                    # Remove lines that are just numbers
#     text = re.sub(r'\s*Page\s*\d+\s*', '', text, flags=re.I)    # Strip "Page 1" etc.
#     return text.strip()

# def semantic_chunk(text, max_tokens=500, threshold=0.75):
#     sentences = sent_tokenize(text)
#     chunks, current = [], []

#     for sent in sentences:
#         emb = model.encode(sent, convert_to_tensor=True)
#         if current:
#             sim = util.pytorch_cos_sim(emb, model.encode(current[-1], convert_to_tensor=True))
#             if sim.item() < threshold or len(" ".join(current).split()) > max_tokens:
#                 chunks.append(" ".join(current))
#                 current = [sent]
#             else:
#                 current.append(sent)
#         else:
#             current.append(sent)
#     if current:
#         chunks.append(" ".join(current))

#     return [{"id": i, "text": chunk, "tokens": len(chunk.split())} for i, chunk in enumerate(chunks)]

# if __name__ == "__main__":
#     file_path = sys.argv[1]

#     try:
#         text = load_docx(file_path)
#         if not text.strip():
#             print("No text extracted from the DOCX file.")
#             sys.exit(1)

#         print(f"Extracted {len(text)} characters of raw text.")

#         output = semantic_chunk(text)
#         output_data = semantic_chunk(text)

#         print(f"Chunked into {len(output)} chunks.")

#         # Write to file (optional: enable this if you want .json file to persist)
#         with open("chunk_output.json", "w") as f:
#             # json.dump(output, f, indent=2)
#             json.dump(output_data, f, ensure_ascii=False, indent=2)

#         # Also print to terminal for redirect compatibility
#         # print(json.dumps(output, indent=2))
#         print(json.dumps(output_data, ensure_ascii=False, indent=2))

#     except Exception as e:
#         print(f"Error during chunking: {str(e)}")
#         sys.exit(1)



import os
import json
import re
import nltk
import tiktoken
import unicodedata
from docx import Document
from typing import List

nltk.download("punkt")
enc = tiktoken.encoding_for_model("gpt-3.5-turbo")  # adjust for your model


def num_tokens(text: str) -> int:
    return len(enc.encode(text))


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\u00a0", " ")  # non-breaking space
    text = text.replace("\ufeff", "")  # BOM
    text = text.replace("\t", " ")     # tabs
    text = text.replace("\u201c", '"').replace("\u201d", '"')  # curly quotes
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u2013", "-").replace("\u2014", "-")  # dashes
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text)  # collapse whitespace
    return text.strip()


def load_docx(file_path: str) -> str:
    doc = Document(file_path)
    full_text = [para.text.strip() for para in doc.paragraphs if para.text.strip()]
    return "\n".join(full_text)


def chunk_sentences(text: str):
    paragraphs = [p for p in text.split("\n") if p.strip()]
    sentence_chunks = []
    para_id = 0
    sentence_id = 0
    para_to_sentences = {}

    for p in paragraphs:
        cleaned_paragraph = clean_text(p)
        sentences = nltk.sent_tokenize(cleaned_paragraph)
        sentence_ids = []

        for s in sentences:
            s = clean_text(s)
            if not s:
                continue

            token_count = num_tokens(s)
            chunk = {
                "id": sentence_id,
                "text": s,
                "tokens": token_count,
                "parentParagraphId": para_id
            }
            sentence_chunks.append(chunk)
            sentence_ids.append(sentence_id)
            sentence_id += 1

        para_to_sentences[para_id] = sentence_ids
        para_id += 1

    return sentence_chunks, para_to_sentences


def group_into_paragraphs(sentences, para_to_sentences, max_tokens=500):
    paragraphs = []
    paragraph_id = 0
    section_id = 0
    current_tokens = 0
    current_sentences = []
    section_map = {}
    section_paragraphs = []

    for para_idx, sentence_ids in para_to_sentences.items():
        para_sentences = [s for s in sentences if s["id"] in sentence_ids]
        para_text = clean_text(" ".join([s["text"] for s in para_sentences]))
        token_count = num_tokens(para_text)

        paragraphs.append({
            "id": paragraph_id,
            "text": para_text,
            "tokens": token_count,
            "parentSectionId": section_id
        })

        for sid in sentence_ids:
            for s in sentences:
                if s["id"] == sid:
                    s["parentSectionId"] = section_id

        section_paragraphs.append(paragraph_id)
        current_tokens += token_count
        paragraph_id += 1

        if current_tokens > max_tokens:
            section_map[section_id] = section_paragraphs
            section_id += 1
            section_paragraphs = []
            current_tokens = 0

    if section_paragraphs:
        section_map[section_id] = section_paragraphs

    return paragraphs, section_map


def build_sections(paragraphs, section_map):
    sections = []
    for section_id, para_ids in section_map.items():
        section_text = clean_text(" ".join([paragraphs[i]["text"] for i in para_ids]))
        token_count = num_tokens(section_text)
        sections.append({
            "id": section_id,
            "text": section_text,
            "tokens": token_count
        })
    return sections


def save_chunked_output(sentences, paragraphs, sections, output_file="chunk_output.json"):
    output = {
        "sentences": sentences,
        "paragraphs": paragraphs,
        "sections": sections
    }
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"Saved chunked output to {output_file}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python chunker.py <path_to_docx>")
        exit(1)

    file_path = sys.argv[1]
    raw_text = load_docx(file_path)
    print(f"Loaded {len(raw_text)} characters from {file_path}")

    try:
        sentences, para_to_sentences = chunk_sentences(raw_text)
        paragraphs, section_map = group_into_paragraphs(sentences, para_to_sentences)
        sections = build_sections(paragraphs, section_map)
        save_chunked_output(sentences, paragraphs, sections)
    except Exception as e:
        print("Error during chunking:", e)

