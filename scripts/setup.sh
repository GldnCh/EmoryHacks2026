#!/usr/bin/env bash
# One-command setup for an IDoc Coder workspace. Safe to re-run.
#   curl -fsSL https://raw.githubusercontent.com/GldnCh/EmoryHacks2026/main/scripts/setup.sh | bash
# or, if the repo is already cloned:
#   bash ~/EmoryHacks2026/scripts/setup.sh
set -euo pipefail

REPO="GldnCh/EmoryHacks2026"
DIR="$HOME/EmoryHacks2026"
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ask() { local reply; read -r -p "$1" reply </dev/tty; printf '%s' "$reply"; }

for tool in git gh node npm; do
  command -v "$tool" >/dev/null || { echo "Missing '$tool'. Are you in the Coder workspace terminal (not your laptop)?"; exit 1; }
done

say "1/5 GitHub sign-in"
if gh auth status >/dev/null 2>&1; then
  echo "Already signed in to GitHub."
else
  echo "Copy the one-time code below, open the link in your browser, paste it and click Authorize."
  gh auth login --hostname github.com --git-protocol https --web </dev/tty
fi
gh auth setup-git

say "2/5 Git name and email"
if [ -z "$(git config --global user.name || true)" ]; then
  git config --global user.name "$(ask 'Your name: ')"
fi
if [ -z "$(git config --global user.email || true)" ]; then
  git config --global user.email "$(ask 'Email on your GitHub account: ')"
fi
echo "Commits will be by: $(git config --global user.name) <$(git config --global user.email)>"

say "3/5 Getting the code"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" checkout -q main && git -C "$DIR" pull -q && echo "Updated $DIR"
else
  git clone -q "https://github.com/$REPO.git" "$DIR" && echo "Cloned to $DIR"
fi
cd "$DIR"

say "4/5 Installing packages (1-2 minutes)"
npm install --no-fund --no-audit --loglevel=error

say "5/5 Keys file"
if [ -f .env.local ]; then
  echo ".env.local already exists (left unchanged)."
else
  cp .env.example .env.local && echo "Created .env.local from .env.example."
fi

say "Setup complete ✅"
cat <<'EOF'
Next:
  1. Get the API keys privately from TD (Tiger Data: from Cam), then:  code ~/EmoryHacks2026/.env.local
  2. Start Claude Code:                                                  cd ~/EmoryHacks2026 && claude
  3. Or run the app (port 3001, open via the Ports tab):                 npm run dev
EOF
