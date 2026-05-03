# MCP Observability Setup

This workspace now includes an MCP server config in `.vscode/mcp.json` and installed MCP packages.

## Installed MCP servers

- `@modelcontextprotocol/server-filesystem`
- `@modelcontextprotocol/server-memory`
- `@modelcontextprotocol/server-sequential-thinking`
- `@modelcontextprotocol/server-github`
- `@modelcontextprotocol/server-puppeteer`

## What each server gives you

- `filesystem`: deep file reads and code navigation in the repo.
- `memory`: persistent context memory tools.
- `sequential-thinking`: structured investigation workflows.
- `github`: issue/repo context via GitHub API.
- `puppeteer`: browser-side debugging automation and console capture support.

## Required env var for GitHub MCP

Set a GitHub PAT before using the GitHub MCP server:

PowerShell:

```powershell
$env:GITHUB_PERSONAL_ACCESS_TOKEN = "<your_token>"
```

## Verify MCP packages

```powershell
npm ls @modelcontextprotocol/server-filesystem @modelcontextprotocol/server-memory @modelcontextprotocol/server-sequential-thinking @modelcontextprotocol/server-github @modelcontextprotocol/server-puppeteer
```

## Logs you already have in-app

Startup logging and overlay were added in `src/utils/startupDiagnostics.ts`.
Enable with:

- URL: `?traceFonts=1`
- or localStorage: `debug-font-trace=true`

The overlay includes live metrics and JSON export.
