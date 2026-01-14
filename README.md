# Perplexity Search MCP

[![smithery badge](https://smithery.ai/badge/@arjunkmrm/perplexity-search)](https://smithery.ai/server/@arjunkmrm/perplexity-search)

A simple Model Context Protocol (MCP) server for Perplexity's web search with sonar or sonar-pro.

## Features

- Provides a `search` tool for AI assistants to perform web searches
- Uses Perplexity's chat completions API with the sonar/sonar-pro models

## Tool: search

The server provides a `search` tool with the following input parameters:

- `query` (required): The search query to perform
- `search_recency_filter` (optional): Filter search results by recency (options: month, week, day, hour). If not specified, no time filtering is applied.

## Configuration

### Environment Variables

- `PERPLEXITY_API_KEY`: Your Perplexity API key (required)

## Response Format

The response from the `search` tool includes:

- `content`: The search results content
- `citations`: Array of citations for the information

## License

MIT