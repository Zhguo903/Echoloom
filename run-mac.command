#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ is required. Download it from nodejs.org, then run this file again."
  read -r -p "Press Enter to close..."
  exit 1
fi
npm start
