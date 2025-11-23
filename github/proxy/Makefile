.PHONY: install build dev start test-health test-models test-chat test-completion test-embeddings clean

install:
	npm install

build:
	npm run build

dev:
	npm run dev

start:
	npm start

test-health:
	@echo "Testing health endpoint..."
	@curl -s http://localhost:11434/health | jq .

test-models:
	@echo "Testing /api/tags endpoint..."
	@curl -s http://localhost:11434/api/tags | jq .

test-chat:
	@echo "Testing chat completion..."
	@curl -X POST http://localhost:11434/v1/chat/completions \
		-H "Content-Type: application/json" \
		-d '{"model":"GLM-4.6","messages":[{"role":"user","content":"Hello!"}],"stream":false}' | jq .

test-completion:
	@echo "Testing FIM completion..."
	@curl -X POST http://localhost:11434/v1/completions \
		-H "Content-Type: application/json" \
		-d '{"prompt":"def hello():","suffix":"","max_tokens":50,"stream":false}' | jq .

test-embeddings:
	@echo "Testing embeddings endpoint..."
	@curl -X POST http://localhost:11434/v1/embeddings \
		-H "Content-Type: application/json" \
		-d '{"input":"function hello() { return world; }","model":"mistralai/codestral-embed-2505"}' | jq .

clean:
	rm -rf node_modules dist
