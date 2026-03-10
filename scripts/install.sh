#!/bin/bash

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$REPO_DIR/dot-files"

echo "=============================="
echo " MacOS Environment Restore"
echo "=============================="

echo "\n[1/7] Checking Xcode Command Line Tools..."
if ! xcode-select -p &>/dev/null; then
  xcode-select --install
  echo "Xcode tools installing. Re-run this script after installation completes."
  exit 1
else
  echo "Already installed."
fi

echo "\n[2/7] Installing Homebrew..."
if ! command -v brew &>/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "Homebrew already installed. Updating..."
  brew update
fi

echo "\n[3/7] Restoring Homebrew packages..."
brew bundle install --file="$REPO_DIR/global/brew-file"

echo "\n[4/7] Restoring dotfiles..."
cp "$DOTFILES_DIR/.zshrc" "$HOME/.zshrc"
cp "$DOTFILES_DIR/.gitconfig" "$HOME/.gitconfig"
cp -r "$DOTFILES_DIR/.config" "$HOME/.config"
echo "Dotfiles copied directly (stow not available)."

echo "\n[5/7] Restoring global npm packages..."
if command -v npm &>/dev/null; then

  while IFS= read -r package; do
    [[ "$package" =~ ^#.*$ || -z "$package" ]] && continue
    echo "Installing npm: $package"
    npm install -g "$package"
  done < "$REPO_DIR/global/npm.txt"
else
  echo "npm not found. Skipping. Check your Brewfile includes node."
fi

echo "\n[6/7] Restoring global pip packages..."
if command -v pip3 &>/dev/null; then
  pip3 install -r "$REPO_DIR/global/pip.txt" --break-system-packages
else
  echo "pip3 not found. Skipping."
fi

echo "\n[7/7] Restoring VS Code..."
VSCODE_DIR="$HOME/Library/Application Support/Code/User"

if [ -d "$VSCODE_DIR" ]; then
  cp "$REPO_DIR/vscode/settings.json" "$VSCODE_DIR/settings.json"
  cp "$REPO_DIR/vscode/cursor.js" "file:////Applications/Visual Studio Code.app/cursor.js"
  echo "VS Code settings restored."
else
  echo "VS Code Directory Not Found. Copy it manually."
fi
