import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Define interface for error response
interface PerplexityErrorResponse {
  error?: string;
  message?: string;
}

// Configuration schema for Smithery CLI
export const configSchema = z.object({
  perplexityApiKey: z.string().describe("Your Perplexity API key"),
  model: z.enum(["sonar", "sonar-pro"]).default("sonar-pro").describe("Perplexity model to use"),
  maxTokens: z.number().default(8192).describe("Maximum tokens for response"),
  temperature: z.number().default(0.2).describe("Temperature for response generation"),
});

// Main server creation function for Smithery CLI
export default function createServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  // Parse config to ensure defaults are applied
  const parsedConfig = configSchema.parse(config);
  
  const server = new McpServer({
    name: "perplexity-search-server",
    version: "1.0.0",
  });

  console.error(`Using Perplexity model: ${parsedConfig.model}`);

  // Register the search tool
  server.registerTool(
    "search",
    {
      title: "Search",
      description: "Perform a web search using Perplexity's API, which provides detailed and contextually relevant results with citations. By default, no time filtering is applied to search results.",
      inputSchema: {
        query: z.string().describe("The search query to perform"),
        search_recency_filter: z.enum(["month", "week", "day", "hour"]).optional().describe("Filter search results by recency (options: month, week, day, hour). If not specified, no time filtering is applied."),
      }
    },
    async (request) => {
      const { query, search_recency_filter } = request;

      try {
        const payload: any = {
          model: parsedConfig.model,
          messages: [
            {
              role: "user",
              content: query
            }
          ],
          max_tokens: parsedConfig.maxTokens,
          temperature: parsedConfig.temperature
        };

        // Add optional parameters if provided
        if (search_recency_filter) {
          payload.search_recency_filter = search_recency_filter;
        }

        console.error(`Using model: ${parsedConfig.model}, max_tokens: ${parsedConfig.maxTokens}, temperature: ${parsedConfig.temperature}`);

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${parsedConfig.perplexityApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const errorData: PerplexityErrorResponse = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If JSON parsing fails, use the default error message
          }
          
          return {
            content: [{
              type: "text" as const,
              text: `Perplexity API error: ${errorMessage}`
            }],
            isError: true
          };
        }

        const responseData = await response.json();
        
        // Format the response to only include content and citations
        const formattedResponse = {
          content: responseData.choices[0].message.content,
          citations: responseData.citations || []
        };
        
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(formattedResponse, null, 2)
          }]
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        return {
          content: [{
            type: "text" as const, 
            text: `Perplexity API error: ${errorMessage}`
          }],
          isError: true
        };
      }
    }
  );

  return server.server;
}

 