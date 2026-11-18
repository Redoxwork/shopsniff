#!/usr/bin/env bash
# One-time setup (GitHub Codespaces / any Ubuntu machine)
set -e
if ! command -v google-chrome >/dev/null 2>&1; then
  echo "Installing Google Chrome (Kane drives it headless)..."
  wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  sudo apt-get update -qq && sudo apt-get install -y -qq /tmp/chrome.deb
fi
if ! command -v kane-cli >/dev/null 2>&1; then
  echo "Installing Kane CLI..."
  npm install -g @testmuai/kane-cli
fi
echo
echo "Done. Next: kane-cli login   (use your TestMu AI username + access key)"
