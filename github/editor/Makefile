.PHONY: help install install-chat-lib compile build clean test lint typecheck watch package setup

# Default target
.DEFAULT_GOAL := help

# Variables
NPM := npm
NODE_VERSION := 22.14.0
NPM_VERSION := 9.0.0

##@ General

help: ## Display this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

##@ Installation

install: ## Install all dependencies (main project)
	@echo "Installing dependencies..."
	$(NPM) install --legacy-peer-deps

install-chat-lib: ## Install chat-lib dependencies
	@echo "Installing chat-lib dependencies..."
	cd chat-lib && $(NPM) install

install-all: install install-chat-lib ## Install all dependencies (main + chat-lib)

##@ Build

compile: ## Compile TypeScript in development mode
	@echo "Compiling TypeScript..."
	$(NPM) run compile

build: ## Build the project for production
	@echo "Building project..."
	$(NPM) run build

build-chat-lib: ## Build chat-lib
	@echo "Building chat-lib..."
	cd chat-lib && $(NPM) run build

build-all: build build-chat-lib ## Build main project and chat-lib

##@ Development

watch: ## Watch for changes and rebuild automatically
	@echo "Starting watch mode..."
	$(NPM) run watch

typecheck: ## Run TypeScript type checking
	@echo "Running type check..."
	$(NPM) run typecheck

lint: ## Run ESLint
	@echo "Running linter..."
	$(NPM) run lint

format: ## Format code with Prettier
	@echo "Formatting code..."
	$(NPM) run prettier

##@ Testing

test: ## Run all tests
	@echo "Running tests..."
	$(NPM) run test

test-unit: ## Run unit tests
	@echo "Running unit tests..."
	$(NPM) run test:unit

test-extension: ## Run extension tests
	@echo "Running extension tests..."
	$(NPM) run test:extension

test-sanity: ## Run sanity tests
	@echo "Running sanity tests..."
	$(NPM) run test:sanity

test-chat-lib: ## Run chat-lib tests
	@echo "Running chat-lib tests..."
	cd chat-lib && $(NPM) run test

##@ Cleanup

clean: ## Remove build artifacts
	@echo "Cleaning build artifacts..."
	rm -rf dist
	rm -rf node_modules/.cache

clean-chat-lib: ## Clean chat-lib build artifacts
	@echo "Cleaning chat-lib build artifacts..."
	cd chat-lib && $(NPM) run clean

clean-all: clean clean-chat-lib ## Clean all build artifacts

clean-deps: ## Remove node_modules (use with caution)
	@echo "Removing node_modules..."
	rm -rf node_modules
	rm -rf chat-lib/node_modules

##@ Packaging

package: ## Package the extension as .vsix file
	@echo "Packaging extension..."
	$(NPM) run package

package-chat-lib: ## Package chat-lib
	@echo "Packaging chat-lib..."
	cd chat-lib && $(NPM) run package

##@ Setup

setup: ## Run setup scripts (get_env and get_token)
	@echo "Running setup..."
	$(NPM) run setup

setup-dotnet: ## Setup .NET SDK
	@echo "Setting up .NET SDK..."
	$(NPM) run setup:dotnet

setup-venv: ## Create Python virtual environment
	@echo "Creating Python virtual environment..."
	$(NPM) run create_venv

##@ Verification

check-versions: ## Check Node.js and npm versions
	@echo "Checking versions..."
	@node --version | grep -q "v$(NODE_VERSION)" || (echo "Warning: Node.js version should be >= $(NODE_VERSION)" && node --version)
	@$(NPM) --version | awk '{if ($$1 < $(NPM_VERSION)) {print "Warning: npm version should be >= $(NPM_VERSION)"; exit 1} else {print "npm version:", $$1}}'

verify: check-versions typecheck lint ## Run all verification checks

##@ Full Workflow

all: install-all build-all ## Install dependencies and build everything

dev: install-all compile ## Install dependencies and compile for development

ci: install-all verify test ## Run CI pipeline (install, verify, test)

