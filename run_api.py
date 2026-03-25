#!/usr/bin/env python3
"""
NSE Stock Analysis API Server
Run this script to start the API server
"""

import subprocess
import sys
import os

def main():
    print("="*80)
    print("NSE STOCK ANALYSIS - API SERVER")
    print("="*80)
    print()
    print("Starting API server...")
    print()
    
    try:
        # Run uvicorn with specific reload directories only
        def main():
            port = int(os.environ.get("PORT", 8000))

            uvicorn.run(
            "app.api:app",
            # host="127.0.0.1",
            host="0.0.0.0",
            port=port,
            timeout_keep_alive=500,
            h11_max_incomplete_event_size=16777216
            )
    except KeyboardInterrupt:
        print("\n\nServer stopped by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nError starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
