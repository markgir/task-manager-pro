#!/usr/bin/env bash
# ==============================================================================
# 📋 Task Manager Pro — Setup Script
# ==============================================================================
# Automated installer: checks/installs Node.js & npm, installs project
# dependencies, optionally runs tests, and starts the application.
# Supports Ubuntu/Debian, Fedora/RHEL/CentOS, Arch, and macOS (brew).
# ==============================================================================

set -euo pipefail

# ─── Colors & helpers ─────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}ℹ ${NC} $*"; }
success() { echo -e "${GREEN}✔ ${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠ ${NC} $*"; }
error()   { echo -e "${RED}✖ ${NC} $*"; }
header()  { echo -e "\n${BOLD}${CYAN}$*${NC}\n"; }

# ─── Detect package manager / OS ─────────────────────────────────────────────
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="${ID:-unknown}"
  elif command -v sw_vers &>/dev/null; then
    OS_ID="macos"
  else
    OS_ID="unknown"
  fi
}

# ─── Node.js minimum version ─────────────────────────────────────────────────
REQUIRED_NODE_MAJOR=14

version_ge() {
  # Returns 0 (true) if $1 >= $2 (major only)
  [ "$1" -ge "$2" ]
}

# ─── Install Node.js via NodeSource (Debian/Ubuntu) or pkg manager ───────────
install_node() {
  header "📦 Instalando Node.js..."

  detect_os

  case "$OS_ID" in
    ubuntu|debian|linuxmint|pop)
      info "Distribuição detetada: $OS_ID (apt)"
      info "A adicionar repositório NodeSource (Node 20.x LTS)..."
      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - || {
        error "Falha ao adicionar repositório NodeSource."
        exit 1
      }
      sudo apt-get install -y nodejs || {
        error "Falha ao instalar Node.js via apt."
        exit 1
      }
      ;;
    fedora|rhel|centos|rocky|alma)
      info "Distribuição detetada: $OS_ID (dnf/yum)"
      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo -E bash - || {
        error "Falha ao adicionar repositório NodeSource."
        exit 1
      }
      if command -v dnf &>/dev/null; then
        sudo dnf install -y nodejs
      else
        sudo yum install -y nodejs
      fi
      ;;
    arch|manjaro)
      info "Distribuição detetada: $OS_ID (pacman)"
      sudo pacman -Sy --noconfirm nodejs npm
      ;;
    macos)
      info "Sistema detetado: macOS"
      if command -v brew &>/dev/null; then
        brew install node
      else
        error "Homebrew não encontrado. Instale Homebrew primeiro: https://brew.sh"
        exit 1
      fi
      ;;
    *)
      error "Distribuição '$OS_ID' não suportada para instalação automática."
      error "Por favor, instale Node.js >= $REQUIRED_NODE_MAJOR manualmente: https://nodejs.org"
      exit 1
      ;;
  esac
}

# ─── Install npm separately (rare, but just in case) ────────────────────────
install_npm() {
  header "📦 Instalando npm..."
  detect_os

  case "$OS_ID" in
    ubuntu|debian|linuxmint|pop)
      sudo apt-get install -y npm
      ;;
    fedora|rhel|centos|rocky|alma)
      if command -v dnf &>/dev/null; then
        sudo dnf install -y npm
      else
        sudo yum install -y npm
      fi
      ;;
    arch|manjaro)
      sudo pacman -Sy --noconfirm npm
      ;;
    macos)
      warn "npm é normalmente incluído com o Node.js via Homebrew."
      ;;
    *)
      error "Não foi possível instalar npm automaticamente."
      exit 1
      ;;
  esac
}

# ==============================================================================
# Main
# ==============================================================================
main() {
  header "🚀 Task Manager Pro — Setup"
  echo -e "   Bem-vindo ao instalador automático!\n"

  # ── 1. Verificar / Instalar Node.js ──────────────────────────────────────
  header "1️⃣  Verificar Node.js"

  if command -v node &>/dev/null; then
    NODE_VERSION=$(node -v | sed 's/v//')
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
    success "Node.js encontrado: v${NODE_VERSION}"

    if version_ge "$NODE_MAJOR" "$REQUIRED_NODE_MAJOR"; then
      success "Versão compatível (>= ${REQUIRED_NODE_MAJOR})"
    else
      warn "Versão ${NODE_VERSION} é inferior à recomendada (>= ${REQUIRED_NODE_MAJOR})."
      read -rp "$(echo -e "${YELLOW}   Deseja atualizar o Node.js? [S/n]: ${NC}")" UPDATE_NODE
      UPDATE_NODE="${UPDATE_NODE:-S}"
      if [[ "$UPDATE_NODE" =~ ^[Ss]$ ]]; then
        install_node
      else
        warn "A continuar com a versão atual. Podem ocorrer incompatibilidades."
      fi
    fi
  else
    warn "Node.js não encontrado no sistema."
    read -rp "$(echo -e "${YELLOW}   Deseja instalar o Node.js agora? [S/n]: ${NC}")" INSTALL_NODE
    INSTALL_NODE="${INSTALL_NODE:-S}"
    if [[ "$INSTALL_NODE" =~ ^[Ss]$ ]]; then
      install_node
      success "Node.js instalado: $(node -v)"
    else
      error "Node.js é necessário para executar este projeto."
      exit 1
    fi
  fi

  # ── 2. Verificar / Instalar npm ─────────────────────────────────────────
  header "2️⃣  Verificar npm"

  if command -v npm &>/dev/null; then
    success "npm encontrado: v$(npm -v)"
  else
    warn "npm não encontrado no sistema."
    read -rp "$(echo -e "${YELLOW}   Deseja instalar o npm agora? [S/n]: ${NC}")" INSTALL_NPM
    INSTALL_NPM="${INSTALL_NPM:-S}"
    if [[ "$INSTALL_NPM" =~ ^[Ss]$ ]]; then
      install_npm
      success "npm instalado: v$(npm -v)"
    else
      error "npm é necessário para instalar as dependências."
      exit 1
    fi
  fi

  # ── 3. Instalar dependências ────────────────────────────────────────────
  header "3️⃣  Instalar dependências do projeto"

  # Navigate to the script's directory (project root)
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$SCRIPT_DIR"
  info "Diretório do projeto: ${SCRIPT_DIR}"

  if [ ! -f "package.json" ]; then
    error "Ficheiro package.json não encontrado em ${SCRIPT_DIR}."
    error "Certifique-se de que está a executar o script na raiz do projeto."
    exit 1
  fi

  info "A instalar dependências (npm install)..."
  npm install || {
    error "Falha ao instalar dependências."
    exit 1
  }
  success "Dependências instaladas com sucesso!"

  # ── 4. Executar testes (opcional) ───────────────────────────────────────
  header "4️⃣  Testes"

  read -rp "$(echo -e "${CYAN}   Deseja executar os testes agora? [s/N]: ${NC}")" RUN_TESTS
  RUN_TESTS="${RUN_TESTS:-N}"
  if [[ "$RUN_TESTS" =~ ^[Ss]$ ]]; then
    info "A executar testes (npm test)..."
    npm test && success "Todos os testes passaram! ✅" || warn "Alguns testes falharam. Verifique os resultados acima."
  else
    info "Testes ignorados."
  fi

  # ── 5. Iniciar a aplicação ──────────────────────────────────────────────
  header "5️⃣  Iniciar aplicação"

  read -rp "$(echo -e "${CYAN}   Deseja iniciar a aplicação agora? [S/n]: ${NC}")" START_APP
  START_APP="${START_APP:-S}"
  if [[ "$START_APP" =~ ^[Ss]$ ]]; then
    echo ""
    success "A iniciar o Task Manager Pro..."
    info "Pressione ${BOLD}Ctrl+C${NC} para parar o servidor.\n"
    npm start
  else
    echo ""
    success "Setup concluído com sucesso! 🎉"
    info "Para iniciar a aplicação mais tarde, execute:"
    echo -e "   ${BOLD}npm start${NC}"
    info "A aplicação ficará disponível em ${BOLD}http://localhost:3000${NC}"
  fi
}

main "$@"
