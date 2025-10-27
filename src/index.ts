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

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "sequential_thinking") {
        const { thought, nextMove } = request.params.arguments as {
          thought: string;
          nextMove: string;
        };

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

const sequentialServer = new SequentialThinkingServer();
const server = sequentialServer.getServer();

app.get("/sse", async (req: Request, res: Response) => {
  console.log("New SSE connection established");
  
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  
  const transport = new SSEServerTransport("/message", res);
  await server.connect(transport);
  
  req.on("close", () => {
    console.log("SSE connection closed");
    transport.close();
  });
});

app.post("/message", express.text({ type: "*/*" }), async (req: Request, res: Response) => {
  console.log("Received message:", req.body);
  res.status(200).end();
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "mcp-sequential-thinking-sse" });
});

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
