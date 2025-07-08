########################## 
#   INTERFACE LAYER
########################## 

import sys
import json
import argparse
from dynamic_chunker_core import dynamic_chunk_on_query

def main():
    # If piped in via stdin
    if not sys.stdin.isatty():
        try:
            data = json.load(sys.stdin)
            text = data["text"]
            query = data["query"]
        except Exception as e:
            print(json.dumps({"error": str(e)}))
            return
    else:
        # CLI mode (for testing)
        parser = argparse.ArgumentParser()
        parser.add_argument('--text', required=True)
        parser.add_argument('--query', required=True)
        args = parser.parse_args()
        text = args.text
        query = args.query

    result = dynamic_chunk_on_query(text, query)
    print(json.dumps(result))

if __name__ == '__main__':
    main()
