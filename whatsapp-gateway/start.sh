#!/bin/bash

# Get the current directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Open a new Terminal window and run pnpm start:dev
osascript -e "tell application \"Terminal\" to do script \"cd $DIR && pnpm start:dev\""

# Open another new Terminal window and run ngrok http 3000
osascript -e "tell application \"Terminal\" to do script \"cd $DIR && ngrok http 3000\""
