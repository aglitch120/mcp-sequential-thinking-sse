#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express, { Request, Response } from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Sequential Thinking Server Implementation
class SequentialThinkingServer {
  private server: Server;
  private thinkingHistory: Array<{
    timestamp: Date;
    thought: string;
    nextMove: string;
  }> = [];

  constructor() {
    this.server = new Server(
      {
        name: "mcp-sequential-thinking",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "sequential_thinking",
          description:
            "Enables dynamic and reflective problem-solving through flexible thinking sequences. " +
            "Use this to break down complex problems, explore different approaches, and revise understanding as you progress.",
          inputSchema: {
            type: "object",
            properties: {
              thought: {
                type: "string",
                description: "Current thinking step or observation",
              },
              nextMove: {
                type: "string",
                description: "What to explore or consider next",
              },
            },
            required: ["thought", "nextMove"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "sequential_thinking") {
        const { thought, nextMove } = request.params.arguments as {
          thought: string;
          nextMove: string;
        };

        // Store thinking step
        this.thinkingHistory.push({
          timestamp: new Date(),
          thought,
          nextMove,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "recorded",
                  thought,
                  nextMove,
                  stepNumber: this.thinkingHistory.length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  getServer() {
    return this.server;
  }
}

// Create server instance
const sequentialServer = new SequentialThinkingServer();
const server = sequentialServer.getServer();

// SSE endpoint
app.get("/sse", async (req: Request, res: Response) => {
  console.log("New SSE connection established");
  
  const transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
  
  // Handle client disconnect
  req.on("close", () => {
    console.log("SSE connection closed");
  });
});

// Message endpoint for client-to-server messages
app.post("/message", async (req: Request, res: Response) => {
  console.log("Received message:", req.body);
  // SSE transport handles the message
  res.sendStatus(200);
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "mcp-sequential-thinking-sse" });
});

// Root endpoint
app.get("/", (req: Request, res: Response) => {
  res.json({
    service: "MCP Sequential Thinking Server",
    version: "1.0.0",
    endpoints: {
      sse: "/sse",
      message: "/message",
      health: "/health",
    },
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Sequential Thinking MCP Server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});
