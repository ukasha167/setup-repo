# MacOS Setup Repo

A complete environment restore system for macOS. Clone this repo on a fresh machine and run one script to get back to a fully working dev environment.

---

## Repo Structure

```
setup-repo/
├── dot-files/          # Shell config, git config, .config/ directory
├── global/             # Package lists for brew, npm
├── vscode/             # VS Code settings
├── scripts/
│   └── install.sh      # Main restore script — run this first
└── README.md
```

---

## Before You Wipe

Go through this checklist completely. Do not skip anything.

### Code & Projects
- [ ] Every project pushed to remote (`git status` on each repo)
- [ ] Zero uncommitted changes across all repos
- [ ] Any `.env` files saved separately (they are gitignored)

### This Repo
- [ ] Brewfile is up to date: `brew bundle dump --file=./global/brew-file --force`
- [ ] npm globals are current: `npm list -g --depth=0 > ./global/npm.txt`
- [ ] Dotfiles are current: `.zshrc`, `.gitconfig`, `.config/` all committed
- [ ] All changes committed and pushed to remote

---

## Restore: Step by Step

### 1. Fresh macOS Install
Boot into Recovery Mode and erase the disk. Install a clean copy of macOS.

### 2. Clone This Repo
Open Terminal. Install Xcode CLI tools first if prompted:
```bash
xcode-select --install
```

Then clone:
```bash
git clone https://github.com/ukasha167/setup-repo.git ~/setup-repo
cd ~/setup-repo
```

### 3. Run the Install Script
```bash
chmod +x scripts/install.sh
./scripts/install.sh
```

This will, in order:
1. Install Homebrew
2. Install all packages, apps, and Mac App Store apps from the Brewfile
3. Restore dotfiles (via `stow` if available, direct copy as fallback)
4. Install global npm packages from `npm.txt`
5. Restore VS Code settings

> Xcode installs from the App Store and takes a long time. The script will notify you. You can proceed with other steps while it downloads.

---
