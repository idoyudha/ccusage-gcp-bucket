.PHONY: help last-week install

help:
	@echo "Available commands:"
	@echo "  make last-week  - Run usage collection for last week (Sunday to Sunday)"
	@echo "  make install    - Install npm dependencies"

last-week:
	@echo "Running usage collection for last week..."
	@node index.js

install:
	npm install