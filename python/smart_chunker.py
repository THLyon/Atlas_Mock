import argparse
import json
from chunker import chunk_docx
from dynamic_chunker_core import dynamic_chunk_on_query
from docx import Document


def run_static_chunking(input_path: str, output_path: str):
    chunks = chunk_docx(input_path)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(chunks, f, indent=2, ensure_ascii=False)
    print(f"[✓] Static chunking complete. Saved to {output_path}")


def run_dynamic_chunking(text: str, query: str, top_k: int, output_path: str = None):
    chunks = dynamic_chunk_on_query(text, query, top_k=top_k)

    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, indent=2, ensure_ascii=False)
        print(f"[✓] Dynamic chunking complete. Saved top {top_k} to {output_path}")
    else:
        print(json.dumps(chunks, indent=2, ensure_ascii=False))


def extract_text_from_docx(file_path: str) -> str:
    doc = Document(file_path)
    return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run smart chunking (static or dynamic)")

    parser.add_argument("--mode", choices=["static", "dynamic"], required=True, help="Chunking mode")
    parser.add_argument("--input", required=True, help="Input .docx file path or raw .txt input")
    parser.add_argument("--query", help="Query string for dynamic mode")
    parser.add_argument("--topK", type=int, default=3, help="Top K relevant chunks to return")
    parser.add_argument("--output", help="Optional output .json path")

    args = parser.parse_args()

    if args.mode == "static":
        run_static_chunking(args.input, args.output or "chunks_static.json")
    elif args.mode == "dynamic":
        if args.input.endswith(".docx"):
            raw_text = extract_text_from_docx(args.input)
        else:
            with open(args.input, "r", encoding="utf-8") as f:
                raw_text = f.read()

        if not args.query:
            raise ValueError("Dynamic mode requires --query argument.")
        
        run_dynamic_chunking(raw_text, args.query, top_k=args.topK, output_path=args.output)
