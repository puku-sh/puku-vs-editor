"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpToolCallingLoopPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
const instructionMessage_1 = require("../../prompts/node/base/instructionMessage");
const tag_1 = require("../../prompts/node/base/tag");
const conversationHistory_1 = require("../../prompts/node/panel/conversationHistory");
const toolCalling_1 = require("../../prompts/node/panel/toolCalling");
const toolsRegistry_1 = require("../../tools/common/toolsRegistry");
const mcpToolCallingTools_1 = require("./mcpToolCallingTools");
const packageTypePreferredCommands = {
    pip: (name, version) => `uvx ${name.replaceAll('-', '_')}` + (version ? `==${version}` : ''),
    npm: (name, version) => `npx ${name}` + (version ? `@${version}` : ''),
    docker: (name, _version) => `docker run -i --rm ${name}`,
    nuget: (name, version) => `dnx ${name}` + (version ? `@${version}` : '') + ` --yes`,
};
class McpToolCallingLoopPrompt extends prompt_tsx_1.PromptElement {
    async render() {
        const { packageType, packageName, packageVersion, pickRef, packageReadme } = this.props;
        const { history, toolCallRounds = [], toolCallResults = {} } = this.props.promptContext;
        // We do kind of a 'special' thing here to have the tool only available to *this* prompt because
        // we're in a quickpick flow (and don't really want the tool generally available)
        for (const round of toolCallRounds) {
            for (const tool of round.toolCalls) {
                if (toolCallResults[tool.id]) {
                    // no-op
                }
                else if (tool.name === mcpToolCallingTools_1.QuickInputTool.ID) {
                    toolCallResults[tool.id] = await mcpToolCallingTools_1.QuickInputTool.invoke(pickRef, JSON.parse(tool.arguments));
                }
                else if (tool.name === mcpToolCallingTools_1.QuickPickTool.ID) {
                    toolCallResults[tool.id] = await mcpToolCallingTools_1.QuickPickTool.invoke(pickRef, JSON.parse(tool.arguments));
                }
            }
        }
        const hasMcpJson = packageReadme?.includes('"mcpServers":');
        const command = packageTypePreferredCommands[packageType](packageName, packageVersion);
        return (vscpp(vscppf, null,
            vscpp(conversationHistory_1.HistoryWithInstructions, { flexGrow: 1, passPriority: true, historyPriority: 700, history: history },
                vscpp(instructionMessage_1.InstructionMessage, null,
                    vscpp(tag_1.Tag, { name: 'instructions' },
                        "You are an expert in reading documentation and extracting relevant results.",
                        vscpp("br", null),
                        "A developer is setting up a Model Context Protocol (MCP) server based on a ",
                        packageType,
                        " package. Your task is to create a configuration for the server matching the provided JSON schema.",
                        vscpp("br", null),
                        hasMcpJson ? vscpp(InstructionsWithMcpJson, { command: command, packageVersion: packageVersion }) : vscpp(InstructionsWithout, { command: command, packageVersion: packageVersion }),
                        vscpp("br", null),
                        vscpp("br", null),
                        "When using a tool, follow the JSON schema very carefully and make sure to include all required fields. DO NOT write out a JSON codeblock with the tool inputs.",
                        vscpp("br", null)),
                    vscpp(tag_1.Tag, { name: 'example' },
                        vscpp(tag_1.Tag, { name: 'request' },
                            "User: I want to run the npm package `@modelcontextprotocol/server-redis` as an MCP server. This is its readme:",
                            vscpp("br", null),
                            vscpp("br", null),
                            redisExampleReadme),
                        vscpp(tag_1.Tag, { name: 'response' },
                            hasMcpJson && vscpp(vscppf, null,
                                "The readme has an example confirmation I'll work off of:",
                                vscpp("br", null),
                                "$",
                                clauseExampleConfiguration),
                            vscpp("br", null),
                            "Based on ",
                            hasMcpJson ? 'this example' : 'the documentation',
                            ", I need the following information to run the MCP server:",
                            vscpp("br", null),
                            "- Redis hostname",
                            vscpp("br", null),
                            "- Redis port number",
                            vscpp("br", null),
                            "- Redis password (optional)",
                            vscpp("br", null),
                            vscpp("br", null),
                            "I will now ask for this information.",
                            vscpp("br", null),
                            "[[`",
                            mcpToolCallingTools_1.QuickInputTool.ID,
                            "` called requesting Redis hostname]]: \"redis.example.com\"",
                            vscpp("br", null),
                            "[[`",
                            mcpToolCallingTools_1.QuickInputTool.ID,
                            "` called requesting Redis port number]]: \"3000\"",
                            vscpp("br", null),
                            "[[`",
                            mcpToolCallingTools_1.QuickInputTool.ID,
                            "` called requesting Redis port password]]: \"\"",
                            vscpp("br", null),
                            vscpp("br", null),
                            !hasMcpJson && vscpp(vscppf, null, "Based on this data, the command needed to run the MCP server is `npx @modelcontextprotocol/server-redis redis://example.com:6379`"),
                            "Based on this data, the command needed to run the MCP server is `npx @modelcontextprotocol/server-redis redis://example.com:6379`",
                            vscpp("br", null),
                            vscpp("br", null),
                            "Here is the JSON object that matches the provided schema:",
                            vscpp("br", null),
                            redisExampleConfig)))),
            vscpp(prompt_tsx_1.UserMessage, { flexGrow: 3 },
                "I want to run the ",
                packageType,
                " package `",
                packageName,
                "` as an MCP server. This is its readme:",
                vscpp("br", null),
                vscpp(tag_1.Tag, { name: 'readme' }, this.props.packageReadme),
                "The schema for the final JSON object is:",
                vscpp("br", null),
                vscpp(tag_1.Tag, { name: 'schema', flexGrow: 1 },
                    vscpp(prompt_tsx_1.TextChunk, { breakOnWhitespace: true }, JSON.stringify(this.props.targetSchema, null, 2)))),
            vscpp(toolCalling_1.ChatToolCalls, { priority: 899, flexGrow: 2, promptContext: this.props.promptContext, toolCallRounds: toolCallRounds, toolCallResults: toolCallResults, toolCallMode: toolsRegistry_1.CopilotToolMode.FullContext })));
    }
}
exports.McpToolCallingLoopPrompt = McpToolCallingLoopPrompt;
class InstructionsWithMcpJson extends prompt_tsx_1.PromptElement {
    render() {
        const [command, ...args] = this.props.command.split(' ');
        return vscpp(vscppf, null,
            "Think step by step:",
            vscpp("br", null),
            "1. Read the documentation for the MCP server and find the section that discusses setting up a configuration with `mcpServers`. If there are multiple such examples, find the one that works best when run as `",
            `{"command":"${command}", "args": ["${args.join('", "')}", ...], , "env": { ... } }`,
            ". State this configuration in your response.",
            vscpp("br", null),
            "2. Determine what placeholders are used in that example that the user would need to fill, such as configuration options, credentials, or API keys.",
            vscpp("br", null),
            "3. Call the tool `",
            mcpToolCallingTools_1.QuickInputTool.ID,
            "` a maximum of 5 times to gather the placeholder information. You may make multiple calls using this tool in parallel, but the maximum number of questions must be 5.",
            vscpp("br", null),
            "4. Transform that example configuration entry, replacing or adding any additional information the user gave you, into a JSON object matching the provided schema.",
            vscpp("br", null),
            this.props.packageVersion && vscpp(vscppf, null,
                "The package version is ",
                this.props.packageVersion,
                ", make sure your command runs the correct version, using the form `",
                this.props.command,
                "`.",
                vscpp("br", null)),
            "5. Return the resulting JSON object in a markdown code block wrapped with triple backticks (```)",
            vscpp("br", null));
    }
}
class InstructionsWithout extends prompt_tsx_1.PromptElement {
    render() {
        return vscpp(vscppf, null,
            "The MCP server the developer is asking about can be run using the command ",
            this.props.command,
            ", but it may need additional arguments or environment variables to function.",
            vscpp("br", null),
            vscpp("br", null),
            "Think step by step:",
            vscpp("br", null),
            "1. Read the documentation for the MCP server and determine what information you would need to run it on the command line.",
            vscpp("br", null),
            "2. Call the tool `",
            mcpToolCallingTools_1.QuickInputTool.ID,
            "` a maximum of 5 times to gather the necessary information. You may make multiple calls using this tool in parallel, but the maximum number of questions must be 5.",
            vscpp("br", null),
            "3. Use that information to construct a set of arguments and environment variables to run the server. ",
            vscpp("br", null),
            this.props.packageVersion && vscpp(vscppf, null,
                "The package version is ",
                this.props.packageVersion,
                ", make sure your command runs the correct version, using the form `",
                this.props.command,
                "`.",
                vscpp("br", null)),
            "4. Translate the command, arguments and environment variables into a JSON object that matches the provided schema.",
            vscpp("br", null),
            "5. Return the resulting JSON object in a markdown code block wrapped with triple backticks (```)",
            vscpp("br", null),
            vscpp("br", null),
            "Follow these rules when constructing your arguments and environment variables:",
            vscpp("br", null),
            "1. Prefer to use environment variables over arguments when possible, especially for sensitive information. Command-line arguments are not secure.",
            vscpp("br", null),
            "2. Look carefully in the readme for instructions for how to run the MCP server in `stdio` mode. If there are additional arguments needed to run the MCP server in `stdio` mode, then you MUST include them in your output.",
            vscpp("br", null),
            "4. Briefly summarize how the above instructions were followed in your response.",
            vscpp("br", null));
    }
}
const clauseExampleConfiguration = `\`\`\`json
{
  "mcpServers": {
    "redis": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-redis",
        "redis://localhost:6379"
      ]
    }
  }
}
\`\`\``;
const redisExampleReadme = `<readme>
# Redis

A Model Context Protocol server that provides access to Redis databases. This server enables LLMs to interact with Redis key-value stores through a set of standardized tools.

## Components

### Tools

- **set**
  - Set a Redis key-value pair with optional expiration
  - Input:
    - \`key\` (string): Redis key
    - \`value\` (string): Value to store
    - \`expireSeconds\` (number, optional): Expiration time in seconds

- **get**
  - Get value by key from Redis
  - Input: \`key\` (string): Redis key to retrieve

- **delete**
  - Delete one or more keys from Redis
  - Input: \`key\` (string | string[]): Key or array of keys to delete

- **list**
  - List Redis keys matching a pattern
  - Input: \`pattern\` (string, optional): Pattern to match keys (default: *)

## Usage with Claude Desktop

To use this server with the Claude Desktop app, add the following configuration to the "mcpServers" section of your \`claude_desktop_config.json\`:

### Docker

* when running docker on macos, use host.docker.internal if the server is running on the host network (eg localhost)
* Redis URL can be specified as an argument, defaults to "redis://localhost:6379"

\`\`\`json
{
  "mcpServers": {
    "redis": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "mcp/redis",
        "redis://host.docker.internal:6379"]
    }
  }
}
\`\`\`

### NPX

${clauseExampleConfiguration}
</readme>`;
const redisExampleConfig = `
\`\`\`json
{
	"name": "redis",
	"command": "npx",
	"args": [
		"@modelcontextprotocol/server-redis",
		"redis://redis.example.com:3000"
	]
}
\`\`\`
`;
//# sourceMappingURL=mcpToolCallingLoopPrompt.js.map