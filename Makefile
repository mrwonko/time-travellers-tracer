check:
	npx svelte-check --tsconfig ./tsconfig.app.json
	npx tsc -p tsconfig.node.json

test-unit:
	npx vitest run

test-e2e:
	npx playwright test

test: test-unit test-e2e

.PHONY: check test test-unit test-e2e
