GOBIN := $(shell go env GOPATH)/bin
BINARY := bin/core-service

.PHONY: fmt lint vet build run test tidy clean tools

fmt: ## Format code (gofumpt + goimports)
	$(GOBIN)/golangci-lint fmt

lint: ## Run linters
	$(GOBIN)/golangci-lint run

vet:
	go vet ./...

build:
	CGO_ENABLED=0 go build -trimpath -o $(BINARY) ./cmd/core-service

run:
	go run ./cmd/core-service

test:
	go test ./...

tidy:
	go mod tidy

clean:
	rm -rf bin

tools: ## Install the formatter and linter
	go install mvdan.cc/gofumpt@latest
	go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest
