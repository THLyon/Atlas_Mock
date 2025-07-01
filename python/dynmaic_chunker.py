import argparse
import json
from dynamic_chunker_core import dynamic_chunk_on_query  # we'll split logic below

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--text', type=str, required=True)
    parser.add_argument('--query', type=str, required=True)
    args = parser.parse_args()

    result = dynamic_chunk_on_query(args.text, args.query)
    print(json.dumps(result))  # <=== returns { intent, chunks }

if __name__ == '__main__':
    main()
