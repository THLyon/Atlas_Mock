import os
import json
import re
import nltk
import tiktoken
import unicodedata
from docx import Document
from sentence_transformers import SentenceTransformer, util
import sys
sys.stderr = sys.stdout

nltk.download("punkt")

enc = tiktoken.encoding_for_model("gpt-3.5-turbo")
model = SentenceTransformer("all-MiniLM-L6-v2")

def num_tokens(text: str) -> int:
    return len(enc.encode(text))

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\u00a0", " ")
    text = text.replace("\ufeff", "")
    text = text.replace("\t", " ")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = unicodedata.normalize("NFKC", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def load_docx(file_path: str) -> str:
    doc = Document(file_path)
    return "\n".join([para.text.strip() for para in doc.paragraphs if para.text.strip()])

def semantic_chunk_sentences(text: str):
    paragraphs = [p for p in text.split("\n") if p.strip()]
    sentence_chunks = []
    sentence_id = 0

    for para in paragraphs:
        raw_sentences = nltk.sent_tokenize(clean_text(para))
        for sent in raw_sentences:
            s_clean = clean_text(sent)
            if s_clean:
                sentence_chunks.append({
                    "id": f"sentence-{sentence_id}",
                    "type": "sentence",
                    "text": s_clean,
                    "tokens": num_tokens(s_clean)
                })
                sentence_id += 1

    return sentence_chunks

def group_sentences_to_paragraphs(sentences, sim_threshold=0.7, max_para_tokens=500):
    paragraphs = []
    paragraph = []
    paragraph_tokens = 0
    paragraph_id = 0

    for i, sentence in enumerate(sentences):
        if not paragraph:
            paragraph.append(sentence)
            paragraph_tokens = sentence["tokens"]
            continue

        prev_emb = model.encode(paragraph[-1]["text"], convert_to_tensor=True)
        curr_emb = model.encode(sentence["text"], convert_to_tensor=True)
        similarity = util.pytorch_cos_sim(prev_emb, curr_emb).item()

        if similarity < sim_threshold or (paragraph_tokens + sentence["tokens"] > max_para_tokens):
            para_text = " ".join([s["text"] for s in paragraph])
            para_chunk = {
                "id": f"paragraph-{paragraph_id}",
                "type": "paragraph",
                "text": para_text,
                "tokens": paragraph_tokens
            }
            for s in paragraph:
                s["parentParagraphId"] = para_chunk["id"]
            paragraphs.append(para_chunk)
            paragraph_id += 1
            paragraph = [sentence]
            paragraph_tokens = sentence["tokens"]
        else:
            paragraph.append(sentence)
            paragraph_tokens += sentence["tokens"]

    if paragraph:
        para_text = " ".join([s["text"] for s in paragraph])
        para_chunk = {
            "id": f"paragraph-{paragraph_id}",
            "type": "paragraph",
            "text": para_text,
            "tokens": paragraph_tokens
        }
        for s in paragraph:
            s["parentParagraphId"] = para_chunk["id"]
        paragraphs.append(para_chunk)

    return paragraphs

def group_paragraphs_to_sections(paragraphs, max_section_tokens=1200):
    sections = []
    section = []
    section_tokens = 0
    section_id = 0

    for para in paragraphs:
        if section_tokens + para["tokens"] > max_section_tokens:
            section_text = " ".join([p["text"] for p in section])
            sec_chunk = {
                "id": f"section-{section_id}",
                "type": "section",
                "text": section_text,
                "tokens": section_tokens
            }
            for p in section:
                p["parentSectionId"] = sec_chunk["id"]
            sections.append(sec_chunk)
            section_id += 1
            section = [para]
            section_tokens = para["tokens"]
        else:
            section.append(para)
            section_tokens += para["tokens"]

    if section:
        section_text = " ".join([p["text"] for p in section])
        sec_chunk = {
            "id": f"section-{section_id}",
            "type": "section",
            "text": section_text,
            "tokens": section_tokens
        }
        for p in section:
            p["parentSectionId"] = sec_chunk["id"]
        sections.append(sec_chunk)

    return sections

def link_chunks(chunks):
    for i in range(len(chunks)):
        chunks[i]["prevChunkId"] = chunks[i - 1]["id"] if i > 0 else None
        chunks[i]["nextChunkId"] = chunks[i + 1]["id"] if i < len(chunks) - 1 else None
    return chunks

def save_flat_chunks(sentences, paragraphs, sections, output_file="flattened_chunks.json"):
    all_chunks = sentences + paragraphs
    all_chunks = link_chunks(all_chunks + sections)  # Link everything together

    output = {
        "documentId": "sample_LPA",  # You can make this dynamic if needed
        "chunks": all_chunks,
        "rawSections": sections
    }

    with open(output_file, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"✅ Saved {len(all_chunks)} chunks and {len(sections)} raw sections to {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python chunker.py <path_to_docx>")
        exit(1)

    file_path = sys.argv[1]
    raw_text = load_docx(file_path)
    print(f"📄 Loaded {len(raw_text)} characters from {file_path}")

    try:
        sentences = semantic_chunk_sentences(raw_text)
        paragraphs = group_sentences_to_paragraphs(sentences)
        sections = group_paragraphs_to_sections(paragraphs)
        save_flat_chunks(sentences, paragraphs, sections)
    except Exception as e:
        print("❌ Error during chunking:", e)
