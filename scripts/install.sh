#!/bin/bash

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$REPO_DIR/dot-files"

echo "=============================="
echo " MacOS Environment Restore"
echo "=============================="

printf "\n[0/6] Setting up MacOS..."
defaults import com.apple.dock "$REPO_DIR/macos/dock-settings.plist"
killall Dock

printf "\n[1/6] Checking Xcode Command Line Tools..."
if ! xcode-select -p &>/dev/null; then
  xcode-select --install
  echo "Xcode tools installing. Re-run this script after installation completes."
  exit 1
else
  echo "Already installed."
fi

printf "\n[2/6] Installing Homebrew..."
if ! command -v brew &>/dev/null; then
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo "Homebrew already installed. Updating..."
  brew update
fi

printf "\n[3/6] Restoring Homebrew packages..."
brew bundle install --file="$REPO_DIR/global/brew-file"

printf "\n[4/6] Restoring dotfiles..."
cp "$DOTFILES_DIR/.zshrc" "$HOME/.zshrc"
cp "$DOTFILES_DIR/.gitconfig" "$HOME/.gitconfig"
cp -r "$DOTFILES_DIR/.config" "$HOME/.config"
echo "Dotfiles copied directly (stow not available)."

printf "\n[5/6] Restoring global npm packages..."
if command -v npm &>/dev/null; then

  while IFS= read -r package; do
    [[ "$package" =~ ^#.*$ || -z "$package" ]] && continue
    echo "Installing npm: $package"
    npm install -g "$package"
  done < "$REPO_DIR/global/npm.txt"
else
  echo "npm not found. Skipping. Check your Brewfile includes node."
fi

printf "\n[6/6] Code Editors..."
VSCODE_DIR="$HOME/Library/Application Support/Code/User"
ZED_DIR="$HOME/.config/zed"

if [ -d "$VSCODE_DIR" ]; then
    cp "$REPO_DIR/code-editors/vs-code/settings.json" "$VSCODE_DIR/settings.json"
    echo "VS Code settings restored."
else
    echo "VS Code Directory Not Found. Copy it manually."
fi

if [ -d "$ZED_DIR" ]; then
    cp "$REPO_DIR/code-editors/zed/settings.json" "$ZED_DIR/settings.json"
    echo "Zed settings restored."
else
    echo "Zed directory not found. Copy it manually."
fi
