import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios, { AxiosError } from "axios";

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
  const server = new McpServer({
    name: "perplexity-search-server",
    version: "1.0.0",
  });

  console.error(`Using Perplexity model: ${config.model}`);

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
          model: config.model,
          messages: [
            {
              role: "user",
              content: query
            }
          ],
          max_tokens: config.maxTokens,
          temperature: config.temperature
        };

        // Add optional parameters if provided
        if (search_recency_filter) {
          payload.search_recency_filter = search_recency_filter;
        }

        console.error(`Using model: ${config.model}, max_tokens: ${config.maxTokens}, temperature: ${config.temperature}`);

        const response = await axios.post('https://api.perplexity.ai/chat/completions', payload, {
          headers: {
            'Authorization': `Bearer ${config.perplexityApiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        // Format the response to only include content and citations
        const formattedResponse = {
          content: response.data.choices[0].message.content,
          citations: response.data.citations || []
        };
        
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(formattedResponse, null, 2)
          }]
        };
      } catch (error: unknown) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<PerplexityErrorResponse>;
          const errorData = axiosError.response?.data;
          const errorMessage = errorData?.error || errorData?.message || axiosError.message;
          
          return {
            content: [{
              type: "text" as const, 
              text: `Perplexity API error: ${errorMessage}`
            }],
            isError: true
          };
        }
        throw error;
      }
    }
  );

  return server.server;
}

 