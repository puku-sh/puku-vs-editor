"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __decorateClass = (decorators, target, key, kind) => {
  var result = kind > 1 ? void 0 : kind ? __getOwnPropDesc(target, key) : target;
  for (var i = decorators.length - 1, decorator; i >= 0; i--)
    if (decorator = decorators[i])
      result = (kind ? decorator(target, key, result) : decorator(result)) || result;
  if (kind && result) __defProp(target, key, result);
  return result;
};
var __decorateParam = (index, decorator) => (target, key) => decorator(target, key, index);

// node_modules/@vscode/prompt-tsx/dist/base/util/assert.js
var require_assert = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/util/assert.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.assertNever = assertNever2;
    function assertNever2(value, msg = `unexpected value ${value}`) {
      throw new Error(`Unreachable: ${msg}`);
    }
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/output/rawTypes.js
var require_rawTypes = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/output/rawTypes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ChatCompletionContentPartOpaque = exports2.ChatCompletionContentPartKind = exports2.ChatRole = void 0;
    var assert_1 = require_assert();
    var ChatRole;
    (function(ChatRole2) {
      ChatRole2[ChatRole2["System"] = 0] = "System";
      ChatRole2[ChatRole2["User"] = 1] = "User";
      ChatRole2[ChatRole2["Assistant"] = 2] = "Assistant";
      ChatRole2[ChatRole2["Tool"] = 3] = "Tool";
    })(ChatRole || (exports2.ChatRole = ChatRole = {}));
    (function(ChatRole2) {
      function display(role) {
        switch (role) {
          case ChatRole2.System:
            return "system";
          case ChatRole2.User:
            return "user";
          case ChatRole2.Assistant:
            return "assistant";
          case ChatRole2.Tool:
            return "tool";
          default:
            (0, assert_1.assertNever)(role, `unknown chat role ${role}}`);
        }
      }
      ChatRole2.display = display;
    })(ChatRole || (exports2.ChatRole = ChatRole = {}));
    var ChatCompletionContentPartKind;
    (function(ChatCompletionContentPartKind2) {
      ChatCompletionContentPartKind2[ChatCompletionContentPartKind2["Image"] = 0] = "Image";
      ChatCompletionContentPartKind2[ChatCompletionContentPartKind2["Text"] = 1] = "Text";
      ChatCompletionContentPartKind2[ChatCompletionContentPartKind2["Opaque"] = 2] = "Opaque";
      ChatCompletionContentPartKind2[ChatCompletionContentPartKind2["CacheBreakpoint"] = 3] = "CacheBreakpoint";
    })(ChatCompletionContentPartKind || (exports2.ChatCompletionContentPartKind = ChatCompletionContentPartKind = {}));
    var ChatCompletionContentPartOpaque;
    (function(ChatCompletionContentPartOpaque2) {
      function usableIn(part, mode) {
        return !part.scope || (part.scope & mode) !== 0;
      }
      ChatCompletionContentPartOpaque2.usableIn = usableIn;
    })(ChatCompletionContentPartOpaque || (exports2.ChatCompletionContentPartOpaque = ChatCompletionContentPartOpaque = {}));
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/output/openaiTypes.js
var require_openaiTypes = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/output/openaiTypes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BaseTokensPerName = exports2.BaseTokensPerMessage = exports2.BaseTokensPerCompletion = exports2.ChatRole = void 0;
    var ChatRole;
    (function(ChatRole2) {
      ChatRole2["System"] = "system";
      ChatRole2["User"] = "user";
      ChatRole2["Assistant"] = "assistant";
      ChatRole2["Function"] = "function";
      ChatRole2["Tool"] = "tool";
    })(ChatRole || (exports2.ChatRole = ChatRole = {}));
    exports2.BaseTokensPerCompletion = 3;
    exports2.BaseTokensPerMessage = 3;
    exports2.BaseTokensPerName = 1;
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/output/openaiConvert.js
var require_openaiConvert = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/output/openaiConvert.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.toOpenAiChatMessage = toOpenAiChatMessage;
    exports2.toOpenAIChatMessages = toOpenAIChatMessages;
    var Raw2 = require_rawTypes();
    var OpenAI = require_openaiTypes();
    var mode_1 = require_mode();
    function onlyStringContent(content) {
      return content.filter((part) => part.type === Raw2.ChatCompletionContentPartKind.Text).map((part) => part.text).join("");
    }
    function stringAndImageContent(content) {
      const parts = content.map((part) => {
        if (part.type === Raw2.ChatCompletionContentPartKind.Text) {
          return {
            type: "text",
            text: part.text
          };
        } else if (part.type === Raw2.ChatCompletionContentPartKind.Image) {
          return {
            image_url: part.imageUrl,
            type: "image_url"
          };
        } else if (part.type === Raw2.ChatCompletionContentPartKind.Opaque && Raw2.ChatCompletionContentPartOpaque.usableIn(part, mode_1.OutputMode.OpenAI)) {
          return part.value;
        }
      }).filter((r) => !!r);
      if (parts.every((part) => part.type === "text")) {
        return parts.map((p) => p.text).join("");
      }
      return parts;
    }
    function toOpenAiChatMessage(message) {
      switch (message.role) {
        case Raw2.ChatRole.System:
          return {
            role: OpenAI.ChatRole.System,
            content: onlyStringContent(message.content),
            name: message.name
          };
        case Raw2.ChatRole.User:
          return {
            role: OpenAI.ChatRole.User,
            content: stringAndImageContent(message.content),
            name: message.name
          };
        case Raw2.ChatRole.Assistant:
          return {
            role: OpenAI.ChatRole.Assistant,
            content: onlyStringContent(message.content),
            name: message.name,
            tool_calls: message.toolCalls?.map((toolCall) => ({
              id: toolCall.id,
              function: toolCall.function,
              type: "function"
            }))
          };
        case Raw2.ChatRole.Tool:
          return {
            role: OpenAI.ChatRole.Tool,
            content: stringAndImageContent(message.content),
            tool_call_id: message.toolCallId
          };
        default:
          return void 0;
      }
    }
    function toOpenAIChatMessages(messages) {
      return messages.map(toOpenAiChatMessage).filter((r) => !!r);
    }
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/output/vscode.js
var require_vscode = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/output/vscode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.toVsCodeChatMessage = toVsCodeChatMessage;
    exports2.toVsCodeChatMessages = toVsCodeChatMessages;
    var Raw2 = require_rawTypes();
    function onlyStringContent(content) {
      return content.filter((part) => part.type === Raw2.ChatCompletionContentPartKind.Text).map((part) => part.text).join("");
    }
    var vscode;
    function toVsCodeChatMessage(m) {
      vscode ??= require("vscode");
      switch (m.role) {
        case Raw2.ChatRole.Assistant:
          const message = vscode.LanguageModelChatMessage.Assistant(onlyStringContent(m.content), m.name);
          if (m.toolCalls) {
            message.content = [
              new vscode.LanguageModelTextPart(onlyStringContent(m.content)),
              ...m.toolCalls.map((tc) => {
                let parsedArgs;
                try {
                  parsedArgs = JSON.parse(tc.function.arguments);
                } catch (err) {
                  throw new Error("Invalid JSON in tool call arguments for tool call: " + tc.id);
                }
                return new vscode.LanguageModelToolCallPart(tc.id, tc.function.name, parsedArgs);
              })
            ];
          }
          return message;
        case Raw2.ChatRole.User:
          return vscode.LanguageModelChatMessage.User(onlyStringContent(m.content), m.name);
        case Raw2.ChatRole.Tool: {
          const message2 = vscode.LanguageModelChatMessage.User("");
          message2.content = [
            new vscode.LanguageModelToolResultPart(m.toolCallId, [
              new vscode.LanguageModelTextPart(onlyStringContent(m.content))
            ])
          ];
          return message2;
        }
        default:
          return void 0;
      }
    }
    function toVsCodeChatMessages(messages) {
      return messages.map(toVsCodeChatMessage).filter((r) => !!r);
    }
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/output/mode.js
var require_mode = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/output/mode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.OutputMode = exports2.Raw = exports2.OpenAI = void 0;
    exports2.toMode = toMode2;
    exports2.toVSCode = toVSCode;
    exports2.toOpenAI = toOpenAI;
    var openaiConvert_1 = require_openaiConvert();
    var vscode_1 = require_vscode();
    exports2.OpenAI = require_openaiTypes();
    exports2.Raw = require_rawTypes();
    var OutputMode2;
    (function(OutputMode3) {
      OutputMode3[OutputMode3["Raw"] = 1] = "Raw";
      OutputMode3[OutputMode3["OpenAI"] = 2] = "OpenAI";
      OutputMode3[OutputMode3["VSCode"] = 4] = "VSCode";
    })(OutputMode2 || (exports2.OutputMode = OutputMode2 = {}));
    function toMode2(mode, messages) {
      switch (mode) {
        case OutputMode2.Raw:
          return messages;
        case OutputMode2.VSCode:
          return messages instanceof Array ? (0, vscode_1.toVsCodeChatMessages)(messages) : (0, vscode_1.toVsCodeChatMessage)(messages);
        case OutputMode2.OpenAI:
          return messages instanceof Array ? (0, openaiConvert_1.toOpenAIChatMessages)(messages) : (0, openaiConvert_1.toOpenAiChatMessage)(messages);
        default:
          throw new Error(`Unknown output mode: ${mode}`);
      }
    }
    function toVSCode(messages) {
      return toMode2(OutputMode2.VSCode, messages);
    }
    function toOpenAI(messages) {
      return toMode2(OutputMode2.OpenAI, messages);
    }
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/jsonTypes.js
var require_jsonTypes = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/jsonTypes.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.jsonRetainedProps = void 0;
    exports2.forEachNode = forEachNode;
    exports2.jsonRetainedProps = Object.keys({
      flexBasis: 1,
      flexGrow: 1,
      flexReserve: 1,
      passPriority: 1,
      priority: 1
    });
    function forEachNode(node, fn) {
      fn(node);
      if (node.type === 1) {
        for (const child of node.children) {
          forEachNode(child, fn);
        }
      }
    }
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/once.js
var require_once = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/once.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.once = once;
    function once(fn) {
      let result;
      let called = false;
      const wrappedFunction = ((...args) => {
        if (!called) {
          result = fn(...args);
          called = true;
        }
        return result;
      });
      wrappedFunction.clear = () => {
        called = false;
      };
      return wrappedFunction;
    }
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/materialized.js
var require_materialized = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/materialized.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BudgetExceededError = exports2.MaterializedChatMessageImage = exports2.MaterializedChatMessageBreakpoint = exports2.MaterializedChatMessageOpaque = exports2.MaterializedChatMessage = exports2.MaterializedChatMessageTextChunk = exports2.GenericMaterializedContainer = void 0;
    var once_1 = require_once();
    var mode_1 = require_mode();
    var GenericMaterializedContainer = class _GenericMaterializedContainer {
      parent;
      id;
      name;
      priority;
      metadata;
      flags;
      children;
      keepWithId;
      constructor(parent, id2, name, priority, childrenRef, metadata, flags) {
        this.parent = parent;
        this.id = id2;
        this.name = name;
        this.priority = priority;
        this.metadata = metadata;
        this.flags = flags;
        this.children = childrenRef(this);
        if (flags & 8) {
          if (this.children.length !== 2) {
            throw new Error("Invalid number of children for EmptyAlternate flag");
          }
          const [ifEmpty, defaultChild] = this.children;
          if (defaultChild.isEmpty) {
            this.children = [ifEmpty];
          } else {
            this.children = [defaultChild];
          }
        }
      }
      has(flag) {
        return !!(this.flags & flag);
      }
      /** @inheritdoc */
      async tokenCount(tokenizer) {
        let total = 0;
        await Promise.all(this.children.map(async (child) => {
          const amt = isContainerType(child) ? await child.tokenCount(tokenizer) : await child.upperBoundTokenCount(tokenizer);
          total += amt;
        }));
        return total;
      }
      /** @inheritdoc */
      async upperBoundTokenCount(tokenizer) {
        let total = 0;
        await Promise.all(this.children.map(async (child) => {
          const amt = await child.upperBoundTokenCount(tokenizer);
          total += amt;
        }));
        return total;
      }
      /**
       * Replaces a node in the tree with the given one, by its ID.
       */
      replaceNode(nodeId, withNode) {
        return replaceNode(nodeId, this.children, withNode);
      }
      /**
       * Gets all metadata the container holds.
       */
      allMetadata() {
        return allMetadata(this);
      }
      /**
       * Finds a node in the tree by ID.
       */
      findById(nodeId) {
        return findNodeById(nodeId, this);
      }
      /**
       * Gets whether the container is empty.
       */
      get isEmpty() {
        return !this.children.some((c) => !c.isEmpty);
      }
      /**
       * Called when children change, so caches can be invalidated.
       */
      onChunksChange() {
        this.parent?.onChunksChange();
      }
      /**
       * Gets the chat messages the container holds.
       */
      *toChatMessages() {
        for (const child of this.children) {
          assertContainerOrChatMessage(child);
          if (child instanceof _GenericMaterializedContainer) {
            yield* child.toChatMessages();
          } else if (!child.isEmpty && child instanceof MaterializedChatMessage) {
            yield child.toChatMessage();
          }
        }
      }
      async baseMessageTokenCount(tokenizer) {
        let sum = 0;
        await Promise.all(this.children.map(async (child) => {
          if (child instanceof MaterializedChatMessage || child instanceof _GenericMaterializedContainer) {
            const amount = await child.baseMessageTokenCount(tokenizer);
            sum += amount;
          }
        }));
        return sum;
      }
      /**
       * Removes the node in the tree with the lowest priority. Returns the
       * list of nodes that were removed.
       */
      removeLowestPriorityChild() {
        const removed = [];
        removeLowestPriorityChild(this, removed);
        return removed;
      }
    };
    exports2.GenericMaterializedContainer = GenericMaterializedContainer;
    var MaterializedChatMessageTextChunk = class {
      parent;
      text;
      priority;
      metadata;
      lineBreakBefore;
      constructor(parent, text, priority, metadata = [], lineBreakBefore) {
        this.parent = parent;
        this.text = text;
        this.priority = priority;
        this.metadata = metadata;
        this.lineBreakBefore = lineBreakBefore;
      }
      upperBoundTokenCount(tokenizer) {
        return this._upperBound(tokenizer);
      }
      _upperBound = (0, once_1.once)(async (tokenizer) => {
        const textTokens = await tokenizer.tokenLength({
          type: mode_1.Raw.ChatCompletionContentPartKind.Text,
          text: this.text
        });
        return textTokens + (this.lineBreakBefore !== 0 ? 1 : 0);
      });
      get isEmpty() {
        return !/\S/.test(this.text);
      }
    };
    exports2.MaterializedChatMessageTextChunk = MaterializedChatMessageTextChunk;
    var MaterializedChatMessage = class {
      parent;
      id;
      role;
      name;
      toolCalls;
      toolCallId;
      priority;
      metadata;
      children;
      constructor(parent, id2, role, name, toolCalls, toolCallId, priority, metadata, childrenRef) {
        this.parent = parent;
        this.id = id2;
        this.role = role;
        this.name = name;
        this.toolCalls = toolCalls;
        this.toolCallId = toolCallId;
        this.priority = priority;
        this.metadata = metadata;
        this.children = childrenRef(this);
      }
      /** @inheritdoc */
      async tokenCount(tokenizer) {
        return this._tokenCount(tokenizer);
      }
      /** @inheritdoc */
      async upperBoundTokenCount(tokenizer) {
        return this._upperBound(tokenizer);
      }
      /** Gets the text this message contains */
      get text() {
        return this._text();
      }
      /** Gets whether the message is empty */
      get isEmpty() {
        return !this.toolCalls?.length && !this.children.some((element) => !element.isEmpty);
      }
      /**
       * Replaces a node in the tree with the given one, by its ID.
       */
      replaceNode(nodeId, withNode) {
        const replaced = replaceNode(nodeId, this.children, withNode);
        if (replaced) {
          this.onChunksChange();
        }
        return replaced;
      }
      removeLowestPriorityChild() {
        const removed = [];
        removeLowestPriorityChild(this, removed);
        return removed;
      }
      onChunksChange() {
        this._tokenCount.clear();
        this._upperBound.clear();
        this._text.clear();
        this.parent?.onChunksChange();
      }
      /**
       * Finds a node in the tree by ID.
       */
      findById(nodeId) {
        return findNodeById(nodeId, this);
      }
      _tokenCount = (0, once_1.once)(async (tokenizer) => {
        const raw = this.toChatMessage();
        return tokenizer.countMessageTokens((0, mode_1.toMode)(tokenizer.mode, raw));
      });
      _upperBound = (0, once_1.once)(async (tokenizer) => {
        let total = await this.baseMessageTokenCount(tokenizer);
        await Promise.all(this.children.map(async (chunk) => {
          const amt = await chunk.upperBoundTokenCount(tokenizer);
          total += amt;
        }));
        return total;
      });
      baseMessageTokenCount = (0, once_1.once)((tokenizer) => {
        const raw = this.toChatMessage();
        raw.content = raw.content.map((message) => {
          if (message.type === mode_1.Raw.ChatCompletionContentPartKind.Text) {
            return { ...message, text: "" };
          } else if (message.type === mode_1.Raw.ChatCompletionContentPartKind.Image) {
            return void 0;
          } else {
            return message;
          }
        }).filter((r) => !!r);
        return tokenizer.countMessageTokens((0, mode_1.toMode)(tokenizer.mode, raw));
      });
      _text = (0, once_1.once)(() => {
        let result = [];
        for (const { content, isTextSibling } of contentChunks(this)) {
          if (content instanceof MaterializedChatMessageImage || content instanceof MaterializedChatMessageOpaque) {
            result.push(content);
            continue;
          }
          if (content instanceof MaterializedChatMessageBreakpoint) {
            if (result.at(-1) instanceof MaterializedChatMessageBreakpoint) {
              result[result.length - 1] = content;
            } else {
              result.push(content);
            }
            continue;
          }
          if (content.lineBreakBefore === 1 || content.lineBreakBefore === 2 && !isTextSibling) {
            let prev = result[result.length - 1];
            if (typeof prev === "string" && prev && !prev.endsWith("\n")) {
              result[result.length - 1] = prev + "\n";
            }
          }
          if (typeof result[result.length - 1] === "string") {
            result[result.length - 1] += content.text;
          } else {
            result.push(content.text);
          }
        }
        return result;
      });
      toChatMessage() {
        const content = this.text.map((element) => {
          if (typeof element === "string") {
            return { type: mode_1.Raw.ChatCompletionContentPartKind.Text, text: element };
          } else if (element instanceof MaterializedChatMessageImage) {
            return {
              type: mode_1.Raw.ChatCompletionContentPartKind.Image,
              // updated type reference
              imageUrl: { url: getEncodedBase64(element.src), detail: element.detail }
            };
          } else if (element instanceof MaterializedChatMessageOpaque) {
            return { type: mode_1.Raw.ChatCompletionContentPartKind.Opaque, value: element.value };
          } else if (element instanceof MaterializedChatMessageBreakpoint) {
            return element.part;
          } else {
            throw new Error("Unexpected element type");
          }
        });
        if (this.role === mode_1.Raw.ChatRole.System) {
          return {
            role: this.role,
            content,
            ...this.name ? { name: this.name } : {}
          };
        } else if (this.role === mode_1.Raw.ChatRole.Assistant) {
          const msg = { role: this.role, content };
          if (this.name) {
            msg.name = this.name;
          }
          if (this.toolCalls?.length) {
            msg.toolCalls = this.toolCalls.map((tc) => ({
              function: tc.function,
              id: tc.id,
              type: tc.type
            }));
          }
          return msg;
        } else if (this.role === mode_1.Raw.ChatRole.User) {
          return {
            role: this.role,
            content,
            ...this.name ? { name: this.name } : {}
          };
        } else if (this.role === mode_1.Raw.ChatRole.Tool) {
          return {
            role: this.role,
            content,
            toolCallId: this.toolCallId
          };
        } else {
          return {
            role: this.role,
            content,
            name: this.name
          };
        }
      }
    };
    exports2.MaterializedChatMessage = MaterializedChatMessage;
    var MaterializedChatMessageOpaque = class {
      parent;
      part;
      priority;
      metadata = [];
      get value() {
        return this.part.value;
      }
      constructor(parent, part, priority = Number.MAX_SAFE_INTEGER) {
        this.parent = parent;
        this.part = part;
        this.priority = priority;
      }
      upperBoundTokenCount(tokenizer) {
        return this.part.tokenUsage && mode_1.Raw.ChatCompletionContentPartOpaque.usableIn(this.part, tokenizer.mode) ? this.part.tokenUsage : 0;
      }
      isEmpty = false;
    };
    exports2.MaterializedChatMessageOpaque = MaterializedChatMessageOpaque;
    var MaterializedChatMessageBreakpoint = class {
      parent;
      part;
      metadata = [];
      priority = Number.MAX_SAFE_INTEGER;
      constructor(parent, part) {
        this.parent = parent;
        this.part = part;
      }
      upperBoundTokenCount(_tokenizer) {
        return 0;
      }
      isEmpty = false;
    };
    exports2.MaterializedChatMessageBreakpoint = MaterializedChatMessageBreakpoint;
    var MaterializedChatMessageImage = class {
      parent;
      id;
      src;
      priority;
      metadata;
      lineBreakBefore;
      detail;
      constructor(parent, id2, src, priority, metadata = [], lineBreakBefore, detail) {
        this.parent = parent;
        this.id = id2;
        this.src = src;
        this.priority = priority;
        this.metadata = metadata;
        this.lineBreakBefore = lineBreakBefore;
        this.detail = detail;
      }
      upperBoundTokenCount(tokenizer) {
        return this._upperBound(tokenizer);
      }
      _upperBound = (0, once_1.once)(async (tokenizer) => {
        return tokenizer.tokenLength({
          type: mode_1.Raw.ChatCompletionContentPartKind.Image,
          imageUrl: { url: getEncodedBase64(this.src), detail: this.detail }
        });
      });
      isEmpty = false;
    };
    exports2.MaterializedChatMessageImage = MaterializedChatMessageImage;
    function isContainerType(node) {
      return node instanceof GenericMaterializedContainer || node instanceof MaterializedChatMessage;
    }
    function isContentType(node) {
      return node instanceof MaterializedChatMessageTextChunk || node instanceof MaterializedChatMessageImage || node instanceof MaterializedChatMessageOpaque || node instanceof MaterializedChatMessageBreakpoint;
    }
    function assertContainerOrChatMessage(v) {
      if (!isContainerType(v)) {
        throw new Error(`Cannot have a text node outside a ChatMessage. Text: "${v.text}"`);
      }
    }
    function* contentChunks(node, isTextSibling = false) {
      for (const child of node.children) {
        if (child instanceof MaterializedChatMessageTextChunk) {
          yield { content: child, isTextSibling };
          isTextSibling = true;
        } else if (child instanceof MaterializedChatMessageImage || child instanceof MaterializedChatMessageOpaque || child instanceof MaterializedChatMessageBreakpoint) {
          yield { content: child, isTextSibling: false };
        } else if (child instanceof MaterializedChatMessageOpaque) {
          yield { content: child, isTextSibling: true };
        } else {
          if (child)
            yield* contentChunks(child, isTextSibling);
          isTextSibling = false;
        }
      }
    }
    function removeLowestPriorityLegacy(root, removed) {
      let lowest;
      function findLowestInTree(node, chain) {
        if (isContentType(node)) {
          if (!lowest || node.priority < lowest.node.priority) {
            lowest = { chain: chain.slice(), node };
          }
        } else {
          chain.push(node);
          for (const child of node.children) {
            findLowestInTree(child, chain);
          }
          chain.pop();
        }
      }
      findLowestInTree(root, []);
      if (!lowest) {
        throw new Error("No lowest priority node found");
      }
      removeNode(lowest.node, removed);
    }
    var _hasCachePointMemo = /* @__PURE__ */ new WeakMap();
    function hasCachePoint(node) {
      let known = _hasCachePointMemo.get(node);
      if (known !== void 0) {
        return known;
      }
      let result = false;
      if (node instanceof MaterializedChatMessageBreakpoint) {
        result = true;
      } else if (node instanceof MaterializedChatMessage) {
        result = node.children.some((c) => c instanceof MaterializedChatMessageBreakpoint);
      } else if (node instanceof GenericMaterializedContainer) {
        result = node.children.some(hasCachePoint);
      }
      _hasCachePointMemo.set(node, result);
      return result;
    }
    function shouldLookForCachePointInNode(node) {
      if (node instanceof MaterializedChatMessage) {
        return true;
      }
      for (let p = node.parent; p; p = p.parent) {
        if (p instanceof MaterializedChatMessage) {
          return false;
        }
      }
      return true;
    }
    function removeLowestPriorityChild(node, removed) {
      let lowest;
      if (node instanceof GenericMaterializedContainer && node.has(
        1
        /* ContainerFlags.IsLegacyPrioritization */
      )) {
        removeLowestPriorityLegacy(node, removed);
        return;
      }
      const shouldLookForCachePoint = shouldLookForCachePointInNode(node);
      const queue = node.children.map((_, i) => ({ chain: [node], index: i }));
      for (let i = 0; i < queue.length; i++) {
        const { chain, index } = queue[i];
        const child = chain[chain.length - 1].children[index];
        if (shouldLookForCachePoint && hasCachePoint(child)) {
          lowest = void 0;
          if (child instanceof MaterializedChatMessageBreakpoint) {
            continue;
          }
        }
        if (child instanceof GenericMaterializedContainer && child.has(
          4
          /* ContainerFlags.PassPriority */
        ) && child.children.length) {
          const newChain = [...chain, child];
          queue.splice(i + 1, 0, ...child.children.map((_, i2) => ({ chain: newChain, index: i2 })));
        } else if (!lowest || child.priority < lowest.value.priority) {
          lowest = { chain, index, value: child };
        } else if (child.priority === lowest.value.priority) {
          lowest.lowestNested ??= getLowestPriorityAmongChildren(lowest.value);
          const lowestNestedPriority = getLowestPriorityAmongChildren(child);
          if (lowestNestedPriority < lowest.lowestNested) {
            lowest = { chain, index, value: child, lowestNested: lowestNestedPriority };
          }
        }
      }
      if (!lowest) {
        throw new BudgetExceededError(node);
      }
      if (isContentType(lowest.value) || lowest.value instanceof GenericMaterializedContainer && lowest.value.has(
        2
        /* ContainerFlags.IsChunk */
      ) || isContainerType(lowest.value) && !lowest.value.children.length) {
        removeNode(lowest.value, removed);
      } else {
        removeLowestPriorityChild(lowest.value, removed);
      }
    }
    var BudgetExceededError = class extends Error {
      metadata;
      messages;
      constructor(node) {
        let path2 = [node];
        while (path2[0].parent) {
          path2.unshift(path2[0].parent);
        }
        const parts = path2.map((n) => n instanceof MaterializedChatMessage ? n.role : n.name || "(anonymous)");
        super(`No lowest priority node found (path: ${parts.join(" -> ")})`);
      }
    };
    exports2.BudgetExceededError = BudgetExceededError;
    function getLowestPriorityAmongChildren(node) {
      if (!isContainerType(node)) {
        return -1;
      }
      let lowest = Number.MAX_SAFE_INTEGER;
      for (const child of node.children) {
        lowest = Math.min(lowest, child.priority);
      }
      return lowest;
    }
    function* allMetadata(node) {
      yield* node.metadata;
      for (const child of node.children) {
        if (isContainerType(child)) {
          yield* allMetadata(child);
        } else {
          yield* child.metadata;
        }
      }
    }
    function replaceNode(nodeId, children, withNode) {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isContainerType(child)) {
          if (child.id === nodeId) {
            const oldNode = children[i];
            withNode.parent = child.parent;
            children[i] = withNode;
            return oldNode;
          }
          const inner = child.replaceNode(nodeId, withNode);
          if (inner) {
            return inner;
          }
        }
      }
    }
    function* forEachNode(node) {
      const queue = [node];
      while (queue.length > 0) {
        const current = queue.pop();
        yield current;
        if (isContainerType(current)) {
          queue.push(...current.children);
        }
      }
    }
    function getRoot2(node) {
      let current = node;
      while (current.parent) {
        current = current.parent;
      }
      return current;
    }
    function isKeepWith(node) {
      return node instanceof GenericMaterializedContainer && node.keepWithId !== void 0;
    }
    var currentlyBeingRemovedKeepWiths = /* @__PURE__ */ new Set();
    function removeOtherKeepWiths(nodeThatWasRemoved, removed) {
      const removeKeepWithIds = /* @__PURE__ */ new Set();
      for (const node of forEachNode(nodeThatWasRemoved)) {
        if (isKeepWith(node) && !currentlyBeingRemovedKeepWiths.has(node.keepWithId)) {
          removeKeepWithIds.add(node.keepWithId);
        }
      }
      if (removeKeepWithIds.size === 0) {
        return false;
      }
      for (const id2 of removeKeepWithIds) {
        currentlyBeingRemovedKeepWiths.add(id2);
      }
      try {
        const root = getRoot2(nodeThatWasRemoved);
        for (const node of forEachNode(root)) {
          if (isKeepWith(node) && removeKeepWithIds.has(node.keepWithId)) {
            removeNode(node, removed);
          } else if (node instanceof MaterializedChatMessage && node.toolCalls) {
            node.toolCalls = filterIfDifferent(node.toolCalls, (c) => !(c.keepWith && removeKeepWithIds.has(c.keepWith.id)));
            if (node.isEmpty) {
              removeNode(node, removed);
            }
          }
        }
      } finally {
        for (const id2 of removeKeepWithIds) {
          currentlyBeingRemovedKeepWiths.delete(id2);
        }
      }
    }
    function findNodeById(nodeId, container) {
      if (container.id === nodeId) {
        return container;
      }
      for (const child of container.children) {
        if (isContainerType(child)) {
          const inner = findNodeById(nodeId, child);
          if (inner) {
            return inner;
          }
        }
      }
    }
    function removeNode(node, removed) {
      const parent = node.parent;
      if (!parent) {
        return;
      }
      const index = parent.children.indexOf(node);
      if (index === -1) {
        return;
      }
      parent.children.splice(index, 1);
      removed.push(node);
      removeOtherKeepWiths(node, removed);
      if (parent.isEmpty) {
        removeNode(parent, removed);
      } else {
        parent.onChunksChange();
      }
    }
    function getEncodedBase64(base64String) {
      const mimeTypes = {
        "/9j/": "image/jpeg",
        iVBOR: "image/png",
        R0lGOD: "image/gif",
        UklGR: "image/webp"
      };
      for (const prefix of Object.keys(mimeTypes)) {
        if (base64String.startsWith(prefix)) {
          return `data:${mimeTypes[prefix]};base64,${base64String}`;
        }
      }
      return base64String;
    }
    function filterIfDifferent(arr, predicate) {
      for (let i = 0; i < arr.length; i++) {
        if (predicate(arr[i])) {
          continue;
        }
        const newArr = arr.slice(0, i);
        for (let k = i + 1; k < arr.length; k++) {
          if (predicate(arr[k])) {
            newArr.push(arr[k]);
          }
        }
        return newArr;
      }
      return arr;
    }
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/tsx.js
var require_tsx = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/tsx.js"() {
    "use strict";
    function _vscpp(ctor, props, ...children) {
      return { ctor, props, children: children.flat() };
    }
    function _vscppf() {
      throw new Error(`This should not be invoked!`);
    }
    _vscppf.isFragment = true;
    globalThis.vscpp = _vscpp;
    globalThis.vscppf = _vscppf;
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/promptElement.js
var require_promptElement = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/promptElement.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PromptElement = void 0;
    require_tsx();
    var PromptElement = class {
      props;
      get priority() {
        return this.props.priority ?? Number.MAX_SAFE_INTEGER;
      }
      get insertLineBreakBefore() {
        return true;
      }
      constructor(props) {
        this.props = props;
      }
    };
    exports2.PromptElement = PromptElement;
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/promptElements.js
var require_promptElements = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/promptElements.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LogicalWrapper = exports2.IfEmpty = exports2.AbstractKeepWith = exports2.TokenLimit = exports2.Expandable = exports2.Chunk = exports2.LegacyPrioritization = exports2.ToolResult = exports2.PrioritizedList = exports2.Image = exports2.TextChunk = exports2.ToolMessage = exports2.AssistantMessage = exports2.UserMessage = exports2.SystemMessage = exports2.BaseChatMessage = void 0;
    exports2.isChatMessagePromptElement = isChatMessagePromptElement;
    exports2.useKeepWith = useKeepWith;
    var _1 = require_base();
    var promptElement_1 = require_promptElement();
    function isChatMessagePromptElement(element) {
      return element instanceof SystemMessage || element instanceof UserMessage || element instanceof AssistantMessage;
    }
    var BaseChatMessage = class extends promptElement_1.PromptElement {
      render() {
        return vscpp(vscppf, null, this.props.children);
      }
    };
    exports2.BaseChatMessage = BaseChatMessage;
    var SystemMessage = class extends BaseChatMessage {
      constructor(props) {
        props.role = _1.Raw.ChatRole.System;
        super(props);
      }
    };
    exports2.SystemMessage = SystemMessage;
    var UserMessage = class extends BaseChatMessage {
      constructor(props) {
        props.role = _1.Raw.ChatRole.User;
        super(props);
      }
    };
    exports2.UserMessage = UserMessage;
    var AssistantMessage = class extends BaseChatMessage {
      constructor(props) {
        props.role = _1.Raw.ChatRole.Assistant;
        super(props);
      }
    };
    exports2.AssistantMessage = AssistantMessage;
    var WHITESPACE_RE = /\s+/g;
    var ToolMessage = class extends BaseChatMessage {
      constructor(props) {
        props.role = _1.Raw.ChatRole.Tool;
        super(props);
      }
    };
    exports2.ToolMessage = ToolMessage;
    var TextChunk = class extends promptElement_1.PromptElement {
      async prepare(sizing, _progress, token) {
        const breakOn = this.props.breakOnWhitespace ? WHITESPACE_RE : this.props.breakOn;
        if (!breakOn) {
          return vscpp(vscppf, null, this.props.children);
        }
        let fullText = "";
        const intrinsics = [];
        for (const child of this.props.children || []) {
          if (child && typeof child === "object") {
            if (typeof child.ctor !== "string") {
              throw new Error("TextChunk children must be text literals or intrinsic attributes.");
            } else if (child.ctor === "br") {
              fullText += "\n";
            } else {
              intrinsics.push(child);
            }
          } else if (child != null) {
            fullText += child;
          }
        }
        const text = await getTextContentBelowBudget(sizing, breakOn, fullText, token);
        return vscpp(
          vscppf,
          null,
          intrinsics,
          text
        );
      }
      render(piece) {
        return piece;
      }
    };
    exports2.TextChunk = TextChunk;
    async function getTextContentBelowBudget(sizing, breakOn, fullText, cancellation) {
      if (breakOn instanceof RegExp) {
        if (!breakOn.global) {
          throw new Error(`\`breakOn\` expression must have the global flag set (got ${breakOn})`);
        }
        breakOn.lastIndex = 0;
      }
      let outputText = "";
      let lastIndex = -1;
      while (lastIndex < fullText.length) {
        let index;
        if (typeof breakOn === "string") {
          index = fullText.indexOf(breakOn, lastIndex === -1 ? 0 : lastIndex + breakOn.length);
        } else {
          index = breakOn.exec(fullText)?.index ?? -1;
        }
        if (index === -1) {
          index = fullText.length;
        }
        const next = outputText + fullText.slice(Math.max(0, lastIndex), index);
        if (await sizing.countTokens({ type: _1.Raw.ChatCompletionContentPartKind.Text, text: next }, cancellation) > sizing.tokenBudget) {
          return outputText;
        }
        outputText = next;
        lastIndex = index;
      }
      return outputText;
    }
    var Image = class extends promptElement_1.PromptElement {
      constructor(props) {
        super(props);
      }
      render() {
        return vscpp(vscppf, null, this.props.children);
      }
    };
    exports2.Image = Image;
    var PrioritizedList = class extends promptElement_1.PromptElement {
      render() {
        const { children, priority = 0, descending } = this.props;
        if (!children) {
          return;
        }
        return vscpp(vscppf, null, children.map((child, i) => {
          if (!child) {
            return;
          }
          const thisPriority = descending ? (
            // First element in array of children has highest priority
            priority - i
          ) : (
            // Last element in array of children has highest priority
            priority - children.length + i
          );
          if (typeof child !== "object") {
            return vscpp(TextChunk, { priority: thisPriority }, child);
          }
          child.props ??= {};
          child.props.priority = thisPriority;
          return child;
        }));
      }
    };
    exports2.PrioritizedList = PrioritizedList;
    var ToolResult = class extends promptElement_1.PromptElement {
      render() {
        return vscpp(vscppf, null, this.props.data.content.map((part) => {
          if (part && typeof part.value === "string") {
            return part.value;
          } else if (part && part.value && typeof part.value.node === "object") {
            return vscpp("elementJSON", { data: part.value });
          }
        }));
      }
    };
    exports2.ToolResult = ToolResult;
    var LegacyPrioritization = class extends promptElement_1.PromptElement {
      render() {
        return vscpp(vscppf, null, this.props.children);
      }
    };
    exports2.LegacyPrioritization = LegacyPrioritization;
    var Chunk = class extends promptElement_1.PromptElement {
      render() {
        return vscpp(vscppf, null, this.props.children);
      }
    };
    exports2.Chunk = Chunk;
    var Expandable = class extends promptElement_1.PromptElement {
      async render(_state, sizing) {
        return vscpp(vscppf, null, await this.props.value(sizing));
      }
    };
    exports2.Expandable = Expandable;
    var TokenLimit = class extends promptElement_1.PromptElement {
      render() {
        return vscpp(vscppf, null, this.props.children);
      }
    };
    exports2.TokenLimit = TokenLimit;
    var AbstractKeepWith = class extends promptElement_1.PromptElement {
    };
    exports2.AbstractKeepWith = AbstractKeepWith;
    var keepWidthId = 0;
    function useKeepWith() {
      const id2 = keepWidthId++;
      return class KeepWith extends AbstractKeepWith {
        static id = id2;
        id = id2;
        render() {
          return vscpp(vscppf, null, this.props.children);
        }
      };
    }
    var IfEmpty = class extends promptElement_1.PromptElement {
      render() {
        return vscpp(
          vscppf,
          null,
          vscpp(LogicalWrapper, null, this.props.alt),
          vscpp(LogicalWrapper, { flexGrow: 1 }, this.props.children)
        );
      }
    };
    exports2.IfEmpty = IfEmpty;
    var LogicalWrapper = class extends promptElement_1.PromptElement {
      render() {
        return vscpp(vscppf, null, this.props.children);
      }
    };
    exports2.LogicalWrapper = LogicalWrapper;
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/util/vs/nls.js
var require_nls = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/util/vs/nls.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.localize = localize;
    exports2.localize2 = localize2;
    exports2.getConfiguredDefaultLocale = getConfiguredDefaultLocale;
    function _format2(message, args) {
      let result;
      if (args.length === 0) {
        result = message;
      } else {
        result = message.replace(/\{(\d+)\}/g, function(match, rest) {
          const index = rest[0];
          return typeof args[index] !== "undefined" ? args[index] : match;
        });
      }
      return result;
    }
    function localize(data, message, ...args) {
      return _format2(message, args);
    }
    function localize2(data, message, ...args) {
      const res = _format2(message, args);
      return {
        original: res,
        value: res
      };
    }
    function getConfiguredDefaultLocale(_) {
      return void 0;
    }
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/util/vs/common/platform.js
var require_platform = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/util/vs/common/platform.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.isAndroid = exports2.isEdge = exports2.isSafari = exports2.isFirefox = exports2.isChrome = exports2.OS = exports2.setTimeout0 = exports2.setTimeout0IsFaster = exports2.translationsConfigFile = exports2.platformLocale = exports2.locale = exports2.Language = exports2.language = exports2.userAgent = exports2.platform = exports2.isCI = exports2.isMobile = exports2.isIOS = exports2.webWorkerOrigin = exports2.isWebWorker = exports2.isWeb = exports2.isElectron = exports2.isNative = exports2.isLinuxSnap = exports2.isLinux = exports2.isMacintosh = exports2.isWindows = exports2.LANGUAGE_DEFAULT = void 0;
    exports2.PlatformToString = PlatformToString;
    exports2.isLittleEndian = isLittleEndian;
    exports2.isBigSurOrNewer = isBigSurOrNewer;
    var nls = require_nls();
    exports2.LANGUAGE_DEFAULT = "en";
    var _isWindows2 = false;
    var _isMacintosh2 = false;
    var _isLinux2 = false;
    var _isLinuxSnap2 = false;
    var _isNative2 = false;
    var _isWeb2 = false;
    var _isElectron2 = false;
    var _isIOS2 = false;
    var _isCI2 = false;
    var _isMobile2 = false;
    var _locale2 = void 0;
    var _language2 = exports2.LANGUAGE_DEFAULT;
    var _platformLocale2 = exports2.LANGUAGE_DEFAULT;
    var _translationsConfigFile2 = void 0;
    var _userAgent2 = void 0;
    var $globalThis2 = globalThis;
    var nodeProcess2 = void 0;
    if (typeof $globalThis2.vscode !== "undefined" && typeof $globalThis2.vscode.process !== "undefined") {
      nodeProcess2 = $globalThis2.vscode.process;
    } else if (typeof process !== "undefined") {
      nodeProcess2 = process;
    }
    var isElectronProcess2 = typeof nodeProcess2?.versions?.electron === "string";
    var isElectronRenderer2 = isElectronProcess2 && nodeProcess2?.type === "renderer";
    if (typeof nodeProcess2 === "object") {
      _isWindows2 = nodeProcess2.platform === "win32";
      _isMacintosh2 = nodeProcess2.platform === "darwin";
      _isLinux2 = nodeProcess2.platform === "linux";
      _isLinuxSnap2 = _isLinux2 && !!nodeProcess2.env["SNAP"] && !!nodeProcess2.env["SNAP_REVISION"];
      _isElectron2 = isElectronProcess2;
      _isCI2 = !!nodeProcess2.env["CI"] || !!nodeProcess2.env["BUILD_ARTIFACTSTAGINGDIRECTORY"];
      _locale2 = exports2.LANGUAGE_DEFAULT;
      _language2 = exports2.LANGUAGE_DEFAULT;
      const rawNlsConfig = nodeProcess2.env["VSCODE_NLS_CONFIG"];
      if (rawNlsConfig) {
        try {
          const nlsConfig = JSON.parse(rawNlsConfig);
          const resolved = nlsConfig.availableLanguages["*"];
          _locale2 = nlsConfig.locale;
          _platformLocale2 = nlsConfig.osLocale;
          _language2 = resolved ? resolved : exports2.LANGUAGE_DEFAULT;
          _translationsConfigFile2 = nlsConfig._translationsConfigFile;
        } catch (e) {
        }
      }
      _isNative2 = true;
    } else if (typeof navigator === "object" && !isElectronRenderer2) {
      _userAgent2 = navigator.userAgent;
      _isWindows2 = _userAgent2.indexOf("Windows") >= 0;
      _isMacintosh2 = _userAgent2.indexOf("Macintosh") >= 0;
      _isIOS2 = (_userAgent2.indexOf("Macintosh") >= 0 || _userAgent2.indexOf("iPad") >= 0 || _userAgent2.indexOf("iPhone") >= 0) && !!navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
      _isLinux2 = _userAgent2.indexOf("Linux") >= 0;
      _isMobile2 = _userAgent2?.indexOf("Mobi") >= 0;
      _isWeb2 = true;
      const configuredLocale = nls.getConfiguredDefaultLocale(
        // This call _must_ be done in the file that calls `nls.getConfiguredDefaultLocale`
        // to ensure that the NLS AMD Loader plugin has been loaded and configured.
        // This is because the loader plugin decides what the default locale is based on
        // how it's able to resolve the strings.
        nls.localize({ key: "ensureLoaderPluginIsLoaded", comment: ["{Locked}"] }, "_")
      );
      _locale2 = configuredLocale || exports2.LANGUAGE_DEFAULT;
      _language2 = _locale2;
      _platformLocale2 = navigator.language;
    } else {
      console.error("Unable to resolve platform.");
    }
    function PlatformToString(platform2) {
      switch (platform2) {
        case 0:
          return "Web";
        case 1:
          return "Mac";
        case 2:
          return "Linux";
        case 3:
          return "Windows";
      }
    }
    var _platform2 = 0;
    if (_isMacintosh2) {
      _platform2 = 1;
    } else if (_isWindows2) {
      _platform2 = 3;
    } else if (_isLinux2) {
      _platform2 = 2;
    }
    exports2.isWindows = _isWindows2;
    exports2.isMacintosh = _isMacintosh2;
    exports2.isLinux = _isLinux2;
    exports2.isLinuxSnap = _isLinuxSnap2;
    exports2.isNative = _isNative2;
    exports2.isElectron = _isElectron2;
    exports2.isWeb = _isWeb2;
    exports2.isWebWorker = _isWeb2 && typeof $globalThis2.importScripts === "function";
    exports2.webWorkerOrigin = exports2.isWebWorker ? $globalThis2.origin : void 0;
    exports2.isIOS = _isIOS2;
    exports2.isMobile = _isMobile2;
    exports2.isCI = _isCI2;
    exports2.platform = _platform2;
    exports2.userAgent = _userAgent2;
    exports2.language = _language2;
    var Language2;
    (function(Language3) {
      function value() {
        return exports2.language;
      }
      Language3.value = value;
      function isDefaultVariant() {
        if (exports2.language.length === 2) {
          return exports2.language === "en";
        } else if (exports2.language.length >= 3) {
          return exports2.language[0] === "e" && exports2.language[1] === "n" && exports2.language[2] === "-";
        } else {
          return false;
        }
      }
      Language3.isDefaultVariant = isDefaultVariant;
      function isDefault() {
        return exports2.language === "en";
      }
      Language3.isDefault = isDefault;
    })(Language2 || (exports2.Language = Language2 = {}));
    exports2.locale = _locale2;
    exports2.platformLocale = _platformLocale2;
    exports2.translationsConfigFile = _translationsConfigFile2;
    exports2.setTimeout0IsFaster = typeof $globalThis2.postMessage === "function" && !$globalThis2.importScripts;
    exports2.setTimeout0 = (() => {
      if (exports2.setTimeout0IsFaster) {
        const pending = [];
        $globalThis2.addEventListener("message", (e) => {
          if (e.data && e.data.vscodeScheduleAsyncWork) {
            for (let i = 0, len = pending.length; i < len; i++) {
              const candidate = pending[i];
              if (candidate.id === e.data.vscodeScheduleAsyncWork) {
                pending.splice(i, 1);
                candidate.callback();
                return;
              }
            }
          }
        });
        let lastId = 0;
        return (callback) => {
          const myId = ++lastId;
          pending.push({
            id: myId,
            callback
          });
          $globalThis2.postMessage({ vscodeScheduleAsyncWork: myId }, "*");
        };
      }
      return (callback) => setTimeout(callback);
    })();
    exports2.OS = _isMacintosh2 || _isIOS2 ? 2 : _isWindows2 ? 1 : 3;
    var _isLittleEndian = true;
    var _isLittleEndianComputed = false;
    function isLittleEndian() {
      if (!_isLittleEndianComputed) {
        _isLittleEndianComputed = true;
        const test = new Uint8Array(2);
        test[0] = 1;
        test[1] = 2;
        const view = new Uint16Array(test.buffer);
        _isLittleEndian = view[0] === (2 << 8) + 1;
      }
      return _isLittleEndian;
    }
    exports2.isChrome = !!(exports2.userAgent && exports2.userAgent.indexOf("Chrome") >= 0);
    exports2.isFirefox = !!(exports2.userAgent && exports2.userAgent.indexOf("Firefox") >= 0);
    exports2.isSafari = !!(!exports2.isChrome && (exports2.userAgent && exports2.userAgent.indexOf("Safari") >= 0));
    exports2.isEdge = !!(exports2.userAgent && exports2.userAgent.indexOf("Edg/") >= 0);
    exports2.isAndroid = !!(exports2.userAgent && exports2.userAgent.indexOf("Android") >= 0);
    function isBigSurOrNewer(osVersion) {
      return parseFloat(osVersion) >= 20;
    }
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/util/vs/common/process.js
var require_process = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/util/vs/common/process.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.arch = exports2.platform = exports2.env = exports2.cwd = void 0;
    var platform_1 = require_platform();
    var safeProcess2;
    var vscodeGlobal2 = globalThis.vscode;
    if (typeof vscodeGlobal2 !== "undefined" && typeof vscodeGlobal2.process !== "undefined") {
      const sandboxProcess = vscodeGlobal2.process;
      safeProcess2 = {
        get platform() {
          return sandboxProcess.platform;
        },
        get arch() {
          return sandboxProcess.arch;
        },
        get env() {
          return sandboxProcess.env;
        },
        cwd() {
          return sandboxProcess.cwd();
        }
      };
    } else if (typeof process !== "undefined") {
      safeProcess2 = {
        get platform() {
          return process.platform;
        },
        get arch() {
          return process.arch;
        },
        get env() {
          return process.env;
        },
        cwd() {
          return process.env["VSCODE_CWD"] || process.cwd();
        }
      };
    } else {
      safeProcess2 = {
        // Supported
        get platform() {
          return platform_1.isWindows ? "win32" : platform_1.isMacintosh ? "darwin" : "linux";
        },
        get arch() {
          return void 0;
        },
        // Unsupported
        get env() {
          return {};
        },
        cwd() {
          return "/";
        }
      };
    }
    exports2.cwd = safeProcess2.cwd;
    exports2.env = safeProcess2.env;
    exports2.platform = safeProcess2.platform;
    exports2.arch = safeProcess2.arch;
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/util/vs/common/path.js
var require_path = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/util/vs/common/path.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.delimiter = exports2.sep = exports2.toNamespacedPath = exports2.parse = exports2.format = exports2.extname = exports2.basename = exports2.dirname = exports2.relative = exports2.resolve = exports2.join = exports2.isAbsolute = exports2.normalize = exports2.posix = exports2.win32 = void 0;
    var process2 = require_process();
    var CHAR_UPPERCASE_A2 = 65;
    var CHAR_LOWERCASE_A2 = 97;
    var CHAR_UPPERCASE_Z2 = 90;
    var CHAR_LOWERCASE_Z2 = 122;
    var CHAR_DOT2 = 46;
    var CHAR_FORWARD_SLASH2 = 47;
    var CHAR_BACKWARD_SLASH2 = 92;
    var CHAR_COLON2 = 58;
    var CHAR_QUESTION_MARK2 = 63;
    var ErrorInvalidArgType2 = class extends Error {
      code;
      constructor(name, expected, actual) {
        let determiner;
        if (typeof expected === "string" && expected.indexOf("not ") === 0) {
          determiner = "must not be";
          expected = expected.replace(/^not /, "");
        } else {
          determiner = "must be";
        }
        const type = name.indexOf(".") !== -1 ? "property" : "argument";
        let msg = `The "${name}" ${type} ${determiner} of type ${expected}`;
        msg += `. Received type ${typeof actual}`;
        super(msg);
        this.code = "ERR_INVALID_ARG_TYPE";
      }
    };
    function validateObject2(pathObject, name) {
      if (pathObject === null || typeof pathObject !== "object") {
        throw new ErrorInvalidArgType2(name, "Object", pathObject);
      }
    }
    function validateString2(value, name) {
      if (typeof value !== "string") {
        throw new ErrorInvalidArgType2(name, "string", value);
      }
    }
    var platformIsWin322 = process2.platform === "win32";
    function isPathSeparator3(code) {
      return code === CHAR_FORWARD_SLASH2 || code === CHAR_BACKWARD_SLASH2;
    }
    function isPosixPathSeparator2(code) {
      return code === CHAR_FORWARD_SLASH2;
    }
    function isWindowsDeviceRoot2(code) {
      return code >= CHAR_UPPERCASE_A2 && code <= CHAR_UPPERCASE_Z2 || code >= CHAR_LOWERCASE_A2 && code <= CHAR_LOWERCASE_Z2;
    }
    function normalizeString2(path2, allowAboveRoot, separator, isPathSeparator4) {
      let res = "";
      let lastSegmentLength = 0;
      let lastSlash = -1;
      let dots = 0;
      let code = 0;
      for (let i = 0; i <= path2.length; ++i) {
        if (i < path2.length) {
          code = path2.charCodeAt(i);
        } else if (isPathSeparator4(code)) {
          break;
        } else {
          code = CHAR_FORWARD_SLASH2;
        }
        if (isPathSeparator4(code)) {
          if (lastSlash === i - 1 || dots === 1) {
          } else if (dots === 2) {
            if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT2 || res.charCodeAt(res.length - 2) !== CHAR_DOT2) {
              if (res.length > 2) {
                const lastSlashIndex = res.lastIndexOf(separator);
                if (lastSlashIndex === -1) {
                  res = "";
                  lastSegmentLength = 0;
                } else {
                  res = res.slice(0, lastSlashIndex);
                  lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
                }
                lastSlash = i;
                dots = 0;
                continue;
              } else if (res.length !== 0) {
                res = "";
                lastSegmentLength = 0;
                lastSlash = i;
                dots = 0;
                continue;
              }
            }
            if (allowAboveRoot) {
              res += res.length > 0 ? `${separator}..` : "..";
              lastSegmentLength = 2;
            }
          } else {
            if (res.length > 0) {
              res += `${separator}${path2.slice(lastSlash + 1, i)}`;
            } else {
              res = path2.slice(lastSlash + 1, i);
            }
            lastSegmentLength = i - lastSlash - 1;
          }
          lastSlash = i;
          dots = 0;
        } else if (code === CHAR_DOT2 && dots !== -1) {
          ++dots;
        } else {
          dots = -1;
        }
      }
      return res;
    }
    function _format2(sep2, pathObject) {
      validateObject2(pathObject, "pathObject");
      const dir = pathObject.dir || pathObject.root;
      const base = pathObject.base || `${pathObject.name || ""}${pathObject.ext || ""}`;
      if (!dir) {
        return base;
      }
      return dir === pathObject.root ? `${dir}${base}` : `${dir}${sep2}${base}`;
    }
    exports2.win32 = {
      // path.resolve([from ...], to)
      resolve(...pathSegments) {
        let resolvedDevice = "";
        let resolvedTail = "";
        let resolvedAbsolute = false;
        for (let i = pathSegments.length - 1; i >= -1; i--) {
          let path2;
          if (i >= 0) {
            path2 = pathSegments[i];
            validateString2(path2, "path");
            if (path2.length === 0) {
              continue;
            }
          } else if (resolvedDevice.length === 0) {
            path2 = process2.cwd();
          } else {
            path2 = process2.env[`=${resolvedDevice}`] || process2.cwd();
            if (path2 === void 0 || path2.slice(0, 2).toLowerCase() !== resolvedDevice.toLowerCase() && path2.charCodeAt(2) === CHAR_BACKWARD_SLASH2) {
              path2 = `${resolvedDevice}\\`;
            }
          }
          const len = path2.length;
          let rootEnd = 0;
          let device = "";
          let isAbsolute2 = false;
          const code = path2.charCodeAt(0);
          if (len === 1) {
            if (isPathSeparator3(code)) {
              rootEnd = 1;
              isAbsolute2 = true;
            }
          } else if (isPathSeparator3(code)) {
            isAbsolute2 = true;
            if (isPathSeparator3(path2.charCodeAt(1))) {
              let j = 2;
              let last = j;
              while (j < len && !isPathSeparator3(path2.charCodeAt(j))) {
                j++;
              }
              if (j < len && j !== last) {
                const firstPart = path2.slice(last, j);
                last = j;
                while (j < len && isPathSeparator3(path2.charCodeAt(j))) {
                  j++;
                }
                if (j < len && j !== last) {
                  last = j;
                  while (j < len && !isPathSeparator3(path2.charCodeAt(j))) {
                    j++;
                  }
                  if (j === len || j !== last) {
                    device = `\\\\${firstPart}\\${path2.slice(last, j)}`;
                    rootEnd = j;
                  }
                }
              }
            } else {
              rootEnd = 1;
            }
          } else if (isWindowsDeviceRoot2(code) && path2.charCodeAt(1) === CHAR_COLON2) {
            device = path2.slice(0, 2);
            rootEnd = 2;
            if (len > 2 && isPathSeparator3(path2.charCodeAt(2))) {
              isAbsolute2 = true;
              rootEnd = 3;
            }
          }
          if (device.length > 0) {
            if (resolvedDevice.length > 0) {
              if (device.toLowerCase() !== resolvedDevice.toLowerCase()) {
                continue;
              }
            } else {
              resolvedDevice = device;
            }
          }
          if (resolvedAbsolute) {
            if (resolvedDevice.length > 0) {
              break;
            }
          } else {
            resolvedTail = `${path2.slice(rootEnd)}\\${resolvedTail}`;
            resolvedAbsolute = isAbsolute2;
            if (isAbsolute2 && resolvedDevice.length > 0) {
              break;
            }
          }
        }
        resolvedTail = normalizeString2(resolvedTail, !resolvedAbsolute, "\\", isPathSeparator3);
        return resolvedAbsolute ? `${resolvedDevice}\\${resolvedTail}` : `${resolvedDevice}${resolvedTail}` || ".";
      },
      normalize(path2) {
        validateString2(path2, "path");
        const len = path2.length;
        if (len === 0) {
          return ".";
        }
        let rootEnd = 0;
        let device;
        let isAbsolute2 = false;
        const code = path2.charCodeAt(0);
        if (len === 1) {
          return isPosixPathSeparator2(code) ? "\\" : path2;
        }
        if (isPathSeparator3(code)) {
          isAbsolute2 = true;
          if (isPathSeparator3(path2.charCodeAt(1))) {
            let j = 2;
            let last = j;
            while (j < len && !isPathSeparator3(path2.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              const firstPart = path2.slice(last, j);
              last = j;
              while (j < len && isPathSeparator3(path2.charCodeAt(j))) {
                j++;
              }
              if (j < len && j !== last) {
                last = j;
                while (j < len && !isPathSeparator3(path2.charCodeAt(j))) {
                  j++;
                }
                if (j === len) {
                  return `\\\\${firstPart}\\${path2.slice(last)}\\`;
                }
                if (j !== last) {
                  device = `\\\\${firstPart}\\${path2.slice(last, j)}`;
                  rootEnd = j;
                }
              }
            }
          } else {
            rootEnd = 1;
          }
        } else if (isWindowsDeviceRoot2(code) && path2.charCodeAt(1) === CHAR_COLON2) {
          device = path2.slice(0, 2);
          rootEnd = 2;
          if (len > 2 && isPathSeparator3(path2.charCodeAt(2))) {
            isAbsolute2 = true;
            rootEnd = 3;
          }
        }
        let tail = rootEnd < len ? normalizeString2(path2.slice(rootEnd), !isAbsolute2, "\\", isPathSeparator3) : "";
        if (tail.length === 0 && !isAbsolute2) {
          tail = ".";
        }
        if (tail.length > 0 && isPathSeparator3(path2.charCodeAt(len - 1))) {
          tail += "\\";
        }
        if (device === void 0) {
          return isAbsolute2 ? `\\${tail}` : tail;
        }
        return isAbsolute2 ? `${device}\\${tail}` : `${device}${tail}`;
      },
      isAbsolute(path2) {
        validateString2(path2, "path");
        const len = path2.length;
        if (len === 0) {
          return false;
        }
        const code = path2.charCodeAt(0);
        return isPathSeparator3(code) || // Possible device root
        len > 2 && isWindowsDeviceRoot2(code) && path2.charCodeAt(1) === CHAR_COLON2 && isPathSeparator3(path2.charCodeAt(2));
      },
      join(...paths) {
        if (paths.length === 0) {
          return ".";
        }
        let joined;
        let firstPart;
        for (let i = 0; i < paths.length; ++i) {
          const arg = paths[i];
          validateString2(arg, "path");
          if (arg.length > 0) {
            if (joined === void 0) {
              joined = firstPart = arg;
            } else {
              joined += `\\${arg}`;
            }
          }
        }
        if (joined === void 0) {
          return ".";
        }
        let needsReplace = true;
        let slashCount = 0;
        if (typeof firstPart === "string" && isPathSeparator3(firstPart.charCodeAt(0))) {
          ++slashCount;
          const firstLen = firstPart.length;
          if (firstLen > 1 && isPathSeparator3(firstPart.charCodeAt(1))) {
            ++slashCount;
            if (firstLen > 2) {
              if (isPathSeparator3(firstPart.charCodeAt(2))) {
                ++slashCount;
              } else {
                needsReplace = false;
              }
            }
          }
        }
        if (needsReplace) {
          while (slashCount < joined.length && isPathSeparator3(joined.charCodeAt(slashCount))) {
            slashCount++;
          }
          if (slashCount >= 2) {
            joined = `\\${joined.slice(slashCount)}`;
          }
        }
        return exports2.win32.normalize(joined);
      },
      // It will solve the relative path from `from` to `to`, for instance:
      //  from = 'C:\\orandea\\test\\aaa'
      //  to = 'C:\\orandea\\impl\\bbb'
      // The output of the function should be: '..\\..\\impl\\bbb'
      relative(from, to) {
        validateString2(from, "from");
        validateString2(to, "to");
        if (from === to) {
          return "";
        }
        const fromOrig = exports2.win32.resolve(from);
        const toOrig = exports2.win32.resolve(to);
        if (fromOrig === toOrig) {
          return "";
        }
        from = fromOrig.toLowerCase();
        to = toOrig.toLowerCase();
        if (from === to) {
          return "";
        }
        let fromStart = 0;
        while (fromStart < from.length && from.charCodeAt(fromStart) === CHAR_BACKWARD_SLASH2) {
          fromStart++;
        }
        let fromEnd = from.length;
        while (fromEnd - 1 > fromStart && from.charCodeAt(fromEnd - 1) === CHAR_BACKWARD_SLASH2) {
          fromEnd--;
        }
        const fromLen = fromEnd - fromStart;
        let toStart = 0;
        while (toStart < to.length && to.charCodeAt(toStart) === CHAR_BACKWARD_SLASH2) {
          toStart++;
        }
        let toEnd = to.length;
        while (toEnd - 1 > toStart && to.charCodeAt(toEnd - 1) === CHAR_BACKWARD_SLASH2) {
          toEnd--;
        }
        const toLen = toEnd - toStart;
        const length = fromLen < toLen ? fromLen : toLen;
        let lastCommonSep = -1;
        let i = 0;
        for (; i < length; i++) {
          const fromCode = from.charCodeAt(fromStart + i);
          if (fromCode !== to.charCodeAt(toStart + i)) {
            break;
          } else if (fromCode === CHAR_BACKWARD_SLASH2) {
            lastCommonSep = i;
          }
        }
        if (i !== length) {
          if (lastCommonSep === -1) {
            return toOrig;
          }
        } else {
          if (toLen > length) {
            if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH2) {
              return toOrig.slice(toStart + i + 1);
            }
            if (i === 2) {
              return toOrig.slice(toStart + i);
            }
          }
          if (fromLen > length) {
            if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH2) {
              lastCommonSep = i;
            } else if (i === 2) {
              lastCommonSep = 3;
            }
          }
          if (lastCommonSep === -1) {
            lastCommonSep = 0;
          }
        }
        let out = "";
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
          if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH2) {
            out += out.length === 0 ? ".." : "\\..";
          }
        }
        toStart += lastCommonSep;
        if (out.length > 0) {
          return `${out}${toOrig.slice(toStart, toEnd)}`;
        }
        if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH2) {
          ++toStart;
        }
        return toOrig.slice(toStart, toEnd);
      },
      toNamespacedPath(path2) {
        if (typeof path2 !== "string" || path2.length === 0) {
          return path2;
        }
        const resolvedPath = exports2.win32.resolve(path2);
        if (resolvedPath.length <= 2) {
          return path2;
        }
        if (resolvedPath.charCodeAt(0) === CHAR_BACKWARD_SLASH2) {
          if (resolvedPath.charCodeAt(1) === CHAR_BACKWARD_SLASH2) {
            const code = resolvedPath.charCodeAt(2);
            if (code !== CHAR_QUESTION_MARK2 && code !== CHAR_DOT2) {
              return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
            }
          }
        } else if (isWindowsDeviceRoot2(resolvedPath.charCodeAt(0)) && resolvedPath.charCodeAt(1) === CHAR_COLON2 && resolvedPath.charCodeAt(2) === CHAR_BACKWARD_SLASH2) {
          return `\\\\?\\${resolvedPath}`;
        }
        return path2;
      },
      dirname(path2) {
        validateString2(path2, "path");
        const len = path2.length;
        if (len === 0) {
          return ".";
        }
        let rootEnd = -1;
        let offset = 0;
        const code = path2.charCodeAt(0);
        if (len === 1) {
          return isPathSeparator3(code) ? path2 : ".";
        }
        if (isPathSeparator3(code)) {
          rootEnd = offset = 1;
          if (isPathSeparator3(path2.charCodeAt(1))) {
            let j = 2;
            let last = j;
            while (j < len && !isPathSeparator3(path2.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              last = j;
              while (j < len && isPathSeparator3(path2.charCodeAt(j))) {
                j++;
              }
              if (j < len && j !== last) {
                last = j;
                while (j < len && !isPathSeparator3(path2.charCodeAt(j))) {
                  j++;
                }
                if (j === len) {
                  return path2;
                }
                if (j !== last) {
                  rootEnd = offset = j + 1;
                }
              }
            }
          }
        } else if (isWindowsDeviceRoot2(code) && path2.charCodeAt(1) === CHAR_COLON2) {
          rootEnd = len > 2 && isPathSeparator3(path2.charCodeAt(2)) ? 3 : 2;
          offset = rootEnd;
        }
        let end = -1;
        let matchedSlash = true;
        for (let i = len - 1; i >= offset; --i) {
          if (isPathSeparator3(path2.charCodeAt(i))) {
            if (!matchedSlash) {
              end = i;
              break;
            }
          } else {
            matchedSlash = false;
          }
        }
        if (end === -1) {
          if (rootEnd === -1) {
            return ".";
          }
          end = rootEnd;
        }
        return path2.slice(0, end);
      },
      basename(path2, ext) {
        if (ext !== void 0) {
          validateString2(ext, "ext");
        }
        validateString2(path2, "path");
        let start = 0;
        let end = -1;
        let matchedSlash = true;
        let i;
        if (path2.length >= 2 && isWindowsDeviceRoot2(path2.charCodeAt(0)) && path2.charCodeAt(1) === CHAR_COLON2) {
          start = 2;
        }
        if (ext !== void 0 && ext.length > 0 && ext.length <= path2.length) {
          if (ext === path2) {
            return "";
          }
          let extIdx = ext.length - 1;
          let firstNonSlashEnd = -1;
          for (i = path2.length - 1; i >= start; --i) {
            const code = path2.charCodeAt(i);
            if (isPathSeparator3(code)) {
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else {
              if (firstNonSlashEnd === -1) {
                matchedSlash = false;
                firstNonSlashEnd = i + 1;
              }
              if (extIdx >= 0) {
                if (code === ext.charCodeAt(extIdx)) {
                  if (--extIdx === -1) {
                    end = i;
                  }
                } else {
                  extIdx = -1;
                  end = firstNonSlashEnd;
                }
              }
            }
          }
          if (start === end) {
            end = firstNonSlashEnd;
          } else if (end === -1) {
            end = path2.length;
          }
          return path2.slice(start, end);
        }
        for (i = path2.length - 1; i >= start; --i) {
          if (isPathSeparator3(path2.charCodeAt(i))) {
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
        }
        if (end === -1) {
          return "";
        }
        return path2.slice(start, end);
      },
      extname(path2) {
        validateString2(path2, "path");
        let start = 0;
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        let preDotState = 0;
        if (path2.length >= 2 && path2.charCodeAt(1) === CHAR_COLON2 && isWindowsDeviceRoot2(path2.charCodeAt(0))) {
          start = startPart = 2;
        }
        for (let i = path2.length - 1; i >= start; --i) {
          const code = path2.charCodeAt(i);
          if (isPathSeparator3(code)) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === CHAR_DOT2) {
            if (startDot === -1) {
              startDot = i;
            } else if (preDotState !== 1) {
              preDotState = 1;
            }
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          return "";
        }
        return path2.slice(startDot, end);
      },
      format: _format2.bind(null, "\\"),
      parse(path2) {
        validateString2(path2, "path");
        const ret = { root: "", dir: "", base: "", ext: "", name: "" };
        if (path2.length === 0) {
          return ret;
        }
        const len = path2.length;
        let rootEnd = 0;
        let code = path2.charCodeAt(0);
        if (len === 1) {
          if (isPathSeparator3(code)) {
            ret.root = ret.dir = path2;
            return ret;
          }
          ret.base = ret.name = path2;
          return ret;
        }
        if (isPathSeparator3(code)) {
          rootEnd = 1;
          if (isPathSeparator3(path2.charCodeAt(1))) {
            let j = 2;
            let last = j;
            while (j < len && !isPathSeparator3(path2.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              last = j;
              while (j < len && isPathSeparator3(path2.charCodeAt(j))) {
                j++;
              }
              if (j < len && j !== last) {
                last = j;
                while (j < len && !isPathSeparator3(path2.charCodeAt(j))) {
                  j++;
                }
                if (j === len) {
                  rootEnd = j;
                } else if (j !== last) {
                  rootEnd = j + 1;
                }
              }
            }
          }
        } else if (isWindowsDeviceRoot2(code) && path2.charCodeAt(1) === CHAR_COLON2) {
          if (len <= 2) {
            ret.root = ret.dir = path2;
            return ret;
          }
          rootEnd = 2;
          if (isPathSeparator3(path2.charCodeAt(2))) {
            if (len === 3) {
              ret.root = ret.dir = path2;
              return ret;
            }
            rootEnd = 3;
          }
        }
        if (rootEnd > 0) {
          ret.root = path2.slice(0, rootEnd);
        }
        let startDot = -1;
        let startPart = rootEnd;
        let end = -1;
        let matchedSlash = true;
        let i = path2.length - 1;
        let preDotState = 0;
        for (; i >= rootEnd; --i) {
          code = path2.charCodeAt(i);
          if (isPathSeparator3(code)) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === CHAR_DOT2) {
            if (startDot === -1) {
              startDot = i;
            } else if (preDotState !== 1) {
              preDotState = 1;
            }
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (end !== -1) {
          if (startDot === -1 || // We saw a non-dot character immediately before the dot
          preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
          preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
            ret.base = ret.name = path2.slice(startPart, end);
          } else {
            ret.name = path2.slice(startPart, startDot);
            ret.base = path2.slice(startPart, end);
            ret.ext = path2.slice(startDot, end);
          }
        }
        if (startPart > 0 && startPart !== rootEnd) {
          ret.dir = path2.slice(0, startPart - 1);
        } else {
          ret.dir = ret.root;
        }
        return ret;
      },
      sep: "\\",
      delimiter: ";",
      win32: null,
      posix: null
    };
    var posixCwd2 = (() => {
      if (platformIsWin322) {
        const regexp = /\\/g;
        return () => {
          const cwd2 = process2.cwd().replace(regexp, "/");
          return cwd2.slice(cwd2.indexOf("/"));
        };
      }
      return () => process2.cwd();
    })();
    exports2.posix = {
      // path.resolve([from ...], to)
      resolve(...pathSegments) {
        let resolvedPath = "";
        let resolvedAbsolute = false;
        for (let i = pathSegments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
          const path2 = i >= 0 ? pathSegments[i] : posixCwd2();
          validateString2(path2, "path");
          if (path2.length === 0) {
            continue;
          }
          resolvedPath = `${path2}/${resolvedPath}`;
          resolvedAbsolute = path2.charCodeAt(0) === CHAR_FORWARD_SLASH2;
        }
        resolvedPath = normalizeString2(resolvedPath, !resolvedAbsolute, "/", isPosixPathSeparator2);
        if (resolvedAbsolute) {
          return `/${resolvedPath}`;
        }
        return resolvedPath.length > 0 ? resolvedPath : ".";
      },
      normalize(path2) {
        validateString2(path2, "path");
        if (path2.length === 0) {
          return ".";
        }
        const isAbsolute2 = path2.charCodeAt(0) === CHAR_FORWARD_SLASH2;
        const trailingSeparator = path2.charCodeAt(path2.length - 1) === CHAR_FORWARD_SLASH2;
        path2 = normalizeString2(path2, !isAbsolute2, "/", isPosixPathSeparator2);
        if (path2.length === 0) {
          if (isAbsolute2) {
            return "/";
          }
          return trailingSeparator ? "./" : ".";
        }
        if (trailingSeparator) {
          path2 += "/";
        }
        return isAbsolute2 ? `/${path2}` : path2;
      },
      isAbsolute(path2) {
        validateString2(path2, "path");
        return path2.length > 0 && path2.charCodeAt(0) === CHAR_FORWARD_SLASH2;
      },
      join(...paths) {
        if (paths.length === 0) {
          return ".";
        }
        let joined;
        for (let i = 0; i < paths.length; ++i) {
          const arg = paths[i];
          validateString2(arg, "path");
          if (arg.length > 0) {
            if (joined === void 0) {
              joined = arg;
            } else {
              joined += `/${arg}`;
            }
          }
        }
        if (joined === void 0) {
          return ".";
        }
        return exports2.posix.normalize(joined);
      },
      relative(from, to) {
        validateString2(from, "from");
        validateString2(to, "to");
        if (from === to) {
          return "";
        }
        from = exports2.posix.resolve(from);
        to = exports2.posix.resolve(to);
        if (from === to) {
          return "";
        }
        const fromStart = 1;
        const fromEnd = from.length;
        const fromLen = fromEnd - fromStart;
        const toStart = 1;
        const toLen = to.length - toStart;
        const length = fromLen < toLen ? fromLen : toLen;
        let lastCommonSep = -1;
        let i = 0;
        for (; i < length; i++) {
          const fromCode = from.charCodeAt(fromStart + i);
          if (fromCode !== to.charCodeAt(toStart + i)) {
            break;
          } else if (fromCode === CHAR_FORWARD_SLASH2) {
            lastCommonSep = i;
          }
        }
        if (i === length) {
          if (toLen > length) {
            if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH2) {
              return to.slice(toStart + i + 1);
            }
            if (i === 0) {
              return to.slice(toStart + i);
            }
          } else if (fromLen > length) {
            if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH2) {
              lastCommonSep = i;
            } else if (i === 0) {
              lastCommonSep = 0;
            }
          }
        }
        let out = "";
        for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
          if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH2) {
            out += out.length === 0 ? ".." : "/..";
          }
        }
        return `${out}${to.slice(toStart + lastCommonSep)}`;
      },
      toNamespacedPath(path2) {
        return path2;
      },
      dirname(path2) {
        validateString2(path2, "path");
        if (path2.length === 0) {
          return ".";
        }
        const hasRoot = path2.charCodeAt(0) === CHAR_FORWARD_SLASH2;
        let end = -1;
        let matchedSlash = true;
        for (let i = path2.length - 1; i >= 1; --i) {
          if (path2.charCodeAt(i) === CHAR_FORWARD_SLASH2) {
            if (!matchedSlash) {
              end = i;
              break;
            }
          } else {
            matchedSlash = false;
          }
        }
        if (end === -1) {
          return hasRoot ? "/" : ".";
        }
        if (hasRoot && end === 1) {
          return "//";
        }
        return path2.slice(0, end);
      },
      basename(path2, ext) {
        if (ext !== void 0) {
          validateString2(ext, "ext");
        }
        validateString2(path2, "path");
        let start = 0;
        let end = -1;
        let matchedSlash = true;
        let i;
        if (ext !== void 0 && ext.length > 0 && ext.length <= path2.length) {
          if (ext === path2) {
            return "";
          }
          let extIdx = ext.length - 1;
          let firstNonSlashEnd = -1;
          for (i = path2.length - 1; i >= 0; --i) {
            const code = path2.charCodeAt(i);
            if (code === CHAR_FORWARD_SLASH2) {
              if (!matchedSlash) {
                start = i + 1;
                break;
              }
            } else {
              if (firstNonSlashEnd === -1) {
                matchedSlash = false;
                firstNonSlashEnd = i + 1;
              }
              if (extIdx >= 0) {
                if (code === ext.charCodeAt(extIdx)) {
                  if (--extIdx === -1) {
                    end = i;
                  }
                } else {
                  extIdx = -1;
                  end = firstNonSlashEnd;
                }
              }
            }
          }
          if (start === end) {
            end = firstNonSlashEnd;
          } else if (end === -1) {
            end = path2.length;
          }
          return path2.slice(start, end);
        }
        for (i = path2.length - 1; i >= 0; --i) {
          if (path2.charCodeAt(i) === CHAR_FORWARD_SLASH2) {
            if (!matchedSlash) {
              start = i + 1;
              break;
            }
          } else if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
        }
        if (end === -1) {
          return "";
        }
        return path2.slice(start, end);
      },
      extname(path2) {
        validateString2(path2, "path");
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        let preDotState = 0;
        for (let i = path2.length - 1; i >= 0; --i) {
          const code = path2.charCodeAt(i);
          if (code === CHAR_FORWARD_SLASH2) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === CHAR_DOT2) {
            if (startDot === -1) {
              startDot = i;
            } else if (preDotState !== 1) {
              preDotState = 1;
            }
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
        preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
        preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
          return "";
        }
        return path2.slice(startDot, end);
      },
      format: _format2.bind(null, "/"),
      parse(path2) {
        validateString2(path2, "path");
        const ret = { root: "", dir: "", base: "", ext: "", name: "" };
        if (path2.length === 0) {
          return ret;
        }
        const isAbsolute2 = path2.charCodeAt(0) === CHAR_FORWARD_SLASH2;
        let start;
        if (isAbsolute2) {
          ret.root = "/";
          start = 1;
        } else {
          start = 0;
        }
        let startDot = -1;
        let startPart = 0;
        let end = -1;
        let matchedSlash = true;
        let i = path2.length - 1;
        let preDotState = 0;
        for (; i >= start; --i) {
          const code = path2.charCodeAt(i);
          if (code === CHAR_FORWARD_SLASH2) {
            if (!matchedSlash) {
              startPart = i + 1;
              break;
            }
            continue;
          }
          if (end === -1) {
            matchedSlash = false;
            end = i + 1;
          }
          if (code === CHAR_DOT2) {
            if (startDot === -1) {
              startDot = i;
            } else if (preDotState !== 1) {
              preDotState = 1;
            }
          } else if (startDot !== -1) {
            preDotState = -1;
          }
        }
        if (end !== -1) {
          const start2 = startPart === 0 && isAbsolute2 ? 1 : startPart;
          if (startDot === -1 || // We saw a non-dot character immediately before the dot
          preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
          preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
            ret.base = ret.name = path2.slice(start2, end);
          } else {
            ret.name = path2.slice(start2, startDot);
            ret.base = path2.slice(start2, end);
            ret.ext = path2.slice(startDot, end);
          }
        }
        if (startPart > 0) {
          ret.dir = path2.slice(0, startPart - 1);
        } else if (isAbsolute2) {
          ret.dir = "/";
        }
        return ret;
      },
      sep: "/",
      delimiter: ":",
      win32: null,
      posix: null
    };
    exports2.posix.win32 = exports2.win32.win32 = exports2.win32;
    exports2.posix.posix = exports2.win32.posix = exports2.posix;
    exports2.normalize = platformIsWin322 ? exports2.win32.normalize : exports2.posix.normalize;
    exports2.isAbsolute = platformIsWin322 ? exports2.win32.isAbsolute : exports2.posix.isAbsolute;
    exports2.join = platformIsWin322 ? exports2.win32.join : exports2.posix.join;
    exports2.resolve = platformIsWin322 ? exports2.win32.resolve : exports2.posix.resolve;
    exports2.relative = platformIsWin322 ? exports2.win32.relative : exports2.posix.relative;
    exports2.dirname = platformIsWin322 ? exports2.win32.dirname : exports2.posix.dirname;
    exports2.basename = platformIsWin322 ? exports2.win32.basename : exports2.posix.basename;
    exports2.extname = platformIsWin322 ? exports2.win32.extname : exports2.posix.extname;
    exports2.format = platformIsWin322 ? exports2.win32.format : exports2.posix.format;
    exports2.parse = platformIsWin322 ? exports2.win32.parse : exports2.posix.parse;
    exports2.toNamespacedPath = platformIsWin322 ? exports2.win32.toNamespacedPath : exports2.posix.toNamespacedPath;
    exports2.sep = platformIsWin322 ? exports2.win32.sep : exports2.posix.sep;
    exports2.delimiter = platformIsWin322 ? exports2.win32.delimiter : exports2.posix.delimiter;
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/util/vs/common/uri.js
var require_uri = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/util/vs/common/uri.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.URI = void 0;
    exports2.isUriComponents = isUriComponents;
    exports2.uriToFsPath = uriToFsPath2;
    var paths = require_path();
    var platform_1 = require_platform();
    var _schemePattern2 = /^\w[\w\d+.-]*$/;
    var _singleSlashStart2 = /^\//;
    var _doubleSlashStart2 = /^\/\//;
    function _validateUri2(ret, _strict) {
      if (!ret.scheme && _strict) {
        throw new Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${ret.authority}", path: "${ret.path}", query: "${ret.query}", fragment: "${ret.fragment}"}`);
      }
      if (ret.scheme && !_schemePattern2.test(ret.scheme)) {
        throw new Error("[UriError]: Scheme contains illegal characters.");
      }
      if (ret.path) {
        if (ret.authority) {
          if (!_singleSlashStart2.test(ret.path)) {
            throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
          }
        } else {
          if (_doubleSlashStart2.test(ret.path)) {
            throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
          }
        }
      }
    }
    function _schemeFix2(scheme, _strict) {
      if (!scheme && !_strict) {
        return "file";
      }
      return scheme;
    }
    function _referenceResolution2(scheme, path2) {
      switch (scheme) {
        case "https":
        case "http":
        case "file":
          if (!path2) {
            path2 = _slash2;
          } else if (path2[0] !== _slash2) {
            path2 = _slash2 + path2;
          }
          break;
      }
      return path2;
    }
    var _empty2 = "";
    var _slash2 = "/";
    var _regexp2 = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
    var URI2 = class _URI {
      static isUri(thing) {
        if (thing instanceof _URI) {
          return true;
        }
        if (!thing) {
          return false;
        }
        return typeof thing.authority === "string" && typeof thing.fragment === "string" && typeof thing.path === "string" && typeof thing.query === "string" && typeof thing.scheme === "string" && typeof thing.fsPath === "string" && typeof thing.with === "function" && typeof thing.toString === "function";
      }
      /**
       * scheme is the 'http' part of 'http://www.example.com/some/path?query#fragment'.
       * The part before the first colon.
       */
      scheme;
      /**
       * authority is the 'www.example.com' part of 'http://www.example.com/some/path?query#fragment'.
       * The part between the first double slashes and the next slash.
       */
      authority;
      /**
       * path is the '/some/path' part of 'http://www.example.com/some/path?query#fragment'.
       */
      path;
      /**
       * query is the 'query' part of 'http://www.example.com/some/path?query#fragment'.
       */
      query;
      /**
       * fragment is the 'fragment' part of 'http://www.example.com/some/path?query#fragment'.
       */
      fragment;
      /**
       * @internal
       */
      constructor(schemeOrData, authority, path2, query, fragment, _strict = false) {
        if (typeof schemeOrData === "object") {
          this.scheme = schemeOrData.scheme || _empty2;
          this.authority = schemeOrData.authority || _empty2;
          this.path = schemeOrData.path || _empty2;
          this.query = schemeOrData.query || _empty2;
          this.fragment = schemeOrData.fragment || _empty2;
        } else {
          this.scheme = _schemeFix2(schemeOrData, _strict);
          this.authority = authority || _empty2;
          this.path = _referenceResolution2(this.scheme, path2 || _empty2);
          this.query = query || _empty2;
          this.fragment = fragment || _empty2;
          _validateUri2(this, _strict);
        }
      }
      // ---- filesystem path -----------------------
      /**
       * Returns a string representing the corresponding file system path of this URI.
       * Will handle UNC paths, normalizes windows drive letters to lower-case, and uses the
       * platform specific path separator.
       *
       * * Will *not* validate the path for invalid characters and semantics.
       * * Will *not* look at the scheme of this URI.
       * * The result shall *not* be used for display purposes but for accessing a file on disk.
       *
       *
       * The *difference* to `URI#path` is the use of the platform specific separator and the handling
       * of UNC paths. See the below sample of a file-uri with an authority (UNC path).
       *
       * ```ts
          const u = URI.parse('file://server/c$/folder/file.txt')
          u.authority === 'server'
          u.path === '/shares/c$/file.txt'
          u.fsPath === '\\server\c$\folder\file.txt'
      ```
       *
       * Using `URI#path` to read a file (using fs-apis) would not be enough because parts of the path,
       * namely the server name, would be missing. Therefore `URI#fsPath` exists - it's sugar to ease working
       * with URIs that represent files on disk (`file` scheme).
       */
      get fsPath() {
        return uriToFsPath2(this, false);
      }
      // ---- modify to new -------------------------
      with(change) {
        if (!change) {
          return this;
        }
        let { scheme, authority, path: path2, query, fragment } = change;
        if (scheme === void 0) {
          scheme = this.scheme;
        } else if (scheme === null) {
          scheme = _empty2;
        }
        if (authority === void 0) {
          authority = this.authority;
        } else if (authority === null) {
          authority = _empty2;
        }
        if (path2 === void 0) {
          path2 = this.path;
        } else if (path2 === null) {
          path2 = _empty2;
        }
        if (query === void 0) {
          query = this.query;
        } else if (query === null) {
          query = _empty2;
        }
        if (fragment === void 0) {
          fragment = this.fragment;
        } else if (fragment === null) {
          fragment = _empty2;
        }
        if (scheme === this.scheme && authority === this.authority && path2 === this.path && query === this.query && fragment === this.fragment) {
          return this;
        }
        return new Uri2(scheme, authority, path2, query, fragment);
      }
      // ---- parse & validate ------------------------
      /**
       * Creates a new URI from a string, e.g. `http://www.example.com/some/path`,
       * `file:///usr/home`, or `scheme:with/path`.
       *
       * @param value A string which represents an URI (see `URI#toString`).
       */
      static parse(value, _strict = false) {
        const match = _regexp2.exec(value);
        if (!match) {
          return new Uri2(_empty2, _empty2, _empty2, _empty2, _empty2);
        }
        return new Uri2(match[2] || _empty2, percentDecode2(match[4] || _empty2), percentDecode2(match[5] || _empty2), percentDecode2(match[7] || _empty2), percentDecode2(match[9] || _empty2), _strict);
      }
      /**
       * Creates a new URI from a file system path, e.g. `c:\my\files`,
       * `/usr/home`, or `\\server\share\some\path`.
       *
       * The *difference* between `URI#parse` and `URI#file` is that the latter treats the argument
       * as path, not as stringified-uri. E.g. `URI.file(path)` is **not the same as**
       * `URI.parse('file://' + path)` because the path might contain characters that are
       * interpreted (# and ?). See the following sample:
       * ```ts
      const good = URI.file('/coding/c#/project1');
      good.scheme === 'file';
      good.path === '/coding/c#/project1';
      good.fragment === '';
      const bad = URI.parse('file://' + '/coding/c#/project1');
      bad.scheme === 'file';
      bad.path === '/coding/c'; // path is now broken
      bad.fragment === '/project1';
      ```
       *
       * @param path A file system path (see `URI#fsPath`)
       */
      static file(path2) {
        let authority = _empty2;
        if (platform_1.isWindows) {
          path2 = path2.replace(/\\/g, _slash2);
        }
        if (path2[0] === _slash2 && path2[1] === _slash2) {
          const idx = path2.indexOf(_slash2, 2);
          if (idx === -1) {
            authority = path2.substring(2);
            path2 = _slash2;
          } else {
            authority = path2.substring(2, idx);
            path2 = path2.substring(idx) || _slash2;
          }
        }
        return new Uri2("file", authority, path2, _empty2, _empty2);
      }
      /**
       * Creates new URI from uri components.
       *
       * Unless `strict` is `true` the scheme is defaults to be `file`. This function performs
       * validation and should be used for untrusted uri components retrieved from storage,
       * user input, command arguments etc
       */
      static from(components, strict) {
        const result = new Uri2(components.scheme, components.authority, components.path, components.query, components.fragment, strict);
        return result;
      }
      /**
       * Join a URI path with path fragments and normalizes the resulting path.
       *
       * @param uri The input URI.
       * @param pathFragment The path fragment to add to the URI path.
       * @returns The resulting URI.
       */
      static joinPath(uri, ...pathFragment) {
        if (!uri.path) {
          throw new Error(`[UriError]: cannot call joinPath on URI without path`);
        }
        let newPath;
        if (platform_1.isWindows && uri.scheme === "file") {
          newPath = _URI.file(paths.win32.join(uriToFsPath2(uri, true), ...pathFragment)).path;
        } else {
          newPath = paths.posix.join(uri.path, ...pathFragment);
        }
        return uri.with({ path: newPath });
      }
      // ---- printing/externalize ---------------------------
      /**
       * Creates a string representation for this URI. It's guaranteed that calling
       * `URI.parse` with the result of this function creates an URI which is equal
       * to this URI.
       *
       * * The result shall *not* be used for display purposes but for externalization or transport.
       * * The result will be encoded using the percentage encoding and encoding happens mostly
       * ignore the scheme-specific encoding rules.
       *
       * @param skipEncoding Do not encode the result, default is `false`
       */
      toString(skipEncoding = false) {
        return _asFormatted2(this, skipEncoding);
      }
      toJSON() {
        return this;
      }
      static revive(data) {
        if (!data) {
          return data;
        } else if (data instanceof _URI) {
          return data;
        } else {
          const result = new Uri2(data);
          result._formatted = data.external ?? null;
          result._fsPath = data._sep === _pathSepMarker2 ? data.fsPath ?? null : null;
          return result;
        }
      }
    };
    exports2.URI = URI2;
    function isUriComponents(thing) {
      if (!thing || typeof thing !== "object") {
        return false;
      }
      return typeof thing.scheme === "string" && (typeof thing.authority === "string" || typeof thing.authority === "undefined") && (typeof thing.path === "string" || typeof thing.path === "undefined") && (typeof thing.query === "string" || typeof thing.query === "undefined") && (typeof thing.fragment === "string" || typeof thing.fragment === "undefined");
    }
    var _pathSepMarker2 = platform_1.isWindows ? 1 : void 0;
    var Uri2 = class extends URI2 {
      _formatted = null;
      _fsPath = null;
      get fsPath() {
        if (!this._fsPath) {
          this._fsPath = uriToFsPath2(this, false);
        }
        return this._fsPath;
      }
      toString(skipEncoding = false) {
        if (!skipEncoding) {
          if (!this._formatted) {
            this._formatted = _asFormatted2(this, false);
          }
          return this._formatted;
        } else {
          return _asFormatted2(this, true);
        }
      }
      toJSON() {
        const res = {
          $mid: 1
          /* MarshalledId.Uri */
        };
        if (this._fsPath) {
          res.fsPath = this._fsPath;
          res._sep = _pathSepMarker2;
        }
        if (this._formatted) {
          res.external = this._formatted;
        }
        if (this.path) {
          res.path = this.path;
        }
        if (this.scheme) {
          res.scheme = this.scheme;
        }
        if (this.authority) {
          res.authority = this.authority;
        }
        if (this.query) {
          res.query = this.query;
        }
        if (this.fragment) {
          res.fragment = this.fragment;
        }
        return res;
      }
    };
    var encodeTable2 = {
      [
        58
        /* CharCode.Colon */
      ]: "%3A",
      // gen-delims
      [
        47
        /* CharCode.Slash */
      ]: "%2F",
      [
        63
        /* CharCode.QuestionMark */
      ]: "%3F",
      [
        35
        /* CharCode.Hash */
      ]: "%23",
      [
        91
        /* CharCode.OpenSquareBracket */
      ]: "%5B",
      [
        93
        /* CharCode.CloseSquareBracket */
      ]: "%5D",
      [
        64
        /* CharCode.AtSign */
      ]: "%40",
      [
        33
        /* CharCode.ExclamationMark */
      ]: "%21",
      // sub-delims
      [
        36
        /* CharCode.DollarSign */
      ]: "%24",
      [
        38
        /* CharCode.Ampersand */
      ]: "%26",
      [
        39
        /* CharCode.SingleQuote */
      ]: "%27",
      [
        40
        /* CharCode.OpenParen */
      ]: "%28",
      [
        41
        /* CharCode.CloseParen */
      ]: "%29",
      [
        42
        /* CharCode.Asterisk */
      ]: "%2A",
      [
        43
        /* CharCode.Plus */
      ]: "%2B",
      [
        44
        /* CharCode.Comma */
      ]: "%2C",
      [
        59
        /* CharCode.Semicolon */
      ]: "%3B",
      [
        61
        /* CharCode.Equals */
      ]: "%3D",
      [
        32
        /* CharCode.Space */
      ]: "%20"
    };
    function encodeURIComponentFast2(uriComponent, isPath, isAuthority) {
      let res = void 0;
      let nativeEncodePos = -1;
      for (let pos = 0; pos < uriComponent.length; pos++) {
        const code = uriComponent.charCodeAt(pos);
        if (code >= 97 && code <= 122 || code >= 65 && code <= 90 || code >= 48 && code <= 57 || code === 45 || code === 46 || code === 95 || code === 126 || isPath && code === 47 || isAuthority && code === 91 || isAuthority && code === 93 || isAuthority && code === 58) {
          if (nativeEncodePos !== -1) {
            res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
            nativeEncodePos = -1;
          }
          if (res !== void 0) {
            res += uriComponent.charAt(pos);
          }
        } else {
          if (res === void 0) {
            res = uriComponent.substr(0, pos);
          }
          const escaped = encodeTable2[code];
          if (escaped !== void 0) {
            if (nativeEncodePos !== -1) {
              res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
              nativeEncodePos = -1;
            }
            res += escaped;
          } else if (nativeEncodePos === -1) {
            nativeEncodePos = pos;
          }
        }
      }
      if (nativeEncodePos !== -1) {
        res += encodeURIComponent(uriComponent.substring(nativeEncodePos));
      }
      return res !== void 0 ? res : uriComponent;
    }
    function encodeURIComponentMinimal2(path2) {
      let res = void 0;
      for (let pos = 0; pos < path2.length; pos++) {
        const code = path2.charCodeAt(pos);
        if (code === 35 || code === 63) {
          if (res === void 0) {
            res = path2.substr(0, pos);
          }
          res += encodeTable2[code];
        } else {
          if (res !== void 0) {
            res += path2[pos];
          }
        }
      }
      return res !== void 0 ? res : path2;
    }
    function uriToFsPath2(uri, keepDriveLetterCasing) {
      let value;
      if (uri.authority && uri.path.length > 1 && uri.scheme === "file") {
        value = `//${uri.authority}${uri.path}`;
      } else if (uri.path.charCodeAt(0) === 47 && (uri.path.charCodeAt(1) >= 65 && uri.path.charCodeAt(1) <= 90 || uri.path.charCodeAt(1) >= 97 && uri.path.charCodeAt(1) <= 122) && uri.path.charCodeAt(2) === 58) {
        if (!keepDriveLetterCasing) {
          value = uri.path[1].toLowerCase() + uri.path.substr(2);
        } else {
          value = uri.path.substr(1);
        }
      } else {
        value = uri.path;
      }
      if (platform_1.isWindows) {
        value = value.replace(/\//g, "\\");
      }
      return value;
    }
    function _asFormatted2(uri, skipEncoding) {
      const encoder = !skipEncoding ? encodeURIComponentFast2 : encodeURIComponentMinimal2;
      let res = "";
      let { scheme, authority, path: path2, query, fragment } = uri;
      if (scheme) {
        res += scheme;
        res += ":";
      }
      if (authority || scheme === "file") {
        res += _slash2;
        res += _slash2;
      }
      if (authority) {
        let idx = authority.indexOf("@");
        if (idx !== -1) {
          const userinfo = authority.substr(0, idx);
          authority = authority.substr(idx + 1);
          idx = userinfo.lastIndexOf(":");
          if (idx === -1) {
            res += encoder(userinfo, false, false);
          } else {
            res += encoder(userinfo.substr(0, idx), false, false);
            res += ":";
            res += encoder(userinfo.substr(idx + 1), false, true);
          }
          res += "@";
        }
        authority = authority.toLowerCase();
        idx = authority.lastIndexOf(":");
        if (idx === -1) {
          res += encoder(authority, false, true);
        } else {
          res += encoder(authority.substr(0, idx), false, true);
          res += authority.substr(idx);
        }
      }
      if (path2) {
        if (path2.length >= 3 && path2.charCodeAt(0) === 47 && path2.charCodeAt(2) === 58) {
          const code = path2.charCodeAt(1);
          if (code >= 65 && code <= 90) {
            path2 = `/${String.fromCharCode(code + 32)}:${path2.substr(3)}`;
          }
        } else if (path2.length >= 2 && path2.charCodeAt(1) === 58) {
          const code = path2.charCodeAt(0);
          if (code >= 65 && code <= 90) {
            path2 = `${String.fromCharCode(code + 32)}:${path2.substr(2)}`;
          }
        }
        res += encoder(path2, true, false);
      }
      if (query) {
        res += "?";
        res += encoder(query, false, false);
      }
      if (fragment) {
        res += "#";
        res += !skipEncoding ? encodeURIComponentFast2(fragment, false, false) : fragment;
      }
      return res;
    }
    function decodeURIComponentGraceful2(str) {
      try {
        return decodeURIComponent(str);
      } catch {
        if (str.length > 3) {
          return str.substr(0, 3) + decodeURIComponentGraceful2(str.substr(3));
        } else {
          return str;
        }
      }
    }
    var _rEncodedAsHex2 = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
    function percentDecode2(str) {
      if (!str.match(_rEncodedAsHex2)) {
        return str;
      }
      return str.replace(_rEncodedAsHex2, (match) => decodeURIComponentGraceful2(match));
    }
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/results.js
var require_results = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/results.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PromptReference = exports2.ChatResponseReferencePartStatusKind = exports2.PromptMetadata = void 0;
    var uri_1 = require_uri();
    var PromptMetadata = class {
      _marker;
      toString() {
        return Object.getPrototypeOf(this).constructor.name;
      }
    };
    exports2.PromptMetadata = PromptMetadata;
    var ChatResponseReferencePartStatusKind;
    (function(ChatResponseReferencePartStatusKind2) {
      ChatResponseReferencePartStatusKind2[ChatResponseReferencePartStatusKind2["Complete"] = 1] = "Complete";
      ChatResponseReferencePartStatusKind2[ChatResponseReferencePartStatusKind2["Partial"] = 2] = "Partial";
      ChatResponseReferencePartStatusKind2[ChatResponseReferencePartStatusKind2["Omitted"] = 3] = "Omitted";
    })(ChatResponseReferencePartStatusKind || (exports2.ChatResponseReferencePartStatusKind = ChatResponseReferencePartStatusKind = {}));
    var PromptReference = class _PromptReference {
      anchor;
      iconPath;
      options;
      static fromJSON(json) {
        const uriOrLocation = (v) => "scheme" in v ? uri_1.URI.from(v) : { uri: uri_1.URI.from(v.uri), range: v.range };
        return new _PromptReference("variableName" in json.anchor ? {
          variableName: json.anchor.variableName,
          value: json.anchor.value && uriOrLocation(json.anchor.value)
        } : uriOrLocation(json.anchor), json.iconPath && ("scheme" in json.iconPath ? uri_1.URI.from(json.iconPath) : "light" in json.iconPath ? { light: uri_1.URI.from(json.iconPath.light), dark: uri_1.URI.from(json.iconPath.dark) } : json.iconPath), json.options);
      }
      constructor(anchor, iconPath, options) {
        this.anchor = anchor;
        this.iconPath = iconPath;
        this.options = options;
      }
      toJSON() {
        return {
          anchor: this.anchor,
          iconPath: this.iconPath,
          options: this.options
        };
      }
    };
    exports2.PromptReference = PromptReference;
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/promptRenderer.js
var require_promptRenderer = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/promptRenderer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.PromptRenderer = exports2.MetadataMap = void 0;
    var JSONT = require_jsonTypes();
    var materialized_1 = require_materialized();
    var mode_1 = require_mode();
    var promptElements_1 = require_promptElements();
    var results_1 = require_results();
    var MetadataMap;
    (function(MetadataMap2) {
      MetadataMap2.empty = {
        get: () => void 0,
        getAll: () => []
      };
      MetadataMap2.from = (metadata) => {
        return {
          get: (ctor) => metadata.find((m) => m instanceof ctor),
          getAll: (ctor) => metadata.filter((m) => m instanceof ctor)
        };
      };
    })(MetadataMap || (exports2.MetadataMap = MetadataMap = {}));
    var PromptRenderer = class {
      _endpoint;
      _ctor;
      _props;
      _tokenizer;
      _usedContext = [];
      _ignoredFiles = [];
      _growables = [];
      _root = new PromptTreeElement(null, 0);
      _tokenLimits = [];
      /** Epoch used to tracing the order in which elements render. */
      tracer = void 0;
      /**
       * @param _endpoint The chat endpoint that the rendered prompt will be sent to.
       * @param _ctor The prompt element constructor to render.
       * @param _props The props to pass to the prompt element.
       */
      constructor(_endpoint, _ctor, _props, _tokenizer) {
        this._endpoint = _endpoint;
        this._ctor = _ctor;
        this._props = _props;
        this._tokenizer = _tokenizer;
      }
      getIgnoredFiles() {
        return Array.from(new Set(this._ignoredFiles));
      }
      getUsedContext() {
        return this._usedContext;
      }
      createElement(element) {
        return new element.ctor(element.props);
      }
      async _processPromptPieces(sizing, pieces, progress, token) {
        const promptElements = /* @__PURE__ */ new Map();
        for (const [i, element] of pieces.entries()) {
          if (Array.isArray(element.children)) {
            element.props = element.props ?? {};
            element.props.children = element.children;
          }
          if (!element.ctor) {
            const loc = atPath(element.path);
            throw new Error(`Invalid ChatMessage child! Child must be a TSX component that extends PromptElement at ${loc}`);
          }
          const promptElement = this.createElement(element);
          let tokenLimit;
          if (promptElement instanceof promptElements_1.TokenLimit) {
            tokenLimit = element.props.max;
            this._tokenLimits.push({ limit: tokenLimit, id: element.node.id });
          }
          element.node.setObj(promptElement);
          const flexGroupValue = element.props.flexGrow ?? Infinity;
          let flexGroup = promptElements.get(flexGroupValue);
          if (!flexGroup) {
            flexGroup = [];
            promptElements.set(flexGroupValue, flexGroup);
          }
          flexGroup.push({ element, promptElementInstance: promptElement, tokenLimit });
        }
        if (promptElements.size === 0) {
          return;
        }
        const flexGroups = [...promptElements.entries()].sort(([a], [b]) => b - a).map(([_, group]) => group);
        const setReserved = (groupIndex) => {
          let reservedTokens = 0;
          for (let i = groupIndex + 1; i < flexGroups.length; i++) {
            for (const { element } of flexGroups[i]) {
              if (!element.props.flexReserve) {
                continue;
              }
              const reserve = typeof element.props.flexReserve === "string" ? (
                // Typings ensure the string is `/${number}`
                Math.floor(sizing.remainingTokenBudget / Number(element.props.flexReserve.slice(1)))
              ) : element.props.flexReserve;
              reservedTokens += reserve;
            }
          }
          sizing.consume(reservedTokens);
          return reservedTokens;
        };
        for (const [groupIndex, promptElements2] of flexGroups.entries()) {
          const reservedTokens = setReserved(groupIndex);
          let flexBasisSum = 0;
          for (const { element } of promptElements2) {
            flexBasisSum += element.props.flexBasis ?? 1;
          }
          let constantTokenLimits = 0;
          const useConstantLimitsForIndex = promptElements2.map((e) => {
            if (e.tokenLimit === void 0) {
              return false;
            }
            const flexBasis = e.element.props.flexBasis ?? 1;
            const proportion = flexBasis / flexBasisSum;
            const proportionateUsage = Math.floor(sizing.remainingTokenBudget * proportion);
            if (proportionateUsage < e.tokenLimit) {
              return false;
            }
            flexBasisSum -= flexBasis;
            constantTokenLimits += e.tokenLimit;
            return true;
          });
          const elementSizings = promptElements2.map((e, i) => {
            const proportion = (e.element.props.flexBasis ?? 1) / flexBasisSum;
            return {
              tokenBudget: useConstantLimitsForIndex[i] ? e.tokenLimit : Math.floor((sizing.remainingTokenBudget - constantTokenLimits) * proportion),
              endpoint: sizing.endpoint,
              countTokens: (text, cancellation) => this._tokenizer.tokenLength(typeof text === "string" ? { type: mode_1.Raw.ChatCompletionContentPartKind.Text, text } : text, cancellation)
            };
          });
          sizing.consume(-reservedTokens);
          this.tracer?.addRenderEpoch?.({
            inNode: promptElements2[0].element.node.parent?.id,
            flexValue: promptElements2[0].element.props.flexGrow ?? 0,
            tokenBudget: sizing.remainingTokenBudget,
            reservedTokens,
            elements: promptElements2.map((e, i) => ({
              id: e.element.node.id,
              tokenBudget: elementSizings[i].tokenBudget
            }))
          });
          await Promise.all(promptElements2.map(async ({ element, promptElementInstance }, i) => {
            const state = await annotateError(element, () => promptElementInstance.prepare?.(elementSizings[i], progress, token));
            element.node.setState(state);
          }));
          const templates = await Promise.all(promptElements2.map(async ({ element, promptElementInstance }, i) => {
            const elementSizing = elementSizings[i];
            return await annotateError(element, () => promptElementInstance.render(element.node.getState(), elementSizing, progress, token));
          }));
          for (const [i, { element, promptElementInstance }] of promptElements2.entries()) {
            const elementSizing = elementSizings[i];
            const template = templates[i];
            if (!template) {
              continue;
            }
            const childConsumption = await this._processPromptRenderPiece(new PromptSizingContext(elementSizing.tokenBudget, this._endpoint), element, promptElementInstance, template, progress, token);
            if (promptElementInstance instanceof promptElements_1.Expandable) {
              this._growables.push({ initialConsume: childConsumption, elem: element.node });
            }
            sizing.consume(childConsumption);
          }
        }
      }
      async _processPromptRenderPiece(elementSizing, element, promptElementInstance, template, progress, token) {
        const pieces = flattenAndReduce(template);
        const childSizing = new PromptSizingContext(elementSizing.tokenBudget, this._endpoint);
        const { tokensConsumed } = await computeTokensConsumedByLiterals(this._tokenizer, element, promptElementInstance, pieces);
        childSizing.consume(tokensConsumed);
        await this._handlePromptChildren(element, pieces, childSizing, progress, token);
        return childSizing.consumed;
      }
      /**
       * Renders the prompt element and its children to a JSON-serializable state.
       * @returns A promise that resolves to an object containing the rendered chat messages and the total token count.
       * The total token count is guaranteed to be less than or equal to the token budget.
       */
      async renderElementJSON(token) {
        await this._processPromptPieces(new PromptSizingContext(this._endpoint.modelMaxPromptTokens, this._endpoint), [
          {
            node: this._root,
            ctor: this._ctor,
            props: this._props,
            children: [],
            path: [this._ctor]
          }
        ], void 0, token);
        return {
          node: this._root.toJSON()
        };
      }
      /**
       * Renders the prompt element and its children.
       * @returns A promise that resolves to an object containing the rendered chat messages and the total token count.
       * The total token count is guaranteed to be less than or equal to the token budget.
       */
      async render(progress, token) {
        const result = await this.renderRaw(progress, token);
        return { ...result, messages: (0, mode_1.toMode)(this._tokenizer.mode, result.messages) };
      }
      /**
       * Renders the prompt element and its children. Similar to {@link render}, but
       * returns the original message representation.
       */
      async renderRaw(progress, token) {
        await this._processPromptPieces(new PromptSizingContext(this._endpoint.modelMaxPromptTokens, this._endpoint), [
          {
            node: this._root,
            ctor: this._ctor,
            props: this._props,
            children: [],
            path: [this._ctor]
          }
        ], progress, token);
        const { container, allMetadata, removed } = await this._getFinalElementTree(this._endpoint.modelMaxPromptTokens, token);
        this.tracer?.didMaterializeTree?.({
          budget: this._endpoint.modelMaxPromptTokens,
          renderedTree: { container, removed, budget: this._endpoint.modelMaxPromptTokens },
          tokenizer: this._tokenizer,
          renderTree: (budget) => this._getFinalElementTree(budget, void 0).then((r) => ({ ...r, budget }))
        });
        const messageResult = [...container.toChatMessages()];
        const tokenCount = await container.tokenCount(this._tokenizer);
        const remainingMetadata = [...container.allMetadata()];
        const referenceNames = /* @__PURE__ */ new Set();
        const references = remainingMetadata.map((m) => {
          if (!(m instanceof ReferenceMetadata)) {
            return;
          }
          const ref = m.reference;
          const isVariableName = "variableName" in ref.anchor;
          if (isVariableName && !referenceNames.has(ref.anchor.variableName)) {
            referenceNames.add(ref.anchor.variableName);
            return ref;
          } else if (!isVariableName) {
            return ref;
          }
        }).filter(isDefined);
        const omittedReferences = allMetadata.map((m) => {
          if (!(m instanceof ReferenceMetadata) || remainingMetadata.includes(m)) {
            return;
          }
          const ref = m.reference;
          const isVariableName = "variableName" in ref.anchor;
          if (isVariableName && !referenceNames.has(ref.anchor.variableName)) {
            referenceNames.add(ref.anchor.variableName);
            return ref;
          } else if (!isVariableName) {
            return ref;
          }
        }).filter(isDefined);
        return {
          metadata: MetadataMap.from(remainingMetadata),
          messages: messageResult,
          hasIgnoredFiles: this._ignoredFiles.length > 0,
          tokenCount,
          references,
          omittedReferences
        };
      }
      /**
       * Note: this may be called multiple times from the tracer as users play
       * around with budgets. It should be side-effect-free.
       */
      async _getFinalElementTree(tokenBudget, token) {
        const root = this._root.materialize();
        const originalMessages = [...root.toChatMessages()];
        const allMetadata = [...root.allMetadata()];
        const limits = [{ limit: tokenBudget, id: this._root.id }, ...this._tokenLimits];
        let removed = 0;
        for (let i = limits.length - 1; i >= 0; i--) {
          const limit = limits[i];
          if (limit.limit > tokenBudget) {
            continue;
          }
          const container = root.findById(limit.id);
          if (!container) {
            continue;
          }
          const initialTokenCount = await container.tokenCount(this._tokenizer);
          if (initialTokenCount < limit.limit) {
            const didChange = await this._grow(container, initialTokenCount, limit.limit, token);
            if (!didChange) {
              continue;
            }
          }
          try {
            let tokenCount = await container.tokenCount(this._tokenizer);
            while (tokenCount > limit.limit) {
              const overhead = await container.baseMessageTokenCount(this._tokenizer);
              do {
                for (const node of container.removeLowestPriorityChild()) {
                  removed++;
                  const rmCount = node.upperBoundTokenCount(this._tokenizer);
                  tokenCount -= (typeof rmCount === "number" ? rmCount : await rmCount) * 1.25;
                }
              } while (tokenCount - overhead > limit.limit);
              tokenCount = await container.tokenCount(this._tokenizer);
            }
          } catch (e) {
            if (e instanceof materialized_1.BudgetExceededError) {
              e.metadata = MetadataMap.from([...root.allMetadata()]);
              e.messages = originalMessages;
            }
            throw e;
          }
        }
        return { container: root, allMetadata, removed };
      }
      /** Grows all Expandable elements, returns if any changes were made. */
      async _grow(tree, tokensUsed, tokenBudget, token) {
        if (!this._growables.length) {
          return false;
        }
        for (const growable of this._growables) {
          if (!tree.findById(growable.elem.id)) {
            continue;
          }
          const obj = growable.elem.getObj();
          if (!(obj instanceof promptElements_1.Expandable)) {
            throw new Error("unreachable: expected growable");
          }
          const tempRoot = new PromptTreeElement(null, 0, growable.elem.id);
          const sizing = new PromptSizingContext(tokenBudget - tokensUsed + growable.initialConsume, this._endpoint);
          const newConsumed = await this._processPromptRenderPiece(sizing, { node: tempRoot, ctor: this._ctor, props: {}, children: [], path: [this._ctor] }, obj, await obj.render(void 0, {
            tokenBudget: sizing.tokenBudget,
            endpoint: this._endpoint,
            countTokens: (text, cancellation) => this._tokenizer.tokenLength(typeof text === "string" ? { type: mode_1.Raw.ChatCompletionContentPartKind.Text, text } : text, cancellation)
          }), void 0, token);
          const newContainer = tempRoot.materialize();
          const oldContainer = tree.replaceNode(growable.elem.id, newContainer);
          if (!oldContainer) {
            throw new Error("unreachable: could not find old element to replace");
          }
          tokensUsed -= growable.initialConsume;
          tokensUsed += newConsumed;
          if (tokensUsed >= tokenBudget) {
            break;
          }
        }
        return true;
      }
      _handlePromptChildren(element, pieces, sizing, progress, token) {
        if (element.ctor === promptElements_1.TextChunk) {
          this._handleExtrinsicTextChunkChildren(element.node, element.node, element.props, pieces);
          return;
        }
        let todo = [];
        for (const piece of pieces) {
          if (piece.kind === "literal") {
            element.node.appendStringChild(piece.value, element.props.priority ?? Number.MAX_SAFE_INTEGER);
            continue;
          }
          if (piece.kind === "intrinsic") {
            this._handleIntrinsic(element.node, piece.name, {
              priority: element.props.priority ?? Number.MAX_SAFE_INTEGER,
              ...piece.props
            }, flattenAndReduceArr(piece.children));
            continue;
          }
          const childNode = element.node.createChild();
          todo.push({
            node: childNode,
            ctor: piece.ctor,
            props: piece.props,
            children: piece.children,
            path: [...element.path, piece.ctor]
          });
        }
        return this._processPromptPieces(sizing, todo, progress, token);
      }
      _handleIntrinsic(node, name, props, children, sortIndex) {
        switch (name) {
          case "meta":
            return this._handleIntrinsicMeta(node, props, children);
          case "br":
            return this._handleIntrinsicLineBreak(node, props, children, props.priority, sortIndex);
          case "usedContext":
            return this._handleIntrinsicUsedContext(node, props, children);
          case "references":
            return this._handleIntrinsicReferences(node, props, children);
          case "ignoredFiles":
            return this._handleIntrinsicIgnoredFiles(node, props, children);
          case "elementJSON":
            return this._handleIntrinsicElementJSON(node, props.data);
          case "cacheBreakpoint":
            return this._handleIntrinsicCacheBreakpoint(node, props, children, sortIndex);
          case "opaque":
            return this._handleIntrinsicOpaque(node, props, sortIndex);
        }
        throw new Error(`Unknown intrinsic element ${name}!`);
      }
      _handleIntrinsicCacheBreakpoint(node, props, children, sortIndex) {
        if (children.length > 0) {
          throw new Error(`<cacheBreakpoint /> must not have children!`);
        }
        node.addCacheBreakpoint(props, sortIndex);
      }
      _handleIntrinsicMeta(node, props, children) {
        if (children.length > 0) {
          throw new Error(`<meta /> must not have children!`);
        }
        if (props.local) {
          node.addMetadata(props.value);
        } else {
          this._root.addMetadata(props.value);
        }
      }
      _handleIntrinsicLineBreak(node, props, children, inheritedPriority, sortIndex) {
        if (children.length > 0) {
          throw new Error(`<br /> must not have children!`);
        }
        node.appendLineBreak(inheritedPriority ?? Number.MAX_SAFE_INTEGER, sortIndex);
      }
      _handleIntrinsicOpaque(node, props, sortIndex) {
        node.appendOpaque(props.value, props.tokenUsage, props.priority, sortIndex);
      }
      _handleIntrinsicElementJSON(node, data) {
        const appended = node.appendPieceJSON(data.node);
        if (this.tracer?.includeInEpoch) {
          for (const child of appended.elements()) {
            this.tracer.includeInEpoch({ id: child.id, tokenBudget: 0 });
          }
        }
      }
      _handleIntrinsicUsedContext(node, props, children) {
        if (children.length > 0) {
          throw new Error(`<usedContext /> must not have children!`);
        }
        this._usedContext.push(...props.value);
      }
      _handleIntrinsicReferences(node, props, children) {
        if (children.length > 0) {
          throw new Error(`<reference /> must not have children!`);
        }
        for (const ref of props.value) {
          node.addMetadata(new ReferenceMetadata(ref));
        }
      }
      _handleIntrinsicIgnoredFiles(node, props, children) {
        if (children.length > 0) {
          throw new Error(`<ignoredFiles /> must not have children!`);
        }
        this._ignoredFiles.push(...props.value);
      }
      /**
       * @param node Parent of the <TextChunk />
       * @param textChunkNode The <TextChunk /> node. All children are in-order
       * appended to the parent using the same sort index to ensure order is preserved.
       * @param props Props of the <TextChunk />
       * @param children Rendered children of the <TextChunk />
       */
      _handleExtrinsicTextChunkChildren(node, textChunkNode, props, children) {
        const content = [];
        const metadata = [];
        for (const child of children) {
          if (child.kind === "extrinsic") {
            throw new Error("TextChunk cannot have extrinsic children!");
          }
          if (child.kind === "literal") {
            content.push(child.value);
          }
          if (child.kind === "intrinsic") {
            if (child.name === "br") {
              content.push("\n");
            } else if (child.name === "references") {
              for (const reference of child.props.value) {
                metadata.push(new ReferenceMetadata(reference));
              }
            } else {
              this._handleIntrinsic(node, child.name, child.props, flattenAndReduceArr(child.children), textChunkNode.childIndex);
            }
          }
        }
        node.appendStringChild(content.join(""), props?.priority ?? Number.MAX_SAFE_INTEGER, metadata, textChunkNode.childIndex, true);
      }
    };
    exports2.PromptRenderer = PromptRenderer;
    async function computeTokensConsumedByLiterals(tokenizer, element, instance, pieces) {
      let tokensConsumed = 0;
      if ((0, promptElements_1.isChatMessagePromptElement)(instance)) {
        const raw = {
          role: element.props.role,
          content: [],
          ...element.props.name ? { name: element.props.name } : void 0,
          ...element.props.toolCalls ? { toolCalls: element.props.toolCalls } : void 0,
          ...element.props.toolCallId ? { toolCallId: element.props.toolCallId } : void 0
        };
        tokensConsumed += await tokenizer.countMessageTokens((0, mode_1.toMode)(tokenizer.mode, raw));
      }
      for (const piece of pieces) {
        if (piece.kind === "literal") {
          tokensConsumed += await tokenizer.tokenLength({
            type: mode_1.Raw.ChatCompletionContentPartKind.Text,
            text: piece.value
          });
        }
      }
      return { tokensConsumed };
    }
    function flattenAndReduce(c, into = []) {
      if (typeof c === "undefined" || typeof c === "boolean") {
        return [];
      } else if (typeof c === "string" || typeof c === "number") {
        into.push(new LiteralPromptPiece(String(c)));
      } else if (isFragmentCtor(c)) {
        flattenAndReduceArr(c.children, into);
      } else if (isIterable2(c)) {
        flattenAndReduceArr(c, into);
      } else if (typeof c.ctor === "string") {
        into.push(new IntrinsicPromptPiece(c.ctor, c.props, c.children));
      } else {
        into.push(new ExtrinsicPromptPiece(c.ctor, c.props, c.children));
      }
      return into;
    }
    function flattenAndReduceArr(arr, into = []) {
      for (const entry of arr) {
        flattenAndReduce(entry, into);
      }
      return into;
    }
    var IntrinsicPromptPiece = class {
      name;
      props;
      children;
      kind = "intrinsic";
      constructor(name, props, children) {
        this.name = name;
        this.props = props;
        this.children = children;
      }
    };
    var ExtrinsicPromptPiece = class {
      ctor;
      props;
      children;
      kind = "extrinsic";
      constructor(ctor, props, children) {
        this.ctor = ctor;
        this.props = props;
        this.children = children;
      }
    };
    var LiteralPromptPiece = class {
      value;
      priority;
      kind = "literal";
      constructor(value, priority) {
        this.value = value;
        this.priority = priority;
      }
    };
    var PromptOpaque = class _PromptOpaque {
      parent;
      childIndex;
      value;
      tokenUsage;
      priority;
      static fromJSON(parent, index, json) {
        return new _PromptOpaque(parent, index, json.value, json.tokenUsage, json.priority);
      }
      kind = 2;
      constructor(parent, childIndex, value, tokenUsage, priority) {
        this.parent = parent;
        this.childIndex = childIndex;
        this.value = value;
        this.tokenUsage = tokenUsage;
        this.priority = priority;
      }
      materialize(parent) {
        return new materialized_1.MaterializedChatMessageOpaque(parent, {
          type: mode_1.Raw.ChatCompletionContentPartKind.Opaque,
          value: this.value,
          tokenUsage: this.tokenUsage
        }, this.priority);
      }
      toJSON() {
        return {
          type: 3,
          value: this.value,
          tokenUsage: this.tokenUsage,
          priority: this.priority
        };
      }
    };
    var PromptSizingContext = class {
      tokenBudget;
      endpoint;
      _consumed = 0;
      constructor(tokenBudget, endpoint) {
        this.tokenBudget = tokenBudget;
        this.endpoint = endpoint;
      }
      get consumed() {
        return this._consumed > this.tokenBudget ? this.tokenBudget : this._consumed;
      }
      get remainingTokenBudget() {
        return Math.max(0, this.tokenBudget - this._consumed);
      }
      /** Marks part of the budget as having been consumed by a render() call. */
      consume(budget) {
        this._consumed += budget;
      }
    };
    var PromptTreeElement = class _PromptTreeElement {
      parent;
      childIndex;
      id;
      static _nextId = 0;
      static fromJSON(index, json, keepWithMap) {
        const element = new _PromptTreeElement(null, index);
        element._metadata = json.references?.map((r) => new ReferenceMetadata(results_1.PromptReference.fromJSON(r))) ?? [];
        element._children = json.children.map((childJson, i) => {
          switch (childJson.type) {
            case 1:
              return _PromptTreeElement.fromJSON(i, childJson, keepWithMap);
            case 2:
              return PromptText.fromJSON(element, i, childJson);
            case 3:
              return PromptOpaque.fromJSON(element, i, childJson);
            default:
              softAssertNever(childJson);
          }
        }).filter(isDefined);
        switch (json.ctor) {
          case 1:
            element._objFlags = json.flags ?? 0;
            element._obj = new promptElements_1.BaseChatMessage(json.props);
            break;
          case 2: {
            if (json.keepWithId !== void 0) {
              let kw = keepWithMap.get(json.keepWithId);
              if (!kw) {
                kw = (0, promptElements_1.useKeepWith)();
                keepWithMap.set(json.keepWithId, kw);
              }
              element._obj = new kw(json.props || {});
            } else {
              element._obj = new promptElements_1.LogicalWrapper(json.props || {});
            }
            element._objFlags = json.flags ?? 0;
            break;
          }
          case 3:
            element._obj = new promptElements_1.Image(json.props);
            break;
          default:
            softAssertNever(json);
        }
        return element;
      }
      kind = 1;
      _obj = null;
      _state = void 0;
      _children = [];
      _metadata = [];
      _objFlags = 0;
      constructor(parent = null, childIndex, id2 = _PromptTreeElement._nextId++) {
        this.parent = parent;
        this.childIndex = childIndex;
        this.id = id2;
      }
      setObj(obj) {
        this._obj = obj;
        if (this._obj instanceof promptElements_1.LegacyPrioritization)
          this._objFlags |= 1;
        if (this._obj instanceof promptElements_1.Chunk)
          this._objFlags |= 2;
        if (this._obj instanceof promptElements_1.IfEmpty)
          this._objFlags |= 8;
        if (this._obj.props.passPriority)
          this._objFlags |= 4;
      }
      /** @deprecated remove when Expandable is gone */
      getObj() {
        return this._obj;
      }
      setState(state) {
        this._state = state;
      }
      getState() {
        return this._state;
      }
      createChild() {
        const child = new _PromptTreeElement(this, this._children.length);
        this._children.push(child);
        return child;
      }
      appendPieceJSON(data) {
        const child = _PromptTreeElement.fromJSON(this._children.length, data, /* @__PURE__ */ new Map());
        this._children.push(child);
        return child;
      }
      appendStringChild(text, priority, metadata, sortIndex = this._children.length, lineBreakBefore = false) {
        this._children.push(new PromptText(this, sortIndex, text, priority, metadata, lineBreakBefore));
      }
      appendLineBreak(priority, sortIndex = this._children.length) {
        this._children.push(new PromptText(this, sortIndex, "\n", priority));
      }
      appendOpaque(value, tokenUsage, priority, sortIndex = this._children.length) {
        this._children.push(new PromptOpaque(this, sortIndex, value, tokenUsage, priority));
      }
      toJSON() {
        const json = {
          type: 1,
          ctor: 2,
          ctorName: this._obj?.constructor.name,
          children: this._children.slice().sort((a, b) => a.childIndex - b.childIndex).map((c) => c.toJSON()).filter(isDefined),
          props: {},
          references: this._metadata.filter((m) => m instanceof ReferenceMetadata).map((r) => r.reference.toJSON())
        };
        if (this._obj) {
          json.props = pickProps(this._obj.props, JSONT.jsonRetainedProps);
        }
        if (this._obj instanceof promptElements_1.BaseChatMessage) {
          json.ctor = 1;
          Object.assign(json.props, pickProps(this._obj.props, ["role", "name", "toolCalls", "toolCallId"]));
        } else if (this._obj instanceof promptElements_1.Image) {
          return {
            ...json,
            ctor: 3,
            props: {
              ...json.props,
              ...pickProps(this._obj.props, ["src", "detail"])
            }
          };
        } else if (this._obj instanceof promptElements_1.AbstractKeepWith) {
          json.keepWithId = this._obj.id;
        }
        if (this._objFlags !== 0) {
          json.flags = this._objFlags;
        }
        return json;
      }
      materialize(parent) {
        this._children.sort((a, b) => a.childIndex - b.childIndex);
        if (this._obj instanceof promptElements_1.Image) {
          return new materialized_1.MaterializedChatMessageImage(parent, this.id, this._obj.props.src, this._obj.props.priority ?? Number.MAX_SAFE_INTEGER, this._metadata, 0, this._obj.props.detail ?? void 0);
        }
        if (this._obj instanceof promptElements_1.BaseChatMessage) {
          if (this._obj.props.role === void 0 || typeof this._obj.props.role !== "number") {
            throw new Error(`Invalid ChatMessage!`);
          }
          return new materialized_1.MaterializedChatMessage(parent, this.id, this._obj.props.role, this._obj.props.name, this._obj instanceof promptElements_1.AssistantMessage ? this._obj.props.toolCalls : void 0, this._obj instanceof promptElements_1.ToolMessage ? this._obj.props.toolCallId : void 0, this._obj.props.priority ?? Number.MAX_SAFE_INTEGER, this._metadata, (parent2) => this._children.map((child) => child.materialize(parent2)));
        } else {
          const container = new materialized_1.GenericMaterializedContainer(parent, this.id, this._obj?.constructor.name, this._obj?.props.priority ?? (this._obj?.props.passPriority ? 0 : Number.MAX_SAFE_INTEGER), (parent2) => this._children.map((child) => child.materialize(parent2)), this._metadata, this._objFlags);
          if (this._obj instanceof promptElements_1.AbstractKeepWith) {
            container.keepWithId = this._obj.id;
          }
          return container;
        }
      }
      addMetadata(metadata) {
        this._metadata.push(metadata);
      }
      addCacheBreakpoint(breakpoint, sortIndex = this._children.length) {
        if (!(this._obj instanceof promptElements_1.BaseChatMessage)) {
          throw new Error("Cache breakpoints may only be direct children of chat messages");
        }
        this._children.push(new PromptCacheBreakpoint({ type: mode_1.Raw.ChatCompletionContentPartKind.CacheBreakpoint, cacheType: breakpoint.type }, sortIndex));
      }
      *elements() {
        yield this;
        for (const child of this._children) {
          if (child instanceof _PromptTreeElement) {
            yield* child.elements();
          }
        }
      }
    };
    var PromptCacheBreakpoint = class {
      part;
      childIndex;
      constructor(part, childIndex) {
        this.part = part;
        this.childIndex = childIndex;
      }
      toJSON() {
        return void 0;
      }
      materialize(parent) {
        return new materialized_1.MaterializedChatMessageBreakpoint(parent, this.part);
      }
    };
    var PromptText = class _PromptText {
      parent;
      childIndex;
      text;
      priority;
      metadata;
      lineBreakBefore;
      static fromJSON(parent, index, json) {
        return new _PromptText(parent, index, json.text, json.priority, json.references?.map((r) => new ReferenceMetadata(results_1.PromptReference.fromJSON(r))), json.lineBreakBefore);
      }
      kind = 2;
      constructor(parent, childIndex, text, priority, metadata, lineBreakBefore = false) {
        this.parent = parent;
        this.childIndex = childIndex;
        this.text = text;
        this.priority = priority;
        this.metadata = metadata;
        this.lineBreakBefore = lineBreakBefore;
      }
      materialize(parent) {
        const lineBreak = this.lineBreakBefore ? 1 : this.childIndex === 0 ? 2 : 0;
        return new materialized_1.MaterializedChatMessageTextChunk(parent, this.text, this.priority ?? Number.MAX_SAFE_INTEGER, this.metadata || [], lineBreak);
      }
      toJSON() {
        return {
          type: 2,
          priority: this.priority,
          text: this.text,
          references: this.metadata?.filter((m) => m instanceof ReferenceMetadata).map((r) => r.reference.toJSON()),
          lineBreakBefore: this.lineBreakBefore
        };
      }
    };
    function isFragmentCtor(template) {
      return (typeof template.ctor === "function" && template.ctor.isFragment) ?? false;
    }
    function softAssertNever(x) {
    }
    function isDefined(x) {
      return x !== void 0;
    }
    var InternalMetadata = class extends results_1.PromptMetadata {
    };
    var ReferenceMetadata = class extends InternalMetadata {
      reference;
      constructor(reference) {
        super();
        this.reference = reference;
      }
    };
    function isIterable2(t) {
      return !!t && typeof t[Symbol.iterator] === "function";
    }
    function pickProps(obj, keys) {
      const result = {};
      for (const key of keys) {
        if (obj.hasOwnProperty(key)) {
          result[key] = obj[key];
        }
      }
      return result;
    }
    function atPath(path2) {
      return path2.map((p) => typeof p === "string" ? p : p ? p.name || "<anonymous>" : String(p)).join(" > ");
    }
    var annotatedErrors = /* @__PURE__ */ new WeakSet();
    async function annotateError(q, fn) {
      try {
        return await fn();
      } catch (e) {
        if (e instanceof Error && !annotatedErrors.has(e) && e.constructor.name !== "CancellationError") {
          annotatedErrors.add(e);
          e.message += ` (at tsx element ${atPath(q.path)})`;
        }
        throw e;
      }
    }
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/tokenizer/tokenizer.js
var require_tokenizer = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/tokenizer/tokenizer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.VSCodeTokenizer = void 0;
    var mode_1 = require_mode();
    var VSCodeTokenizer = class {
      countTokens;
      mode = mode_1.OutputMode.VSCode;
      constructor(countTokens, mode) {
        this.countTokens = countTokens;
        if (mode !== mode_1.OutputMode.VSCode) {
          throw new Error("`mode` must be set to vscode when using vscode.LanguageModelChat as the tokenizer");
        }
      }
      async tokenLength(part, token) {
        if (part.type === mode_1.Raw.ChatCompletionContentPartKind.Text) {
          return this.countTokens(part.text, token);
        }
        return Promise.resolve(0);
      }
      async countMessageTokens(message) {
        return this.countTokens(message);
      }
    };
    exports2.VSCodeTokenizer = VSCodeTokenizer;
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/htmlTracerSrc.js
var require_htmlTracerSrc = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/htmlTracerSrc.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.tracerCss = exports2.tracerSrc = void 0;
    exports2.tracerSrc = '"use strict";(()=>{var $,m,se,Ue,w,re,le,q,X,G,K,Ae,D={},ce=[],Re=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,J=Array.isArray;function E(t,e){for(var n in e)t[n]=e[n];return t}function ue(t){t&&t.parentNode&&t.parentNode.removeChild(t)}function l(t,e,n){var o,r,_,c={};for(_ in e)_=="key"?o=e[_]:_=="ref"?r=e[_]:c[_]=e[_];if(arguments.length>2&&(c.children=arguments.length>3?$.call(arguments,2):n),typeof t=="function"&&t.defaultProps!=null)for(_ in t.defaultProps)c[_]===void 0&&(c[_]=t.defaultProps[_]);return R(t,c,o,r,null)}function R(t,e,n,o,r){var _={type:t,props:e,key:n,ref:o,__k:null,__:null,__b:0,__e:null,__d:void 0,__c:null,constructor:void 0,__v:r??++se,__i:-1,__u:0};return r==null&&m.vnode!=null&&m.vnode(_),_}function N(t){return t.children}function B(t,e){this.props=t,this.context=e}function I(t,e){if(e==null)return t.__?I(t.__,t.__i+1):null;for(var n;e<t.__k.length;e++)if((n=t.__k[e])!=null&&n.__e!=null)return n.__e;return typeof t.type=="function"?I(t):null}function de(t){var e,n;if((t=t.__)!=null&&t.__c!=null){for(t.__e=t.__c.base=null,e=0;e<t.__k.length;e++)if((n=t.__k[e])!=null&&n.__e!=null){t.__e=t.__c.base=n.__e;break}return de(t)}}function ie(t){(!t.__d&&(t.__d=!0)&&w.push(t)&&!O.__r++||re!==m.debounceRendering)&&((re=m.debounceRendering)||le)(O)}function O(){var t,e,n,o,r,_,c,a;for(w.sort(q);t=w.shift();)t.__d&&(e=w.length,o=void 0,_=(r=(n=t).__v).__e,c=[],a=[],n.__P&&((o=E({},r)).__v=r.__v+1,m.vnode&&m.vnode(o),Q(n.__P,o,r,n.__n,n.__P.namespaceURI,32&r.__u?[_]:null,c,_??I(r),!!(32&r.__u),a),o.__v=r.__v,o.__.__k[o.__i]=o,me(c,o,a),o.__e!=_&&de(o)),w.length>e&&w.sort(q));O.__r=0}function pe(t,e,n,o,r,_,c,a,u,s,p){var i,f,d,b,x,C=o&&o.__k||ce,h=e.length;for(n.__d=u,Be(n,e,C),u=n.__d,i=0;i<h;i++)(d=n.__k[i])!=null&&(f=d.__i===-1?D:C[d.__i]||D,d.__i=i,Q(t,d,f,r,_,c,a,u,s,p),b=d.__e,d.ref&&f.ref!=d.ref&&(f.ref&&Y(f.ref,null,d),p.push(d.ref,d.__c||b,d)),x==null&&b!=null&&(x=b),65536&d.__u||f.__k===d.__k?u=fe(d,u,t):typeof d.type=="function"&&d.__d!==void 0?u=d.__d:b&&(u=b.nextSibling),d.__d=void 0,d.__u&=-196609);n.__d=u,n.__e=x}function Be(t,e,n){var o,r,_,c,a,u=e.length,s=n.length,p=s,i=0;for(t.__k=[],o=0;o<u;o++)(r=e[o])!=null&&typeof r!="boolean"&&typeof r!="function"?(c=o+i,(r=t.__k[o]=typeof r=="string"||typeof r=="number"||typeof r=="bigint"||r.constructor==String?R(null,r,null,null,null):J(r)?R(N,{children:r},null,null,null):r.constructor===void 0&&r.__b>0?R(r.type,r.props,r.key,r.ref?r.ref:null,r.__v):r).__=t,r.__b=t.__b+1,_=null,(a=r.__i=Oe(r,n,c,p))!==-1&&(p--,(_=n[a])&&(_.__u|=131072)),_==null||_.__v===null?(a==-1&&i--,typeof r.type!="function"&&(r.__u|=65536)):a!==c&&(a==c-1?i--:a==c+1?i++:(a>c?i--:i++,r.__u|=65536))):r=t.__k[o]=null;if(p)for(o=0;o<s;o++)(_=n[o])!=null&&(131072&_.__u)==0&&(_.__e==t.__d&&(t.__d=I(_)),he(_,_))}function fe(t,e,n){var o,r;if(typeof t.type=="function"){for(o=t.__k,r=0;o&&r<o.length;r++)o[r]&&(o[r].__=t,e=fe(o[r],e,n));return e}t.__e!=e&&(e&&t.type&&!n.contains(e)&&(e=I(t)),n.insertBefore(t.__e,e||null),e=t.__e);do e=e&&e.nextSibling;while(e!=null&&e.nodeType===8);return e}function Oe(t,e,n,o){var r=t.key,_=t.type,c=n-1,a=n+1,u=e[n];if(u===null||u&&r==u.key&&_===u.type&&(131072&u.__u)==0)return n;if(o>(u!=null&&(131072&u.__u)==0?1:0))for(;c>=0||a<e.length;){if(c>=0){if((u=e[c])&&(131072&u.__u)==0&&r==u.key&&_===u.type)return c;c--}if(a<e.length){if((u=e[a])&&(131072&u.__u)==0&&r==u.key&&_===u.type)return a;a++}}return-1}function _e(t,e,n){e[0]==="-"?t.setProperty(e,n??""):t[e]=n==null?"":typeof n!="number"||Re.test(e)?n:n+"px"}function A(t,e,n,o,r){var _;e:if(e==="style")if(typeof n=="string")t.style.cssText=n;else{if(typeof o=="string"&&(t.style.cssText=o=""),o)for(e in o)n&&e in n||_e(t.style,e,"");if(n)for(e in n)o&&n[e]===o[e]||_e(t.style,e,n[e])}else if(e[0]==="o"&&e[1]==="n")_=e!==(e=e.replace(/(PointerCapture)$|Capture$/i,"$1")),e=e.toLowerCase()in t||e==="onFocusOut"||e==="onFocusIn"?e.toLowerCase().slice(2):e.slice(2),t.l||(t.l={}),t.l[e+_]=n,n?o?n.u=o.u:(n.u=X,t.addEventListener(e,_?K:G,_)):t.removeEventListener(e,_?K:G,_);else{if(r=="http://www.w3.org/2000/svg")e=e.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(e!="width"&&e!="height"&&e!="href"&&e!="list"&&e!="form"&&e!="tabIndex"&&e!="download"&&e!="rowSpan"&&e!="colSpan"&&e!="role"&&e!="popover"&&e in t)try{t[e]=n??"";break e}catch{}typeof n=="function"||(n==null||n===!1&&e[4]!=="-"?t.removeAttribute(e):t.setAttribute(e,e=="popover"&&n==1?"":n))}}function ae(t){return function(e){if(this.l){var n=this.l[e.type+t];if(e.t==null)e.t=X++;else if(e.t<n.u)return;return n(m.event?m.event(e):e)}}}function Q(t,e,n,o,r,_,c,a,u,s){var p,i,f,d,b,x,C,h,v,H,M,P,F,oe,z,j,k=e.type;if(e.constructor!==void 0)return null;128&n.__u&&(u=!!(32&n.__u),_=[a=e.__e=n.__e]),(p=m.__b)&&p(e);e:if(typeof k=="function")try{if(h=e.props,v="prototype"in k&&k.prototype.render,H=(p=k.contextType)&&o[p.__c],M=p?H?H.props.value:p.__:o,n.__c?C=(i=e.__c=n.__c).__=i.__E:(v?e.__c=i=new k(h,M):(e.__c=i=new B(h,M),i.constructor=k,i.render=We),H&&H.sub(i),i.props=h,i.state||(i.state={}),i.context=M,i.__n=o,f=i.__d=!0,i.__h=[],i._sb=[]),v&&i.__s==null&&(i.__s=i.state),v&&k.getDerivedStateFromProps!=null&&(i.__s==i.state&&(i.__s=E({},i.__s)),E(i.__s,k.getDerivedStateFromProps(h,i.__s))),d=i.props,b=i.state,i.__v=e,f)v&&k.getDerivedStateFromProps==null&&i.componentWillMount!=null&&i.componentWillMount(),v&&i.componentDidMount!=null&&i.__h.push(i.componentDidMount);else{if(v&&k.getDerivedStateFromProps==null&&h!==d&&i.componentWillReceiveProps!=null&&i.componentWillReceiveProps(h,M),!i.__e&&(i.shouldComponentUpdate!=null&&i.shouldComponentUpdate(h,i.__s,M)===!1||e.__v===n.__v)){for(e.__v!==n.__v&&(i.props=h,i.state=i.__s,i.__d=!1),e.__e=n.__e,e.__k=n.__k,e.__k.some(function(U){U&&(U.__=e)}),P=0;P<i._sb.length;P++)i.__h.push(i._sb[P]);i._sb=[],i.__h.length&&c.push(i);break e}i.componentWillUpdate!=null&&i.componentWillUpdate(h,i.__s,M),v&&i.componentDidUpdate!=null&&i.__h.push(function(){i.componentDidUpdate(d,b,x)})}if(i.context=M,i.props=h,i.__P=t,i.__e=!1,F=m.__r,oe=0,v){for(i.state=i.__s,i.__d=!1,F&&F(e),p=i.render(i.props,i.state,i.context),z=0;z<i._sb.length;z++)i.__h.push(i._sb[z]);i._sb=[]}else do i.__d=!1,F&&F(e),p=i.render(i.props,i.state,i.context),i.state=i.__s;while(i.__d&&++oe<25);i.state=i.__s,i.getChildContext!=null&&(o=E(E({},o),i.getChildContext())),v&&!f&&i.getSnapshotBeforeUpdate!=null&&(x=i.getSnapshotBeforeUpdate(d,b)),pe(t,J(j=p!=null&&p.type===N&&p.key==null?p.props.children:p)?j:[j],e,n,o,r,_,c,a,u,s),i.base=e.__e,e.__u&=-161,i.__h.length&&c.push(i),C&&(i.__E=i.__=null)}catch(U){if(e.__v=null,u||_!=null){for(e.__u|=u?160:32;a&&a.nodeType===8&&a.nextSibling;)a=a.nextSibling;_[_.indexOf(a)]=null,e.__e=a}else e.__e=n.__e,e.__k=n.__k;m.__e(U,e,n)}else _==null&&e.__v===n.__v?(e.__k=n.__k,e.__e=n.__e):e.__e=$e(n.__e,e,n,o,r,_,c,u,s);(p=m.diffed)&&p(e)}function me(t,e,n){e.__d=void 0;for(var o=0;o<n.length;o++)Y(n[o],n[++o],n[++o]);m.__c&&m.__c(e,t),t.some(function(r){try{t=r.__h,r.__h=[],t.some(function(_){_.call(r)})}catch(_){m.__e(_,r.__v)}})}function $e(t,e,n,o,r,_,c,a,u){var s,p,i,f,d,b,x,C=n.props,h=e.props,v=e.type;if(v==="svg"?r="http://www.w3.org/2000/svg":v==="math"?r="http://www.w3.org/1998/Math/MathML":r||(r="http://www.w3.org/1999/xhtml"),_!=null){for(s=0;s<_.length;s++)if((d=_[s])&&"setAttribute"in d==!!v&&(v?d.localName===v:d.nodeType===3)){t=d,_[s]=null;break}}if(t==null){if(v===null)return document.createTextNode(h);t=document.createElementNS(r,v,h.is&&h),a&&(m.__m&&m.__m(e,_),a=!1),_=null}if(v===null)C===h||a&&t.data===h||(t.data=h);else{if(_=_&&$.call(t.childNodes),C=n.props||D,!a&&_!=null)for(C={},s=0;s<t.attributes.length;s++)C[(d=t.attributes[s]).name]=d.value;for(s in C)if(d=C[s],s!="children"){if(s=="dangerouslySetInnerHTML")i=d;else if(!(s in h)){if(s=="value"&&"defaultValue"in h||s=="checked"&&"defaultChecked"in h)continue;A(t,s,null,d,r)}}for(s in h)d=h[s],s=="children"?f=d:s=="dangerouslySetInnerHTML"?p=d:s=="value"?b=d:s=="checked"?x=d:a&&typeof d!="function"||C[s]===d||A(t,s,d,C[s],r);if(p)a||i&&(p.__html===i.__html||p.__html===t.innerHTML)||(t.innerHTML=p.__html),e.__k=[];else if(i&&(t.innerHTML=""),pe(t,J(f)?f:[f],e,n,o,v==="foreignObject"?"http://www.w3.org/1999/xhtml":r,_,c,_?_[0]:n.__k&&I(n,0),a,u),_!=null)for(s=_.length;s--;)ue(_[s]);a||(s="value",v==="progress"&&b==null?t.removeAttribute("value"):b!==void 0&&(b!==t[s]||v==="progress"&&!b||v==="option"&&b!==C[s])&&A(t,s,b,C[s],r),s="checked",x!==void 0&&x!==t[s]&&A(t,s,x,C[s],r))}return t}function Y(t,e,n){try{if(typeof t=="function"){var o=typeof t.__u=="function";o&&t.__u(),o&&e==null||(t.__u=t(e))}else t.current=e}catch(r){m.__e(r,n)}}function he(t,e,n){var o,r;if(m.unmount&&m.unmount(t),(o=t.ref)&&(o.current&&o.current!==t.__e||Y(o,null,e)),(o=t.__c)!=null){if(o.componentWillUnmount)try{o.componentWillUnmount()}catch(_){m.__e(_,e)}o.base=o.__P=null}if(o=t.__k)for(r=0;r<o.length;r++)o[r]&&he(o[r],e,n||typeof t.type!="function");n||ue(t.__e),t.__c=t.__=t.__e=t.__d=void 0}function We(t,e,n){return this.constructor(t,n)}function ve(t,e,n){var o,r,_,c;m.__&&m.__(t,e),r=(o=typeof n=="function")?null:n&&n.__k||e.__k,_=[],c=[],Q(e,t=(!o&&n||e).__k=l(N,null,[t]),r||D,D,e.namespaceURI,!o&&n?[n]:r?null:e.firstChild?$.call(e.childNodes):null,_,!o&&n?n:r?r.__e:e.firstChild,o,c),me(_,t,c)}$=ce.slice,m={__e:function(t,e,n,o){for(var r,_,c;e=e.__;)if((r=e.__c)&&!r.__)try{if((_=r.constructor)&&_.getDerivedStateFromError!=null&&(r.setState(_.getDerivedStateFromError(t)),c=r.__d),r.componentDidCatch!=null&&(r.componentDidCatch(t,o||{}),c=r.__d),c)return r.__E=r}catch(a){t=a}throw t}},se=0,Ue=function(t){return t!=null&&t.constructor==null},B.prototype.setState=function(t,e){var n;n=this.__s!=null&&this.__s!==this.state?this.__s:this.__s=E({},this.state),typeof t=="function"&&(t=t(E({},n),this.props)),t&&E(n,t),t!=null&&this.__v&&(e&&this._sb.push(e),ie(this))},B.prototype.forceUpdate=function(t){this.__v&&(this.__e=!0,t&&this.__h.push(t),ie(this))},B.prototype.render=N,w=[],le=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,q=function(t,e){return t.__v.__b-e.__v.__b},O.__r=0,X=0,G=ae(!1),K=ae(!0),Ae=0;var L,g,Z,ge,V=0,Ee=[],y=m,be=y.__b,ye=y.__r,Ce=y.diffed,xe=y.__c,ke=y.unmount,Te=y.__;function te(t,e){y.__h&&y.__h(g,t,V||e),V=0;var n=g.__H||(g.__H={__:[],__h:[]});return t>=n.__.length&&n.__.push({}),n.__[t]}function S(t){return V=1,Ve(Ne,t)}function Ve(t,e,n){var o=te(L++,2);if(o.t=t,!o.__c&&(o.__=[n?n(e):Ne(void 0,e),function(a){var u=o.__N?o.__N[0]:o.__[0],s=o.t(u,a);u!==s&&(o.__N=[s,o.__[1]],o.__c.setState({}))}],o.__c=g,!g.u)){var r=function(a,u,s){if(!o.__c.__H)return!0;var p=o.__c.__H.__.filter(function(f){return!!f.__c});if(p.every(function(f){return!f.__N}))return!_||_.call(this,a,u,s);var i=!1;return p.forEach(function(f){if(f.__N){var d=f.__[0];f.__=f.__N,f.__N=void 0,d!==f.__[0]&&(i=!0)}}),!(!i&&o.__c.props===a)&&(!_||_.call(this,a,u,s))};g.u=!0;var _=g.shouldComponentUpdate,c=g.componentWillUpdate;g.componentWillUpdate=function(a,u,s){if(this.__e){var p=_;_=void 0,r(a,u,s),_=p}c&&c.call(this,a,u,s)},g.shouldComponentUpdate=r}return o.__N||o.__}function Se(t,e){var n=te(L++,3);!y.__s&&Ie(n.__H,e)&&(n.__=t,n.i=e,g.__H.__h.push(n))}function we(t){return V=5,je(function(){return{current:t}},[])}function je(t,e){var n=te(L++,7);return Ie(n.__H,e)&&(n.__=t(),n.__H=e,n.__h=t),n.__}function qe(){for(var t;t=Ee.shift();)if(t.__P&&t.__H)try{t.__H.__h.forEach(W),t.__H.__h.forEach(ee),t.__H.__h=[]}catch(e){t.__H.__h=[],y.__e(e,t.__v)}}y.__b=function(t){g=null,be&&be(t)},y.__=function(t,e){t&&e.__k&&e.__k.__m&&(t.__m=e.__k.__m),Te&&Te(t,e)},y.__r=function(t){ye&&ye(t),L=0;var e=(g=t.__c).__H;e&&(Z===g?(e.__h=[],g.__h=[],e.__.forEach(function(n){n.__N&&(n.__=n.__N),n.i=n.__N=void 0})):(e.__h.forEach(W),e.__h.forEach(ee),e.__h=[],L=0)),Z=g},y.diffed=function(t){Ce&&Ce(t);var e=t.__c;e&&e.__H&&(e.__H.__h.length&&(Ee.push(e)!==1&&ge===y.requestAnimationFrame||((ge=y.requestAnimationFrame)||Ge)(qe)),e.__H.__.forEach(function(n){n.i&&(n.__H=n.i),n.i=void 0})),Z=g=null},y.__c=function(t,e){e.some(function(n){try{n.__h.forEach(W),n.__h=n.__h.filter(function(o){return!o.__||ee(o)})}catch(o){e.some(function(r){r.__h&&(r.__h=[])}),e=[],y.__e(o,n.__v)}}),xe&&xe(t,e)},y.unmount=function(t){ke&&ke(t);var e,n=t.__c;n&&n.__H&&(n.__H.__.forEach(function(o){try{W(o)}catch(r){e=r}}),n.__H=void 0,e&&y.__e(e,n.__v))};var Me=typeof requestAnimationFrame=="function";function Ge(t){var e,n=function(){clearTimeout(o),Me&&cancelAnimationFrame(e),setTimeout(t)},o=setTimeout(n,100);Me&&(e=requestAnimationFrame(n))}function W(t){var e=g,n=t.__c;typeof n=="function"&&(t.__c=void 0,n()),g=e}function ee(t){var e=g;t.__c=t.__(),g=e}function Ie(t,e){return!t||t.length!==e.length||e.some(function(n,o){return n!==t[o]})}function Ne(t,e){return typeof e=="function"?e(t):e}function He(t,e){let n=we(void 0),o=(...r)=>{n.current&&clearTimeout(n.current),n.current=window.setTimeout(()=>{t(...r)},e)};return Se(()=>()=>{n.current&&clearTimeout(n.current)},[]),o}var Ke=new Intl.NumberFormat("en-US"),T=({value:t})=>l(N,null,Ke.format(t));var ne=[{bg:"#c1e7ff",fg:"#000"},{bg:"#abd2ec",fg:"#000"},{bg:"#94bed9",fg:"#000"},{bg:"#7faac6",fg:"#000"},{bg:"#6996b3",fg:"#fff"},{bg:"#5383a1",fg:"#fff"},{bg:"#3d708f",fg:"#fff"},{bg:"#255e7e",fg:"#fff"}],Xe=({scoreBy:t,nodes:e,epoch:n})=>{if(e.length===0)return null;let o=t;if(t.field!=="tokens"){let r=e[0][t.field],_=e[0][t.field];for(let c=1;c<e.length;c++)r=Math.max(r,e[c][t.field]),_=Math.max(_,e[c][t.field]);o={field:t.field,max:r,min:_}}return l("div",{className:"node-children"},e.map((r,_)=>r.type===2?l(Je,{scoreBy:o,key:_,node:r}):l(Le,{scoreBy:o,key:_,node:r,epoch:n})))},Fe=({node:t})=>l("div",{className:"node-stats"},"Used Tokens: ",l(T,{value:t.tokens})," / ","Priority:"," ",t.priority===Number.MAX_SAFE_INTEGER?"MAX":l(T,{value:t.priority})),De=({scoreBy:t,node:e,children:n,...o})=>{let r=0;if(t.max!==t.min){let _=(e[t.field]-t.min)/(t.max-t.min);r=Math.round((ne.length-1)*_)}return l("div",{...o,className:`node ${o.className||""}`,style:{backgroundColor:ne[r].bg,color:ne[r].fg}},n)},Je=({scoreBy:t,node:e})=>l(De,{node:e,scoreBy:t,tabIndex:0,className:"node-text"},l(Fe,{node:e}),l("div",{className:"node-content"},e.value)),Le=({scoreBy:t,node:e,epoch:n})=>{let[o,r]=S(!1),_=EPOCHS.findIndex(i=>i.elements.some(f=>f.id===e.id));if(_===void 0)throw new Error(`epoch not found for ${e.id}`);let c=EPOCHS[_],a=EPOCHS.at(n),u=c.elements.find(i=>i.id===e.id).tokenBudget,s=e.type===1?e.name||e.role.slice(0,1).toUpperCase()+e.role.slice(1)+"Message":e.name,p=_===n?"new-in-epoch":n<_?"before-epoch":"";return l(De,{node:e,scoreBy:t,className:p},l(Fe,{node:e}),l("div",{className:"node-content node-toggler",onClick:()=>r(i=>!i)},l("span",null,a?.inNode===e.id?"\\u{1F3C3} ":"",`<${s}>`),l("span",{className:"indicator"},o?"[+]":"[-]")),n===_&&l("div",{className:"node-stats"},"Token Budget: ",l(T,{value:u})),a?.inNode===e.id&&l("div",{className:"node-stats"},"Rendering flexGrow=",a.flexValue,l("br",null),l("br",null),"Splitting"," ",a.reservedTokens?`${a.tokenBudget} - ${a.reservedTokens} (reserved) = `:"",l(T,{value:a.tokenBudget})," tokens among ",a.elements.length," ","elements"),!o&&l(Xe,{nodes:e.children,scoreBy:t,epoch:n}))},Pe=({scoreBy:t,node:e,epoch:n})=>{let o;return t==="tokens"?o={field:"tokens",max:e.tokens,min:0}:o={field:"priority",max:e.priority,min:e.priority},l(Le,{scoreBy:o,node:e,epoch:n})};var ze=({label:t,value:e,onChange:n,min:o,max:r})=>{let _=a=>{n(a.target.valueAsNumber)},c=`number-slider-${Math.random()}`;return l("div",{className:"controls-slider"},l("label",{htmlFor:c},t),l("input",{id:c,type:"range",min:o,max:r,value:e,onInput:_}),l("input",{type:"number",min:o,value:e,onInput:_,onChange:_}))},Qe=({scoreBy:t,onScoreByChange:e})=>{let n=o=>{let r=o.target.value;e(r)};return l("div",{className:"controls-scoreby"},"Visualize by",l("label",null,l("input",{type:"radio",name:"scoreBy",value:"tokens",checked:t==="tokens",onChange:n}),"Tokens"),l("label",null,l("input",{type:"radio",name:"scoreBy",value:"priority",checked:t==="priority",onChange:n}),"Priority"))},Ye=()=>{let[t,e]=S(DEFAULT_TOKENS),[n,o]=S(EPOCHS.length),[r,_]=S(DEFAULT_MODEL),[c,a]=S("tokens"),[u,s]=S("epoch"),p=He(async f=>{if(f===DEFAULT_TOKENS)return DEFAULT_MODEL;let b=await(await fetch(`${SERVER_ADDRESS}regen?n=${f}`)).json();_(b)},100),i=f=>{e(f),p(f),o(EPOCHS.length)};return l("div",{className:"app"},l("div",{className:"controls"},l("div",{className:"tabs"},l("div",{className:`tab ${u==="epoch"?"active":""}`,onClick:()=>s("epoch")},"View Order"),l("div",{className:`tab ${u==="tokens"?"active":""}`,onClick:()=>s("tokens")},"Change Token Budget")),l("div",{className:`tab-content ${u==="epoch"?"active":""}`},l(ze,{label:"Render Epoch",value:n,onChange:o,min:0,max:EPOCHS.length})),l("div",{className:`tab-content ${u==="tokens"?"active":""}`},l(ze,{label:"Token Budget",value:t,onChange:i,min:0,max:DEFAULT_TOKENS*2}))),l("div",{className:"control-description"},u==="tokens"?l("p",null,"Token changes here will prune elements and re-render Expandable ones, but the entire prompt is not being re-rendered"):l("p",null,"Changing the render epoch lets you see the order in which elements are rendered and how the token budget is allocated."),l("div",{className:"controls-stats"},l("span",null,"Used ",l(T,{value:r.container.tokens}),"/",l(T,{value:r.budget})," tokens"),l("span",null,"Removed ",l(T,{value:r.removed})," nodes"),l(Qe,{scoreBy:c,onScoreByChange:a}))),l(Pe,{node:r.container,scoreBy:c,epoch:n}))};ve(l(Ye,null),document.body);})();\n';
    exports2.tracerCss = "body{font-family:-apple-system,BlinkMacSystemFont,Segoe WPC,Segoe UI,system-ui,Ubuntu,Droid Sans,sans-serif;background:#fff;margin:0}.render-pass{border-left:2px solid #ccc;&:hover{border-left-color:#000}}.literals li{white-space:pre;font-family:SF Mono,Monaco,Menlo,Consolas,Ubuntu Mono,Liberation Mono,DejaVu Sans Mono,Courier New,monospace}.render-flex,.render-element{padding-left:10px}.node{border:1px solid rgba(255,255,255,.5);margin:3px 10px;padding:3px 10px;border-radius:4px;width:fit-content;&.new-in-epoch{box-shadow:0 0 3px 2px red}&.before-epoch{pointer-events:none;filter:grayscale(1);color:#777!important;.node{color:#777!important}}&:last-child{margin-bottom:0}}.node-content{font-weight:700}.node-children{margin-left:20px;border-left:2px dashed rgba(255,255,255,.5);padding-left:10px}.node-toggler{cursor:pointer;display:flex;align-items:center;justify-content:space-between;.indicator{font-size:.7em}}.node-text{width:400px;&:focus,&:focus-within{outline:1px solid orange;.node-content{white-space:normal}}.node-content{font-weight:400;font-size:.8em;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}}.node-stats{font-family:SF Mono,Monaco,Menlo,Consolas,Ubuntu Mono,Liberation Mono,DejaVu Sans Mono,Courier New,monospace;font-size:.8em}.control-description{padding:10px;p{font-size:.9em;max-width:500px;margin-top:0}}.controls{display:flex;flex-direction:column;gap:10px;position:sticky;top:0;padding:10px;background:#fff;border-bottom:1px solid #ccc;z-index:1}.controls-slider{display:flex;align-items:center;gap:10px}.controls-stats{display:flex;gap:20px;list-style:none;padding:0;margin-top:0}.controls-scoreby{display:flex;gap:10px}.tabs{display:flex;border-bottom:1px solid #ccc;margin-bottom:10px}.tab{padding:10px;cursor:pointer;border:1px solid transparent;border-bottom:none}.tab.active{border-color:#ccc;border-bottom:1px solid #fff;background-color:#f9f9f9}.tab-content{display:none}.tab-content.active{display:block}\n";
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/htmlTracer.js
var require_htmlTracer = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/htmlTracer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.HTMLTracer = void 0;
    var htmlTracerSrc_1 = require_htmlTracerSrc();
    var materialized_1 = require_materialized();
    var mode_1 = require_mode();
    var HTMLTracer = class {
      traceData;
      epochs = [];
      addRenderEpoch(epoch) {
        this.epochs.push(epoch);
      }
      includeInEpoch(data) {
        this.epochs[this.epochs.length - 1].elements.push(data);
      }
      didMaterializeTree(traceData) {
        this.traceData = traceData;
      }
      /**
       * Returns HTML to trace the output. Note that is starts a server which is
       * used for client interaction to resize the prompt and its `address` should
       * be displayed or opened as a link in a browser.
       *
       * The server runs until it is disposed.
       */
      async serveHTML() {
        return RequestServer.create({
          epochs: this.epochs,
          traceData: mustGet(this.traceData)
        });
      }
      /**
       * Gets an HTML router for a server at the URL. URL is the form `http://127.0.0.1:1234`.
       */
      serveRouter(url) {
        return new RequestRouter({
          baseAddress: url,
          epochs: this.epochs,
          traceData: mustGet(this.traceData)
        });
      }
    };
    exports2.HTMLTracer = HTMLTracer;
    var RequestRouter = class {
      opts;
      serverToken = crypto.randomUUID();
      constructor(opts) {
        this.opts = opts;
      }
      route(httpIncomingMessage, httpOutgoingMessage) {
        const req = httpIncomingMessage;
        const res = httpOutgoingMessage;
        const url = new URL(req.url || "/", `http://localhost`);
        const prefix = `/${this.serverToken}`;
        switch (url.pathname) {
          case prefix:
          case `${prefix}/`:
            this.onRoot(url, req, res);
            break;
          case `${prefix}/regen`:
            this.onRegen(url, req, res);
            break;
          default:
            return false;
        }
        return true;
      }
      get address() {
        return this.opts.baseAddress + "/" + this.serverToken;
      }
      async getHTML() {
        const { traceData, epochs } = this.opts;
        return `<body>
			<style>${htmlTracerSrc_1.tracerCss}</style>
			<script>
				const DEFAULT_TOKENS = ${JSON.stringify(traceData.budget)};
				const EPOCHS = ${JSON.stringify(epochs)};
				const DEFAULT_MODEL = ${JSON.stringify(await serializeRenderData(traceData.tokenizer, traceData.renderedTree))};
				const SERVER_ADDRESS = ${JSON.stringify(this.opts.baseAddress + "/" + this.serverToken + "/")};
				${htmlTracerSrc_1.tracerSrc}
			</script>
		</body>`;
      }
      async onRegen(url, _req, res) {
        const { traceData } = this.opts;
        const budget = Number(url.searchParams.get("n") || traceData.budget);
        const renderedTree = await traceData.renderTree(budget);
        const serialized = await serializeRenderData(traceData.tokenizer, renderedTree);
        const json = JSON.stringify(serialized);
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Length", Buffer.byteLength(json));
        res.end(json);
      }
      onRoot(_url, _req, res) {
        this.getHTML().then((html) => {
          res.setHeader("Content-Type", "text/html");
          res.setHeader("Content-Length", Buffer.byteLength(html));
          res.end(html);
        });
      }
    };
    var RequestServer = class _RequestServer extends RequestRouter {
      server;
      static async create(opts) {
        const { createServer } = await Promise.resolve().then(() => require("http"));
        const server = createServer((req, res) => {
          try {
            if (!instance.route(req, res)) {
              res.statusCode = 404;
              res.end("Not Found");
            }
          } catch (e) {
            res.statusCode = 500;
            res.end(String(e));
          }
        });
        const port2 = await new Promise((resolve2, reject) => {
          server.listen(0, "127.0.0.1", () => resolve2(server.address().port)).on("error", reject);
        });
        const instance = new _RequestServer({
          ...opts,
          baseAddress: `http://127.0.0.1:${port2}`
        }, server);
        return instance;
      }
      constructor(opts, server) {
        super(opts);
        this.server = server;
      }
      dispose() {
        this.server.closeAllConnections();
        this.server.close();
      }
    };
    async function serializeRenderData(tokenizer, tree) {
      return {
        container: await serializeMaterialized(tokenizer, tree.container, false),
        removed: tree.removed,
        budget: tree.budget
      };
    }
    async function serializeMaterialized(tokenizer, materialized, inChatMessage) {
      const common = {
        metadata: materialized.metadata.map(serializeMetadata),
        priority: materialized.priority
      };
      if (materialized instanceof materialized_1.MaterializedChatMessageTextChunk) {
        return {
          ...common,
          type: 2,
          value: materialized.text,
          tokens: await materialized.upperBoundTokenCount(tokenizer)
        };
      } else if (materialized instanceof materialized_1.MaterializedChatMessageImage) {
        return {
          ...common,
          name: materialized.id.toString(),
          id: materialized.id,
          type: 3,
          value: materialized.src,
          tokens: await materialized.upperBoundTokenCount(tokenizer)
        };
      } else if (materialized instanceof materialized_1.MaterializedChatMessageOpaque || materialized instanceof materialized_1.MaterializedChatMessageBreakpoint) {
        return void 0;
      } else {
        const containerCommon = {
          ...common,
          id: materialized.id,
          name: materialized.name,
          children: (await Promise.all(materialized.children.map((c) => serializeMaterialized(tokenizer, c, inChatMessage || materialized instanceof materialized_1.MaterializedChatMessage)))).filter((r) => !!r),
          tokens: inChatMessage ? await materialized.upperBoundTokenCount(tokenizer) : await materialized.tokenCount(tokenizer)
        };
        if (materialized instanceof materialized_1.GenericMaterializedContainer) {
          return {
            ...containerCommon,
            type: 0
          };
        } else if (materialized instanceof materialized_1.MaterializedChatMessage) {
          const content = materialized.text.filter((element) => typeof element === "string").join("").trim();
          return {
            ...containerCommon,
            type: 1,
            role: mode_1.Raw.ChatRole.display(materialized.role),
            text: content
          };
        }
      }
      assertNever2(materialized);
    }
    function assertNever2(x) {
      throw new Error("unreachable");
    }
    function serializeMetadata(metadata) {
      return { name: metadata.constructor.name, value: JSON.stringify(metadata) };
    }
    var mustGet = (value) => {
      if (value === void 0) {
        throw new Error("Prompt must be rendered before calling HTMLTRacer.serveHTML");
      }
      return value;
    };
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/tracer.js
var require_tracer = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/tracer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/tsx-globals.js
var require_tsx_globals = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/tsx-globals.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/types.js
var require_types = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/@vscode/prompt-tsx/dist/base/index.js
var require_base = __commonJS({
  "node_modules/@vscode/prompt-tsx/dist/base/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.contentType = exports2.PromptRenderer = exports2.MetadataMap = exports2.PromptElement = exports2.JSONTree = void 0;
    exports2.renderPrompt = renderPrompt;
    exports2.renderElementJSON = renderElementJSON;
    var mode_1 = require_mode();
    var promptRenderer_1 = require_promptRenderer();
    var tokenizer_1 = require_tokenizer();
    __exportStar(require_htmlTracer(), exports2);
    exports2.JSONTree = require_jsonTypes();
    __exportStar(require_mode(), exports2);
    __exportStar(require_promptElements(), exports2);
    __exportStar(require_results(), exports2);
    __exportStar(require_tracer(), exports2);
    __exportStar(require_tsx_globals(), exports2);
    __exportStar(require_types(), exports2);
    var promptElement_1 = require_promptElement();
    Object.defineProperty(exports2, "PromptElement", { enumerable: true, get: function() {
      return promptElement_1.PromptElement;
    } });
    var promptRenderer_2 = require_promptRenderer();
    Object.defineProperty(exports2, "MetadataMap", { enumerable: true, get: function() {
      return promptRenderer_2.MetadataMap;
    } });
    Object.defineProperty(exports2, "PromptRenderer", { enumerable: true, get: function() {
      return promptRenderer_2.PromptRenderer;
    } });
    async function renderPrompt(ctor, props, endpoint, tokenizerMetadata, progress, token, mode = mode_1.OutputMode.VSCode) {
      let tokenizer = "countTokens" in tokenizerMetadata ? new tokenizer_1.VSCodeTokenizer((text, token2) => tokenizerMetadata.countTokens(text, token2), mode) : tokenizerMetadata;
      const renderer = new promptRenderer_1.PromptRenderer(endpoint, ctor, props, tokenizer);
      const renderResult = await renderer.render(progress, token);
      const usedContext = renderer.getUsedContext();
      return { ...renderResult, usedContext };
    }
    exports2.contentType = "application/vnd.codechat.prompt+json.1";
    function renderElementJSON(ctor, props, budgetInformation, token) {
      const renderer = new promptRenderer_1.PromptRenderer(
        { modelMaxPromptTokens: budgetInformation?.tokenBudget ?? Number.MAX_SAFE_INTEGER },
        ctor,
        props,
        // note: if tokenBudget is given, countTokens is also give and vise-versa.
        // `1` is used only as a dummy fallback to avoid errors if no/unlimited budget is provided.
        {
          mode: mode_1.OutputMode.Raw,
          countMessageTokens(message) {
            throw new Error("Tools may only return text, not messages.");
          },
          tokenLength(part, token2) {
            if (part.type === mode_1.Raw.ChatCompletionContentPartKind.Text) {
              return Promise.resolve(budgetInformation?.countTokens(part.text, token2) ?? Promise.resolve(1));
            }
            return Promise.resolve(1);
          }
        }
      );
      return renderer.renderElementJSON(token);
    }
  }
});

// node_modules/@microsoft/tiktokenizer/dist/bytePairEncode.js
var require_bytePairEncode = __commonJS({
  "node_modules/@microsoft/tiktokenizer/dist/bytePairEncode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.bytePairEncode = exports2.BinaryMap = exports2.binaryMapKey = void 0;
    var binaryMapKey = (k, start, end) => {
      const length = end - start;
      const lowerMask = 16777215 >>> Math.max(0, (3 - length) * 8);
      const lower = (k[start + 0] | k[start + 1] << 8 | k[start + 2] << 16) & lowerMask;
      const upperMask = 16777215 >>> Math.min(31, Math.max(0, (6 - length) * 8));
      const upper = (k[start + 3] | k[start + 4] << 8 | k[start + 5] << 16) & upperMask;
      return lower + 16777216 * upper;
    };
    exports2.binaryMapKey = binaryMapKey;
    var BinaryMap = class _BinaryMap {
      constructor() {
        this.nested = /* @__PURE__ */ new Map();
        this.final = /* @__PURE__ */ new Map();
      }
      get(key, start = 0, end = key.length) {
        const isFinal = end < 6 + start;
        const mapKey = (0, exports2.binaryMapKey)(key, start, end);
        if (isFinal) {
          return this.final.get(mapKey);
        }
        return this.nested.get(mapKey)?.get(key, 6 + start, end);
      }
      set(key, value) {
        const k = (0, exports2.binaryMapKey)(key, 0, key.length);
        const isFinal = key.length < 6;
        if (isFinal) {
          this.final.set(k, value);
          return;
        }
        const existing = this.nested.get(k);
        if (existing instanceof _BinaryMap) {
          existing.set(key.subarray(
            6
            /* Constant.BytesPerLevel */
          ), value);
        } else {
          const newMap = new _BinaryMap();
          newMap.set(key.subarray(
            6
            /* Constant.BytesPerLevel */
          ), value);
          this.nested.set(k, newMap);
        }
      }
    };
    exports2.BinaryMap = BinaryMap;
    var ranksBuf = new Int32Array(128);
    var indicesBuf = new Int32Array(128);
    function bytePairEncode(mergingBytes, ranks, length) {
      if (length === 1) {
        return [ranks.get(mergingBytes)];
      }
      let minRank = 2147483647;
      let minIndex = -1;
      while (ranksBuf.length < length * 2) {
        indicesBuf = new Int32Array(indicesBuf.length * 2);
        ranksBuf = new Int32Array(ranksBuf.length * 2);
      }
      for (let i = 0; i < length - 1; i++) {
        const rank = ranks.get(mergingBytes, i, i + 2) ?? 2147483647;
        if (rank < minRank) {
          minRank = rank;
          minIndex = i;
        }
        indicesBuf[i] = i;
        ranksBuf[i] = rank;
      }
      indicesBuf[length - 1] = length - 1;
      ranksBuf[length - 1] = 2147483647;
      indicesBuf[length] = length;
      ranksBuf[length] = 2147483647;
      let maxIndex = length + 1;
      function getRank(startIndex, skip = 0) {
        if (startIndex + skip + 2 < maxIndex) {
          const rank = ranks.get(mergingBytes, indicesBuf[startIndex], indicesBuf[startIndex + skip + 2]);
          if (rank !== void 0) {
            return rank;
          }
        }
        return 2147483647;
      }
      while (minRank !== 2147483647) {
        ranksBuf[indicesBuf[minIndex]] = getRank(minIndex, 1);
        if (minIndex > 0) {
          ranksBuf[indicesBuf[minIndex - 1]] = getRank(minIndex - 1, 1);
        }
        for (let i = minIndex + 1; i < maxIndex - 1; i++) {
          indicesBuf[i] = indicesBuf[i + 1];
        }
        maxIndex--;
        minIndex = -1;
        minRank = 2147483647;
        for (let i = 0; i < maxIndex - 1; i++) {
          const rank = ranksBuf[indicesBuf[i]];
          if (ranksBuf[indicesBuf[i]] < minRank) {
            minRank = rank;
            minIndex = i;
          }
        }
      }
      const outList = [];
      for (let i = 0; i < maxIndex - 1; i++) {
        outList.push(ranks.get(mergingBytes, indicesBuf[i], indicesBuf[i + 1]));
      }
      return outList;
    }
    exports2.bytePairEncode = bytePairEncode;
  }
});

// node_modules/@microsoft/tiktokenizer/dist/textEncoder.js
var require_textEncoder = __commonJS({
  "node_modules/@microsoft/tiktokenizer/dist/textEncoder.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.makeTextEncoder = void 0;
    var UniversalTextEncoder = class {
      constructor() {
        this.length = 0;
        this.encoder = new TextEncoder();
      }
      encode(text) {
        const arr = this.encoder.encode(text);
        this.length = arr.length;
        return arr;
      }
    };
    var NodeTextEncoder = class {
      constructor() {
        this.buffer = Buffer.alloc(256);
        this.length = 0;
      }
      encode(text) {
        while (true) {
          this.length = this.buffer.write(text, "utf8");
          if (this.length < this.buffer.length - 4) {
            return this.buffer;
          }
          this.buffer = Buffer.alloc(this.length * 2);
          this.length = this.buffer.write(text);
        }
      }
    };
    var makeTextEncoder = () => typeof Buffer !== "undefined" ? new NodeTextEncoder() : new UniversalTextEncoder();
    exports2.makeTextEncoder = makeTextEncoder;
  }
});

// node_modules/@microsoft/tiktokenizer/dist/lru.js
var require_lru = __commonJS({
  "node_modules/@microsoft/tiktokenizer/dist/lru.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LRUCache = void 0;
    var LRUCache2 = class {
      constructor(size) {
        this.size = size;
        this.nodes = /* @__PURE__ */ new Map();
      }
      get(key) {
        const node = this.nodes.get(key);
        if (node) {
          this.moveToHead(node);
          return node.value;
        }
        return void 0;
      }
      set(key, value) {
        const node = this.nodes.get(key);
        if (node) {
          node.value = value;
          this.moveToHead(node);
        } else {
          const newNode = new Node3(key, value);
          this.nodes.set(key, newNode);
          this.addNode(newNode);
          if (this.nodes.size > this.size) {
            this.nodes.delete(this.tail.key);
            this.removeNode(this.tail);
          }
        }
      }
      moveToHead(node) {
        this.removeNode(node);
        node.next = void 0;
        node.prev = void 0;
        this.addNode(node);
      }
      addNode(node) {
        if (this.head) {
          this.head.prev = node;
          node.next = this.head;
        }
        if (!this.tail) {
          this.tail = node;
        }
        this.head = node;
      }
      removeNode(node) {
        if (node.prev) {
          node.prev.next = node.next;
        } else {
          this.head = node.next;
        }
        if (node.next) {
          node.next.prev = node.prev;
        } else {
          this.tail = node.prev;
        }
      }
    };
    exports2.LRUCache = LRUCache2;
    var Node3 = class {
      constructor(key, value) {
        this.key = key;
        this.value = value;
      }
    };
  }
});

// node_modules/@microsoft/tiktokenizer/dist/tikTokenizer.js
var require_tikTokenizer = __commonJS({
  "node_modules/@microsoft/tiktokenizer/dist/tikTokenizer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.TikTokenizer = void 0;
    var bytePairEncode_1 = require_bytePairEncode();
    var textEncoder_1 = require_textEncoder();
    var lru_1 = require_lru();
    function loadTikTokenBpe(tikTokenBpeFile) {
      const bpeDict = /* @__PURE__ */ new Map();
      try {
        const fs2 = require("fs");
        const fileContent = fs2.readFileSync(tikTokenBpeFile, "utf-8");
        processBpeRanks(fileContent);
        return bpeDict;
      } catch (ex) {
        throw new Error(`Failed to load from BPE encoder file stream: ${ex}`);
      }
      function processBpeRanks(fileContent) {
        for (const line of fileContent.split(/[\r\n]+/)) {
          if (line.trim() === "") {
            continue;
          }
          const tokens = line.split(" ");
          if (tokens.length !== 2) {
            throw new Error("Invalid format in the BPE encoder file stream");
          }
          const tokenBytes = new Uint8Array(Buffer.from(tokens[0], "base64"));
          const rank = parseInt(tokens[1]);
          if (!isNaN(rank)) {
            bpeDict.set(tokenBytes, rank);
          } else {
            throw new Error(`Can't parse ${tokens[1]} to integer`);
          }
        }
      }
    }
    function escapeRegExp(regex) {
      return regex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    var TikTokenizer2 = class {
      /**
       * Take the encoder tokens mapping from OpenAI tiktoken dump to build the encoder
       * For gpt-3.5-turbo/gpt4, you can download the BPE tokens mapping from:
       * https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken
       * @param tikTokenBpeFileOrDict BPE rank file path or parsed dictionary
       * @param specialTokensEncoder special tokens encoder
       * @param regexPattern regex pattern to split the input text
       * @param cacheSize cache size
       */
      constructor(tikTokenBpeFileOrDict, specialTokensEncoder, regexPattern, cacheSize = 8192) {
        this.textEncoder = (0, textEncoder_1.makeTextEncoder)();
        this.textDecoder = new TextDecoder("utf-8");
        this.cache = new lru_1.LRUCache(cacheSize);
        const bpeDict = typeof tikTokenBpeFileOrDict === "string" ? loadTikTokenBpe(tikTokenBpeFileOrDict) : tikTokenBpeFileOrDict;
        this.init(bpeDict, specialTokensEncoder, regexPattern);
      }
      init(bpeDict, specialTokensEncoder, regexPattern) {
        this.encoder = new bytePairEncode_1.BinaryMap();
        for (const [key, value] of bpeDict) {
          this.encoder.set(key, value);
        }
        this.regex = new RegExp(regexPattern, "gu");
        this.specialTokensRegex = new RegExp(Array.from(specialTokensEncoder.keys()).map((s) => escapeRegExp(s)).join("|"));
        this.specialTokensEncoder = specialTokensEncoder;
        this.decoder = /* @__PURE__ */ new Map();
        for (const [key, value] of bpeDict) {
          this.decoder.set(value, key);
        }
        if (bpeDict.size !== this.decoder.size) {
          throw new Error("Encoder and decoder sizes do not match");
        }
        this.specialTokensDecoder = /* @__PURE__ */ new Map();
        for (const [key, value] of specialTokensEncoder) {
          this.specialTokensDecoder.set(value, key);
        }
      }
      findNextSpecialToken(text, start, allowedSpecial) {
        let startFind = start;
        let nextSpecial = null;
        if (allowedSpecial && this.specialTokensRegex) {
          while (true) {
            nextSpecial = text.slice(startFind).match(this.specialTokensRegex);
            if (!nextSpecial) {
              break;
            }
            if (allowedSpecial && allowedSpecial.includes(nextSpecial[0])) {
              break;
            }
            startFind += nextSpecial.index + 1;
          }
        }
        const end = nextSpecial ? startFind + nextSpecial.index : text.length;
        return [nextSpecial, end];
      }
      /**
       * Encode a string with a set of allowed special tokens that are not broken apart.
       * @param text text to encode
       * @param allowedSpecial allowed special tokens
       * @returns number[] encoded token ids
       */
      encode(text, allowedSpecial) {
        const tokenIds = [];
        let start = 0;
        while (true) {
          let nextSpecial;
          let end;
          [nextSpecial, end] = this.findNextSpecialToken(text, start, allowedSpecial);
          if (end > start) {
            this.encodeByIndex(text, tokenIds, start, end);
          }
          if (nextSpecial) {
            start = start + this.encodeSpecialToken(tokenIds, nextSpecial);
            if (start >= text.length) {
              break;
            }
          } else {
            break;
          }
        }
        return tokenIds;
      }
      encodeSpecialToken(tokenIds, nextSpecial) {
        const token = this.specialTokensEncoder?.get(nextSpecial[0]);
        tokenIds.push(token);
        return nextSpecial.index + nextSpecial[0].length;
      }
      encodeByIndex(text, tokenIds, start, end) {
        let match;
        const substring = text.substring(start, end);
        this.regex.lastIndex = 0;
        while (match = this.regex.exec(substring)) {
          const cached = this.cache.get(match[0]);
          if (cached) {
            for (const b of cached) {
              tokenIds.push(b);
            }
          } else {
            const bytes = this.textEncoder.encode(match[0]);
            const token = this.encoder.get(bytes, 0, this.textEncoder.length);
            if (token !== void 0) {
              tokenIds.push(token);
              this.cache.set(match[0], [token]);
            } else {
              const encodedTokens = (0, bytePairEncode_1.bytePairEncode)(bytes, this.encoder, this.textEncoder.length);
              for (const b of encodedTokens) {
                tokenIds.push(b);
              }
              this.cache.set(match[0], encodedTokens);
            }
          }
        }
      }
      encodeTrimSuffixByIndex(text, tokenIds, start, end, maxTokenCount, tokenCount, encodeLength) {
        let match;
        const substring = text.substring(start, end);
        this.regex.lastIndex = 0;
        while (match = this.regex.exec(substring)) {
          const piece = match[0];
          const cachedTokens = this.cache.get(piece);
          if (cachedTokens) {
            if (tokenCount + cachedTokens.length <= maxTokenCount) {
              tokenCount += cachedTokens.length;
              encodeLength += piece.length;
              tokenIds.push(...cachedTokens);
            } else {
              let remainingTokens = maxTokenCount - tokenCount;
              tokenCount += remainingTokens;
              encodeLength += piece.length;
              tokenIds.push(...cachedTokens.slice(0, remainingTokens));
              break;
            }
          } else {
            const bytes = this.textEncoder.encode(piece);
            const token = this.encoder.get(bytes, 0, bytes.length);
            if (token !== void 0) {
              this.cache.set(piece, [token]);
              if (tokenCount + 1 <= maxTokenCount) {
                tokenCount++;
                encodeLength += piece.length;
                tokenIds.push(token);
              } else {
                break;
              }
            } else {
              const encodedTokens = (0, bytePairEncode_1.bytePairEncode)(bytes, this.encoder, this.textEncoder.length);
              this.cache.set(piece, encodedTokens);
              if (tokenCount + encodedTokens.length <= maxTokenCount) {
                tokenCount += encodedTokens.length;
                encodeLength += piece.length;
                for (const b of encodedTokens) {
                  tokenIds.push(b);
                }
              } else {
                let remainingTokens = maxTokenCount - tokenCount;
                tokenCount += remainingTokens;
                encodeLength += piece.length;
                for (let i = 0; i < remainingTokens; i++) {
                  tokenIds.push(encodedTokens[i]);
                }
                break;
              }
            }
          }
          if (tokenCount >= maxTokenCount) {
            break;
          }
        }
        return { tokenCount, encodeLength };
      }
      /**
       * Encode a piece of text limited by max token count through trimming suffix
       * @param text text to encode
       * @param maxTokenCount max token count
       * @param allowedSpecial allowed special tokens
       * @returns { tokenIds: number[], text: string } encoded token ids and trimmed text
       */
      encodeTrimSuffix(text, maxTokenCount, allowedSpecial) {
        const tokenIds = [];
        let start = 0;
        let tokenCount = 0;
        let encodeLength = 0;
        while (true) {
          let nextSpecial;
          let end;
          [nextSpecial, end] = this.findNextSpecialToken(text, start, allowedSpecial);
          if (end > start) {
            const { tokenCount: newTokenCount, encodeLength: newEncodeLength } = this.encodeTrimSuffixByIndex(text, tokenIds, start, end, maxTokenCount, tokenCount, encodeLength);
            tokenCount = newTokenCount;
            encodeLength = newEncodeLength;
            if (tokenCount >= maxTokenCount) {
              break;
            }
          }
          if (nextSpecial !== null) {
            tokenCount++;
            if (tokenCount <= maxTokenCount) {
              start = start + this.encodeSpecialToken(tokenIds, nextSpecial);
              encodeLength += nextSpecial[0].length;
              if (start >= text.length) {
                break;
              }
            }
            if (tokenCount >= maxTokenCount) {
              break;
            }
          } else {
            break;
          }
        }
        const encodedText = encodeLength === text.length ? text : text.slice(0, encodeLength);
        return { tokenIds, text: encodedText };
      }
      /**
       * Encode a piece of text limited by max token count through trimming prefix
       * @param text text to encode
       * @param maxTokenCount max token count
       * @param allowedSpecial allowed special tokens
       * @returns { tokenIds: number[], text: string } encoded token ids and trimmed text
       */
      encodeTrimPrefix(text, maxTokenCount, allowedSpecial) {
        const tokenIds = [];
        let start = 0;
        let tokenCount = 0;
        let encodeLength = 0;
        const tokenCountMap = /* @__PURE__ */ new Map();
        tokenCountMap.set(tokenCount, encodeLength);
        while (true) {
          let nextSpecial;
          let end;
          [nextSpecial, end] = this.findNextSpecialToken(text, start, allowedSpecial);
          if (end > start) {
            let match;
            const substring = text.substring(start, end);
            this.regex.lastIndex = 0;
            while (match = this.regex.exec(substring)) {
              const piece = match[0];
              const cachedTokens = this.cache.get(piece);
              if (cachedTokens) {
                tokenCount += cachedTokens.length;
                encodeLength += piece.length;
                tokenIds.push(...cachedTokens);
                tokenCountMap.set(tokenCount, encodeLength);
              } else {
                const bytes = this.textEncoder.encode(piece);
                const token = this.encoder.get(bytes);
                if (token !== void 0) {
                  this.cache.set(piece, [token]);
                  tokenCount++;
                  encodeLength += piece.length;
                  tokenIds.push(token);
                  tokenCountMap.set(tokenCount, encodeLength);
                } else {
                  const encodedTokens = (0, bytePairEncode_1.bytePairEncode)(bytes, this.encoder, this.textEncoder.length);
                  this.cache.set(piece, encodedTokens);
                  tokenCount += encodedTokens.length;
                  encodeLength += piece.length;
                  for (const b of encodedTokens) {
                    tokenIds.push(b);
                  }
                  tokenCountMap.set(tokenCount, encodeLength);
                }
              }
            }
          }
          if (nextSpecial !== null) {
            start = start + this.encodeSpecialToken(tokenIds, nextSpecial);
            tokenCount++;
            encodeLength += nextSpecial[0].length;
            tokenCountMap.set(tokenCount, encodeLength);
            if (start >= text.length) {
              break;
            }
          } else {
            break;
          }
        }
        if (tokenCount <= maxTokenCount) {
          return { tokenIds, text };
        }
        const prefixTokenCount = tokenCount - maxTokenCount;
        let actualPrefixTokenCount = 0;
        let actualPrefixStrLength = 0;
        for (const [key, value] of tokenCountMap) {
          if (key >= prefixTokenCount) {
            actualPrefixTokenCount = key;
            actualPrefixStrLength = value;
            break;
          }
        }
        if (actualPrefixTokenCount > maxTokenCount) {
          const encodedTokens = this.encode(text, allowedSpecial);
          const slicedTokens = encodedTokens.slice(encodedTokens.length - maxTokenCount);
          return {
            tokenIds: slicedTokens,
            text: this.decode(slicedTokens)
          };
        }
        return {
          tokenIds: tokenIds.slice(actualPrefixTokenCount),
          text: text.slice(actualPrefixStrLength)
        };
      }
      /**
       * Decode an array of integer token ids
       * @param tokens array of integer token ids
       * @returns string decoded text
       */
      decode(tokens) {
        const decoded = [];
        for (const token of tokens) {
          let tokenBytes = [];
          const value = this.decoder?.get(token);
          if (value !== void 0) {
            tokenBytes = Array.from(value);
          } else {
            const specialTokenValue = this.specialTokensDecoder?.get(token);
            if (specialTokenValue !== void 0) {
              const bytes = this.textEncoder.encode(specialTokenValue);
              tokenBytes = Array.from(bytes.subarray(0, this.textEncoder.length));
            }
          }
          decoded.push(...tokenBytes);
        }
        return this.textDecoder.decode(new Uint8Array(decoded));
      }
    };
    exports2.TikTokenizer = TikTokenizer2;
  }
});

// node_modules/@microsoft/tiktokenizer/dist/tokenizerBuilder.js
var require_tokenizerBuilder = __commonJS({
  "node_modules/@microsoft/tiktokenizer/dist/tokenizerBuilder.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createTokenizer = exports2.createByEncoderName = exports2.createByModelName = exports2.getRegexByModel = exports2.getRegexByEncoder = exports2.getSpecialTokensByModel = exports2.getSpecialTokensByEncoder = exports2.MODEL_TO_ENCODING = void 0;
    var tikTokenizer_1 = require_tikTokenizer();
    var MODEL_PREFIX_TO_ENCODING = /* @__PURE__ */ new Map([
      // chat
      ["gpt-4o-", "o200k_base"],
      ["gpt-4-", "cl100k_base"],
      ["gpt-3.5-turbo-", "cl100k_base"],
      ["gpt-35-turbo-", "cl100k_base"]
      // Azure deployment name
    ]);
    exports2.MODEL_TO_ENCODING = /* @__PURE__ */ new Map([
      // chat
      ["gpt-4o", "o200k_base"],
      ["gpt-4", "cl100k_base"],
      ["gpt-3.5-turbo", "cl100k_base"],
      // text
      ["text-davinci-003", "p50k_base"],
      ["text-davinci-002", "p50k_base"],
      ["text-davinci-001", "r50k_base"],
      ["text-curie-001", "r50k_base"],
      ["text-babbage-001", "r50k_base"],
      ["text-ada-001", "r50k_base"],
      ["davinci", "r50k_base"],
      ["curie", "r50k_base"],
      ["babbage", "r50k_base"],
      ["ada", "r50k_base"],
      // code
      ["code-davinci-002", "p50k_base"],
      ["code-davinci-001", "p50k_base"],
      ["code-cushman-002", "p50k_base"],
      ["code-cushman-001", "p50k_base"],
      ["davinci-codex", "p50k_base"],
      ["cushman-codex", "p50k_base"],
      // edit
      ["text-davinci-edit-001", "p50k_edit"],
      ["code-davinci-edit-001", "p50k_edit"],
      // embeddings
      ["text-embedding-ada-002", "cl100k_base"],
      // old embeddings
      ["text-similarity-davinci-001", "r50k_base"],
      ["text-similarity-curie-001", "r50k_base"],
      ["text-similarity-babbage-001", "r50k_base"],
      ["text-similarity-ada-001", "r50k_base"],
      ["text-search-davinci-doc-001", "r50k_base"],
      ["text-search-curie-doc-001", "r50k_base"],
      ["text-search-babbage-doc-001", "r50k_base"],
      ["text-search-ada-doc-001", "r50k_base"],
      ["code-search-babbage-code-001", "r50k_base"],
      ["code-search-ada-code-001", "r50k_base"],
      // open source
      ["gpt2", "gpt2"]
    ]);
    var ENDOFTEXT = "<|endoftext|>";
    var FIM_PREFIX = "<|fim_prefix|>";
    var FIM_MIDDLE = "<|fim_middle|>";
    var FIM_SUFFIX = "<|fim_suffix|>";
    var ENDOFPROMPT = "<|endofprompt|>";
    var REGEX_PATTERN_1 = "'s|'t|'re|'ve|'m|'ll|'d| ?\\p{L}+| ?\\p{N}+| ?[^\\s\\p{L}\\p{N}]+|\\s+(?!\\S)|\\s+";
    var REGEX_PATTERN_2 = "(?:'s|'S|'t|'T|'re|'RE|'Re|'eR|'ve|'VE|'vE|'Ve|'m|'M|'ll|'lL|'Ll|'LL|'d|'D)|[^\\r\\n\\p{L}\\p{N}]?\\p{L}+|\\p{N}{1,3}| ?[^\\s\\p{L}\\p{N}]+[\\r\\n]*|\\s*[\\r\\n]+|\\s+(?!\\S)|\\s+";
    var patterns = [
      `[^\r
\\p{L}\\p{N}]?[\\p{Lu}\\p{Lt}\\p{Lm}\\p{Lo}\\p{M}]*[\\p{Ll}\\p{Lm}\\p{Lo}\\p{M}]+(?:'s|'S|'t|'T|'re|'RE|'Re|'eR|'ve|'VE|'vE|'Ve|'m|'M|'ll|'lL|'Ll|'LL|'d|'D)?`,
      `[^\r
\\p{L}\\p{N}]?[\\p{Lu}\\p{Lt}\\p{Lm}\\p{Lo}\\p{M}]+[\\p{Ll}\\p{Lm}\\p{Lo}\\p{M}]*(?:'s|'S|'t|'T|'re|'RE|'Re|'eR|'ve|'VE|'vE|'Ve|'m|'M|'ll|'lL|'Ll|'LL|'d|'D)?`,
      `\\p{N}{1,3}`,
      ` ?[^\\s\\p{L}\\p{N}]+[\\r\\n/]*`,
      `\\s*[\\r\\n]+`,
      `\\s+(?!\\S)`,
      `\\s+`
    ];
    var REGEX_PATTERN_3 = patterns.join("|");
    function getEncoderFromModelName(modelName) {
      let encoder = "";
      if (!exports2.MODEL_TO_ENCODING.has(modelName)) {
        for (const [prefix, encoding] of MODEL_PREFIX_TO_ENCODING) {
          if (modelName.startsWith(prefix)) {
            encoder = encoding;
            break;
          }
        }
      } else {
        encoder = exports2.MODEL_TO_ENCODING.get(modelName);
      }
      return encoder;
    }
    async function fetchAndSaveFile(mergeableRanksFileUrl, filePath) {
      const fs2 = require("fs");
      const response = await fetch(mergeableRanksFileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file from ${mergeableRanksFileUrl}. Status code: ${response.status}`);
      }
      const text = await response.text();
      fs2.writeFileSync(filePath, text);
    }
    function getSpecialTokensByEncoder2(encoder) {
      let specialTokens = /* @__PURE__ */ new Map([[ENDOFTEXT, 50256]]);
      switch (encoder) {
        case "o200k_base":
          specialTokens = /* @__PURE__ */ new Map([
            [ENDOFTEXT, 199999],
            [ENDOFPROMPT, 200018]
          ]);
          break;
        case "cl100k_base":
          specialTokens = /* @__PURE__ */ new Map([
            [ENDOFTEXT, 100257],
            [FIM_PREFIX, 100258],
            [FIM_MIDDLE, 100259],
            [FIM_SUFFIX, 100260],
            [ENDOFPROMPT, 100276]
          ]);
          break;
        case "p50k_edit":
          specialTokens = /* @__PURE__ */ new Map([
            [ENDOFTEXT, 50256],
            [FIM_PREFIX, 50281],
            [FIM_MIDDLE, 50282],
            [FIM_SUFFIX, 50283]
          ]);
          break;
        default:
          break;
      }
      return specialTokens;
    }
    exports2.getSpecialTokensByEncoder = getSpecialTokensByEncoder2;
    function getSpecialTokensByModel(modelName) {
      const encoderName = getEncoderFromModelName(modelName);
      const specialTokens = getSpecialTokensByEncoder2(encoderName);
      return specialTokens;
    }
    exports2.getSpecialTokensByModel = getSpecialTokensByModel;
    function getRegexByEncoder2(encoder) {
      switch (encoder) {
        case "o200k_base":
          return REGEX_PATTERN_3;
        case "cl100k_base":
          return REGEX_PATTERN_2;
        default:
          break;
      }
      return REGEX_PATTERN_1;
    }
    exports2.getRegexByEncoder = getRegexByEncoder2;
    function getRegexByModel(modelName) {
      const encoderName = getEncoderFromModelName(modelName);
      const regexPattern = getRegexByEncoder2(encoderName);
      return regexPattern;
    }
    exports2.getRegexByModel = getRegexByModel;
    async function createByModelName(modelName, extraSpecialTokens = null) {
      return createByEncoderName(getEncoderFromModelName(modelName), extraSpecialTokens);
    }
    exports2.createByModelName = createByModelName;
    async function createByEncoderName(encoderName, extraSpecialTokens = null) {
      let regexPattern;
      let mergeableRanksFileUrl;
      let specialTokens = getSpecialTokensByEncoder2(encoderName);
      switch (encoderName) {
        case "o200k_base":
          regexPattern = REGEX_PATTERN_3;
          mergeableRanksFileUrl = `https://openaipublic.blob.core.windows.net/encodings/o200k_base.tiktoken`;
          break;
        case "cl100k_base":
          regexPattern = REGEX_PATTERN_2;
          mergeableRanksFileUrl = `https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken`;
          break;
        case "p50k_base":
          regexPattern = REGEX_PATTERN_1;
          mergeableRanksFileUrl = `https://openaipublic.blob.core.windows.net/encodings/p50k_base.tiktoken`;
          break;
        case "p50k_edit":
          regexPattern = REGEX_PATTERN_1;
          mergeableRanksFileUrl = `https://openaipublic.blob.core.windows.net/encodings/p50k_base.tiktoken`;
          break;
        case "r50k_base":
          regexPattern = REGEX_PATTERN_1;
          mergeableRanksFileUrl = `https://openaipublic.blob.core.windows.net/encodings/r50k_base.tiktoken`;
          break;
        case "gpt2":
          regexPattern = REGEX_PATTERN_1;
          mergeableRanksFileUrl = `https://raw.githubusercontent.com/microsoft/Tokenizer/main/model/gpt2.tiktoken`;
          break;
        default:
          throw new Error(`Doesn't support this encoder [${encoderName}]`);
      }
      if (extraSpecialTokens !== null) {
        specialTokens = new Map([...specialTokens, ...extraSpecialTokens]);
      }
      const fs2 = require("fs");
      const path2 = require("path");
      const fileName = path2.basename(mergeableRanksFileUrl);
      const dirPath = path2.resolve(__dirname, "..", "model");
      if (!fs2.existsSync(dirPath)) {
        fs2.mkdirSync(dirPath, { recursive: true });
      }
      const filePath = path2.resolve(dirPath, fileName);
      if (!fs2.existsSync(filePath)) {
        console.log(`Downloading file from ${mergeableRanksFileUrl}`);
        await fetchAndSaveFile(mergeableRanksFileUrl, filePath);
        console.log(`Saved file to ${filePath}`);
      }
      return createTokenizer2(filePath, specialTokens, regexPattern);
    }
    exports2.createByEncoderName = createByEncoderName;
    function createTokenizer2(tikTokenBpeFileOrDict, specialTokensEncoder, regexPattern, cacheSize = 8192) {
      const tikTokenizer = new tikTokenizer_1.TikTokenizer(tikTokenBpeFileOrDict, specialTokensEncoder, regexPattern, cacheSize);
      return tikTokenizer;
    }
    exports2.createTokenizer = createTokenizer2;
  }
});

// node_modules/@microsoft/tiktokenizer/dist/index.js
var require_dist = __commonJS({
  "node_modules/@microsoft/tiktokenizer/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createTokenizer = exports2.createByEncoderName = exports2.createByModelName = exports2.getSpecialTokensByModel = exports2.getSpecialTokensByEncoder = exports2.getRegexByModel = exports2.getRegexByEncoder = exports2.MODEL_TO_ENCODING = exports2.TikTokenizer = void 0;
    var tikTokenizer_1 = require_tikTokenizer();
    Object.defineProperty(exports2, "TikTokenizer", { enumerable: true, get: function() {
      return tikTokenizer_1.TikTokenizer;
    } });
    var tokenizerBuilder_1 = require_tokenizerBuilder();
    Object.defineProperty(exports2, "MODEL_TO_ENCODING", { enumerable: true, get: function() {
      return tokenizerBuilder_1.MODEL_TO_ENCODING;
    } });
    Object.defineProperty(exports2, "getRegexByEncoder", { enumerable: true, get: function() {
      return tokenizerBuilder_1.getRegexByEncoder;
    } });
    Object.defineProperty(exports2, "getRegexByModel", { enumerable: true, get: function() {
      return tokenizerBuilder_1.getRegexByModel;
    } });
    Object.defineProperty(exports2, "getSpecialTokensByEncoder", { enumerable: true, get: function() {
      return tokenizerBuilder_1.getSpecialTokensByEncoder;
    } });
    Object.defineProperty(exports2, "getSpecialTokensByModel", { enumerable: true, get: function() {
      return tokenizerBuilder_1.getSpecialTokensByModel;
    } });
    Object.defineProperty(exports2, "createByModelName", { enumerable: true, get: function() {
      return tokenizerBuilder_1.createByModelName;
    } });
    Object.defineProperty(exports2, "createByEncoderName", { enumerable: true, get: function() {
      return tokenizerBuilder_1.createByEncoderName;
    } });
    Object.defineProperty(exports2, "createTokenizer", { enumerable: true, get: function() {
      return tokenizerBuilder_1.createTokenizer;
    } });
  }
});

// node_modules/picomatch/lib/constants.js
var require_constants = __commonJS({
  "node_modules/picomatch/lib/constants.js"(exports2, module2) {
    "use strict";
    var WIN_SLASH = "\\\\/";
    var WIN_NO_SLASH = `[^${WIN_SLASH}]`;
    var DOT_LITERAL = "\\.";
    var PLUS_LITERAL = "\\+";
    var QMARK_LITERAL = "\\?";
    var SLASH_LITERAL = "\\/";
    var ONE_CHAR = "(?=.)";
    var QMARK = "[^/]";
    var END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
    var START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
    var DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
    var NO_DOT = `(?!${DOT_LITERAL})`;
    var NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
    var NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
    var NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
    var QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
    var STAR = `${QMARK}*?`;
    var SEP = "/";
    var POSIX_CHARS = {
      DOT_LITERAL,
      PLUS_LITERAL,
      QMARK_LITERAL,
      SLASH_LITERAL,
      ONE_CHAR,
      QMARK,
      END_ANCHOR,
      DOTS_SLASH,
      NO_DOT,
      NO_DOTS,
      NO_DOT_SLASH,
      NO_DOTS_SLASH,
      QMARK_NO_DOT,
      STAR,
      START_ANCHOR,
      SEP
    };
    var WINDOWS_CHARS = {
      ...POSIX_CHARS,
      SLASH_LITERAL: `[${WIN_SLASH}]`,
      QMARK: WIN_NO_SLASH,
      STAR: `${WIN_NO_SLASH}*?`,
      DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
      NO_DOT: `(?!${DOT_LITERAL})`,
      NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
      NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
      NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
      QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
      START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
      END_ANCHOR: `(?:[${WIN_SLASH}]|$)`,
      SEP: "\\"
    };
    var POSIX_REGEX_SOURCE = {
      alnum: "a-zA-Z0-9",
      alpha: "a-zA-Z",
      ascii: "\\x00-\\x7F",
      blank: " \\t",
      cntrl: "\\x00-\\x1F\\x7F",
      digit: "0-9",
      graph: "\\x21-\\x7E",
      lower: "a-z",
      print: "\\x20-\\x7E ",
      punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
      space: " \\t\\r\\n\\v\\f",
      upper: "A-Z",
      word: "A-Za-z0-9_",
      xdigit: "A-Fa-f0-9"
    };
    module2.exports = {
      MAX_LENGTH: 1024 * 64,
      POSIX_REGEX_SOURCE,
      // regular expressions
      REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
      REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
      REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
      REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
      REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
      REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
      // Replace globs with equivalent patterns to reduce parsing time.
      REPLACEMENTS: {
        __proto__: null,
        "***": "*",
        "**/**": "**",
        "**/**/**": "**"
      },
      // Digits
      CHAR_0: 48,
      /* 0 */
      CHAR_9: 57,
      /* 9 */
      // Alphabet chars.
      CHAR_UPPERCASE_A: 65,
      /* A */
      CHAR_LOWERCASE_A: 97,
      /* a */
      CHAR_UPPERCASE_Z: 90,
      /* Z */
      CHAR_LOWERCASE_Z: 122,
      /* z */
      CHAR_LEFT_PARENTHESES: 40,
      /* ( */
      CHAR_RIGHT_PARENTHESES: 41,
      /* ) */
      CHAR_ASTERISK: 42,
      /* * */
      // Non-alphabetic chars.
      CHAR_AMPERSAND: 38,
      /* & */
      CHAR_AT: 64,
      /* @ */
      CHAR_BACKWARD_SLASH: 92,
      /* \ */
      CHAR_CARRIAGE_RETURN: 13,
      /* \r */
      CHAR_CIRCUMFLEX_ACCENT: 94,
      /* ^ */
      CHAR_COLON: 58,
      /* : */
      CHAR_COMMA: 44,
      /* , */
      CHAR_DOT: 46,
      /* . */
      CHAR_DOUBLE_QUOTE: 34,
      /* " */
      CHAR_EQUAL: 61,
      /* = */
      CHAR_EXCLAMATION_MARK: 33,
      /* ! */
      CHAR_FORM_FEED: 12,
      /* \f */
      CHAR_FORWARD_SLASH: 47,
      /* / */
      CHAR_GRAVE_ACCENT: 96,
      /* ` */
      CHAR_HASH: 35,
      /* # */
      CHAR_HYPHEN_MINUS: 45,
      /* - */
      CHAR_LEFT_ANGLE_BRACKET: 60,
      /* < */
      CHAR_LEFT_CURLY_BRACE: 123,
      /* { */
      CHAR_LEFT_SQUARE_BRACKET: 91,
      /* [ */
      CHAR_LINE_FEED: 10,
      /* \n */
      CHAR_NO_BREAK_SPACE: 160,
      /* \u00A0 */
      CHAR_PERCENT: 37,
      /* % */
      CHAR_PLUS: 43,
      /* + */
      CHAR_QUESTION_MARK: 63,
      /* ? */
      CHAR_RIGHT_ANGLE_BRACKET: 62,
      /* > */
      CHAR_RIGHT_CURLY_BRACE: 125,
      /* } */
      CHAR_RIGHT_SQUARE_BRACKET: 93,
      /* ] */
      CHAR_SEMICOLON: 59,
      /* ; */
      CHAR_SINGLE_QUOTE: 39,
      /* ' */
      CHAR_SPACE: 32,
      /*   */
      CHAR_TAB: 9,
      /* \t */
      CHAR_UNDERSCORE: 95,
      /* _ */
      CHAR_VERTICAL_LINE: 124,
      /* | */
      CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
      /* \uFEFF */
      /**
       * Create EXTGLOB_CHARS
       */
      extglobChars(chars) {
        return {
          "!": { type: "negate", open: "(?:(?!(?:", close: `))${chars.STAR})` },
          "?": { type: "qmark", open: "(?:", close: ")?" },
          "+": { type: "plus", open: "(?:", close: ")+" },
          "*": { type: "star", open: "(?:", close: ")*" },
          "@": { type: "at", open: "(?:", close: ")" }
        };
      },
      /**
       * Create GLOB_CHARS
       */
      globChars(win322) {
        return win322 === true ? WINDOWS_CHARS : POSIX_CHARS;
      }
    };
  }
});

// node_modules/picomatch/lib/utils.js
var require_utils = __commonJS({
  "node_modules/picomatch/lib/utils.js"(exports2) {
    "use strict";
    var {
      REGEX_BACKSLASH,
      REGEX_REMOVE_BACKSLASH,
      REGEX_SPECIAL_CHARS,
      REGEX_SPECIAL_CHARS_GLOBAL
    } = require_constants();
    exports2.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
    exports2.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
    exports2.isRegexChar = (str) => str.length === 1 && exports2.hasRegexChars(str);
    exports2.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
    exports2.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
    exports2.isWindows = () => {
      if (typeof navigator !== "undefined" && navigator.platform) {
        const platform2 = navigator.platform.toLowerCase();
        return platform2 === "win32" || platform2 === "windows";
      }
      if (typeof process !== "undefined" && process.platform) {
        return process.platform === "win32";
      }
      return false;
    };
    exports2.removeBackslashes = (str) => {
      return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
        return match === "\\" ? "" : match;
      });
    };
    exports2.escapeLast = (input, char, lastIdx) => {
      const idx = input.lastIndexOf(char, lastIdx);
      if (idx === -1) return input;
      if (input[idx - 1] === "\\") return exports2.escapeLast(input, char, idx - 1);
      return `${input.slice(0, idx)}\\${input.slice(idx)}`;
    };
    exports2.removePrefix = (input, state = {}) => {
      let output = input;
      if (output.startsWith("./")) {
        output = output.slice(2);
        state.prefix = "./";
      }
      return output;
    };
    exports2.wrapOutput = (input, state = {}, options = {}) => {
      const prepend = options.contains ? "" : "^";
      const append = options.contains ? "" : "$";
      let output = `${prepend}(?:${input})${append}`;
      if (state.negated === true) {
        output = `(?:^(?!${output}).*$)`;
      }
      return output;
    };
    exports2.basename = (path2, { windows } = {}) => {
      const segs = path2.split(windows ? /[\\/]/ : "/");
      const last = segs[segs.length - 1];
      if (last === "") {
        return segs[segs.length - 2];
      }
      return last;
    };
  }
});

// node_modules/picomatch/lib/scan.js
var require_scan = __commonJS({
  "node_modules/picomatch/lib/scan.js"(exports2, module2) {
    "use strict";
    var utils = require_utils();
    var {
      CHAR_ASTERISK,
      /* * */
      CHAR_AT,
      /* @ */
      CHAR_BACKWARD_SLASH: CHAR_BACKWARD_SLASH2,
      /* \ */
      CHAR_COMMA,
      /* , */
      CHAR_DOT: CHAR_DOT2,
      /* . */
      CHAR_EXCLAMATION_MARK,
      /* ! */
      CHAR_FORWARD_SLASH: CHAR_FORWARD_SLASH2,
      /* / */
      CHAR_LEFT_CURLY_BRACE,
      /* { */
      CHAR_LEFT_PARENTHESES,
      /* ( */
      CHAR_LEFT_SQUARE_BRACKET,
      /* [ */
      CHAR_PLUS,
      /* + */
      CHAR_QUESTION_MARK: CHAR_QUESTION_MARK2,
      /* ? */
      CHAR_RIGHT_CURLY_BRACE,
      /* } */
      CHAR_RIGHT_PARENTHESES,
      /* ) */
      CHAR_RIGHT_SQUARE_BRACKET
      /* ] */
    } = require_constants();
    var isPathSeparator3 = (code) => {
      return code === CHAR_FORWARD_SLASH2 || code === CHAR_BACKWARD_SLASH2;
    };
    var depth = (token) => {
      if (token.isPrefix !== true) {
        token.depth = token.isGlobstar ? Infinity : 1;
      }
    };
    var scan = (input, options) => {
      const opts = options || {};
      const length = input.length - 1;
      const scanToEnd = opts.parts === true || opts.scanToEnd === true;
      const slashes = [];
      const tokens = [];
      const parts = [];
      let str = input;
      let index = -1;
      let start = 0;
      let lastIndex = 0;
      let isBrace = false;
      let isBracket = false;
      let isGlob = false;
      let isExtglob = false;
      let isGlobstar = false;
      let braceEscaped = false;
      let backslashes = false;
      let negated = false;
      let negatedExtglob = false;
      let finished = false;
      let braces = 0;
      let prev;
      let code;
      let token = { value: "", depth: 0, isGlob: false };
      const eos = () => index >= length;
      const peek = () => str.charCodeAt(index + 1);
      const advance = () => {
        prev = code;
        return str.charCodeAt(++index);
      };
      while (index < length) {
        code = advance();
        let next;
        if (code === CHAR_BACKWARD_SLASH2) {
          backslashes = token.backslashes = true;
          code = advance();
          if (code === CHAR_LEFT_CURLY_BRACE) {
            braceEscaped = true;
          }
          continue;
        }
        if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
          braces++;
          while (eos() !== true && (code = advance())) {
            if (code === CHAR_BACKWARD_SLASH2) {
              backslashes = token.backslashes = true;
              advance();
              continue;
            }
            if (code === CHAR_LEFT_CURLY_BRACE) {
              braces++;
              continue;
            }
            if (braceEscaped !== true && code === CHAR_DOT2 && (code = advance()) === CHAR_DOT2) {
              isBrace = token.isBrace = true;
              isGlob = token.isGlob = true;
              finished = true;
              if (scanToEnd === true) {
                continue;
              }
              break;
            }
            if (braceEscaped !== true && code === CHAR_COMMA) {
              isBrace = token.isBrace = true;
              isGlob = token.isGlob = true;
              finished = true;
              if (scanToEnd === true) {
                continue;
              }
              break;
            }
            if (code === CHAR_RIGHT_CURLY_BRACE) {
              braces--;
              if (braces === 0) {
                braceEscaped = false;
                isBrace = token.isBrace = true;
                finished = true;
                break;
              }
            }
          }
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_FORWARD_SLASH2) {
          slashes.push(index);
          tokens.push(token);
          token = { value: "", depth: 0, isGlob: false };
          if (finished === true) continue;
          if (prev === CHAR_DOT2 && index === start + 1) {
            start += 2;
            continue;
          }
          lastIndex = index + 1;
          continue;
        }
        if (opts.noext !== true) {
          const isExtglobChar = code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK2 || code === CHAR_EXCLAMATION_MARK;
          if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
            isGlob = token.isGlob = true;
            isExtglob = token.isExtglob = true;
            finished = true;
            if (code === CHAR_EXCLAMATION_MARK && index === start) {
              negatedExtglob = true;
            }
            if (scanToEnd === true) {
              while (eos() !== true && (code = advance())) {
                if (code === CHAR_BACKWARD_SLASH2) {
                  backslashes = token.backslashes = true;
                  code = advance();
                  continue;
                }
                if (code === CHAR_RIGHT_PARENTHESES) {
                  isGlob = token.isGlob = true;
                  finished = true;
                  break;
                }
              }
              continue;
            }
            break;
          }
        }
        if (code === CHAR_ASTERISK) {
          if (prev === CHAR_ASTERISK) isGlobstar = token.isGlobstar = true;
          isGlob = token.isGlob = true;
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_QUESTION_MARK2) {
          isGlob = token.isGlob = true;
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_LEFT_SQUARE_BRACKET) {
          while (eos() !== true && (next = advance())) {
            if (next === CHAR_BACKWARD_SLASH2) {
              backslashes = token.backslashes = true;
              advance();
              continue;
            }
            if (next === CHAR_RIGHT_SQUARE_BRACKET) {
              isBracket = token.isBracket = true;
              isGlob = token.isGlob = true;
              finished = true;
              break;
            }
          }
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
          negated = token.negated = true;
          start++;
          continue;
        }
        if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
          isGlob = token.isGlob = true;
          if (scanToEnd === true) {
            while (eos() !== true && (code = advance())) {
              if (code === CHAR_LEFT_PARENTHESES) {
                backslashes = token.backslashes = true;
                code = advance();
                continue;
              }
              if (code === CHAR_RIGHT_PARENTHESES) {
                finished = true;
                break;
              }
            }
            continue;
          }
          break;
        }
        if (isGlob === true) {
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
      }
      if (opts.noext === true) {
        isExtglob = false;
        isGlob = false;
      }
      let base = str;
      let prefix = "";
      let glob = "";
      if (start > 0) {
        prefix = str.slice(0, start);
        str = str.slice(start);
        lastIndex -= start;
      }
      if (base && isGlob === true && lastIndex > 0) {
        base = str.slice(0, lastIndex);
        glob = str.slice(lastIndex);
      } else if (isGlob === true) {
        base = "";
        glob = str;
      } else {
        base = str;
      }
      if (base && base !== "" && base !== "/" && base !== str) {
        if (isPathSeparator3(base.charCodeAt(base.length - 1))) {
          base = base.slice(0, -1);
        }
      }
      if (opts.unescape === true) {
        if (glob) glob = utils.removeBackslashes(glob);
        if (base && backslashes === true) {
          base = utils.removeBackslashes(base);
        }
      }
      const state = {
        prefix,
        input,
        start,
        base,
        glob,
        isBrace,
        isBracket,
        isGlob,
        isExtglob,
        isGlobstar,
        negated,
        negatedExtglob
      };
      if (opts.tokens === true) {
        state.maxDepth = 0;
        if (!isPathSeparator3(code)) {
          tokens.push(token);
        }
        state.tokens = tokens;
      }
      if (opts.parts === true || opts.tokens === true) {
        let prevIndex;
        for (let idx = 0; idx < slashes.length; idx++) {
          const n = prevIndex ? prevIndex + 1 : start;
          const i = slashes[idx];
          const value = input.slice(n, i);
          if (opts.tokens) {
            if (idx === 0 && start !== 0) {
              tokens[idx].isPrefix = true;
              tokens[idx].value = prefix;
            } else {
              tokens[idx].value = value;
            }
            depth(tokens[idx]);
            state.maxDepth += tokens[idx].depth;
          }
          if (idx !== 0 || value !== "") {
            parts.push(value);
          }
          prevIndex = i;
        }
        if (prevIndex && prevIndex + 1 < input.length) {
          const value = input.slice(prevIndex + 1);
          parts.push(value);
          if (opts.tokens) {
            tokens[tokens.length - 1].value = value;
            depth(tokens[tokens.length - 1]);
            state.maxDepth += tokens[tokens.length - 1].depth;
          }
        }
        state.slashes = slashes;
        state.parts = parts;
      }
      return state;
    };
    module2.exports = scan;
  }
});

// node_modules/picomatch/lib/parse.js
var require_parse = __commonJS({
  "node_modules/picomatch/lib/parse.js"(exports2, module2) {
    "use strict";
    var constants = require_constants();
    var utils = require_utils();
    var {
      MAX_LENGTH,
      POSIX_REGEX_SOURCE,
      REGEX_NON_SPECIAL_CHARS,
      REGEX_SPECIAL_CHARS_BACKREF,
      REPLACEMENTS
    } = constants;
    var expandRange = (args, options) => {
      if (typeof options.expandRange === "function") {
        return options.expandRange(...args, options);
      }
      args.sort();
      const value = `[${args.join("-")}]`;
      try {
        new RegExp(value);
      } catch (ex) {
        return args.map((v) => utils.escapeRegex(v)).join("..");
      }
      return value;
    };
    var syntaxError = (type, char) => {
      return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
    };
    var parse2 = (input, options) => {
      if (typeof input !== "string") {
        throw new TypeError("Expected a string");
      }
      input = REPLACEMENTS[input] || input;
      const opts = { ...options };
      const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
      let len = input.length;
      if (len > max) {
        throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
      }
      const bos = { type: "bos", value: "", output: opts.prepend || "" };
      const tokens = [bos];
      const capture = opts.capture ? "" : "?:";
      const PLATFORM_CHARS = constants.globChars(opts.windows);
      const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
      const {
        DOT_LITERAL,
        PLUS_LITERAL,
        SLASH_LITERAL,
        ONE_CHAR,
        DOTS_SLASH,
        NO_DOT,
        NO_DOT_SLASH,
        NO_DOTS_SLASH,
        QMARK,
        QMARK_NO_DOT,
        STAR,
        START_ANCHOR
      } = PLATFORM_CHARS;
      const globstar = (opts2) => {
        return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
      };
      const nodot = opts.dot ? "" : NO_DOT;
      const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
      let star = opts.bash === true ? globstar(opts) : STAR;
      if (opts.capture) {
        star = `(${star})`;
      }
      if (typeof opts.noext === "boolean") {
        opts.noextglob = opts.noext;
      }
      const state = {
        input,
        index: -1,
        start: 0,
        dot: opts.dot === true,
        consumed: "",
        output: "",
        prefix: "",
        backtrack: false,
        negated: false,
        brackets: 0,
        braces: 0,
        parens: 0,
        quotes: 0,
        globstar: false,
        tokens
      };
      input = utils.removePrefix(input, state);
      len = input.length;
      const extglobs = [];
      const braces = [];
      const stack = [];
      let prev = bos;
      let value;
      const eos = () => state.index === len - 1;
      const peek = state.peek = (n = 1) => input[state.index + n];
      const advance = state.advance = () => input[++state.index] || "";
      const remaining = () => input.slice(state.index + 1);
      const consume = (value2 = "", num = 0) => {
        state.consumed += value2;
        state.index += num;
      };
      const append = (token) => {
        state.output += token.output != null ? token.output : token.value;
        consume(token.value);
      };
      const negate = () => {
        let count = 1;
        while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
          advance();
          state.start++;
          count++;
        }
        if (count % 2 === 0) {
          return false;
        }
        state.negated = true;
        state.start++;
        return true;
      };
      const increment = (type) => {
        state[type]++;
        stack.push(type);
      };
      const decrement = (type) => {
        state[type]--;
        stack.pop();
      };
      const push = (tok) => {
        if (prev.type === "globstar") {
          const isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
          const isExtglob = tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
          if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
            state.output = state.output.slice(0, -prev.output.length);
            prev.type = "star";
            prev.value = "*";
            prev.output = star;
            state.output += prev.output;
          }
        }
        if (extglobs.length && tok.type !== "paren") {
          extglobs[extglobs.length - 1].inner += tok.value;
        }
        if (tok.value || tok.output) append(tok);
        if (prev && prev.type === "text" && tok.type === "text") {
          prev.output = (prev.output || prev.value) + tok.value;
          prev.value += tok.value;
          return;
        }
        tok.prev = prev;
        tokens.push(tok);
        prev = tok;
      };
      const extglobOpen = (type, value2) => {
        const token = { ...EXTGLOB_CHARS[value2], conditions: 1, inner: "" };
        token.prev = prev;
        token.parens = state.parens;
        token.output = state.output;
        const output = (opts.capture ? "(" : "") + token.open;
        increment("parens");
        push({ type, value: value2, output: state.output ? "" : ONE_CHAR });
        push({ type: "paren", extglob: true, value: advance(), output });
        extglobs.push(token);
      };
      const extglobClose = (token) => {
        let output = token.close + (opts.capture ? ")" : "");
        let rest;
        if (token.type === "negate") {
          let extglobStar = star;
          if (token.inner && token.inner.length > 1 && token.inner.includes("/")) {
            extglobStar = globstar(opts);
          }
          if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
            output = token.close = `)$))${extglobStar}`;
          }
          if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
            const expression = parse2(rest, { ...options, fastpaths: false }).output;
            output = token.close = `)${expression})${extglobStar})`;
          }
          if (token.prev.type === "bos") {
            state.negatedExtglob = true;
          }
        }
        push({ type: "paren", extglob: true, value, output });
        decrement("parens");
      };
      if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
        let backslashes = false;
        let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
          if (first === "\\") {
            backslashes = true;
            return m;
          }
          if (first === "?") {
            if (esc) {
              return esc + first + (rest ? QMARK.repeat(rest.length) : "");
            }
            if (index === 0) {
              return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
            }
            return QMARK.repeat(chars.length);
          }
          if (first === ".") {
            return DOT_LITERAL.repeat(chars.length);
          }
          if (first === "*") {
            if (esc) {
              return esc + first + (rest ? star : "");
            }
            return star;
          }
          return esc ? m : `\\${m}`;
        });
        if (backslashes === true) {
          if (opts.unescape === true) {
            output = output.replace(/\\/g, "");
          } else {
            output = output.replace(/\\+/g, (m) => {
              return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
            });
          }
        }
        if (output === input && opts.contains === true) {
          state.output = input;
          return state;
        }
        state.output = utils.wrapOutput(output, state, options);
        return state;
      }
      while (!eos()) {
        value = advance();
        if (value === "\0") {
          continue;
        }
        if (value === "\\") {
          const next = peek();
          if (next === "/" && opts.bash !== true) {
            continue;
          }
          if (next === "." || next === ";") {
            continue;
          }
          if (!next) {
            value += "\\";
            push({ type: "text", value });
            continue;
          }
          const match = /^\\+/.exec(remaining());
          let slashes = 0;
          if (match && match[0].length > 2) {
            slashes = match[0].length;
            state.index += slashes;
            if (slashes % 2 !== 0) {
              value += "\\";
            }
          }
          if (opts.unescape === true) {
            value = advance();
          } else {
            value += advance();
          }
          if (state.brackets === 0) {
            push({ type: "text", value });
            continue;
          }
        }
        if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
          if (opts.posix !== false && value === ":") {
            const inner = prev.value.slice(1);
            if (inner.includes("[")) {
              prev.posix = true;
              if (inner.includes(":")) {
                const idx = prev.value.lastIndexOf("[");
                const pre = prev.value.slice(0, idx);
                const rest2 = prev.value.slice(idx + 2);
                const posix2 = POSIX_REGEX_SOURCE[rest2];
                if (posix2) {
                  prev.value = pre + posix2;
                  state.backtrack = true;
                  advance();
                  if (!bos.output && tokens.indexOf(prev) === 1) {
                    bos.output = ONE_CHAR;
                  }
                  continue;
                }
              }
            }
          }
          if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") {
            value = `\\${value}`;
          }
          if (value === "]" && (prev.value === "[" || prev.value === "[^")) {
            value = `\\${value}`;
          }
          if (opts.posix === true && value === "!" && prev.value === "[") {
            value = "^";
          }
          prev.value += value;
          append({ value });
          continue;
        }
        if (state.quotes === 1 && value !== '"') {
          value = utils.escapeRegex(value);
          prev.value += value;
          append({ value });
          continue;
        }
        if (value === '"') {
          state.quotes = state.quotes === 1 ? 0 : 1;
          if (opts.keepQuotes === true) {
            push({ type: "text", value });
          }
          continue;
        }
        if (value === "(") {
          increment("parens");
          push({ type: "paren", value });
          continue;
        }
        if (value === ")") {
          if (state.parens === 0 && opts.strictBrackets === true) {
            throw new SyntaxError(syntaxError("opening", "("));
          }
          const extglob = extglobs[extglobs.length - 1];
          if (extglob && state.parens === extglob.parens + 1) {
            extglobClose(extglobs.pop());
            continue;
          }
          push({ type: "paren", value, output: state.parens ? ")" : "\\)" });
          decrement("parens");
          continue;
        }
        if (value === "[") {
          if (opts.nobracket === true || !remaining().includes("]")) {
            if (opts.nobracket !== true && opts.strictBrackets === true) {
              throw new SyntaxError(syntaxError("closing", "]"));
            }
            value = `\\${value}`;
          } else {
            increment("brackets");
          }
          push({ type: "bracket", value });
          continue;
        }
        if (value === "]") {
          if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
            push({ type: "text", value, output: `\\${value}` });
            continue;
          }
          if (state.brackets === 0) {
            if (opts.strictBrackets === true) {
              throw new SyntaxError(syntaxError("opening", "["));
            }
            push({ type: "text", value, output: `\\${value}` });
            continue;
          }
          decrement("brackets");
          const prevValue = prev.value.slice(1);
          if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) {
            value = `/${value}`;
          }
          prev.value += value;
          append({ value });
          if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) {
            continue;
          }
          const escaped = utils.escapeRegex(prev.value);
          state.output = state.output.slice(0, -prev.value.length);
          if (opts.literalBrackets === true) {
            state.output += escaped;
            prev.value = escaped;
            continue;
          }
          prev.value = `(${capture}${escaped}|${prev.value})`;
          state.output += prev.value;
          continue;
        }
        if (value === "{" && opts.nobrace !== true) {
          increment("braces");
          const open = {
            type: "brace",
            value,
            output: "(",
            outputIndex: state.output.length,
            tokensIndex: state.tokens.length
          };
          braces.push(open);
          push(open);
          continue;
        }
        if (value === "}") {
          const brace = braces[braces.length - 1];
          if (opts.nobrace === true || !brace) {
            push({ type: "text", value, output: value });
            continue;
          }
          let output = ")";
          if (brace.dots === true) {
            const arr = tokens.slice();
            const range = [];
            for (let i = arr.length - 1; i >= 0; i--) {
              tokens.pop();
              if (arr[i].type === "brace") {
                break;
              }
              if (arr[i].type !== "dots") {
                range.unshift(arr[i].value);
              }
            }
            output = expandRange(range, opts);
            state.backtrack = true;
          }
          if (brace.comma !== true && brace.dots !== true) {
            const out = state.output.slice(0, brace.outputIndex);
            const toks = state.tokens.slice(brace.tokensIndex);
            brace.value = brace.output = "\\{";
            value = output = "\\}";
            state.output = out;
            for (const t of toks) {
              state.output += t.output || t.value;
            }
          }
          push({ type: "brace", value, output });
          decrement("braces");
          braces.pop();
          continue;
        }
        if (value === "|") {
          if (extglobs.length > 0) {
            extglobs[extglobs.length - 1].conditions++;
          }
          push({ type: "text", value });
          continue;
        }
        if (value === ",") {
          let output = value;
          const brace = braces[braces.length - 1];
          if (brace && stack[stack.length - 1] === "braces") {
            brace.comma = true;
            output = "|";
          }
          push({ type: "comma", value, output });
          continue;
        }
        if (value === "/") {
          if (prev.type === "dot" && state.index === state.start + 1) {
            state.start = state.index + 1;
            state.consumed = "";
            state.output = "";
            tokens.pop();
            prev = bos;
            continue;
          }
          push({ type: "slash", value, output: SLASH_LITERAL });
          continue;
        }
        if (value === ".") {
          if (state.braces > 0 && prev.type === "dot") {
            if (prev.value === ".") prev.output = DOT_LITERAL;
            const brace = braces[braces.length - 1];
            prev.type = "dots";
            prev.output += value;
            prev.value += value;
            brace.dots = true;
            continue;
          }
          if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
            push({ type: "text", value, output: DOT_LITERAL });
            continue;
          }
          push({ type: "dot", value, output: DOT_LITERAL });
          continue;
        }
        if (value === "?") {
          const isGroup = prev && prev.value === "(";
          if (!isGroup && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
            extglobOpen("qmark", value);
            continue;
          }
          if (prev && prev.type === "paren") {
            const next = peek();
            let output = value;
            if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) {
              output = `\\${value}`;
            }
            push({ type: "text", value, output });
            continue;
          }
          if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
            push({ type: "qmark", value, output: QMARK_NO_DOT });
            continue;
          }
          push({ type: "qmark", value, output: QMARK });
          continue;
        }
        if (value === "!") {
          if (opts.noextglob !== true && peek() === "(") {
            if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
              extglobOpen("negate", value);
              continue;
            }
          }
          if (opts.nonegate !== true && state.index === 0) {
            negate();
            continue;
          }
        }
        if (value === "+") {
          if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
            extglobOpen("plus", value);
            continue;
          }
          if (prev && prev.value === "(" || opts.regex === false) {
            push({ type: "plus", value, output: PLUS_LITERAL });
            continue;
          }
          if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
            push({ type: "plus", value });
            continue;
          }
          push({ type: "plus", value: PLUS_LITERAL });
          continue;
        }
        if (value === "@") {
          if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
            push({ type: "at", extglob: true, value, output: "" });
            continue;
          }
          push({ type: "text", value });
          continue;
        }
        if (value !== "*") {
          if (value === "$" || value === "^") {
            value = `\\${value}`;
          }
          const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
          if (match) {
            value += match[0];
            state.index += match[0].length;
          }
          push({ type: "text", value });
          continue;
        }
        if (prev && (prev.type === "globstar" || prev.star === true)) {
          prev.type = "star";
          prev.star = true;
          prev.value += value;
          prev.output = star;
          state.backtrack = true;
          state.globstar = true;
          consume(value);
          continue;
        }
        let rest = remaining();
        if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
          extglobOpen("star", value);
          continue;
        }
        if (prev.type === "star") {
          if (opts.noglobstar === true) {
            consume(value);
            continue;
          }
          const prior = prev.prev;
          const before = prior.prev;
          const isStart = prior.type === "slash" || prior.type === "bos";
          const afterStar = before && (before.type === "star" || before.type === "globstar");
          if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
            push({ type: "star", value, output: "" });
            continue;
          }
          const isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
          const isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
          if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
            push({ type: "star", value, output: "" });
            continue;
          }
          while (rest.slice(0, 3) === "/**") {
            const after = input[state.index + 4];
            if (after && after !== "/") {
              break;
            }
            rest = rest.slice(3);
            consume("/**", 3);
          }
          if (prior.type === "bos" && eos()) {
            prev.type = "globstar";
            prev.value += value;
            prev.output = globstar(opts);
            state.output = prev.output;
            state.globstar = true;
            consume(value);
            continue;
          }
          if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
            state.output = state.output.slice(0, -(prior.output + prev.output).length);
            prior.output = `(?:${prior.output}`;
            prev.type = "globstar";
            prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
            prev.value += value;
            state.globstar = true;
            state.output += prior.output + prev.output;
            consume(value);
            continue;
          }
          if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
            const end = rest[1] !== void 0 ? "|$" : "";
            state.output = state.output.slice(0, -(prior.output + prev.output).length);
            prior.output = `(?:${prior.output}`;
            prev.type = "globstar";
            prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
            prev.value += value;
            state.output += prior.output + prev.output;
            state.globstar = true;
            consume(value + advance());
            push({ type: "slash", value: "/", output: "" });
            continue;
          }
          if (prior.type === "bos" && rest[0] === "/") {
            prev.type = "globstar";
            prev.value += value;
            prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
            state.output = prev.output;
            state.globstar = true;
            consume(value + advance());
            push({ type: "slash", value: "/", output: "" });
            continue;
          }
          state.output = state.output.slice(0, -prev.output.length);
          prev.type = "globstar";
          prev.output = globstar(opts);
          prev.value += value;
          state.output += prev.output;
          state.globstar = true;
          consume(value);
          continue;
        }
        const token = { type: "star", value, output: star };
        if (opts.bash === true) {
          token.output = ".*?";
          if (prev.type === "bos" || prev.type === "slash") {
            token.output = nodot + token.output;
          }
          push(token);
          continue;
        }
        if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
          token.output = value;
          push(token);
          continue;
        }
        if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
          if (prev.type === "dot") {
            state.output += NO_DOT_SLASH;
            prev.output += NO_DOT_SLASH;
          } else if (opts.dot === true) {
            state.output += NO_DOTS_SLASH;
            prev.output += NO_DOTS_SLASH;
          } else {
            state.output += nodot;
            prev.output += nodot;
          }
          if (peek() !== "*") {
            state.output += ONE_CHAR;
            prev.output += ONE_CHAR;
          }
        }
        push(token);
      }
      while (state.brackets > 0) {
        if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "]"));
        state.output = utils.escapeLast(state.output, "[");
        decrement("brackets");
      }
      while (state.parens > 0) {
        if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", ")"));
        state.output = utils.escapeLast(state.output, "(");
        decrement("parens");
      }
      while (state.braces > 0) {
        if (opts.strictBrackets === true) throw new SyntaxError(syntaxError("closing", "}"));
        state.output = utils.escapeLast(state.output, "{");
        decrement("braces");
      }
      if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) {
        push({ type: "maybe_slash", value: "", output: `${SLASH_LITERAL}?` });
      }
      if (state.backtrack === true) {
        state.output = "";
        for (const token of state.tokens) {
          state.output += token.output != null ? token.output : token.value;
          if (token.suffix) {
            state.output += token.suffix;
          }
        }
      }
      return state;
    };
    parse2.fastpaths = (input, options) => {
      const opts = { ...options };
      const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
      const len = input.length;
      if (len > max) {
        throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
      }
      input = REPLACEMENTS[input] || input;
      const {
        DOT_LITERAL,
        SLASH_LITERAL,
        ONE_CHAR,
        DOTS_SLASH,
        NO_DOT,
        NO_DOTS,
        NO_DOTS_SLASH,
        STAR,
        START_ANCHOR
      } = constants.globChars(opts.windows);
      const nodot = opts.dot ? NO_DOTS : NO_DOT;
      const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
      const capture = opts.capture ? "" : "?:";
      const state = { negated: false, prefix: "" };
      let star = opts.bash === true ? ".*?" : STAR;
      if (opts.capture) {
        star = `(${star})`;
      }
      const globstar = (opts2) => {
        if (opts2.noglobstar === true) return star;
        return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
      };
      const create = (str) => {
        switch (str) {
          case "*":
            return `${nodot}${ONE_CHAR}${star}`;
          case ".*":
            return `${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "*.*":
            return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "*/*":
            return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
          case "**":
            return nodot + globstar(opts);
          case "**/*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
          case "**/*.*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "**/.*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
          default: {
            const match = /^(.*?)\.(\w+)$/.exec(str);
            if (!match) return;
            const source2 = create(match[1]);
            if (!source2) return;
            return source2 + DOT_LITERAL + match[2];
          }
        }
      };
      const output = utils.removePrefix(input, state);
      let source = create(output);
      if (source && opts.strictSlashes !== true) {
        source += `${SLASH_LITERAL}?`;
      }
      return source;
    };
    module2.exports = parse2;
  }
});

// node_modules/picomatch/lib/picomatch.js
var require_picomatch = __commonJS({
  "node_modules/picomatch/lib/picomatch.js"(exports2, module2) {
    "use strict";
    var scan = require_scan();
    var parse2 = require_parse();
    var utils = require_utils();
    var constants = require_constants();
    var isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
    var picomatch2 = (glob, options, returnState = false) => {
      if (Array.isArray(glob)) {
        const fns = glob.map((input) => picomatch2(input, options, returnState));
        const arrayMatcher = (str) => {
          for (const isMatch2 of fns) {
            const state2 = isMatch2(str);
            if (state2) return state2;
          }
          return false;
        };
        return arrayMatcher;
      }
      const isState = isObject(glob) && glob.tokens && glob.input;
      if (glob === "" || typeof glob !== "string" && !isState) {
        throw new TypeError("Expected pattern to be a non-empty string");
      }
      const opts = options || {};
      const posix2 = opts.windows;
      const regex = isState ? picomatch2.compileRe(glob, options) : picomatch2.makeRe(glob, options, false, true);
      const state = regex.state;
      delete regex.state;
      let isIgnored = () => false;
      if (opts.ignore) {
        const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
        isIgnored = picomatch2(opts.ignore, ignoreOpts, returnState);
      }
      const matcher = (input, returnObject = false) => {
        const { isMatch: isMatch2, match, output } = picomatch2.test(input, regex, options, { glob, posix: posix2 });
        const result = { glob, state, regex, posix: posix2, input, output, match, isMatch: isMatch2 };
        if (typeof opts.onResult === "function") {
          opts.onResult(result);
        }
        if (isMatch2 === false) {
          result.isMatch = false;
          return returnObject ? result : false;
        }
        if (isIgnored(input)) {
          if (typeof opts.onIgnore === "function") {
            opts.onIgnore(result);
          }
          result.isMatch = false;
          return returnObject ? result : false;
        }
        if (typeof opts.onMatch === "function") {
          opts.onMatch(result);
        }
        return returnObject ? result : true;
      };
      if (returnState) {
        matcher.state = state;
      }
      return matcher;
    };
    picomatch2.test = (input, regex, options, { glob, posix: posix2 } = {}) => {
      if (typeof input !== "string") {
        throw new TypeError("Expected input to be a string");
      }
      if (input === "") {
        return { isMatch: false, output: "" };
      }
      const opts = options || {};
      const format2 = opts.format || (posix2 ? utils.toPosixSlashes : null);
      let match = input === glob;
      let output = match && format2 ? format2(input) : input;
      if (match === false) {
        output = format2 ? format2(input) : input;
        match = output === glob;
      }
      if (match === false || opts.capture === true) {
        if (opts.matchBase === true || opts.basename === true) {
          match = picomatch2.matchBase(input, regex, options, posix2);
        } else {
          match = regex.exec(output);
        }
      }
      return { isMatch: Boolean(match), match, output };
    };
    picomatch2.matchBase = (input, glob, options) => {
      const regex = glob instanceof RegExp ? glob : picomatch2.makeRe(glob, options);
      return regex.test(utils.basename(input));
    };
    picomatch2.isMatch = (str, patterns, options) => picomatch2(patterns, options)(str);
    picomatch2.parse = (pattern, options) => {
      if (Array.isArray(pattern)) return pattern.map((p) => picomatch2.parse(p, options));
      return parse2(pattern, { ...options, fastpaths: false });
    };
    picomatch2.scan = (input, options) => scan(input, options);
    picomatch2.compileRe = (state, options, returnOutput = false, returnState = false) => {
      if (returnOutput === true) {
        return state.output;
      }
      const opts = options || {};
      const prepend = opts.contains ? "" : "^";
      const append = opts.contains ? "" : "$";
      let source = `${prepend}(?:${state.output})${append}`;
      if (state && state.negated === true) {
        source = `^(?!${source}).*$`;
      }
      const regex = picomatch2.toRegex(source, options);
      if (returnState === true) {
        regex.state = state;
      }
      return regex;
    };
    picomatch2.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
      if (!input || typeof input !== "string") {
        throw new TypeError("Expected a non-empty string");
      }
      let parsed = { negated: false, fastpaths: true };
      if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) {
        parsed.output = parse2.fastpaths(input, options);
      }
      if (!parsed.output) {
        parsed = parse2(input, options);
      }
      return picomatch2.compileRe(parsed, options, returnOutput, returnState);
    };
    picomatch2.toRegex = (source, options) => {
      try {
        const opts = options || {};
        return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
      } catch (err) {
        if (options && options.debug === true) throw err;
        return /$^/;
      }
    };
    picomatch2.constants = constants;
    module2.exports = picomatch2;
  }
});

// node_modules/picomatch/index.js
var require_picomatch2 = __commonJS({
  "node_modules/picomatch/index.js"(exports2, module2) {
    "use strict";
    var pico = require_picomatch();
    var utils = require_utils();
    function picomatch2(glob, options, returnState = false) {
      if (options && (options.windows === null || options.windows === void 0)) {
        options = { ...options, windows: utils.isWindows() };
      }
      return pico(glob, options, returnState);
    }
    Object.assign(picomatch2, pico);
    module2.exports = picomatch2;
  }
});

// src/platform/tfidf/node/tfidfWorker.ts
var tfidfWorker_exports = {};
module.exports = __toCommonJS(tfidfWorker_exports);
var import_worker_threads2 = require("worker_threads");

// src/util/node/worker.ts
var import_worker_threads = require("worker_threads");
var RcpResponseHandler = class {
  constructor() {
    this.nextId = 1;
    this.handlers = /* @__PURE__ */ new Map();
  }
  createHandler() {
    const id2 = this.nextId++;
    let resolve2;
    let reject;
    const result = new Promise((res, rej) => {
      resolve2 = res;
      reject = rej;
    });
    this.handlers.set(id2, { resolve: resolve2, reject });
    return { id: id2, result };
  }
  handleResponse(response) {
    const handler = this.handlers.get(response.id);
    if (!handler) {
      return;
    }
    this.handlers.delete(response.id);
    if (response.err) {
      handler.reject(response.err);
    } else {
      handler.resolve(response.res);
    }
  }
  /**
   * Handle an unexpected error by logging it and rejecting all handlers.
   */
  handleError(err) {
    for (const handler of this.handlers.values()) {
      handler.reject(err);
    }
    this.handlers.clear();
  }
  clear() {
    this.handlers.clear();
  }
};
function createRpcProxy(remoteCall) {
  const handler = {
    get: (target, name) => {
      if (typeof name === "string" && !target[name]) {
        target[name] = (...myArgs) => {
          return remoteCall(name, myArgs);
        };
      }
      return target[name];
    }
  };
  return new Proxy(/* @__PURE__ */ Object.create(null), handler);
}
var WorkerWithRpcProxy = class {
  constructor(workerPath, workerOptions, host) {
    this.responseHandler = new RcpResponseHandler();
    this.worker = new import_worker_threads.Worker(workerPath, workerOptions);
    this.worker.on("message", async (msg) => {
      if ("fn" in msg) {
        try {
          const response = await host?.[msg.fn].apply(host, msg.args);
          this.worker.postMessage({ id: msg.id, res: response });
        } catch (err) {
          this.worker.postMessage({ id: msg.id, err });
        }
      } else {
        this.responseHandler.handleResponse(msg);
      }
    });
    this.worker.on("error", (err) => this.handleError(err));
    this.worker.on("exit", (code) => {
      if (code !== 0) {
        this.handleError(new Error(`Worker thread exited with code ${code}.`));
      }
    });
    this.proxy = createRpcProxy((fn, args) => {
      if (!this.worker) {
        throw new Error(`Worker was terminated!`);
      }
      const { id: id2, result } = this.responseHandler.createHandler();
      this.worker.postMessage({ id: id2, fn, args });
      return result;
    });
  }
  terminate() {
    this.worker.removeAllListeners();
    this.worker.terminate();
    this.responseHandler.clear();
  }
  /**
   * Handle an unexpected error by logging it and rejecting all handlers.
   */
  handleError(err) {
    this.responseHandler.handleError(err);
  }
};

// src/util/vs/base/common/collections.ts
function groupBy(data, groupFn) {
  const result = /* @__PURE__ */ Object.create(null);
  for (const element of data) {
    const key = groupFn(element);
    let target = result[key];
    if (!target) {
      target = result[key] = [];
    }
    target.push(element);
  }
  return result;
}
var _a, _b;
var SetWithKey = class {
  constructor(values, toKey) {
    this.toKey = toKey;
    this._map = /* @__PURE__ */ new Map();
    this[_a] = "SetWithKey";
    for (const value of values) {
      this.add(value);
    }
  }
  get size() {
    return this._map.size;
  }
  add(value) {
    const key = this.toKey(value);
    this._map.set(key, value);
    return this;
  }
  delete(value) {
    return this._map.delete(this.toKey(value));
  }
  has(value) {
    return this._map.has(this.toKey(value));
  }
  *entries() {
    for (const entry of this._map.values()) {
      yield [entry, entry];
    }
  }
  keys() {
    return this.values();
  }
  *values() {
    for (const entry of this._map.values()) {
      yield entry;
    }
  }
  clear() {
    this._map.clear();
  }
  forEach(callbackfn, thisArg) {
    this._map.forEach((entry) => callbackfn.call(thisArg, entry, entry, this));
  }
  [(_b = Symbol.iterator, _a = Symbol.toStringTag, _b)]() {
    return this.values();
  }
};

// src/util/vs/base/common/errors.ts
var ErrorHandler = class {
  constructor() {
    this.listeners = [];
    this.unexpectedErrorHandler = function(e) {
      setTimeout(() => {
        if (e.stack) {
          if (ErrorNoTelemetry.isErrorNoTelemetry(e)) {
            throw new ErrorNoTelemetry(e.message + "\n\n" + e.stack);
          }
          throw new Error(e.message + "\n\n" + e.stack);
        }
        throw e;
      }, 0);
    };
  }
  addListener(listener) {
    this.listeners.push(listener);
    return () => {
      this._removeListener(listener);
    };
  }
  emit(e) {
    this.listeners.forEach((listener) => {
      listener(e);
    });
  }
  _removeListener(listener) {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }
  setUnexpectedErrorHandler(newUnexpectedErrorHandler) {
    this.unexpectedErrorHandler = newUnexpectedErrorHandler;
  }
  getUnexpectedErrorHandler() {
    return this.unexpectedErrorHandler;
  }
  onUnexpectedError(e) {
    this.unexpectedErrorHandler(e);
    this.emit(e);
  }
  // For external errors, we don't want the listeners to be called
  onUnexpectedExternalError(e) {
    this.unexpectedErrorHandler(e);
  }
};
var errorHandler = new ErrorHandler();
function onUnexpectedError(e) {
  if (!isCancellationError(e)) {
    errorHandler.onUnexpectedError(e);
  }
  return void 0;
}
var canceledName = "Canceled";
function isCancellationError(error) {
  if (error instanceof CancellationError) {
    return true;
  }
  return error instanceof Error && error.name === canceledName && error.message === canceledName;
}
var CancellationError = class extends Error {
  constructor() {
    super(canceledName);
    this.name = this.message;
  }
};
var PendingMigrationError = class _PendingMigrationError extends Error {
  static {
    this._name = "PendingMigrationError";
  }
  static is(error) {
    return error instanceof _PendingMigrationError || error instanceof Error && error.name === _PendingMigrationError._name;
  }
  constructor(message) {
    super(message);
    this.name = _PendingMigrationError._name;
  }
};
var ErrorNoTelemetry = class _ErrorNoTelemetry extends Error {
  constructor(msg) {
    super(msg);
    this.name = "CodeExpectedError";
  }
  static fromError(err) {
    if (err instanceof _ErrorNoTelemetry) {
      return err;
    }
    const result = new _ErrorNoTelemetry();
    result.message = err.message;
    result.stack = err.stack;
    return result;
  }
  static isErrorNoTelemetry(err) {
    return err.name === "CodeExpectedError";
  }
};
var BugIndicatingError = class _BugIndicatingError extends Error {
  constructor(message) {
    super(message || "An unexpected bug occurred.");
    Object.setPrototypeOf(this, _BugIndicatingError.prototype);
  }
};

// src/util/vs/base/common/arraysFind.ts
function findLastIdxMonotonous(array, predicate, startIdx = 0, endIdxEx = array.length) {
  let i = startIdx;
  let j = endIdxEx;
  while (i < j) {
    const k = Math.floor((i + j) / 2);
    if (predicate(array[k])) {
      i = k + 1;
    } else {
      j = k;
    }
  }
  return i - 1;
}
var MonotonousArray = class _MonotonousArray {
  constructor(_array) {
    this._array = _array;
    this._findLastMonotonousLastIdx = 0;
  }
  static {
    this.assertInvariants = false;
  }
  /**
   * The predicate must be monotonous, i.e. `arr.map(predicate)` must be like `[true, ..., true, false, ..., false]`!
   * For subsequent calls, current predicate must be weaker than (or equal to) the previous predicate, i.e. more entries must be `true`.
   */
  findLastMonotonous(predicate) {
    if (_MonotonousArray.assertInvariants) {
      if (this._prevFindLastPredicate) {
        for (const item of this._array) {
          if (this._prevFindLastPredicate(item) && !predicate(item)) {
            throw new Error("MonotonousArray: current predicate must be weaker than (or equal to) the previous predicate.");
          }
        }
      }
      this._prevFindLastPredicate = predicate;
    }
    const idx = findLastIdxMonotonous(this._array, predicate, this._findLastMonotonousLastIdx);
    this._findLastMonotonousLastIdx = idx + 1;
    return idx === -1 ? void 0 : this._array[idx];
  }
};

// src/util/vs/base/common/arrays.ts
var CompareResult;
((CompareResult2) => {
  function isLessThan(result) {
    return result < 0;
  }
  CompareResult2.isLessThan = isLessThan;
  function isLessThanOrEqual(result) {
    return result <= 0;
  }
  CompareResult2.isLessThanOrEqual = isLessThanOrEqual;
  function isGreaterThan(result) {
    return result > 0;
  }
  CompareResult2.isGreaterThan = isGreaterThan;
  function isNeitherLessOrGreaterThan(result) {
    return result === 0;
  }
  CompareResult2.isNeitherLessOrGreaterThan = isNeitherLessOrGreaterThan;
  CompareResult2.greaterThan = 1;
  CompareResult2.lessThan = -1;
  CompareResult2.neitherLessOrGreaterThan = 0;
})(CompareResult || (CompareResult = {}));
function compareBy(selector, comparator) {
  return (a, b) => comparator(selector(a), selector(b));
}
var numberComparator = (a, b) => a - b;
var CallbackIterable = class _CallbackIterable {
  constructor(iterate) {
    this.iterate = iterate;
  }
  static {
    this.empty = new _CallbackIterable((_callback) => {
    });
  }
  forEach(handler) {
    this.iterate((item) => {
      handler(item);
      return true;
    });
  }
  toArray() {
    const result = [];
    this.iterate((item) => {
      result.push(item);
      return true;
    });
    return result;
  }
  filter(predicate) {
    return new _CallbackIterable((cb) => this.iterate((item) => predicate(item) ? cb(item) : true));
  }
  map(mapFn) {
    return new _CallbackIterable((cb) => this.iterate((item) => cb(mapFn(item))));
  }
  some(predicate) {
    let result = false;
    this.iterate((item) => {
      result = predicate(item);
      return !result;
    });
    return result;
  }
  findFirst(predicate) {
    let result;
    this.iterate((item) => {
      if (predicate(item)) {
        result = item;
        return false;
      }
      return true;
    });
    return result;
  }
  findLast(predicate) {
    let result;
    this.iterate((item) => {
      if (predicate(item)) {
        result = item;
      }
      return true;
    });
    return result;
  }
  findLastMaxBy(comparator) {
    let result;
    let first = true;
    this.iterate((item) => {
      if (first || CompareResult.isGreaterThan(comparator(item, result))) {
        first = false;
        result = item;
      }
      return true;
    });
    return result;
  }
};

// src/util/vs/base/common/map.ts
var ResourceMapEntry = class {
  constructor(uri, value) {
    this.uri = uri;
    this.value = value;
  }
};
function isEntries(arg) {
  return Array.isArray(arg);
}
var _a2;
var ResourceMap = class _ResourceMap {
  constructor(arg, toKey) {
    this[_a2] = "ResourceMap";
    if (arg instanceof _ResourceMap) {
      this.map = new Map(arg.map);
      this.toKey = toKey ?? _ResourceMap.defaultToKey;
    } else if (isEntries(arg)) {
      this.map = /* @__PURE__ */ new Map();
      this.toKey = toKey ?? _ResourceMap.defaultToKey;
      for (const [resource, value] of arg) {
        this.set(resource, value);
      }
    } else {
      this.map = /* @__PURE__ */ new Map();
      this.toKey = arg ?? _ResourceMap.defaultToKey;
    }
  }
  static {
    this.defaultToKey = (resource) => resource.toString();
  }
  set(resource, value) {
    this.map.set(this.toKey(resource), new ResourceMapEntry(resource, value));
    return this;
  }
  get(resource) {
    return this.map.get(this.toKey(resource))?.value;
  }
  has(resource) {
    return this.map.has(this.toKey(resource));
  }
  get size() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  delete(resource) {
    return this.map.delete(this.toKey(resource));
  }
  forEach(clb, thisArg) {
    if (typeof thisArg !== "undefined") {
      clb = clb.bind(thisArg);
    }
    for (const [_, entry] of this.map) {
      clb(entry.value, entry.uri, this);
    }
  }
  *values() {
    for (const entry of this.map.values()) {
      yield entry.value;
    }
  }
  *keys() {
    for (const entry of this.map.values()) {
      yield entry.uri;
    }
  }
  *entries() {
    for (const entry of this.map.values()) {
      yield [entry.uri, entry.value];
    }
  }
  *[(_a2 = Symbol.toStringTag, Symbol.iterator)]() {
    for (const [, entry] of this.map) {
      yield [entry.uri, entry.value];
    }
  }
};
var _a3;
var ResourceSet = class {
  constructor(entriesOrKey, toKey) {
    this[_a3] = "ResourceSet";
    if (!entriesOrKey || typeof entriesOrKey === "function") {
      this._map = new ResourceMap(entriesOrKey);
    } else {
      this._map = new ResourceMap(toKey);
      entriesOrKey.forEach(this.add, this);
    }
  }
  get size() {
    return this._map.size;
  }
  add(value) {
    this._map.set(value, value);
    return this;
  }
  clear() {
    this._map.clear();
  }
  delete(value) {
    return this._map.delete(value);
  }
  forEach(callbackfn, thisArg) {
    this._map.forEach((_value, key) => callbackfn.call(thisArg, key, key, this));
  }
  has(value) {
    return this._map.has(value);
  }
  entries() {
    return this._map.entries();
  }
  keys() {
    return this._map.keys();
  }
  values() {
    return this._map.keys();
  }
  [(_a3 = Symbol.toStringTag, Symbol.iterator)]() {
    return this.keys();
  }
};
var _a4;
var LinkedMap = class {
  constructor() {
    this[_a4] = "LinkedMap";
    this._map = /* @__PURE__ */ new Map();
    this._head = void 0;
    this._tail = void 0;
    this._size = 0;
    this._state = 0;
  }
  clear() {
    this._map.clear();
    this._head = void 0;
    this._tail = void 0;
    this._size = 0;
    this._state++;
  }
  isEmpty() {
    return !this._head && !this._tail;
  }
  get size() {
    return this._size;
  }
  get first() {
    return this._head?.value;
  }
  get last() {
    return this._tail?.value;
  }
  has(key) {
    return this._map.has(key);
  }
  get(key, touch = 0 /* None */) {
    const item = this._map.get(key);
    if (!item) {
      return void 0;
    }
    if (touch !== 0 /* None */) {
      this.touch(item, touch);
    }
    return item.value;
  }
  set(key, value, touch = 0 /* None */) {
    let item = this._map.get(key);
    if (item) {
      item.value = value;
      if (touch !== 0 /* None */) {
        this.touch(item, touch);
      }
    } else {
      item = { key, value, next: void 0, previous: void 0 };
      switch (touch) {
        case 0 /* None */:
          this.addItemLast(item);
          break;
        case 1 /* AsOld */:
          this.addItemFirst(item);
          break;
        case 2 /* AsNew */:
          this.addItemLast(item);
          break;
        default:
          this.addItemLast(item);
          break;
      }
      this._map.set(key, item);
      this._size++;
    }
    return this;
  }
  delete(key) {
    return !!this.remove(key);
  }
  remove(key) {
    const item = this._map.get(key);
    if (!item) {
      return void 0;
    }
    this._map.delete(key);
    this.removeItem(item);
    this._size--;
    return item.value;
  }
  shift() {
    if (!this._head && !this._tail) {
      return void 0;
    }
    if (!this._head || !this._tail) {
      throw new Error("Invalid list");
    }
    const item = this._head;
    this._map.delete(item.key);
    this.removeItem(item);
    this._size--;
    return item.value;
  }
  forEach(callbackfn, thisArg) {
    const state = this._state;
    let current = this._head;
    while (current) {
      if (thisArg) {
        callbackfn.bind(thisArg)(current.value, current.key, this);
      } else {
        callbackfn(current.value, current.key, this);
      }
      if (this._state !== state) {
        throw new Error(`LinkedMap got modified during iteration.`);
      }
      current = current.next;
    }
  }
  keys() {
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      next() {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: current.key, done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  values() {
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      next() {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: current.value, done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  entries() {
    const map = this;
    const state = this._state;
    let current = this._head;
    const iterator = {
      [Symbol.iterator]() {
        return iterator;
      },
      next() {
        if (map._state !== state) {
          throw new Error(`LinkedMap got modified during iteration.`);
        }
        if (current) {
          const result = { value: [current.key, current.value], done: false };
          current = current.next;
          return result;
        } else {
          return { value: void 0, done: true };
        }
      }
    };
    return iterator;
  }
  [(_a4 = Symbol.toStringTag, Symbol.iterator)]() {
    return this.entries();
  }
  trimOld(newSize) {
    if (newSize >= this.size) {
      return;
    }
    if (newSize === 0) {
      this.clear();
      return;
    }
    let current = this._head;
    let currentSize = this.size;
    while (current && currentSize > newSize) {
      this._map.delete(current.key);
      current = current.next;
      currentSize--;
    }
    this._head = current;
    this._size = currentSize;
    if (current) {
      current.previous = void 0;
    }
    this._state++;
  }
  trimNew(newSize) {
    if (newSize >= this.size) {
      return;
    }
    if (newSize === 0) {
      this.clear();
      return;
    }
    let current = this._tail;
    let currentSize = this.size;
    while (current && currentSize > newSize) {
      this._map.delete(current.key);
      current = current.previous;
      currentSize--;
    }
    this._tail = current;
    this._size = currentSize;
    if (current) {
      current.next = void 0;
    }
    this._state++;
  }
  addItemFirst(item) {
    if (!this._head && !this._tail) {
      this._tail = item;
    } else if (!this._head) {
      throw new Error("Invalid list");
    } else {
      item.next = this._head;
      this._head.previous = item;
    }
    this._head = item;
    this._state++;
  }
  addItemLast(item) {
    if (!this._head && !this._tail) {
      this._head = item;
    } else if (!this._tail) {
      throw new Error("Invalid list");
    } else {
      item.previous = this._tail;
      this._tail.next = item;
    }
    this._tail = item;
    this._state++;
  }
  removeItem(item) {
    if (item === this._head && item === this._tail) {
      this._head = void 0;
      this._tail = void 0;
    } else if (item === this._head) {
      if (!item.next) {
        throw new Error("Invalid list");
      }
      item.next.previous = void 0;
      this._head = item.next;
    } else if (item === this._tail) {
      if (!item.previous) {
        throw new Error("Invalid list");
      }
      item.previous.next = void 0;
      this._tail = item.previous;
    } else {
      const next = item.next;
      const previous = item.previous;
      if (!next || !previous) {
        throw new Error("Invalid list");
      }
      next.previous = previous;
      previous.next = next;
    }
    item.next = void 0;
    item.previous = void 0;
    this._state++;
  }
  touch(item, touch) {
    if (!this._head || !this._tail) {
      throw new Error("Invalid list");
    }
    if (touch !== 1 /* AsOld */ && touch !== 2 /* AsNew */) {
      return;
    }
    if (touch === 1 /* AsOld */) {
      if (item === this._head) {
        return;
      }
      const next = item.next;
      const previous = item.previous;
      if (item === this._tail) {
        previous.next = void 0;
        this._tail = previous;
      } else {
        next.previous = previous;
        previous.next = next;
      }
      item.previous = void 0;
      item.next = this._head;
      this._head.previous = item;
      this._head = item;
      this._state++;
    } else if (touch === 2 /* AsNew */) {
      if (item === this._tail) {
        return;
      }
      const next = item.next;
      const previous = item.previous;
      if (item === this._head) {
        next.previous = void 0;
        this._head = next;
      } else {
        next.previous = previous;
        previous.next = next;
      }
      item.next = void 0;
      item.previous = this._tail;
      this._tail.next = item;
      this._tail = item;
      this._state++;
    }
  }
  toJSON() {
    const data = [];
    this.forEach((value, key) => {
      data.push([key, value]);
    });
    return data;
  }
  fromJSON(data) {
    this.clear();
    for (const [key, value] of data) {
      this.set(key, value);
    }
  }
};
var SetMap = class {
  constructor() {
    this.map = /* @__PURE__ */ new Map();
  }
  add(key, value) {
    let values = this.map.get(key);
    if (!values) {
      values = /* @__PURE__ */ new Set();
      this.map.set(key, values);
    }
    values.add(value);
  }
  delete(key, value) {
    const values = this.map.get(key);
    if (!values) {
      return;
    }
    values.delete(value);
    if (values.size === 0) {
      this.map.delete(key);
    }
  }
  forEach(key, fn) {
    const values = this.map.get(key);
    if (!values) {
      return;
    }
    values.forEach(fn);
  }
  get(key) {
    const values = this.map.get(key);
    if (!values) {
      return /* @__PURE__ */ new Set();
    }
    return values;
  }
};

// src/util/vs/base/common/assert.ts
function assertNever(value, message = "Unreachable") {
  throw new Error(message);
}

// src/util/vs/base/common/types.ts
function isIterable(obj) {
  return !!obj && typeof obj[Symbol.iterator] === "function";
}

// src/util/vs/base/common/iterator.ts
var Iterable;
((Iterable2) => {
  function is(thing) {
    return !!thing && typeof thing === "object" && typeof thing[Symbol.iterator] === "function";
  }
  Iterable2.is = is;
  const _empty2 = Object.freeze([]);
  function empty() {
    return _empty2;
  }
  Iterable2.empty = empty;
  function* single(element) {
    yield element;
  }
  Iterable2.single = single;
  function wrap(iterableOrElement) {
    if (is(iterableOrElement)) {
      return iterableOrElement;
    } else {
      return single(iterableOrElement);
    }
  }
  Iterable2.wrap = wrap;
  function from(iterable) {
    return iterable || _empty2;
  }
  Iterable2.from = from;
  function* reverse(array) {
    for (let i = array.length - 1; i >= 0; i--) {
      yield array[i];
    }
  }
  Iterable2.reverse = reverse;
  function isEmpty(iterable) {
    return !iterable || iterable[Symbol.iterator]().next().done === true;
  }
  Iterable2.isEmpty = isEmpty;
  function first(iterable) {
    return iterable[Symbol.iterator]().next().value;
  }
  Iterable2.first = first;
  function some(iterable, predicate) {
    let i = 0;
    for (const element of iterable) {
      if (predicate(element, i++)) {
        return true;
      }
    }
    return false;
  }
  Iterable2.some = some;
  function every(iterable, predicate) {
    let i = 0;
    for (const element of iterable) {
      if (!predicate(element, i++)) {
        return false;
      }
    }
    return true;
  }
  Iterable2.every = every;
  function find(iterable, predicate) {
    for (const element of iterable) {
      if (predicate(element)) {
        return element;
      }
    }
    return void 0;
  }
  Iterable2.find = find;
  function* filter(iterable, predicate) {
    for (const element of iterable) {
      if (predicate(element)) {
        yield element;
      }
    }
  }
  Iterable2.filter = filter;
  function* map(iterable, fn) {
    let index = 0;
    for (const element of iterable) {
      yield fn(element, index++);
    }
  }
  Iterable2.map = map;
  function* flatMap(iterable, fn) {
    let index = 0;
    for (const element of iterable) {
      yield* fn(element, index++);
    }
  }
  Iterable2.flatMap = flatMap;
  function* concat(...iterables) {
    for (const item of iterables) {
      if (isIterable(item)) {
        yield* item;
      } else {
        yield item;
      }
    }
  }
  Iterable2.concat = concat;
  function reduce(iterable, reducer, initialValue) {
    let value = initialValue;
    for (const element of iterable) {
      value = reducer(value, element);
    }
    return value;
  }
  Iterable2.reduce = reduce;
  function length(iterable) {
    let count = 0;
    for (const _ of iterable) {
      count++;
    }
    return count;
  }
  Iterable2.length = length;
  function* slice(arr, from2, to = arr.length) {
    if (from2 < -arr.length) {
      from2 = 0;
    }
    if (from2 < 0) {
      from2 += arr.length;
    }
    if (to < 0) {
      to += arr.length;
    } else if (to > arr.length) {
      to = arr.length;
    }
    for (; from2 < to; from2++) {
      yield arr[from2];
    }
  }
  Iterable2.slice = slice;
  function consume(iterable, atMost = Number.POSITIVE_INFINITY) {
    const consumed = [];
    if (atMost === 0) {
      return [consumed, iterable];
    }
    const iterator = iterable[Symbol.iterator]();
    for (let i = 0; i < atMost; i++) {
      const next = iterator.next();
      if (next.done) {
        return [consumed, Iterable2.empty()];
      }
      consumed.push(next.value);
    }
    return [consumed, { [Symbol.iterator]() {
      return iterator;
    } }];
  }
  Iterable2.consume = consume;
  async function asyncToArray(iterable) {
    const result = [];
    for await (const item of iterable) {
      result.push(item);
    }
    return result;
  }
  Iterable2.asyncToArray = asyncToArray;
  async function asyncToArrayFlat(iterable) {
    let result = [];
    for await (const item of iterable) {
      result = result.concat(item);
    }
    return result;
  }
  Iterable2.asyncToArrayFlat = asyncToArrayFlat;
})(Iterable || (Iterable = {}));

// src/util/vs/base/common/lifecycle.ts
var TRACK_DISPOSABLES = false;
var disposableTracker = null;
var DisposableTracker = class _DisposableTracker {
  constructor() {
    this.livingDisposables = /* @__PURE__ */ new Map();
  }
  static {
    this.idx = 0;
  }
  getDisposableData(d) {
    let val = this.livingDisposables.get(d);
    if (!val) {
      val = { parent: null, source: null, isSingleton: false, value: d, idx: _DisposableTracker.idx++ };
      this.livingDisposables.set(d, val);
    }
    return val;
  }
  trackDisposable(d) {
    const data = this.getDisposableData(d);
    if (!data.source) {
      data.source = new Error().stack;
    }
  }
  setParent(child, parent) {
    const data = this.getDisposableData(child);
    data.parent = parent;
  }
  markAsDisposed(x) {
    this.livingDisposables.delete(x);
  }
  markAsSingleton(disposable) {
    this.getDisposableData(disposable).isSingleton = true;
  }
  getRootParent(data, cache) {
    const cacheValue = cache.get(data);
    if (cacheValue) {
      return cacheValue;
    }
    const result = data.parent ? this.getRootParent(this.getDisposableData(data.parent), cache) : data;
    cache.set(data, result);
    return result;
  }
  getTrackedDisposables() {
    const rootParentCache = /* @__PURE__ */ new Map();
    const leaking = [...this.livingDisposables.entries()].filter(([, v]) => v.source !== null && !this.getRootParent(v, rootParentCache).isSingleton).flatMap(([k]) => k);
    return leaking;
  }
  computeLeakingDisposables(maxReported = 10, preComputedLeaks) {
    let uncoveredLeakingObjs;
    if (preComputedLeaks) {
      uncoveredLeakingObjs = preComputedLeaks;
    } else {
      const rootParentCache = /* @__PURE__ */ new Map();
      const leakingObjects = [...this.livingDisposables.values()].filter((info) => info.source !== null && !this.getRootParent(info, rootParentCache).isSingleton);
      if (leakingObjects.length === 0) {
        return;
      }
      const leakingObjsSet = new Set(leakingObjects.map((o) => o.value));
      uncoveredLeakingObjs = leakingObjects.filter((l) => {
        return !(l.parent && leakingObjsSet.has(l.parent));
      });
      if (uncoveredLeakingObjs.length === 0) {
        throw new Error("There are cyclic diposable chains!");
      }
    }
    if (!uncoveredLeakingObjs) {
      return void 0;
    }
    function getStackTracePath(leaking) {
      function removePrefix(array, linesToRemove) {
        while (array.length > 0 && linesToRemove.some((regexp) => typeof regexp === "string" ? regexp === array[0] : array[0].match(regexp))) {
          array.shift();
        }
      }
      const lines = leaking.source.split("\n").map((p) => p.trim().replace("at ", "")).filter((l) => l !== "");
      removePrefix(lines, ["Error", /^trackDisposable \(.*\)$/, /^DisposableTracker.trackDisposable \(.*\)$/]);
      return lines.reverse();
    }
    const stackTraceStarts = new SetMap();
    for (const leaking of uncoveredLeakingObjs) {
      const stackTracePath = getStackTracePath(leaking);
      for (let i2 = 0; i2 <= stackTracePath.length; i2++) {
        stackTraceStarts.add(stackTracePath.slice(0, i2).join("\n"), leaking);
      }
    }
    uncoveredLeakingObjs.sort(compareBy((l) => l.idx, numberComparator));
    let message = "";
    let i = 0;
    for (const leaking of uncoveredLeakingObjs.slice(0, maxReported)) {
      i++;
      const stackTracePath = getStackTracePath(leaking);
      const stackTraceFormattedLines = [];
      for (let i2 = 0; i2 < stackTracePath.length; i2++) {
        let line = stackTracePath[i2];
        const starts = stackTraceStarts.get(stackTracePath.slice(0, i2 + 1).join("\n"));
        line = `(shared with ${starts.size}/${uncoveredLeakingObjs.length} leaks) at ${line}`;
        const prevStarts = stackTraceStarts.get(stackTracePath.slice(0, i2).join("\n"));
        const continuations = groupBy([...prevStarts].map((d) => getStackTracePath(d)[i2]), (v) => v);
        delete continuations[stackTracePath[i2]];
        for (const [cont, set] of Object.entries(continuations)) {
          if (set) {
            stackTraceFormattedLines.unshift(`    - stacktraces of ${set.length} other leaks continue with ${cont}`);
          }
        }
        stackTraceFormattedLines.unshift(line);
      }
      message += `


==================== Leaking disposable ${i}/${uncoveredLeakingObjs.length}: ${leaking.value.constructor.name} ====================
${stackTraceFormattedLines.join("\n")}
============================================================

`;
    }
    if (uncoveredLeakingObjs.length > maxReported) {
      message += `


... and ${uncoveredLeakingObjs.length - maxReported} more leaking disposables

`;
    }
    return { leaks: uncoveredLeakingObjs, details: message };
  }
};
function setDisposableTracker(tracker) {
  disposableTracker = tracker;
}
if (TRACK_DISPOSABLES) {
  const __is_disposable_tracked__ = "__is_disposable_tracked__";
  setDisposableTracker(new class {
    trackDisposable(x) {
      const stack = new Error("Potentially leaked disposable").stack;
      setTimeout(() => {
        if (!x[__is_disposable_tracked__]) {
          console.log(stack);
        }
      }, 3e3);
    }
    setParent(child, parent) {
      if (child && child !== Disposable.None) {
        try {
          child[__is_disposable_tracked__] = true;
        } catch {
        }
      }
    }
    markAsDisposed(disposable) {
      if (disposable && disposable !== Disposable.None) {
        try {
          disposable[__is_disposable_tracked__] = true;
        } catch {
        }
      }
    }
    markAsSingleton(disposable) {
    }
  }());
}
function trackDisposable(x) {
  disposableTracker?.trackDisposable(x);
  return x;
}
function markAsDisposed(disposable) {
  disposableTracker?.markAsDisposed(disposable);
}
function setParentOfDisposable(child, parent) {
  disposableTracker?.setParent(child, parent);
}
function setParentOfDisposables(children, parent) {
  if (!disposableTracker) {
    return;
  }
  for (const child of children) {
    disposableTracker.setParent(child, parent);
  }
}
function dispose(arg) {
  if (Iterable.is(arg)) {
    const errors = [];
    for (const d of arg) {
      if (d) {
        try {
          d.dispose();
        } catch (e) {
          errors.push(e);
        }
      }
    }
    if (errors.length === 1) {
      throw errors[0];
    } else if (errors.length > 1) {
      throw new AggregateError(errors, "Encountered errors while disposing of store");
    }
    return Array.isArray(arg) ? [] : arg;
  } else if (arg) {
    arg.dispose();
    return arg;
  }
}
function combinedDisposable(...disposables) {
  const parent = toDisposable(() => dispose(disposables));
  setParentOfDisposables(disposables, parent);
  return parent;
}
var FunctionDisposable = class {
  constructor(fn) {
    this._isDisposed = false;
    this._fn = fn;
    trackDisposable(this);
  }
  dispose() {
    if (this._isDisposed) {
      return;
    }
    if (!this._fn) {
      throw new Error(`Unbound disposable context: Need to use an arrow function to preserve the value of this`);
    }
    this._isDisposed = true;
    markAsDisposed(this);
    this._fn();
  }
};
function toDisposable(fn) {
  return new FunctionDisposable(fn);
}
var DisposableStore = class _DisposableStore {
  constructor() {
    this._toDispose = /* @__PURE__ */ new Set();
    this._isDisposed = false;
    trackDisposable(this);
  }
  static {
    this.DISABLE_DISPOSED_WARNING = false;
  }
  /**
   * Dispose of all registered disposables and mark this object as disposed.
   *
   * Any future disposables added to this object will be disposed of on `add`.
   */
  dispose() {
    if (this._isDisposed) {
      return;
    }
    markAsDisposed(this);
    this._isDisposed = true;
    this.clear();
  }
  /**
   * @return `true` if this object has been disposed of.
   */
  get isDisposed() {
    return this._isDisposed;
  }
  /**
   * Dispose of all registered disposables but do not mark this object as disposed.
   */
  clear() {
    if (this._toDispose.size === 0) {
      return;
    }
    try {
      dispose(this._toDispose);
    } finally {
      this._toDispose.clear();
    }
  }
  /**
   * Add a new {@link IDisposable disposable} to the collection.
   */
  add(o) {
    if (!o || o === Disposable.None) {
      return o;
    }
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    setParentOfDisposable(o, this);
    if (this._isDisposed) {
      if (!_DisposableStore.DISABLE_DISPOSED_WARNING) {
        console.warn(new Error("Trying to add a disposable to a DisposableStore that has already been disposed of. The added object will be leaked!").stack);
      }
    } else {
      this._toDispose.add(o);
    }
    return o;
  }
  /**
   * Deletes a disposable from store and disposes of it. This will not throw or warn and proceed to dispose the
   * disposable even when the disposable is not part in the store.
   */
  delete(o) {
    if (!o) {
      return;
    }
    if (o === this) {
      throw new Error("Cannot dispose a disposable on itself!");
    }
    this._toDispose.delete(o);
    o.dispose();
  }
  /**
   * Deletes the value from the store, but does not dispose it.
   */
  deleteAndLeak(o) {
    if (!o) {
      return;
    }
    if (this._toDispose.has(o)) {
      this._toDispose.delete(o);
      setParentOfDisposable(o, null);
    }
  }
  assertNotDisposed() {
    if (this._isDisposed) {
      onUnexpectedError(new BugIndicatingError("Object disposed"));
    }
  }
};
var Disposable = class {
  constructor() {
    this._store = new DisposableStore();
    trackDisposable(this);
    setParentOfDisposable(this._store, this);
  }
  static {
    /**
     * A disposable that does nothing when it is disposed of.
     *
     * TODO: This should not be a static property.
     */
    this.None = Object.freeze({ dispose() {
    } });
  }
  dispose() {
    markAsDisposed(this);
    this._store.dispose();
  }
  /**
   * Adds `o` to the collection of disposables managed by this object.
   */
  _register(o) {
    if (o === this) {
      throw new Error("Cannot register a disposable on itself!");
    }
    return this._store.add(o);
  }
};

// src/util/vs/base/common/linkedList.ts
var Node = class _Node {
  static {
    this.Undefined = new _Node(void 0);
  }
  constructor(element) {
    this.element = element;
    this.next = _Node.Undefined;
    this.prev = _Node.Undefined;
  }
};

// src/util/vs/base/common/stopwatch.ts
var performanceNow = globalThis.performance.now.bind(globalThis.performance);
var StopWatch = class _StopWatch {
  static create(highResolution) {
    return new _StopWatch(highResolution);
  }
  constructor(highResolution) {
    this._now = highResolution === false ? Date.now : performanceNow;
    this._startTime = this._now();
    this._stopTime = -1;
  }
  stop() {
    this._stopTime = this._now();
  }
  reset() {
    this._startTime = this._now();
    this._stopTime = -1;
  }
  elapsed() {
    if (this._stopTime !== -1) {
      return this._stopTime - this._startTime;
    }
    return this._now() - this._startTime;
  }
};

// src/util/vs/base/common/event.ts
var _enableDisposeWithListenerWarning = false;
var _enableSnapshotPotentialLeakWarning = false;
var Event;
((Event3) => {
  Event3.None = () => Disposable.None;
  function _addLeakageTraceLogic(options) {
    if (_enableSnapshotPotentialLeakWarning) {
      const { onDidAddListener: origListenerDidAdd } = options;
      const stack = Stacktrace.create();
      let count = 0;
      options.onDidAddListener = () => {
        if (++count === 2) {
          console.warn("snapshotted emitter LIKELY used public and SHOULD HAVE BEEN created with DisposableStore. snapshotted here");
          stack.print();
        }
        origListenerDidAdd?.();
      };
    }
  }
  function defer(event, disposable) {
    return debounce(event, () => void 0, 0, void 0, true, void 0, disposable);
  }
  Event3.defer = defer;
  function once(event) {
    return (listener, thisArgs = null, disposables) => {
      let didFire = false;
      let result = void 0;
      result = event((e) => {
        if (didFire) {
          return;
        } else if (result) {
          result.dispose();
        } else {
          didFire = true;
        }
        return listener.call(thisArgs, e);
      }, null, disposables);
      if (didFire) {
        result.dispose();
      }
      return result;
    };
  }
  Event3.once = once;
  function onceIf(event, condition) {
    return Event3.once(Event3.filter(event, condition));
  }
  Event3.onceIf = onceIf;
  function map(event, map2, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((i) => listener.call(thisArgs, map2(i)), null, disposables), disposable);
  }
  Event3.map = map;
  function forEach(event, each, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((i) => {
      each(i);
      listener.call(thisArgs, i);
    }, null, disposables), disposable);
  }
  Event3.forEach = forEach;
  function filter(event, filter2, disposable) {
    return snapshot((listener, thisArgs = null, disposables) => event((e) => filter2(e) && listener.call(thisArgs, e), null, disposables), disposable);
  }
  Event3.filter = filter;
  function signal(event) {
    return event;
  }
  Event3.signal = signal;
  function any(...events) {
    return (listener, thisArgs = null, disposables) => {
      const disposable = combinedDisposable(...events.map((event) => event((e) => listener.call(thisArgs, e))));
      return addAndReturnDisposable(disposable, disposables);
    };
  }
  Event3.any = any;
  function reduce(event, merge, initial, disposable) {
    let output = initial;
    return map(event, (e) => {
      output = merge(output, e);
      return output;
    }, disposable);
  }
  Event3.reduce = reduce;
  function snapshot(event, disposable) {
    let listener;
    const options = {
      onWillAddFirstListener() {
        listener = event(emitter.fire, emitter);
      },
      onDidRemoveLastListener() {
        listener?.dispose();
      }
    };
    if (!disposable) {
      _addLeakageTraceLogic(options);
    }
    const emitter = new Emitter(options);
    disposable?.add(emitter);
    return emitter.event;
  }
  function addAndReturnDisposable(d, store) {
    if (store instanceof Array) {
      store.push(d);
    } else if (store) {
      store.add(d);
    }
    return d;
  }
  function debounce(event, merge, delay = 100, leading = false, flushOnListenerRemove = false, leakWarningThreshold, disposable) {
    let subscription;
    let output = void 0;
    let handle = void 0;
    let numDebouncedCalls = 0;
    let doFire;
    const options = {
      leakWarningThreshold,
      onWillAddFirstListener() {
        subscription = event((cur) => {
          numDebouncedCalls++;
          output = merge(output, cur);
          if (leading && !handle) {
            emitter.fire(output);
            output = void 0;
          }
          doFire = () => {
            const _output = output;
            output = void 0;
            handle = void 0;
            if (!leading || numDebouncedCalls > 1) {
              emitter.fire(_output);
            }
            numDebouncedCalls = 0;
          };
          if (typeof delay === "number") {
            if (handle) {
              clearTimeout(handle);
            }
            handle = setTimeout(doFire, delay);
          } else {
            if (handle === void 0) {
              handle = null;
              queueMicrotask(doFire);
            }
          }
        });
      },
      onWillRemoveListener() {
        if (flushOnListenerRemove && numDebouncedCalls > 0) {
          doFire?.();
        }
      },
      onDidRemoveLastListener() {
        doFire = void 0;
        subscription.dispose();
      }
    };
    if (!disposable) {
      _addLeakageTraceLogic(options);
    }
    const emitter = new Emitter(options);
    disposable?.add(emitter);
    return emitter.event;
  }
  Event3.debounce = debounce;
  function accumulate(event, delay = 0, disposable) {
    return Event3.debounce(event, (last, e) => {
      if (!last) {
        return [e];
      }
      last.push(e);
      return last;
    }, delay, void 0, true, void 0, disposable);
  }
  Event3.accumulate = accumulate;
  function latch(event, equals = (a, b) => a === b, disposable) {
    let firstCall = true;
    let cache;
    return filter(event, (value) => {
      const shouldEmit = firstCall || !equals(value, cache);
      firstCall = false;
      cache = value;
      return shouldEmit;
    }, disposable);
  }
  Event3.latch = latch;
  function split(event, isT, disposable) {
    return [
      Event3.filter(event, isT, disposable),
      Event3.filter(event, (e) => !isT(e), disposable)
    ];
  }
  Event3.split = split;
  function buffer(event, flushAfterTimeout = false, _buffer = [], disposable) {
    let buffer2 = _buffer.slice();
    let listener = event((e) => {
      if (buffer2) {
        buffer2.push(e);
      } else {
        emitter.fire(e);
      }
    });
    if (disposable) {
      disposable.add(listener);
    }
    const flush = () => {
      buffer2?.forEach((e) => emitter.fire(e));
      buffer2 = null;
    };
    const emitter = new Emitter({
      onWillAddFirstListener() {
        if (!listener) {
          listener = event((e) => emitter.fire(e));
          if (disposable) {
            disposable.add(listener);
          }
        }
      },
      onDidAddFirstListener() {
        if (buffer2) {
          if (flushAfterTimeout) {
            setTimeout(flush);
          } else {
            flush();
          }
        }
      },
      onDidRemoveLastListener() {
        if (listener) {
          listener.dispose();
        }
        listener = null;
      }
    });
    if (disposable) {
      disposable.add(emitter);
    }
    return emitter.event;
  }
  Event3.buffer = buffer;
  function chain(event, sythensize) {
    const fn = (listener, thisArgs, disposables) => {
      const cs = sythensize(new ChainableSynthesis());
      return event(function(value) {
        const result = cs.evaluate(value);
        if (result !== HaltChainable) {
          listener.call(thisArgs, result);
        }
      }, void 0, disposables);
    };
    return fn;
  }
  Event3.chain = chain;
  const HaltChainable = Symbol("HaltChainable");
  class ChainableSynthesis {
    constructor() {
      this.steps = [];
    }
    map(fn) {
      this.steps.push(fn);
      return this;
    }
    forEach(fn) {
      this.steps.push((v) => {
        fn(v);
        return v;
      });
      return this;
    }
    filter(fn) {
      this.steps.push((v) => fn(v) ? v : HaltChainable);
      return this;
    }
    reduce(merge, initial) {
      let last = initial;
      this.steps.push((v) => {
        last = merge(last, v);
        return last;
      });
      return this;
    }
    latch(equals = (a, b) => a === b) {
      let firstCall = true;
      let cache;
      this.steps.push((value) => {
        const shouldEmit = firstCall || !equals(value, cache);
        firstCall = false;
        cache = value;
        return shouldEmit ? value : HaltChainable;
      });
      return this;
    }
    evaluate(value) {
      for (const step of this.steps) {
        value = step(value);
        if (value === HaltChainable) {
          break;
        }
      }
      return value;
    }
  }
  function fromNodeEventEmitter(emitter, eventName, map2 = (id2) => id2) {
    const fn = (...args) => result.fire(map2(...args));
    const onFirstListenerAdd = () => emitter.on(eventName, fn);
    const onLastListenerRemove = () => emitter.removeListener(eventName, fn);
    const result = new Emitter({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
    return result.event;
  }
  Event3.fromNodeEventEmitter = fromNodeEventEmitter;
  function fromDOMEventEmitter(emitter, eventName, map2 = (id2) => id2) {
    const fn = (...args) => result.fire(map2(...args));
    const onFirstListenerAdd = () => emitter.addEventListener(eventName, fn);
    const onLastListenerRemove = () => emitter.removeEventListener(eventName, fn);
    const result = new Emitter({ onWillAddFirstListener: onFirstListenerAdd, onDidRemoveLastListener: onLastListenerRemove });
    return result.event;
  }
  Event3.fromDOMEventEmitter = fromDOMEventEmitter;
  function toPromise(event, disposables) {
    let cancelRef;
    const promise = new Promise((resolve2, reject) => {
      const listener = once(event)(resolve2, null, disposables);
      cancelRef = () => listener.dispose();
    });
    promise.cancel = cancelRef;
    return promise;
  }
  Event3.toPromise = toPromise;
  function forward(from, to) {
    return from((e) => to.fire(e));
  }
  Event3.forward = forward;
  function runAndSubscribe(event, handler, initial) {
    handler(initial);
    return event((e) => handler(e));
  }
  Event3.runAndSubscribe = runAndSubscribe;
  class EmitterObserver {
    constructor(_observable, store) {
      this._observable = _observable;
      this._counter = 0;
      this._hasChanged = false;
      const options = {
        onWillAddFirstListener: () => {
          _observable.addObserver(this);
          this._observable.reportChanges();
        },
        onDidRemoveLastListener: () => {
          _observable.removeObserver(this);
        }
      };
      if (!store) {
        _addLeakageTraceLogic(options);
      }
      this.emitter = new Emitter(options);
      if (store) {
        store.add(this.emitter);
      }
    }
    beginUpdate(_observable) {
      this._counter++;
    }
    handlePossibleChange(_observable) {
    }
    handleChange(_observable, _change) {
      this._hasChanged = true;
    }
    endUpdate(_observable) {
      this._counter--;
      if (this._counter === 0) {
        this._observable.reportChanges();
        if (this._hasChanged) {
          this._hasChanged = false;
          this.emitter.fire(this._observable.get());
        }
      }
    }
  }
  function fromObservable(obs, store) {
    const observer = new EmitterObserver(obs, store);
    return observer.emitter.event;
  }
  Event3.fromObservable = fromObservable;
  function fromObservableLight(observable) {
    return (listener, thisArgs, disposables) => {
      let count = 0;
      let didChange = false;
      const observer = {
        beginUpdate() {
          count++;
        },
        endUpdate() {
          count--;
          if (count === 0) {
            observable.reportChanges();
            if (didChange) {
              didChange = false;
              listener.call(thisArgs);
            }
          }
        },
        handlePossibleChange() {
        },
        handleChange() {
          didChange = true;
        }
      };
      observable.addObserver(observer);
      observable.reportChanges();
      const disposable = {
        dispose() {
          observable.removeObserver(observer);
        }
      };
      if (disposables instanceof DisposableStore) {
        disposables.add(disposable);
      } else if (Array.isArray(disposables)) {
        disposables.push(disposable);
      }
      return disposable;
    };
  }
  Event3.fromObservableLight = fromObservableLight;
})(Event || (Event = {}));
var EventProfiling = class _EventProfiling {
  constructor(name) {
    this.listenerCount = 0;
    this.invocationCount = 0;
    this.elapsedOverall = 0;
    this.durations = [];
    this.name = `${name}_${_EventProfiling._idPool++}`;
    _EventProfiling.all.add(this);
  }
  static {
    this.all = /* @__PURE__ */ new Set();
  }
  static {
    this._idPool = 0;
  }
  start(listenerCount) {
    this._stopWatch = new StopWatch();
    this.listenerCount = listenerCount;
  }
  stop() {
    if (this._stopWatch) {
      const elapsed = this._stopWatch.elapsed();
      this.durations.push(elapsed);
      this.elapsedOverall += elapsed;
      this.invocationCount += 1;
      this._stopWatch = void 0;
    }
  }
};
var _globalLeakWarningThreshold = -1;
var LeakageMonitor = class _LeakageMonitor {
  constructor(_errorHandler, threshold, name = (_LeakageMonitor._idPool++).toString(16).padStart(3, "0")) {
    this._errorHandler = _errorHandler;
    this.threshold = threshold;
    this.name = name;
    this._warnCountdown = 0;
  }
  static {
    this._idPool = 1;
  }
  dispose() {
    this._stacks?.clear();
  }
  check(stack, listenerCount) {
    const threshold = this.threshold;
    if (threshold <= 0 || listenerCount < threshold) {
      return void 0;
    }
    if (!this._stacks) {
      this._stacks = /* @__PURE__ */ new Map();
    }
    const count = this._stacks.get(stack.value) || 0;
    this._stacks.set(stack.value, count + 1);
    this._warnCountdown -= 1;
    if (this._warnCountdown <= 0) {
      this._warnCountdown = threshold * 0.5;
      const [topStack, topCount] = this.getMostFrequentStack();
      const message = `[${this.name}] potential listener LEAK detected, having ${listenerCount} listeners already. MOST frequent listener (${topCount}):`;
      console.warn(message);
      console.warn(topStack);
      const error = new ListenerLeakError(message, topStack);
      this._errorHandler(error);
    }
    return () => {
      const count2 = this._stacks.get(stack.value) || 0;
      this._stacks.set(stack.value, count2 - 1);
    };
  }
  getMostFrequentStack() {
    if (!this._stacks) {
      return void 0;
    }
    let topStack;
    let topCount = 0;
    for (const [stack, count] of this._stacks) {
      if (!topStack || topCount < count) {
        topStack = [stack, count];
        topCount = count;
      }
    }
    return topStack;
  }
};
var Stacktrace = class _Stacktrace {
  constructor(value) {
    this.value = value;
  }
  static create() {
    const err = new Error();
    return new _Stacktrace(err.stack ?? "");
  }
  print() {
    console.warn(this.value.split("\n").slice(2).join("\n"));
  }
};
var ListenerLeakError = class extends Error {
  constructor(message, stack) {
    super(message);
    this.name = "ListenerLeakError";
    this.stack = stack;
  }
};
var ListenerRefusalError = class extends Error {
  constructor(message, stack) {
    super(message);
    this.name = "ListenerRefusalError";
    this.stack = stack;
  }
};
var id = 0;
var UniqueContainer = class {
  constructor(value) {
    this.value = value;
    this.id = id++;
  }
};
var compactionThreshold = 2;
var forEachListener = (listeners, fn) => {
  if (listeners instanceof UniqueContainer) {
    fn(listeners);
  } else {
    for (let i = 0; i < listeners.length; i++) {
      const l = listeners[i];
      if (l) {
        fn(l);
      }
    }
  }
};
var Emitter = class {
  constructor(options) {
    this._size = 0;
    this._options = options;
    this._leakageMon = _globalLeakWarningThreshold > 0 || this._options?.leakWarningThreshold ? new LeakageMonitor(options?.onListenerError ?? onUnexpectedError, this._options?.leakWarningThreshold ?? _globalLeakWarningThreshold) : void 0;
    this._perfMon = this._options?._profName ? new EventProfiling(this._options._profName) : void 0;
    this._deliveryQueue = this._options?.deliveryQueue;
  }
  dispose() {
    if (!this._disposed) {
      this._disposed = true;
      if (this._deliveryQueue?.current === this) {
        this._deliveryQueue.reset();
      }
      if (this._listeners) {
        if (_enableDisposeWithListenerWarning) {
          const listeners = this._listeners;
          queueMicrotask(() => {
            forEachListener(listeners, (l) => l.stack?.print());
          });
        }
        this._listeners = void 0;
        this._size = 0;
      }
      this._options?.onDidRemoveLastListener?.();
      this._leakageMon?.dispose();
    }
  }
  /**
   * For the public to allow to subscribe
   * to events from this Emitter
   */
  get event() {
    this._event ??= (callback, thisArgs, disposables) => {
      if (this._leakageMon && this._size > this._leakageMon.threshold ** 2) {
        const message = `[${this._leakageMon.name}] REFUSES to accept new listeners because it exceeded its threshold by far (${this._size} vs ${this._leakageMon.threshold})`;
        console.warn(message);
        const tuple = this._leakageMon.getMostFrequentStack() ?? ["UNKNOWN stack", -1];
        const error = new ListenerRefusalError(`${message}. HINT: Stack shows most frequent listener (${tuple[1]}-times)`, tuple[0]);
        const errorHandler2 = this._options?.onListenerError || onUnexpectedError;
        errorHandler2(error);
        return Disposable.None;
      }
      if (this._disposed) {
        return Disposable.None;
      }
      if (thisArgs) {
        callback = callback.bind(thisArgs);
      }
      const contained = new UniqueContainer(callback);
      let removeMonitor;
      let stack;
      if (this._leakageMon && this._size >= Math.ceil(this._leakageMon.threshold * 0.2)) {
        contained.stack = Stacktrace.create();
        removeMonitor = this._leakageMon.check(contained.stack, this._size + 1);
      }
      if (_enableDisposeWithListenerWarning) {
        contained.stack = stack ?? Stacktrace.create();
      }
      if (!this._listeners) {
        this._options?.onWillAddFirstListener?.(this);
        this._listeners = contained;
        this._options?.onDidAddFirstListener?.(this);
      } else if (this._listeners instanceof UniqueContainer) {
        this._deliveryQueue ??= new EventDeliveryQueuePrivate();
        this._listeners = [this._listeners, contained];
      } else {
        this._listeners.push(contained);
      }
      this._options?.onDidAddListener?.(this);
      this._size++;
      const result = toDisposable(() => {
        removeMonitor?.();
        this._removeListener(contained);
      });
      if (disposables instanceof DisposableStore) {
        disposables.add(result);
      } else if (Array.isArray(disposables)) {
        disposables.push(result);
      }
      return result;
    };
    return this._event;
  }
  _removeListener(listener) {
    this._options?.onWillRemoveListener?.(this);
    if (!this._listeners) {
      return;
    }
    if (this._size === 1) {
      this._listeners = void 0;
      this._options?.onDidRemoveLastListener?.(this);
      this._size = 0;
      return;
    }
    const listeners = this._listeners;
    const index = listeners.indexOf(listener);
    if (index === -1) {
      console.log("disposed?", this._disposed);
      console.log("size?", this._size);
      console.log("arr?", JSON.stringify(this._listeners));
      throw new Error("Attempted to dispose unknown listener");
    }
    this._size--;
    listeners[index] = void 0;
    const adjustDeliveryQueue = this._deliveryQueue.current === this;
    if (this._size * compactionThreshold <= listeners.length) {
      let n = 0;
      for (let i = 0; i < listeners.length; i++) {
        if (listeners[i]) {
          listeners[n++] = listeners[i];
        } else if (adjustDeliveryQueue && n < this._deliveryQueue.end) {
          this._deliveryQueue.end--;
          if (n < this._deliveryQueue.i) {
            this._deliveryQueue.i--;
          }
        }
      }
      listeners.length = n;
    }
  }
  _deliver(listener, value) {
    if (!listener) {
      return;
    }
    const errorHandler2 = this._options?.onListenerError || onUnexpectedError;
    if (!errorHandler2) {
      listener.value(value);
      return;
    }
    try {
      listener.value(value);
    } catch (e) {
      errorHandler2(e);
    }
  }
  /** Delivers items in the queue. Assumes the queue is ready to go. */
  _deliverQueue(dq) {
    const listeners = dq.current._listeners;
    while (dq.i < dq.end) {
      this._deliver(listeners[dq.i++], dq.value);
    }
    dq.reset();
  }
  /**
   * To be kept private to fire an event to
   * subscribers
   */
  fire(event) {
    if (this._deliveryQueue?.current) {
      this._deliverQueue(this._deliveryQueue);
      this._perfMon?.stop();
    }
    this._perfMon?.start(this._size);
    if (!this._listeners) {
    } else if (this._listeners instanceof UniqueContainer) {
      this._deliver(this._listeners, event);
    } else {
      const dq = this._deliveryQueue;
      dq.enqueue(this, event, this._listeners.length);
      this._deliverQueue(dq);
    }
    this._perfMon?.stop();
  }
  hasListeners() {
    return this._size > 0;
  }
};
var EventDeliveryQueuePrivate = class {
  constructor() {
    /**
     * Index in current's listener list.
     */
    this.i = -1;
    /**
     * The last index in the listener's list to deliver.
     */
    this.end = 0;
  }
  enqueue(emitter, value, end) {
    this.i = 0;
    this.end = end;
    this.current = emitter;
    this.value = value;
  }
  reset() {
    this.i = this.end;
    this.current = void 0;
    this.value = void 0;
  }
};

// src/util/vs/base/common/cancellation.ts
var shortcutEvent = Object.freeze(function(callback, context) {
  const handle = setTimeout(callback.bind(context), 0);
  return { dispose() {
    clearTimeout(handle);
  } };
});
var CancellationToken;
((CancellationToken4) => {
  function isCancellationToken(thing) {
    if (thing === CancellationToken4.None || thing === CancellationToken4.Cancelled) {
      return true;
    }
    if (thing instanceof MutableToken) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return typeof thing.isCancellationRequested === "boolean" && typeof thing.onCancellationRequested === "function";
  }
  CancellationToken4.isCancellationToken = isCancellationToken;
  CancellationToken4.None = Object.freeze({
    isCancellationRequested: false,
    onCancellationRequested: Event.None
  });
  CancellationToken4.Cancelled = Object.freeze({
    isCancellationRequested: true,
    onCancellationRequested: shortcutEvent
  });
})(CancellationToken || (CancellationToken = {}));
var MutableToken = class {
  constructor() {
    this._isCancelled = false;
    this._emitter = null;
  }
  cancel() {
    if (!this._isCancelled) {
      this._isCancelled = true;
      if (this._emitter) {
        this._emitter.fire(void 0);
        this.dispose();
      }
    }
  }
  get isCancellationRequested() {
    return this._isCancelled;
  }
  get onCancellationRequested() {
    if (this._isCancelled) {
      return shortcutEvent;
    }
    if (!this._emitter) {
      this._emitter = new Emitter();
    }
    return this._emitter.event;
  }
  dispose() {
    if (this._emitter) {
      this._emitter.dispose();
      this._emitter = null;
    }
  }
};

// src/util/vs/base/common/lazy.ts
var Lazy = class {
  constructor(executor) {
    this.executor = executor;
    this._state = 0 /* Uninitialized */;
  }
  /**
   * True if the lazy value has been resolved.
   */
  get hasValue() {
    return this._state === 2 /* Completed */;
  }
  /**
   * Get the wrapped value.
   *
   * This will force evaluation of the lazy value if it has not been resolved yet. Lazy values are only
   * resolved once. `getValue` will re-throw exceptions that are hit while resolving the value
   */
  get value() {
    if (this._state === 0 /* Uninitialized */) {
      this._state = 1 /* Running */;
      try {
        this._value = this.executor();
      } catch (err) {
        this._error = err;
      } finally {
        this._state = 2 /* Completed */;
      }
    } else if (this._state === 1 /* Running */) {
      throw new Error("Cannot read the value of a lazy that is being initialized");
    }
    if (this._error) {
      throw this._error;
    }
    return this._value;
  }
  /**
   * Get the wrapped value without forcing evaluation.
   */
  get rawValue() {
    return this._value;
  }
};

// src/util/vs/nls.messages.ts
function getNLSLanguage() {
  return globalThis._VSCODE_NLS_LANGUAGE;
}

// src/util/vs/nls.ts
var isPseudo = getNLSLanguage() === "pseudo" || typeof document !== "undefined" && document.location && typeof document.location.hash === "string" && document.location.hash.indexOf("pseudo=true") >= 0;

// src/util/vs/base/common/platform.ts
var LANGUAGE_DEFAULT = "en";
var _isWindows = false;
var _isMacintosh = false;
var _isLinux = false;
var _isLinuxSnap = false;
var _isNative = false;
var _isWeb = false;
var _isElectron = false;
var _isIOS = false;
var _isCI = false;
var _isMobile = false;
var _locale = void 0;
var _language = LANGUAGE_DEFAULT;
var _platformLocale = LANGUAGE_DEFAULT;
var _translationsConfigFile = void 0;
var _userAgent = void 0;
var $globalThis = globalThis;
var nodeProcess = void 0;
if (typeof $globalThis.vscode !== "undefined" && typeof $globalThis.vscode.process !== "undefined") {
  nodeProcess = $globalThis.vscode.process;
} else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
  nodeProcess = process;
}
var isElectronProcess = typeof nodeProcess?.versions?.electron === "string";
var isElectronRenderer = isElectronProcess && nodeProcess?.type === "renderer";
if (typeof nodeProcess === "object") {
  _isWindows = nodeProcess.platform === "win32";
  _isMacintosh = nodeProcess.platform === "darwin";
  _isLinux = nodeProcess.platform === "linux";
  _isLinuxSnap = _isLinux && !!nodeProcess.env["SNAP"] && !!nodeProcess.env["SNAP_REVISION"];
  _isElectron = isElectronProcess;
  _isCI = !!nodeProcess.env["CI"] || !!nodeProcess.env["BUILD_ARTIFACTSTAGINGDIRECTORY"] || !!nodeProcess.env["GITHUB_WORKSPACE"];
  _locale = LANGUAGE_DEFAULT;
  _language = LANGUAGE_DEFAULT;
  const rawNlsConfig = nodeProcess.env["VSCODE_NLS_CONFIG"];
  if (rawNlsConfig) {
    try {
      const nlsConfig = JSON.parse(rawNlsConfig);
      _locale = nlsConfig.userLocale;
      _platformLocale = nlsConfig.osLocale;
      _language = nlsConfig.resolvedLanguage || LANGUAGE_DEFAULT;
      _translationsConfigFile = nlsConfig.languagePack?.translationsConfigFile;
    } catch (e) {
    }
  }
  _isNative = true;
} else if (typeof navigator === "object" && !isElectronRenderer) {
  _userAgent = navigator.userAgent;
  _isWindows = _userAgent.indexOf("Windows") >= 0;
  _isMacintosh = _userAgent.indexOf("Macintosh") >= 0;
  _isIOS = (_userAgent.indexOf("Macintosh") >= 0 || _userAgent.indexOf("iPad") >= 0 || _userAgent.indexOf("iPhone") >= 0) && !!navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
  _isLinux = _userAgent.indexOf("Linux") >= 0;
  _isMobile = _userAgent?.indexOf("Mobi") >= 0;
  _isWeb = true;
  _language = getNLSLanguage() || LANGUAGE_DEFAULT;
  _locale = navigator.language.toLowerCase();
  _platformLocale = _locale;
} else {
  console.error("Unable to resolve platform.");
}
var _platform = 0 /* Web */;
if (_isMacintosh) {
  _platform = 1 /* Mac */;
} else if (_isWindows) {
  _platform = 3 /* Windows */;
} else if (_isLinux) {
  _platform = 2 /* Linux */;
}
var isWindows = _isWindows;
var isMacintosh = _isMacintosh;
var isLinux = _isLinux;
var isNative = _isNative;
var isWeb = _isWeb;
var isWebWorker = _isWeb && typeof $globalThis.importScripts === "function";
var webWorkerOrigin = isWebWorker ? $globalThis.origin : void 0;
var userAgent = _userAgent;
var language = _language;
var Language;
((Language2) => {
  function value() {
    return language;
  }
  Language2.value = value;
  function isDefaultVariant() {
    if (language.length === 2) {
      return language === "en";
    } else if (language.length >= 3) {
      return language[0] === "e" && language[1] === "n" && language[2] === "-";
    } else {
      return false;
    }
  }
  Language2.isDefaultVariant = isDefaultVariant;
  function isDefault() {
    return language === "en";
  }
  Language2.isDefault = isDefault;
})(Language || (Language = {}));
var setTimeout0IsFaster = typeof $globalThis.postMessage === "function" && !$globalThis.importScripts;
var setTimeout0 = (() => {
  if (setTimeout0IsFaster) {
    const pending = [];
    $globalThis.addEventListener("message", (e) => {
      if (e.data && e.data.vscodeScheduleAsyncWork) {
        for (let i = 0, len = pending.length; i < len; i++) {
          const candidate = pending[i];
          if (candidate.id === e.data.vscodeScheduleAsyncWork) {
            pending.splice(i, 1);
            candidate.callback();
            return;
          }
        }
      }
    });
    let lastId = 0;
    return (callback) => {
      const myId = ++lastId;
      pending.push({
        id: myId,
        callback
      });
      $globalThis.postMessage({ vscodeScheduleAsyncWork: myId }, "*");
    };
  }
  return (callback) => setTimeout(callback);
})();
var isChrome = !!(userAgent && userAgent.indexOf("Chrome") >= 0);
var isFirefox = !!(userAgent && userAgent.indexOf("Firefox") >= 0);
var isSafari = !!(!isChrome && (userAgent && userAgent.indexOf("Safari") >= 0));
var isEdge = !!(userAgent && userAgent.indexOf("Edg/") >= 0);
var isAndroid = !!(userAgent && userAgent.indexOf("Android") >= 0);

// src/util/vs/base/common/process.ts
var safeProcess;
var vscodeGlobal = globalThis.vscode;
if (typeof vscodeGlobal !== "undefined" && typeof vscodeGlobal.process !== "undefined") {
  const sandboxProcess = vscodeGlobal.process;
  safeProcess = {
    get platform() {
      return sandboxProcess.platform;
    },
    get arch() {
      return sandboxProcess.arch;
    },
    get env() {
      return sandboxProcess.env;
    },
    cwd() {
      return sandboxProcess.cwd();
    }
  };
} else if (typeof process !== "undefined" && typeof process?.versions?.node === "string") {
  safeProcess = {
    get platform() {
      return process.platform;
    },
    get arch() {
      return process.arch;
    },
    get env() {
      return process.env;
    },
    cwd() {
      return process.env["VSCODE_CWD"] || process.cwd();
    }
  };
} else {
  safeProcess = {
    // Supported
    get platform() {
      return isWindows ? "win32" : isMacintosh ? "darwin" : "linux";
    },
    get arch() {
      return void 0;
    },
    // Unsupported
    get env() {
      return {};
    },
    cwd() {
      return "/";
    }
  };
}
var cwd = safeProcess.cwd;
var env = safeProcess.env;
var platform = safeProcess.platform;
var arch = safeProcess.arch;

// src/util/vs/base/common/path.ts
var CHAR_UPPERCASE_A = 65;
var CHAR_LOWERCASE_A = 97;
var CHAR_UPPERCASE_Z = 90;
var CHAR_LOWERCASE_Z = 122;
var CHAR_DOT = 46;
var CHAR_FORWARD_SLASH = 47;
var CHAR_BACKWARD_SLASH = 92;
var CHAR_COLON = 58;
var CHAR_QUESTION_MARK = 63;
var ErrorInvalidArgType = class extends Error {
  constructor(name, expected, actual) {
    let determiner;
    if (typeof expected === "string" && expected.indexOf("not ") === 0) {
      determiner = "must not be";
      expected = expected.replace(/^not /, "");
    } else {
      determiner = "must be";
    }
    const type = name.indexOf(".") !== -1 ? "property" : "argument";
    let msg = `The "${name}" ${type} ${determiner} of type ${expected}`;
    msg += `. Received type ${typeof actual}`;
    super(msg);
    this.code = "ERR_INVALID_ARG_TYPE";
  }
};
function validateObject(pathObject, name) {
  if (pathObject === null || typeof pathObject !== "object") {
    throw new ErrorInvalidArgType(name, "Object", pathObject);
  }
}
function validateString(value, name) {
  if (typeof value !== "string") {
    throw new ErrorInvalidArgType(name, "string", value);
  }
}
var platformIsWin32 = platform === "win32";
function isPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}
function isPosixPathSeparator(code) {
  return code === CHAR_FORWARD_SLASH;
}
function isWindowsDeviceRoot(code) {
  return code >= CHAR_UPPERCASE_A && code <= CHAR_UPPERCASE_Z || code >= CHAR_LOWERCASE_A && code <= CHAR_LOWERCASE_Z;
}
function normalizeString(path2, allowAboveRoot, separator, isPathSeparator3) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let code = 0;
  for (let i = 0; i <= path2.length; ++i) {
    if (i < path2.length) {
      code = path2.charCodeAt(i);
    } else if (isPathSeparator3(code)) {
      break;
    } else {
      code = CHAR_FORWARD_SLASH;
    }
    if (isPathSeparator3(code)) {
      if (lastSlash === i - 1 || dots === 1) {
      } else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res.charCodeAt(res.length - 1) !== CHAR_DOT || res.charCodeAt(res.length - 2) !== CHAR_DOT) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf(separator);
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (res.length !== 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? `${separator}..` : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `${separator}${path2.slice(lastSlash + 1, i)}`;
        } else {
          res = path2.slice(lastSlash + 1, i);
        }
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code === CHAR_DOT && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
function formatExt(ext) {
  return ext ? `${ext[0] === "." ? "" : "."}${ext}` : "";
}
function _format(sep2, pathObject) {
  validateObject(pathObject, "pathObject");
  const dir = pathObject.dir || pathObject.root;
  const base = pathObject.base || `${pathObject.name || ""}${formatExt(pathObject.ext)}`;
  if (!dir) {
    return base;
  }
  return dir === pathObject.root ? `${dir}${base}` : `${dir}${sep2}${base}`;
}
var win32 = {
  // path.resolve([from ...], to)
  resolve(...pathSegments) {
    let resolvedDevice = "";
    let resolvedTail = "";
    let resolvedAbsolute = false;
    for (let i = pathSegments.length - 1; i >= -1; i--) {
      let path2;
      if (i >= 0) {
        path2 = pathSegments[i];
        validateString(path2, `paths[${i}]`);
        if (path2.length === 0) {
          continue;
        }
      } else if (resolvedDevice.length === 0) {
        path2 = cwd();
      } else {
        path2 = env[`=${resolvedDevice}`] || cwd();
        if (path2 === void 0 || path2.slice(0, 2).toLowerCase() !== resolvedDevice.toLowerCase() && path2.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
          path2 = `${resolvedDevice}\\`;
        }
      }
      const len = path2.length;
      let rootEnd = 0;
      let device = "";
      let isAbsolute2 = false;
      const code = path2.charCodeAt(0);
      if (len === 1) {
        if (isPathSeparator(code)) {
          rootEnd = 1;
          isAbsolute2 = true;
        }
      } else if (isPathSeparator(code)) {
        isAbsolute2 = true;
        if (isPathSeparator(path2.charCodeAt(1))) {
          let j = 2;
          let last = j;
          while (j < len && !isPathSeparator(path2.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            const firstPart = path2.slice(last, j);
            last = j;
            while (j < len && isPathSeparator(path2.charCodeAt(j))) {
              j++;
            }
            if (j < len && j !== last) {
              last = j;
              while (j < len && !isPathSeparator(path2.charCodeAt(j))) {
                j++;
              }
              if (j === len || j !== last) {
                device = `\\\\${firstPart}\\${path2.slice(last, j)}`;
                rootEnd = j;
              }
            }
          }
        } else {
          rootEnd = 1;
        }
      } else if (isWindowsDeviceRoot(code) && path2.charCodeAt(1) === CHAR_COLON) {
        device = path2.slice(0, 2);
        rootEnd = 2;
        if (len > 2 && isPathSeparator(path2.charCodeAt(2))) {
          isAbsolute2 = true;
          rootEnd = 3;
        }
      }
      if (device.length > 0) {
        if (resolvedDevice.length > 0) {
          if (device.toLowerCase() !== resolvedDevice.toLowerCase()) {
            continue;
          }
        } else {
          resolvedDevice = device;
        }
      }
      if (resolvedAbsolute) {
        if (resolvedDevice.length > 0) {
          break;
        }
      } else {
        resolvedTail = `${path2.slice(rootEnd)}\\${resolvedTail}`;
        resolvedAbsolute = isAbsolute2;
        if (isAbsolute2 && resolvedDevice.length > 0) {
          break;
        }
      }
    }
    resolvedTail = normalizeString(
      resolvedTail,
      !resolvedAbsolute,
      "\\",
      isPathSeparator
    );
    return resolvedAbsolute ? `${resolvedDevice}\\${resolvedTail}` : `${resolvedDevice}${resolvedTail}` || ".";
  },
  normalize(path2) {
    validateString(path2, "path");
    const len = path2.length;
    if (len === 0) {
      return ".";
    }
    let rootEnd = 0;
    let device;
    let isAbsolute2 = false;
    const code = path2.charCodeAt(0);
    if (len === 1) {
      return isPosixPathSeparator(code) ? "\\" : path2;
    }
    if (isPathSeparator(code)) {
      isAbsolute2 = true;
      if (isPathSeparator(path2.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path2.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          const firstPart = path2.slice(last, j);
          last = j;
          while (j < len && isPathSeparator(path2.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path2.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              return `\\\\${firstPart}\\${path2.slice(last)}\\`;
            }
            if (j !== last) {
              device = `\\\\${firstPart}\\${path2.slice(last, j)}`;
              rootEnd = j;
            }
          }
        }
      } else {
        rootEnd = 1;
      }
    } else if (isWindowsDeviceRoot(code) && path2.charCodeAt(1) === CHAR_COLON) {
      device = path2.slice(0, 2);
      rootEnd = 2;
      if (len > 2 && isPathSeparator(path2.charCodeAt(2))) {
        isAbsolute2 = true;
        rootEnd = 3;
      }
    }
    let tail = rootEnd < len ? normalizeString(path2.slice(rootEnd), !isAbsolute2, "\\", isPathSeparator) : "";
    if (tail.length === 0 && !isAbsolute2) {
      tail = ".";
    }
    if (tail.length > 0 && isPathSeparator(path2.charCodeAt(len - 1))) {
      tail += "\\";
    }
    if (!isAbsolute2 && device === void 0 && path2.includes(":")) {
      if (tail.length >= 2 && isWindowsDeviceRoot(tail.charCodeAt(0)) && tail.charCodeAt(1) === CHAR_COLON) {
        return `.\\${tail}`;
      }
      let index = path2.indexOf(":");
      do {
        if (index === len - 1 || isPathSeparator(path2.charCodeAt(index + 1))) {
          return `.\\${tail}`;
        }
      } while ((index = path2.indexOf(":", index + 1)) !== -1);
    }
    if (device === void 0) {
      return isAbsolute2 ? `\\${tail}` : tail;
    }
    return isAbsolute2 ? `${device}\\${tail}` : `${device}${tail}`;
  },
  isAbsolute(path2) {
    validateString(path2, "path");
    const len = path2.length;
    if (len === 0) {
      return false;
    }
    const code = path2.charCodeAt(0);
    return isPathSeparator(code) || // Possible device root
    len > 2 && isWindowsDeviceRoot(code) && path2.charCodeAt(1) === CHAR_COLON && isPathSeparator(path2.charCodeAt(2));
  },
  join(...paths) {
    if (paths.length === 0) {
      return ".";
    }
    let joined;
    let firstPart;
    for (let i = 0; i < paths.length; ++i) {
      const arg = paths[i];
      validateString(arg, "path");
      if (arg.length > 0) {
        if (joined === void 0) {
          joined = firstPart = arg;
        } else {
          joined += `\\${arg}`;
        }
      }
    }
    if (joined === void 0) {
      return ".";
    }
    let needsReplace = true;
    let slashCount = 0;
    if (typeof firstPart === "string" && isPathSeparator(firstPart.charCodeAt(0))) {
      ++slashCount;
      const firstLen = firstPart.length;
      if (firstLen > 1 && isPathSeparator(firstPart.charCodeAt(1))) {
        ++slashCount;
        if (firstLen > 2) {
          if (isPathSeparator(firstPart.charCodeAt(2))) {
            ++slashCount;
          } else {
            needsReplace = false;
          }
        }
      }
    }
    if (needsReplace) {
      while (slashCount < joined.length && isPathSeparator(joined.charCodeAt(slashCount))) {
        slashCount++;
      }
      if (slashCount >= 2) {
        joined = `\\${joined.slice(slashCount)}`;
      }
    }
    return win32.normalize(joined);
  },
  // It will solve the relative path from `from` to `to`, for instance:
  //  from = 'C:\\orandea\\test\\aaa'
  //  to = 'C:\\orandea\\impl\\bbb'
  // The output of the function should be: '..\\..\\impl\\bbb'
  relative(from, to) {
    validateString(from, "from");
    validateString(to, "to");
    if (from === to) {
      return "";
    }
    const fromOrig = win32.resolve(from);
    const toOrig = win32.resolve(to);
    if (fromOrig === toOrig) {
      return "";
    }
    from = fromOrig.toLowerCase();
    to = toOrig.toLowerCase();
    if (from === to) {
      return "";
    }
    if (fromOrig.length !== from.length || toOrig.length !== to.length) {
      const fromSplit = fromOrig.split("\\");
      const toSplit = toOrig.split("\\");
      if (fromSplit[fromSplit.length - 1] === "") {
        fromSplit.pop();
      }
      if (toSplit[toSplit.length - 1] === "") {
        toSplit.pop();
      }
      const fromLen2 = fromSplit.length;
      const toLen2 = toSplit.length;
      const length2 = fromLen2 < toLen2 ? fromLen2 : toLen2;
      let i2;
      for (i2 = 0; i2 < length2; i2++) {
        if (fromSplit[i2].toLowerCase() !== toSplit[i2].toLowerCase()) {
          break;
        }
      }
      if (i2 === 0) {
        return toOrig;
      } else if (i2 === length2) {
        if (toLen2 > length2) {
          return toSplit.slice(i2).join("\\");
        }
        if (fromLen2 > length2) {
          return "..\\".repeat(fromLen2 - 1 - i2) + "..";
        }
        return "";
      }
      return "..\\".repeat(fromLen2 - i2) + toSplit.slice(i2).join("\\");
    }
    let fromStart = 0;
    while (fromStart < from.length && from.charCodeAt(fromStart) === CHAR_BACKWARD_SLASH) {
      fromStart++;
    }
    let fromEnd = from.length;
    while (fromEnd - 1 > fromStart && from.charCodeAt(fromEnd - 1) === CHAR_BACKWARD_SLASH) {
      fromEnd--;
    }
    const fromLen = fromEnd - fromStart;
    let toStart = 0;
    while (toStart < to.length && to.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
      toStart++;
    }
    let toEnd = to.length;
    while (toEnd - 1 > toStart && to.charCodeAt(toEnd - 1) === CHAR_BACKWARD_SLASH) {
      toEnd--;
    }
    const toLen = toEnd - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
      const fromCode = from.charCodeAt(fromStart + i);
      if (fromCode !== to.charCodeAt(toStart + i)) {
        break;
      } else if (fromCode === CHAR_BACKWARD_SLASH) {
        lastCommonSep = i;
      }
    }
    if (i !== length) {
      if (lastCommonSep === -1) {
        return toOrig;
      }
    } else {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
          return toOrig.slice(toStart + i + 1);
        }
        if (i === 2) {
          return toOrig.slice(toStart + i);
        }
      }
      if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_BACKWARD_SLASH) {
          lastCommonSep = i;
        } else if (i === 2) {
          lastCommonSep = 3;
        }
      }
      if (lastCommonSep === -1) {
        lastCommonSep = 0;
      }
    }
    let out = "";
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
        out += out.length === 0 ? ".." : "\\..";
      }
    }
    toStart += lastCommonSep;
    if (out.length > 0) {
      return `${out}${toOrig.slice(toStart, toEnd)}`;
    }
    if (toOrig.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
      ++toStart;
    }
    return toOrig.slice(toStart, toEnd);
  },
  toNamespacedPath(path2) {
    if (typeof path2 !== "string" || path2.length === 0) {
      return path2;
    }
    const resolvedPath = win32.resolve(path2);
    if (resolvedPath.length <= 2) {
      return path2;
    }
    if (resolvedPath.charCodeAt(0) === CHAR_BACKWARD_SLASH) {
      if (resolvedPath.charCodeAt(1) === CHAR_BACKWARD_SLASH) {
        const code = resolvedPath.charCodeAt(2);
        if (code !== CHAR_QUESTION_MARK && code !== CHAR_DOT) {
          return `\\\\?\\UNC\\${resolvedPath.slice(2)}`;
        }
      }
    } else if (isWindowsDeviceRoot(resolvedPath.charCodeAt(0)) && resolvedPath.charCodeAt(1) === CHAR_COLON && resolvedPath.charCodeAt(2) === CHAR_BACKWARD_SLASH) {
      return `\\\\?\\${resolvedPath}`;
    }
    return resolvedPath;
  },
  dirname(path2) {
    validateString(path2, "path");
    const len = path2.length;
    if (len === 0) {
      return ".";
    }
    let rootEnd = -1;
    let offset = 0;
    const code = path2.charCodeAt(0);
    if (len === 1) {
      return isPathSeparator(code) ? path2 : ".";
    }
    if (isPathSeparator(code)) {
      rootEnd = offset = 1;
      if (isPathSeparator(path2.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path2.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          last = j;
          while (j < len && isPathSeparator(path2.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path2.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              return path2;
            }
            if (j !== last) {
              rootEnd = offset = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code) && path2.charCodeAt(1) === CHAR_COLON) {
      rootEnd = len > 2 && isPathSeparator(path2.charCodeAt(2)) ? 3 : 2;
      offset = rootEnd;
    }
    let end = -1;
    let matchedSlash = true;
    for (let i = len - 1; i >= offset; --i) {
      if (isPathSeparator(path2.charCodeAt(i))) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        matchedSlash = false;
      }
    }
    if (end === -1) {
      if (rootEnd === -1) {
        return ".";
      }
      end = rootEnd;
    }
    return path2.slice(0, end);
  },
  basename(path2, suffix) {
    if (suffix !== void 0) {
      validateString(suffix, "suffix");
    }
    validateString(path2, "path");
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (path2.length >= 2 && isWindowsDeviceRoot(path2.charCodeAt(0)) && path2.charCodeAt(1) === CHAR_COLON) {
      start = 2;
    }
    if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path2.length) {
      if (suffix === path2) {
        return "";
      }
      let extIdx = suffix.length - 1;
      let firstNonSlashEnd = -1;
      for (i = path2.length - 1; i >= start; --i) {
        const code = path2.charCodeAt(i);
        if (isPathSeparator(code)) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            if (code === suffix.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                end = i;
              }
            } else {
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end) {
        end = firstNonSlashEnd;
      } else if (end === -1) {
        end = path2.length;
      }
      return path2.slice(start, end);
    }
    for (i = path2.length - 1; i >= start; --i) {
      if (isPathSeparator(path2.charCodeAt(i))) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return path2.slice(start, end);
  },
  extname(path2) {
    validateString(path2, "path");
    let start = 0;
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    if (path2.length >= 2 && path2.charCodeAt(1) === CHAR_COLON && isWindowsDeviceRoot(path2.charCodeAt(0))) {
      start = startPart = 2;
    }
    for (let i = path2.length - 1; i >= start; --i) {
      const code = path2.charCodeAt(i);
      if (isPathSeparator(code)) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return "";
    }
    return path2.slice(startDot, end);
  },
  format: _format.bind(null, "\\"),
  parse(path2) {
    validateString(path2, "path");
    const ret = { root: "", dir: "", base: "", ext: "", name: "" };
    if (path2.length === 0) {
      return ret;
    }
    const len = path2.length;
    let rootEnd = 0;
    let code = path2.charCodeAt(0);
    if (len === 1) {
      if (isPathSeparator(code)) {
        ret.root = ret.dir = path2;
        return ret;
      }
      ret.base = ret.name = path2;
      return ret;
    }
    if (isPathSeparator(code)) {
      rootEnd = 1;
      if (isPathSeparator(path2.charCodeAt(1))) {
        let j = 2;
        let last = j;
        while (j < len && !isPathSeparator(path2.charCodeAt(j))) {
          j++;
        }
        if (j < len && j !== last) {
          last = j;
          while (j < len && isPathSeparator(path2.charCodeAt(j))) {
            j++;
          }
          if (j < len && j !== last) {
            last = j;
            while (j < len && !isPathSeparator(path2.charCodeAt(j))) {
              j++;
            }
            if (j === len) {
              rootEnd = j;
            } else if (j !== last) {
              rootEnd = j + 1;
            }
          }
        }
      }
    } else if (isWindowsDeviceRoot(code) && path2.charCodeAt(1) === CHAR_COLON) {
      if (len <= 2) {
        ret.root = ret.dir = path2;
        return ret;
      }
      rootEnd = 2;
      if (isPathSeparator(path2.charCodeAt(2))) {
        if (len === 3) {
          ret.root = ret.dir = path2;
          return ret;
        }
        rootEnd = 3;
      }
    }
    if (rootEnd > 0) {
      ret.root = path2.slice(0, rootEnd);
    }
    let startDot = -1;
    let startPart = rootEnd;
    let end = -1;
    let matchedSlash = true;
    let i = path2.length - 1;
    let preDotState = 0;
    for (; i >= rootEnd; --i) {
      code = path2.charCodeAt(i);
      if (isPathSeparator(code)) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (end !== -1) {
      if (startDot === -1 || // We saw a non-dot character immediately before the dot
      preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        ret.base = ret.name = path2.slice(startPart, end);
      } else {
        ret.name = path2.slice(startPart, startDot);
        ret.base = path2.slice(startPart, end);
        ret.ext = path2.slice(startDot, end);
      }
    }
    if (startPart > 0 && startPart !== rootEnd) {
      ret.dir = path2.slice(0, startPart - 1);
    } else {
      ret.dir = ret.root;
    }
    return ret;
  },
  sep: "\\",
  delimiter: ";",
  win32: null,
  posix: null
};
var posixCwd = (() => {
  if (platformIsWin32) {
    const regexp = /\\/g;
    return () => {
      const cwd2 = cwd().replace(regexp, "/");
      return cwd2.slice(cwd2.indexOf("/"));
    };
  }
  return () => cwd();
})();
var posix = {
  // path.resolve([from ...], to)
  resolve(...pathSegments) {
    let resolvedPath = "";
    let resolvedAbsolute = false;
    for (let i = pathSegments.length - 1; i >= 0 && !resolvedAbsolute; i--) {
      const path2 = pathSegments[i];
      validateString(path2, `paths[${i}]`);
      if (path2.length === 0) {
        continue;
      }
      resolvedPath = `${path2}/${resolvedPath}`;
      resolvedAbsolute = path2.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    if (!resolvedAbsolute) {
      const cwd2 = posixCwd();
      resolvedPath = `${cwd2}/${resolvedPath}`;
      resolvedAbsolute = cwd2.charCodeAt(0) === CHAR_FORWARD_SLASH;
    }
    resolvedPath = normalizeString(
      resolvedPath,
      !resolvedAbsolute,
      "/",
      isPosixPathSeparator
    );
    if (resolvedAbsolute) {
      return `/${resolvedPath}`;
    }
    return resolvedPath.length > 0 ? resolvedPath : ".";
  },
  normalize(path2) {
    validateString(path2, "path");
    if (path2.length === 0) {
      return ".";
    }
    const isAbsolute2 = path2.charCodeAt(0) === CHAR_FORWARD_SLASH;
    const trailingSeparator = path2.charCodeAt(path2.length - 1) === CHAR_FORWARD_SLASH;
    path2 = normalizeString(path2, !isAbsolute2, "/", isPosixPathSeparator);
    if (path2.length === 0) {
      if (isAbsolute2) {
        return "/";
      }
      return trailingSeparator ? "./" : ".";
    }
    if (trailingSeparator) {
      path2 += "/";
    }
    return isAbsolute2 ? `/${path2}` : path2;
  },
  isAbsolute(path2) {
    validateString(path2, "path");
    return path2.length > 0 && path2.charCodeAt(0) === CHAR_FORWARD_SLASH;
  },
  join(...paths) {
    if (paths.length === 0) {
      return ".";
    }
    const path2 = [];
    for (let i = 0; i < paths.length; ++i) {
      const arg = paths[i];
      validateString(arg, "path");
      if (arg.length > 0) {
        path2.push(arg);
      }
    }
    if (path2.length === 0) {
      return ".";
    }
    return posix.normalize(path2.join("/"));
  },
  relative(from, to) {
    validateString(from, "from");
    validateString(to, "to");
    if (from === to) {
      return "";
    }
    from = posix.resolve(from);
    to = posix.resolve(to);
    if (from === to) {
      return "";
    }
    const fromStart = 1;
    const fromEnd = from.length;
    const fromLen = fromEnd - fromStart;
    const toStart = 1;
    const toLen = to.length - toStart;
    const length = fromLen < toLen ? fromLen : toLen;
    let lastCommonSep = -1;
    let i = 0;
    for (; i < length; i++) {
      const fromCode = from.charCodeAt(fromStart + i);
      if (fromCode !== to.charCodeAt(toStart + i)) {
        break;
      } else if (fromCode === CHAR_FORWARD_SLASH) {
        lastCommonSep = i;
      }
    }
    if (i === length) {
      if (toLen > length) {
        if (to.charCodeAt(toStart + i) === CHAR_FORWARD_SLASH) {
          return to.slice(toStart + i + 1);
        }
        if (i === 0) {
          return to.slice(toStart + i);
        }
      } else if (fromLen > length) {
        if (from.charCodeAt(fromStart + i) === CHAR_FORWARD_SLASH) {
          lastCommonSep = i;
        } else if (i === 0) {
          lastCommonSep = 0;
        }
      }
    }
    let out = "";
    for (i = fromStart + lastCommonSep + 1; i <= fromEnd; ++i) {
      if (i === fromEnd || from.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        out += out.length === 0 ? ".." : "/..";
      }
    }
    return `${out}${to.slice(toStart + lastCommonSep)}`;
  },
  toNamespacedPath(path2) {
    return path2;
  },
  dirname(path2) {
    validateString(path2, "path");
    if (path2.length === 0) {
      return ".";
    }
    const hasRoot = path2.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let end = -1;
    let matchedSlash = true;
    for (let i = path2.length - 1; i >= 1; --i) {
      if (path2.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
        matchedSlash = false;
      }
    }
    if (end === -1) {
      return hasRoot ? "/" : ".";
    }
    if (hasRoot && end === 1) {
      return "//";
    }
    return path2.slice(0, end);
  },
  basename(path2, suffix) {
    if (suffix !== void 0) {
      validateString(suffix, "suffix");
    }
    validateString(path2, "path");
    let start = 0;
    let end = -1;
    let matchedSlash = true;
    let i;
    if (suffix !== void 0 && suffix.length > 0 && suffix.length <= path2.length) {
      if (suffix === path2) {
        return "";
      }
      let extIdx = suffix.length - 1;
      let firstNonSlashEnd = -1;
      for (i = path2.length - 1; i >= 0; --i) {
        const code = path2.charCodeAt(i);
        if (code === CHAR_FORWARD_SLASH) {
          if (!matchedSlash) {
            start = i + 1;
            break;
          }
        } else {
          if (firstNonSlashEnd === -1) {
            matchedSlash = false;
            firstNonSlashEnd = i + 1;
          }
          if (extIdx >= 0) {
            if (code === suffix.charCodeAt(extIdx)) {
              if (--extIdx === -1) {
                end = i;
              }
            } else {
              extIdx = -1;
              end = firstNonSlashEnd;
            }
          }
        }
      }
      if (start === end) {
        end = firstNonSlashEnd;
      } else if (end === -1) {
        end = path2.length;
      }
      return path2.slice(start, end);
    }
    for (i = path2.length - 1; i >= 0; --i) {
      if (path2.charCodeAt(i) === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
    }
    if (end === -1) {
      return "";
    }
    return path2.slice(start, end);
  },
  extname(path2) {
    validateString(path2, "path");
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let preDotState = 0;
    for (let i = path2.length - 1; i >= 0; --i) {
      const char = path2[i];
      if (char === "/") {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (char === ".") {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (startDot === -1 || end === -1 || // We saw a non-dot character immediately before the dot
    preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
    preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
      return "";
    }
    return path2.slice(startDot, end);
  },
  format: _format.bind(null, "/"),
  parse(path2) {
    validateString(path2, "path");
    const ret = { root: "", dir: "", base: "", ext: "", name: "" };
    if (path2.length === 0) {
      return ret;
    }
    const isAbsolute2 = path2.charCodeAt(0) === CHAR_FORWARD_SLASH;
    let start;
    if (isAbsolute2) {
      ret.root = "/";
      start = 1;
    } else {
      start = 0;
    }
    let startDot = -1;
    let startPart = 0;
    let end = -1;
    let matchedSlash = true;
    let i = path2.length - 1;
    let preDotState = 0;
    for (; i >= start; --i) {
      const code = path2.charCodeAt(i);
      if (code === CHAR_FORWARD_SLASH) {
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
      if (end === -1) {
        matchedSlash = false;
        end = i + 1;
      }
      if (code === CHAR_DOT) {
        if (startDot === -1) {
          startDot = i;
        } else if (preDotState !== 1) {
          preDotState = 1;
        }
      } else if (startDot !== -1) {
        preDotState = -1;
      }
    }
    if (end !== -1) {
      const start2 = startPart === 0 && isAbsolute2 ? 1 : startPart;
      if (startDot === -1 || // We saw a non-dot character immediately before the dot
      preDotState === 0 || // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
        ret.base = ret.name = path2.slice(start2, end);
      } else {
        ret.name = path2.slice(start2, startDot);
        ret.base = path2.slice(start2, end);
        ret.ext = path2.slice(startDot, end);
      }
    }
    if (startPart > 0) {
      ret.dir = path2.slice(0, startPart - 1);
    } else if (isAbsolute2) {
      ret.dir = "/";
    }
    return ret;
  },
  sep: "/",
  delimiter: ":",
  win32: null,
  posix: null
};
posix.win32 = win32.win32 = win32;
posix.posix = win32.posix = posix;
var normalize = platformIsWin32 ? win32.normalize : posix.normalize;
var isAbsolute = platformIsWin32 ? win32.isAbsolute : posix.isAbsolute;
var join = platformIsWin32 ? win32.join : posix.join;
var resolve = platformIsWin32 ? win32.resolve : posix.resolve;
var relative = platformIsWin32 ? win32.relative : posix.relative;
var dirname = platformIsWin32 ? win32.dirname : posix.dirname;
var basename = platformIsWin32 ? win32.basename : posix.basename;
var extname = platformIsWin32 ? win32.extname : posix.extname;
var format = platformIsWin32 ? win32.format : posix.format;
var parse = platformIsWin32 ? win32.parse : posix.parse;
var toNamespacedPath = platformIsWin32 ? win32.toNamespacedPath : posix.toNamespacedPath;
var sep = platformIsWin32 ? win32.sep : posix.sep;
var delimiter = platformIsWin32 ? win32.delimiter : posix.delimiter;

// src/util/vs/base/common/uri.ts
var _schemePattern = /^\w[\w\d+.-]*$/;
var _singleSlashStart = /^\//;
var _doubleSlashStart = /^\/\//;
function _validateUri(ret, _strict) {
  if (!ret.scheme && _strict) {
    throw new Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${ret.authority}", path: "${ret.path}", query: "${ret.query}", fragment: "${ret.fragment}"}`);
  }
  if (ret.scheme && !_schemePattern.test(ret.scheme)) {
    throw new Error("[UriError]: Scheme contains illegal characters.");
  }
  if (ret.path) {
    if (ret.authority) {
      if (!_singleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
      }
    } else {
      if (_doubleSlashStart.test(ret.path)) {
        throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
      }
    }
  }
}
function _schemeFix(scheme, _strict) {
  if (!scheme && !_strict) {
    return "file";
  }
  return scheme;
}
function _referenceResolution(scheme, path2) {
  switch (scheme) {
    case "https":
    case "http":
    case "file":
      if (!path2) {
        path2 = _slash;
      } else if (path2[0] !== _slash) {
        path2 = _slash + path2;
      }
      break;
  }
  return path2;
}
var _empty = "";
var _slash = "/";
var _regexp = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
var URI = class _URI {
  static isUri(thing) {
    if (thing instanceof _URI) {
      return true;
    }
    if (!thing || typeof thing !== "object") {
      return false;
    }
    return typeof thing.authority === "string" && typeof thing.fragment === "string" && typeof thing.path === "string" && typeof thing.query === "string" && typeof thing.scheme === "string" && typeof thing.fsPath === "string" && typeof thing.with === "function" && typeof thing.toString === "function";
  }
  /**
   * @internal
   */
  constructor(schemeOrData, authority, path2, query, fragment, _strict = false) {
    if (typeof schemeOrData === "object") {
      this.scheme = schemeOrData.scheme || _empty;
      this.authority = schemeOrData.authority || _empty;
      this.path = schemeOrData.path || _empty;
      this.query = schemeOrData.query || _empty;
      this.fragment = schemeOrData.fragment || _empty;
    } else {
      this.scheme = _schemeFix(schemeOrData, _strict);
      this.authority = authority || _empty;
      this.path = _referenceResolution(this.scheme, path2 || _empty);
      this.query = query || _empty;
      this.fragment = fragment || _empty;
      _validateUri(this, _strict);
    }
  }
  // ---- filesystem path -----------------------
  /**
   * Returns a string representing the corresponding file system path of this URI.
   * Will handle UNC paths, normalizes windows drive letters to lower-case, and uses the
   * platform specific path separator.
   *
   * * Will *not* validate the path for invalid characters and semantics.
   * * Will *not* look at the scheme of this URI.
   * * The result shall *not* be used for display purposes but for accessing a file on disk.
   *
   *
   * The *difference* to `URI#path` is the use of the platform specific separator and the handling
   * of UNC paths. See the below sample of a file-uri with an authority (UNC path).
   *
   * ```ts
  	const u = URI.parse('file://server/c$/folder/file.txt')
  	u.authority === 'server'
  	u.path === '/shares/c$/file.txt'
  	u.fsPath === '\\server\c$\folder\file.txt'
  ```
   *
   * Using `URI#path` to read a file (using fs-apis) would not be enough because parts of the path,
   * namely the server name, would be missing. Therefore `URI#fsPath` exists - it's sugar to ease working
   * with URIs that represent files on disk (`file` scheme).
   */
  get fsPath() {
    return uriToFsPath(this, false);
  }
  // ---- modify to new -------------------------
  with(change) {
    if (!change) {
      return this;
    }
    let { scheme, authority, path: path2, query, fragment } = change;
    if (scheme === void 0) {
      scheme = this.scheme;
    } else if (scheme === null) {
      scheme = _empty;
    }
    if (authority === void 0) {
      authority = this.authority;
    } else if (authority === null) {
      authority = _empty;
    }
    if (path2 === void 0) {
      path2 = this.path;
    } else if (path2 === null) {
      path2 = _empty;
    }
    if (query === void 0) {
      query = this.query;
    } else if (query === null) {
      query = _empty;
    }
    if (fragment === void 0) {
      fragment = this.fragment;
    } else if (fragment === null) {
      fragment = _empty;
    }
    if (scheme === this.scheme && authority === this.authority && path2 === this.path && query === this.query && fragment === this.fragment) {
      return this;
    }
    return new Uri(scheme, authority, path2, query, fragment);
  }
  // ---- parse & validate ------------------------
  /**
   * Creates a new URI from a string, e.g. `http://www.example.com/some/path`,
   * `file:///usr/home`, or `scheme:with/path`.
   *
   * @param value A string which represents an URI (see `URI#toString`).
   */
  static parse(value, _strict = false) {
    const match = _regexp.exec(value);
    if (!match) {
      return new Uri(_empty, _empty, _empty, _empty, _empty);
    }
    return new Uri(
      match[2] || _empty,
      percentDecode(match[4] || _empty),
      percentDecode(match[5] || _empty),
      percentDecode(match[7] || _empty),
      percentDecode(match[9] || _empty),
      _strict
    );
  }
  /**
   * Creates a new URI from a file system path, e.g. `c:\my\files`,
   * `/usr/home`, or `\\server\share\some\path`.
   *
   * The *difference* between `URI#parse` and `URI#file` is that the latter treats the argument
   * as path, not as stringified-uri. E.g. `URI.file(path)` is **not the same as**
   * `URI.parse('file://' + path)` because the path might contain characters that are
   * interpreted (# and ?). See the following sample:
   * ```ts
  const good = URI.file('/coding/c#/project1');
  good.scheme === 'file';
  good.path === '/coding/c#/project1';
  good.fragment === '';
  const bad = URI.parse('file://' + '/coding/c#/project1');
  bad.scheme === 'file';
  bad.path === '/coding/c'; // path is now broken
  bad.fragment === '/project1';
  ```
   *
   * @param path A file system path (see `URI#fsPath`)
   */
  static file(path2) {
    let authority = _empty;
    if (isWindows) {
      path2 = path2.replace(/\\/g, _slash);
    }
    if (path2[0] === _slash && path2[1] === _slash) {
      const idx = path2.indexOf(_slash, 2);
      if (idx === -1) {
        authority = path2.substring(2);
        path2 = _slash;
      } else {
        authority = path2.substring(2, idx);
        path2 = path2.substring(idx) || _slash;
      }
    }
    return new Uri("file", authority, path2, _empty, _empty);
  }
  /**
   * Creates new URI from uri components.
   *
   * Unless `strict` is `true` the scheme is defaults to be `file`. This function performs
   * validation and should be used for untrusted uri components retrieved from storage,
   * user input, command arguments etc
   */
  static from(components, strict) {
    const result = new Uri(
      components.scheme,
      components.authority,
      components.path,
      components.query,
      components.fragment,
      strict
    );
    return result;
  }
  /**
   * Join a URI path with path fragments and normalizes the resulting path.
   *
   * @param uri The input URI.
   * @param pathFragment The path fragment to add to the URI path.
   * @returns The resulting URI.
   */
  static joinPath(uri, ...pathFragment) {
    if (!uri.path) {
      throw new Error(`[UriError]: cannot call joinPath on URI without path`);
    }
    let newPath;
    if (isWindows && uri.scheme === "file") {
      newPath = _URI.file(win32.join(uriToFsPath(uri, true), ...pathFragment)).path;
    } else {
      newPath = posix.join(uri.path, ...pathFragment);
    }
    return uri.with({ path: newPath });
  }
  // ---- printing/externalize ---------------------------
  /**
   * Creates a string representation for this URI. It's guaranteed that calling
   * `URI.parse` with the result of this function creates an URI which is equal
   * to this URI.
   *
   * * The result shall *not* be used for display purposes but for externalization or transport.
   * * The result will be encoded using the percentage encoding and encoding happens mostly
   * ignore the scheme-specific encoding rules.
   *
   * @param skipEncoding Do not encode the result, default is `false`
   */
  toString(skipEncoding = false) {
    return _asFormatted(this, skipEncoding);
  }
  toJSON() {
    return this;
  }
  static revive(data) {
    if (!data) {
      return data;
    } else if (data instanceof _URI) {
      return data;
    } else {
      const result = new Uri(data);
      result._formatted = data.external ?? null;
      result._fsPath = data._sep === _pathSepMarker ? data.fsPath ?? null : null;
      return result;
    }
  }
  [Symbol.for("debug.description")]() {
    return `URI(${this.toString()})`;
  }
};
var _pathSepMarker = isWindows ? 1 : void 0;
var Uri = class extends URI {
  constructor() {
    super(...arguments);
    this._formatted = null;
    this._fsPath = null;
  }
  get fsPath() {
    if (!this._fsPath) {
      this._fsPath = uriToFsPath(this, false);
    }
    return this._fsPath;
  }
  toString(skipEncoding = false) {
    if (!skipEncoding) {
      if (!this._formatted) {
        this._formatted = _asFormatted(this, false);
      }
      return this._formatted;
    } else {
      return _asFormatted(this, true);
    }
  }
  toJSON() {
    const res = {
      $mid: 1 /* Uri */
    };
    if (this._fsPath) {
      res.fsPath = this._fsPath;
      res._sep = _pathSepMarker;
    }
    if (this._formatted) {
      res.external = this._formatted;
    }
    if (this.path) {
      res.path = this.path;
    }
    if (this.scheme) {
      res.scheme = this.scheme;
    }
    if (this.authority) {
      res.authority = this.authority;
    }
    if (this.query) {
      res.query = this.query;
    }
    if (this.fragment) {
      res.fragment = this.fragment;
    }
    return res;
  }
};
var encodeTable = {
  [58 /* Colon */]: "%3A",
  // gen-delims
  [47 /* Slash */]: "%2F",
  [63 /* QuestionMark */]: "%3F",
  [35 /* Hash */]: "%23",
  [91 /* OpenSquareBracket */]: "%5B",
  [93 /* CloseSquareBracket */]: "%5D",
  [64 /* AtSign */]: "%40",
  [33 /* ExclamationMark */]: "%21",
  // sub-delims
  [36 /* DollarSign */]: "%24",
  [38 /* Ampersand */]: "%26",
  [39 /* SingleQuote */]: "%27",
  [40 /* OpenParen */]: "%28",
  [41 /* CloseParen */]: "%29",
  [42 /* Asterisk */]: "%2A",
  [43 /* Plus */]: "%2B",
  [44 /* Comma */]: "%2C",
  [59 /* Semicolon */]: "%3B",
  [61 /* Equals */]: "%3D",
  [32 /* Space */]: "%20"
};
function encodeURIComponentFast(uriComponent, isPath, isAuthority) {
  let res = void 0;
  let nativeEncodePos = -1;
  for (let pos = 0; pos < uriComponent.length; pos++) {
    const code = uriComponent.charCodeAt(pos);
    if (code >= 97 /* a */ && code <= 122 /* z */ || code >= 65 /* A */ && code <= 90 /* Z */ || code >= 48 /* Digit0 */ && code <= 57 /* Digit9 */ || code === 45 /* Dash */ || code === 46 /* Period */ || code === 95 /* Underline */ || code === 126 /* Tilde */ || isPath && code === 47 /* Slash */ || isAuthority && code === 91 /* OpenSquareBracket */ || isAuthority && code === 93 /* CloseSquareBracket */ || isAuthority && code === 58 /* Colon */) {
      if (nativeEncodePos !== -1) {
        res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
        nativeEncodePos = -1;
      }
      if (res !== void 0) {
        res += uriComponent.charAt(pos);
      }
    } else {
      if (res === void 0) {
        res = uriComponent.substr(0, pos);
      }
      const escaped = encodeTable[code];
      if (escaped !== void 0) {
        if (nativeEncodePos !== -1) {
          res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
          nativeEncodePos = -1;
        }
        res += escaped;
      } else if (nativeEncodePos === -1) {
        nativeEncodePos = pos;
      }
    }
  }
  if (nativeEncodePos !== -1) {
    res += encodeURIComponent(uriComponent.substring(nativeEncodePos));
  }
  return res !== void 0 ? res : uriComponent;
}
function encodeURIComponentMinimal(path2) {
  let res = void 0;
  for (let pos = 0; pos < path2.length; pos++) {
    const code = path2.charCodeAt(pos);
    if (code === 35 /* Hash */ || code === 63 /* QuestionMark */) {
      if (res === void 0) {
        res = path2.substr(0, pos);
      }
      res += encodeTable[code];
    } else {
      if (res !== void 0) {
        res += path2[pos];
      }
    }
  }
  return res !== void 0 ? res : path2;
}
function uriToFsPath(uri, keepDriveLetterCasing) {
  let value;
  if (uri.authority && uri.path.length > 1 && uri.scheme === "file") {
    value = `//${uri.authority}${uri.path}`;
  } else if (uri.path.charCodeAt(0) === 47 /* Slash */ && (uri.path.charCodeAt(1) >= 65 /* A */ && uri.path.charCodeAt(1) <= 90 /* Z */ || uri.path.charCodeAt(1) >= 97 /* a */ && uri.path.charCodeAt(1) <= 122 /* z */) && uri.path.charCodeAt(2) === 58 /* Colon */) {
    if (!keepDriveLetterCasing) {
      value = uri.path[1].toLowerCase() + uri.path.substr(2);
    } else {
      value = uri.path.substr(1);
    }
  } else {
    value = uri.path;
  }
  if (isWindows) {
    value = value.replace(/\//g, "\\");
  }
  return value;
}
function _asFormatted(uri, skipEncoding) {
  const encoder = !skipEncoding ? encodeURIComponentFast : encodeURIComponentMinimal;
  let res = "";
  let { scheme, authority, path: path2, query, fragment } = uri;
  if (scheme) {
    res += scheme;
    res += ":";
  }
  if (authority || scheme === "file") {
    res += _slash;
    res += _slash;
  }
  if (authority) {
    let idx = authority.indexOf("@");
    if (idx !== -1) {
      const userinfo = authority.substr(0, idx);
      authority = authority.substr(idx + 1);
      idx = userinfo.lastIndexOf(":");
      if (idx === -1) {
        res += encoder(userinfo, false, false);
      } else {
        res += encoder(userinfo.substr(0, idx), false, false);
        res += ":";
        res += encoder(userinfo.substr(idx + 1), false, true);
      }
      res += "@";
    }
    authority = authority.toLowerCase();
    idx = authority.lastIndexOf(":");
    if (idx === -1) {
      res += encoder(authority, false, true);
    } else {
      res += encoder(authority.substr(0, idx), false, true);
      res += authority.substr(idx);
    }
  }
  if (path2) {
    if (path2.length >= 3 && path2.charCodeAt(0) === 47 /* Slash */ && path2.charCodeAt(2) === 58 /* Colon */) {
      const code = path2.charCodeAt(1);
      if (code >= 65 /* A */ && code <= 90 /* Z */) {
        path2 = `/${String.fromCharCode(code + 32)}:${path2.substr(3)}`;
      }
    } else if (path2.length >= 2 && path2.charCodeAt(1) === 58 /* Colon */) {
      const code = path2.charCodeAt(0);
      if (code >= 65 /* A */ && code <= 90 /* Z */) {
        path2 = `${String.fromCharCode(code + 32)}:${path2.substr(2)}`;
      }
    }
    res += encoder(path2, true, false);
  }
  if (query) {
    res += "?";
    res += encoder(query, false, false);
  }
  if (fragment) {
    res += "#";
    res += !skipEncoding ? encodeURIComponentFast(fragment, false, false) : fragment;
  }
  return res;
}
function decodeURIComponentGraceful(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    if (str.length > 3) {
      return str.substr(0, 3) + decodeURIComponentGraceful(str.substr(3));
    } else {
      return str;
    }
  }
}
var _rEncodedAsHex = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
function percentDecode(str) {
  if (!str.match(_rEncodedAsHex)) {
    return str;
  }
  return str.replace(_rEncodedAsHex, (match) => decodeURIComponentGraceful(match));
}

// src/util/vs/editor/common/core/position.ts
var Position = class _Position {
  constructor(lineNumber, column) {
    this.lineNumber = lineNumber;
    this.column = column;
  }
  /**
   * Create a new position from this position.
   *
   * @param newLineNumber new line number
   * @param newColumn new column
   */
  with(newLineNumber = this.lineNumber, newColumn = this.column) {
    if (newLineNumber === this.lineNumber && newColumn === this.column) {
      return this;
    } else {
      return new _Position(newLineNumber, newColumn);
    }
  }
  /**
   * Derive a new position from this position.
   *
   * @param deltaLineNumber line number delta
   * @param deltaColumn column delta
   */
  delta(deltaLineNumber = 0, deltaColumn = 0) {
    return this.with(Math.max(1, this.lineNumber + deltaLineNumber), Math.max(1, this.column + deltaColumn));
  }
  /**
   * Test if this position equals other position
   */
  equals(other) {
    return _Position.equals(this, other);
  }
  /**
   * Test if position `a` equals position `b`
   */
  static equals(a, b) {
    if (!a && !b) {
      return true;
    }
    return !!a && !!b && a.lineNumber === b.lineNumber && a.column === b.column;
  }
  /**
   * Test if this position is before other position.
   * If the two positions are equal, the result will be false.
   */
  isBefore(other) {
    return _Position.isBefore(this, other);
  }
  /**
   * Test if position `a` is before position `b`.
   * If the two positions are equal, the result will be false.
   */
  static isBefore(a, b) {
    if (a.lineNumber < b.lineNumber) {
      return true;
    }
    if (b.lineNumber < a.lineNumber) {
      return false;
    }
    return a.column < b.column;
  }
  /**
   * Test if this position is before other position.
   * If the two positions are equal, the result will be true.
   */
  isBeforeOrEqual(other) {
    return _Position.isBeforeOrEqual(this, other);
  }
  /**
   * Test if position `a` is before position `b`.
   * If the two positions are equal, the result will be true.
   */
  static isBeforeOrEqual(a, b) {
    if (a.lineNumber < b.lineNumber) {
      return true;
    }
    if (b.lineNumber < a.lineNumber) {
      return false;
    }
    return a.column <= b.column;
  }
  /**
   * A function that compares positions, useful for sorting
   */
  static compare(a, b) {
    const aLineNumber = a.lineNumber | 0;
    const bLineNumber = b.lineNumber | 0;
    if (aLineNumber === bLineNumber) {
      const aColumn = a.column | 0;
      const bColumn = b.column | 0;
      return aColumn - bColumn;
    }
    return aLineNumber - bLineNumber;
  }
  /**
   * Clone this position.
   */
  clone() {
    return new _Position(this.lineNumber, this.column);
  }
  /**
   * Convert to a human-readable representation.
   */
  toString() {
    return "(" + this.lineNumber + "," + this.column + ")";
  }
  // ---
  /**
   * Create a `Position` from an `IPosition`.
   */
  static lift(pos) {
    return new _Position(pos.lineNumber, pos.column);
  }
  /**
   * Test if `obj` is an `IPosition`.
   */
  static isIPosition(obj) {
    return !!obj && typeof obj.lineNumber === "number" && typeof obj.column === "number";
  }
  toJSON() {
    return {
      lineNumber: this.lineNumber,
      column: this.column
    };
  }
};

// src/util/vs/editor/common/core/range.ts
var Range = class _Range {
  constructor(startLineNumber, startColumn, endLineNumber, endColumn) {
    if (startLineNumber > endLineNumber || startLineNumber === endLineNumber && startColumn > endColumn) {
      this.startLineNumber = endLineNumber;
      this.startColumn = endColumn;
      this.endLineNumber = startLineNumber;
      this.endColumn = startColumn;
    } else {
      this.startLineNumber = startLineNumber;
      this.startColumn = startColumn;
      this.endLineNumber = endLineNumber;
      this.endColumn = endColumn;
    }
  }
  /**
   * Test if this range is empty.
   */
  isEmpty() {
    return _Range.isEmpty(this);
  }
  /**
   * Test if `range` is empty.
   */
  static isEmpty(range) {
    return range.startLineNumber === range.endLineNumber && range.startColumn === range.endColumn;
  }
  /**
   * Test if position is in this range. If the position is at the edges, will return true.
   */
  containsPosition(position) {
    return _Range.containsPosition(this, position);
  }
  /**
   * Test if `position` is in `range`. If the position is at the edges, will return true.
   */
  static containsPosition(range, position) {
    if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
      return false;
    }
    if (position.lineNumber === range.startLineNumber && position.column < range.startColumn) {
      return false;
    }
    if (position.lineNumber === range.endLineNumber && position.column > range.endColumn) {
      return false;
    }
    return true;
  }
  /**
   * Test if `position` is in `range`. If the position is at the edges, will return false.
   * @internal
   */
  static strictContainsPosition(range, position) {
    if (position.lineNumber < range.startLineNumber || position.lineNumber > range.endLineNumber) {
      return false;
    }
    if (position.lineNumber === range.startLineNumber && position.column <= range.startColumn) {
      return false;
    }
    if (position.lineNumber === range.endLineNumber && position.column >= range.endColumn) {
      return false;
    }
    return true;
  }
  /**
   * Test if range is in this range. If the range is equal to this range, will return true.
   */
  containsRange(range) {
    return _Range.containsRange(this, range);
  }
  /**
   * Test if `otherRange` is in `range`. If the ranges are equal, will return true.
   */
  static containsRange(range, otherRange) {
    if (otherRange.startLineNumber < range.startLineNumber || otherRange.endLineNumber < range.startLineNumber) {
      return false;
    }
    if (otherRange.startLineNumber > range.endLineNumber || otherRange.endLineNumber > range.endLineNumber) {
      return false;
    }
    if (otherRange.startLineNumber === range.startLineNumber && otherRange.startColumn < range.startColumn) {
      return false;
    }
    if (otherRange.endLineNumber === range.endLineNumber && otherRange.endColumn > range.endColumn) {
      return false;
    }
    return true;
  }
  /**
   * Test if `range` is strictly in this range. `range` must start after and end before this range for the result to be true.
   */
  strictContainsRange(range) {
    return _Range.strictContainsRange(this, range);
  }
  /**
   * Test if `otherRange` is strictly in `range` (must start after, and end before). If the ranges are equal, will return false.
   */
  static strictContainsRange(range, otherRange) {
    if (otherRange.startLineNumber < range.startLineNumber || otherRange.endLineNumber < range.startLineNumber) {
      return false;
    }
    if (otherRange.startLineNumber > range.endLineNumber || otherRange.endLineNumber > range.endLineNumber) {
      return false;
    }
    if (otherRange.startLineNumber === range.startLineNumber && otherRange.startColumn <= range.startColumn) {
      return false;
    }
    if (otherRange.endLineNumber === range.endLineNumber && otherRange.endColumn >= range.endColumn) {
      return false;
    }
    return true;
  }
  /**
   * A reunion of the two ranges.
   * The smallest position will be used as the start point, and the largest one as the end point.
   */
  plusRange(range) {
    return _Range.plusRange(this, range);
  }
  /**
   * A reunion of the two ranges.
   * The smallest position will be used as the start point, and the largest one as the end point.
   */
  static plusRange(a, b) {
    let startLineNumber;
    let startColumn;
    let endLineNumber;
    let endColumn;
    if (b.startLineNumber < a.startLineNumber) {
      startLineNumber = b.startLineNumber;
      startColumn = b.startColumn;
    } else if (b.startLineNumber === a.startLineNumber) {
      startLineNumber = b.startLineNumber;
      startColumn = Math.min(b.startColumn, a.startColumn);
    } else {
      startLineNumber = a.startLineNumber;
      startColumn = a.startColumn;
    }
    if (b.endLineNumber > a.endLineNumber) {
      endLineNumber = b.endLineNumber;
      endColumn = b.endColumn;
    } else if (b.endLineNumber === a.endLineNumber) {
      endLineNumber = b.endLineNumber;
      endColumn = Math.max(b.endColumn, a.endColumn);
    } else {
      endLineNumber = a.endLineNumber;
      endColumn = a.endColumn;
    }
    return new _Range(startLineNumber, startColumn, endLineNumber, endColumn);
  }
  /**
   * A intersection of the two ranges.
   */
  intersectRanges(range) {
    return _Range.intersectRanges(this, range);
  }
  /**
   * A intersection of the two ranges.
   */
  static intersectRanges(a, b) {
    let resultStartLineNumber = a.startLineNumber;
    let resultStartColumn = a.startColumn;
    let resultEndLineNumber = a.endLineNumber;
    let resultEndColumn = a.endColumn;
    const otherStartLineNumber = b.startLineNumber;
    const otherStartColumn = b.startColumn;
    const otherEndLineNumber = b.endLineNumber;
    const otherEndColumn = b.endColumn;
    if (resultStartLineNumber < otherStartLineNumber) {
      resultStartLineNumber = otherStartLineNumber;
      resultStartColumn = otherStartColumn;
    } else if (resultStartLineNumber === otherStartLineNumber) {
      resultStartColumn = Math.max(resultStartColumn, otherStartColumn);
    }
    if (resultEndLineNumber > otherEndLineNumber) {
      resultEndLineNumber = otherEndLineNumber;
      resultEndColumn = otherEndColumn;
    } else if (resultEndLineNumber === otherEndLineNumber) {
      resultEndColumn = Math.min(resultEndColumn, otherEndColumn);
    }
    if (resultStartLineNumber > resultEndLineNumber) {
      return null;
    }
    if (resultStartLineNumber === resultEndLineNumber && resultStartColumn > resultEndColumn) {
      return null;
    }
    return new _Range(resultStartLineNumber, resultStartColumn, resultEndLineNumber, resultEndColumn);
  }
  /**
   * Test if this range equals other.
   */
  equalsRange(other) {
    return _Range.equalsRange(this, other);
  }
  /**
   * Test if range `a` equals `b`.
   */
  static equalsRange(a, b) {
    if (!a && !b) {
      return true;
    }
    return !!a && !!b && a.startLineNumber === b.startLineNumber && a.startColumn === b.startColumn && a.endLineNumber === b.endLineNumber && a.endColumn === b.endColumn;
  }
  /**
   * Return the end position (which will be after or equal to the start position)
   */
  getEndPosition() {
    return _Range.getEndPosition(this);
  }
  /**
   * Return the end position (which will be after or equal to the start position)
   */
  static getEndPosition(range) {
    return new Position(range.endLineNumber, range.endColumn);
  }
  /**
   * Return the start position (which will be before or equal to the end position)
   */
  getStartPosition() {
    return _Range.getStartPosition(this);
  }
  /**
   * Return the start position (which will be before or equal to the end position)
   */
  static getStartPosition(range) {
    return new Position(range.startLineNumber, range.startColumn);
  }
  /**
   * Transform to a user presentable string representation.
   */
  toString() {
    return "[" + this.startLineNumber + "," + this.startColumn + " -> " + this.endLineNumber + "," + this.endColumn + "]";
  }
  /**
   * Create a new range using this range's start position, and using endLineNumber and endColumn as the end position.
   */
  setEndPosition(endLineNumber, endColumn) {
    return new _Range(this.startLineNumber, this.startColumn, endLineNumber, endColumn);
  }
  /**
   * Create a new range using this range's end position, and using startLineNumber and startColumn as the start position.
   */
  setStartPosition(startLineNumber, startColumn) {
    return new _Range(startLineNumber, startColumn, this.endLineNumber, this.endColumn);
  }
  /**
   * Create a new empty range using this range's start position.
   */
  collapseToStart() {
    return _Range.collapseToStart(this);
  }
  /**
   * Create a new empty range using this range's start position.
   */
  static collapseToStart(range) {
    return new _Range(range.startLineNumber, range.startColumn, range.startLineNumber, range.startColumn);
  }
  /**
   * Create a new empty range using this range's end position.
   */
  collapseToEnd() {
    return _Range.collapseToEnd(this);
  }
  /**
   * Create a new empty range using this range's end position.
   */
  static collapseToEnd(range) {
    return new _Range(range.endLineNumber, range.endColumn, range.endLineNumber, range.endColumn);
  }
  /**
   * Moves the range by the given amount of lines.
   */
  delta(lineCount) {
    return new _Range(this.startLineNumber + lineCount, this.startColumn, this.endLineNumber + lineCount, this.endColumn);
  }
  isSingleLine() {
    return this.startLineNumber === this.endLineNumber;
  }
  // ---
  static fromPositions(start, end = start) {
    return new _Range(start.lineNumber, start.column, end.lineNumber, end.column);
  }
  static lift(range) {
    if (!range) {
      return null;
    }
    return new _Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
  }
  /**
   * Test if `obj` is an `IRange`.
   */
  static isIRange(obj) {
    return !!obj && typeof obj.startLineNumber === "number" && typeof obj.startColumn === "number" && typeof obj.endLineNumber === "number" && typeof obj.endColumn === "number";
  }
  /**
   * Test if the two ranges are touching in any way.
   */
  static areIntersectingOrTouching(a, b) {
    if (a.endLineNumber < b.startLineNumber || a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn) {
      return false;
    }
    if (b.endLineNumber < a.startLineNumber || b.endLineNumber === a.startLineNumber && b.endColumn < a.startColumn) {
      return false;
    }
    return true;
  }
  /**
   * Test if the two ranges are intersecting. If the ranges are touching it returns true.
   */
  static areIntersecting(a, b) {
    if (a.endLineNumber < b.startLineNumber || a.endLineNumber === b.startLineNumber && a.endColumn <= b.startColumn) {
      return false;
    }
    if (b.endLineNumber < a.startLineNumber || b.endLineNumber === a.startLineNumber && b.endColumn <= a.startColumn) {
      return false;
    }
    return true;
  }
  /**
   * Test if the two ranges are intersecting, but not touching at all.
   */
  static areOnlyIntersecting(a, b) {
    if (a.endLineNumber < b.startLineNumber - 1 || a.endLineNumber === b.startLineNumber && a.endColumn < b.startColumn - 1) {
      return false;
    }
    if (b.endLineNumber < a.startLineNumber - 1 || b.endLineNumber === a.startLineNumber && b.endColumn < a.startColumn - 1) {
      return false;
    }
    return true;
  }
  /**
   * A function that compares ranges, useful for sorting ranges
   * It will first compare ranges on the startPosition and then on the endPosition
   */
  static compareRangesUsingStarts(a, b) {
    if (a && b) {
      const aStartLineNumber = a.startLineNumber | 0;
      const bStartLineNumber = b.startLineNumber | 0;
      if (aStartLineNumber === bStartLineNumber) {
        const aStartColumn = a.startColumn | 0;
        const bStartColumn = b.startColumn | 0;
        if (aStartColumn === bStartColumn) {
          const aEndLineNumber = a.endLineNumber | 0;
          const bEndLineNumber = b.endLineNumber | 0;
          if (aEndLineNumber === bEndLineNumber) {
            const aEndColumn = a.endColumn | 0;
            const bEndColumn = b.endColumn | 0;
            return aEndColumn - bEndColumn;
          }
          return aEndLineNumber - bEndLineNumber;
        }
        return aStartColumn - bStartColumn;
      }
      return aStartLineNumber - bStartLineNumber;
    }
    const aExists = a ? 1 : 0;
    const bExists = b ? 1 : 0;
    return aExists - bExists;
  }
  /**
   * A function that compares ranges, useful for sorting ranges
   * It will first compare ranges on the endPosition and then on the startPosition
   */
  static compareRangesUsingEnds(a, b) {
    if (a.endLineNumber === b.endLineNumber) {
      if (a.endColumn === b.endColumn) {
        if (a.startLineNumber === b.startLineNumber) {
          return a.startColumn - b.startColumn;
        }
        return a.startLineNumber - b.startLineNumber;
      }
      return a.endColumn - b.endColumn;
    }
    return a.endLineNumber - b.endLineNumber;
  }
  /**
   * Test if the range spans multiple lines.
   */
  static spansMultipleLines(range) {
    return range.endLineNumber > range.startLineNumber;
  }
  toJSON() {
    return this;
  }
};

// src/util/vs/base/common/cache.ts
function identity(t) {
  return t;
}
var LRUCachedFunction = class {
  constructor(arg1, arg2) {
    this.lastCache = void 0;
    this.lastArgKey = void 0;
    if (typeof arg1 === "function") {
      this._fn = arg1;
      this._computeKey = identity;
    } else {
      this._fn = arg2;
      this._computeKey = arg1.getCacheKey;
    }
  }
  get(arg) {
    const key = this._computeKey(arg);
    if (this.lastArgKey !== key) {
      this.lastArgKey = key;
      this.lastCache = this._fn(arg);
    }
    return this.lastCache;
  }
};

// src/util/vs/base/common/strings.ts
function isFalsyOrWhitespace(str) {
  if (!str || typeof str !== "string") {
    return true;
  }
  return str.trim().length === 0;
}
function splitLines(str) {
  return str.split(/\r\n|\r|\n/);
}
function compare(a, b) {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else {
    return 0;
  }
}
function compareSubstring(a, b, aStart = 0, aEnd = a.length, bStart = 0, bEnd = b.length) {
  for (; aStart < aEnd && bStart < bEnd; aStart++, bStart++) {
    const codeA = a.charCodeAt(aStart);
    const codeB = b.charCodeAt(bStart);
    if (codeA < codeB) {
      return -1;
    } else if (codeA > codeB) {
      return 1;
    }
  }
  const aLen = aEnd - aStart;
  const bLen = bEnd - bStart;
  if (aLen < bLen) {
    return -1;
  } else if (aLen > bLen) {
    return 1;
  }
  return 0;
}
function compareSubstringIgnoreCase(a, b, aStart = 0, aEnd = a.length, bStart = 0, bEnd = b.length) {
  for (; aStart < aEnd && bStart < bEnd; aStart++, bStart++) {
    let codeA = a.charCodeAt(aStart);
    let codeB = b.charCodeAt(bStart);
    if (codeA === codeB) {
      continue;
    }
    if (codeA >= 128 || codeB >= 128) {
      return compareSubstring(a.toLowerCase(), b.toLowerCase(), aStart, aEnd, bStart, bEnd);
    }
    if (isLowerAsciiLetter(codeA)) {
      codeA -= 32;
    }
    if (isLowerAsciiLetter(codeB)) {
      codeB -= 32;
    }
    const diff = codeA - codeB;
    if (diff === 0) {
      continue;
    }
    return diff;
  }
  const aLen = aEnd - aStart;
  const bLen = bEnd - bStart;
  if (aLen < bLen) {
    return -1;
  } else if (aLen > bLen) {
    return 1;
  }
  return 0;
}
function isLowerAsciiLetter(code) {
  return code >= 97 /* a */ && code <= 122 /* z */;
}
function equalsIgnoreCase(a, b) {
  return a.length === b.length && compareSubstringIgnoreCase(a, b) === 0;
}
function startsWithIgnoreCase(str, candidate) {
  const candidateLength = candidate.length;
  if (candidate.length > str.length) {
    return false;
  }
  return compareSubstringIgnoreCase(str, candidate, 0, candidateLength) === 0;
}
function commonPrefixLength(a, b) {
  const len = Math.min(a.length, b.length);
  let i;
  for (i = 0; i < len; i++) {
    if (a.charCodeAt(i) !== b.charCodeAt(i)) {
      return i;
    }
  }
  return len;
}
var CSI_SEQUENCE = /(?:\x1b\[|\x9b)[=?>!]?[\d;:]*["$#'* ]?[a-zA-Z@^`{}|~]/;
var OSC_SEQUENCE = /(?:\x1b\]|\x9d).*?(?:\x1b\\|\x07|\x9c)/;
var ESC_SEQUENCE = /\x1b(?:[ #%\(\)\*\+\-\.\/]?[a-zA-Z0-9\|}~@])/;
var CONTROL_SEQUENCES = new RegExp("(?:" + [
  CSI_SEQUENCE.source,
  OSC_SEQUENCE.source,
  ESC_SEQUENCE.source
].join("|") + ")", "g");
var UTF8_BOM_CHARACTER = String.fromCharCode(65279 /* UTF8_BOM */);
var GraphemeBreakTree = class _GraphemeBreakTree {
  static {
    this._INSTANCE = null;
  }
  static getInstance() {
    if (!_GraphemeBreakTree._INSTANCE) {
      _GraphemeBreakTree._INSTANCE = new _GraphemeBreakTree();
    }
    return _GraphemeBreakTree._INSTANCE;
  }
  constructor() {
    this._data = getGraphemeBreakRawData();
  }
  getGraphemeBreakType(codePoint) {
    if (codePoint < 32) {
      if (codePoint === 10 /* LineFeed */) {
        return 3 /* LF */;
      }
      if (codePoint === 13 /* CarriageReturn */) {
        return 2 /* CR */;
      }
      return 4 /* Control */;
    }
    if (codePoint < 127) {
      return 0 /* Other */;
    }
    const data = this._data;
    const nodeCount = data.length / 3;
    let nodeIndex = 1;
    while (nodeIndex <= nodeCount) {
      if (codePoint < data[3 * nodeIndex]) {
        nodeIndex = 2 * nodeIndex;
      } else if (codePoint > data[3 * nodeIndex + 1]) {
        nodeIndex = 2 * nodeIndex + 1;
      } else {
        return data[3 * nodeIndex + 2];
      }
    }
    return 0 /* Other */;
  }
};
function getGraphemeBreakRawData() {
  return JSON.parse("[0,0,0,51229,51255,12,44061,44087,12,127462,127487,6,7083,7085,5,47645,47671,12,54813,54839,12,128678,128678,14,3270,3270,5,9919,9923,14,45853,45879,12,49437,49463,12,53021,53047,12,71216,71218,7,128398,128399,14,129360,129374,14,2519,2519,5,4448,4519,9,9742,9742,14,12336,12336,14,44957,44983,12,46749,46775,12,48541,48567,12,50333,50359,12,52125,52151,12,53917,53943,12,69888,69890,5,73018,73018,5,127990,127990,14,128558,128559,14,128759,128760,14,129653,129655,14,2027,2035,5,2891,2892,7,3761,3761,5,6683,6683,5,8293,8293,4,9825,9826,14,9999,9999,14,43452,43453,5,44509,44535,12,45405,45431,12,46301,46327,12,47197,47223,12,48093,48119,12,48989,49015,12,49885,49911,12,50781,50807,12,51677,51703,12,52573,52599,12,53469,53495,12,54365,54391,12,65279,65279,4,70471,70472,7,72145,72147,7,119173,119179,5,127799,127818,14,128240,128244,14,128512,128512,14,128652,128652,14,128721,128722,14,129292,129292,14,129445,129450,14,129734,129743,14,1476,1477,5,2366,2368,7,2750,2752,7,3076,3076,5,3415,3415,5,4141,4144,5,6109,6109,5,6964,6964,5,7394,7400,5,9197,9198,14,9770,9770,14,9877,9877,14,9968,9969,14,10084,10084,14,43052,43052,5,43713,43713,5,44285,44311,12,44733,44759,12,45181,45207,12,45629,45655,12,46077,46103,12,46525,46551,12,46973,46999,12,47421,47447,12,47869,47895,12,48317,48343,12,48765,48791,12,49213,49239,12,49661,49687,12,50109,50135,12,50557,50583,12,51005,51031,12,51453,51479,12,51901,51927,12,52349,52375,12,52797,52823,12,53245,53271,12,53693,53719,12,54141,54167,12,54589,54615,12,55037,55063,12,69506,69509,5,70191,70193,5,70841,70841,7,71463,71467,5,72330,72342,5,94031,94031,5,123628,123631,5,127763,127765,14,127941,127941,14,128043,128062,14,128302,128317,14,128465,128467,14,128539,128539,14,128640,128640,14,128662,128662,14,128703,128703,14,128745,128745,14,129004,129007,14,129329,129330,14,129402,129402,14,129483,129483,14,129686,129704,14,130048,131069,14,173,173,4,1757,1757,1,2200,2207,5,2434,2435,7,2631,2632,5,2817,2817,5,3008,3008,5,3201,3201,5,3387,3388,5,3542,3542,5,3902,3903,7,4190,4192,5,6002,6003,5,6439,6440,5,6765,6770,7,7019,7027,5,7154,7155,7,8205,8205,13,8505,8505,14,9654,9654,14,9757,9757,14,9792,9792,14,9852,9853,14,9890,9894,14,9937,9937,14,9981,9981,14,10035,10036,14,11035,11036,14,42654,42655,5,43346,43347,7,43587,43587,5,44006,44007,7,44173,44199,12,44397,44423,12,44621,44647,12,44845,44871,12,45069,45095,12,45293,45319,12,45517,45543,12,45741,45767,12,45965,45991,12,46189,46215,12,46413,46439,12,46637,46663,12,46861,46887,12,47085,47111,12,47309,47335,12,47533,47559,12,47757,47783,12,47981,48007,12,48205,48231,12,48429,48455,12,48653,48679,12,48877,48903,12,49101,49127,12,49325,49351,12,49549,49575,12,49773,49799,12,49997,50023,12,50221,50247,12,50445,50471,12,50669,50695,12,50893,50919,12,51117,51143,12,51341,51367,12,51565,51591,12,51789,51815,12,52013,52039,12,52237,52263,12,52461,52487,12,52685,52711,12,52909,52935,12,53133,53159,12,53357,53383,12,53581,53607,12,53805,53831,12,54029,54055,12,54253,54279,12,54477,54503,12,54701,54727,12,54925,54951,12,55149,55175,12,68101,68102,5,69762,69762,7,70067,70069,7,70371,70378,5,70720,70721,7,71087,71087,5,71341,71341,5,71995,71996,5,72249,72249,7,72850,72871,5,73109,73109,5,118576,118598,5,121505,121519,5,127245,127247,14,127568,127569,14,127777,127777,14,127872,127891,14,127956,127967,14,128015,128016,14,128110,128172,14,128259,128259,14,128367,128368,14,128424,128424,14,128488,128488,14,128530,128532,14,128550,128551,14,128566,128566,14,128647,128647,14,128656,128656,14,128667,128673,14,128691,128693,14,128715,128715,14,128728,128732,14,128752,128752,14,128765,128767,14,129096,129103,14,129311,129311,14,129344,129349,14,129394,129394,14,129413,129425,14,129466,129471,14,129511,129535,14,129664,129666,14,129719,129722,14,129760,129767,14,917536,917631,5,13,13,2,1160,1161,5,1564,1564,4,1807,1807,1,2085,2087,5,2307,2307,7,2382,2383,7,2497,2500,5,2563,2563,7,2677,2677,5,2763,2764,7,2879,2879,5,2914,2915,5,3021,3021,5,3142,3144,5,3263,3263,5,3285,3286,5,3398,3400,7,3530,3530,5,3633,3633,5,3864,3865,5,3974,3975,5,4155,4156,7,4229,4230,5,5909,5909,7,6078,6085,7,6277,6278,5,6451,6456,7,6744,6750,5,6846,6846,5,6972,6972,5,7074,7077,5,7146,7148,7,7222,7223,5,7416,7417,5,8234,8238,4,8417,8417,5,9000,9000,14,9203,9203,14,9730,9731,14,9748,9749,14,9762,9763,14,9776,9783,14,9800,9811,14,9831,9831,14,9872,9873,14,9882,9882,14,9900,9903,14,9929,9933,14,9941,9960,14,9974,9974,14,9989,9989,14,10006,10006,14,10062,10062,14,10160,10160,14,11647,11647,5,12953,12953,14,43019,43019,5,43232,43249,5,43443,43443,5,43567,43568,7,43696,43696,5,43765,43765,7,44013,44013,5,44117,44143,12,44229,44255,12,44341,44367,12,44453,44479,12,44565,44591,12,44677,44703,12,44789,44815,12,44901,44927,12,45013,45039,12,45125,45151,12,45237,45263,12,45349,45375,12,45461,45487,12,45573,45599,12,45685,45711,12,45797,45823,12,45909,45935,12,46021,46047,12,46133,46159,12,46245,46271,12,46357,46383,12,46469,46495,12,46581,46607,12,46693,46719,12,46805,46831,12,46917,46943,12,47029,47055,12,47141,47167,12,47253,47279,12,47365,47391,12,47477,47503,12,47589,47615,12,47701,47727,12,47813,47839,12,47925,47951,12,48037,48063,12,48149,48175,12,48261,48287,12,48373,48399,12,48485,48511,12,48597,48623,12,48709,48735,12,48821,48847,12,48933,48959,12,49045,49071,12,49157,49183,12,49269,49295,12,49381,49407,12,49493,49519,12,49605,49631,12,49717,49743,12,49829,49855,12,49941,49967,12,50053,50079,12,50165,50191,12,50277,50303,12,50389,50415,12,50501,50527,12,50613,50639,12,50725,50751,12,50837,50863,12,50949,50975,12,51061,51087,12,51173,51199,12,51285,51311,12,51397,51423,12,51509,51535,12,51621,51647,12,51733,51759,12,51845,51871,12,51957,51983,12,52069,52095,12,52181,52207,12,52293,52319,12,52405,52431,12,52517,52543,12,52629,52655,12,52741,52767,12,52853,52879,12,52965,52991,12,53077,53103,12,53189,53215,12,53301,53327,12,53413,53439,12,53525,53551,12,53637,53663,12,53749,53775,12,53861,53887,12,53973,53999,12,54085,54111,12,54197,54223,12,54309,54335,12,54421,54447,12,54533,54559,12,54645,54671,12,54757,54783,12,54869,54895,12,54981,55007,12,55093,55119,12,55243,55291,10,66045,66045,5,68325,68326,5,69688,69702,5,69817,69818,5,69957,69958,7,70089,70092,5,70198,70199,5,70462,70462,5,70502,70508,5,70750,70750,5,70846,70846,7,71100,71101,5,71230,71230,7,71351,71351,5,71737,71738,5,72000,72000,7,72160,72160,5,72273,72278,5,72752,72758,5,72882,72883,5,73031,73031,5,73461,73462,7,94192,94193,7,119149,119149,7,121403,121452,5,122915,122916,5,126980,126980,14,127358,127359,14,127535,127535,14,127759,127759,14,127771,127771,14,127792,127793,14,127825,127867,14,127897,127899,14,127945,127945,14,127985,127986,14,128000,128007,14,128021,128021,14,128066,128100,14,128184,128235,14,128249,128252,14,128266,128276,14,128335,128335,14,128379,128390,14,128407,128419,14,128444,128444,14,128481,128481,14,128499,128499,14,128526,128526,14,128536,128536,14,128543,128543,14,128556,128556,14,128564,128564,14,128577,128580,14,128643,128645,14,128649,128649,14,128654,128654,14,128660,128660,14,128664,128664,14,128675,128675,14,128686,128689,14,128695,128696,14,128705,128709,14,128717,128719,14,128725,128725,14,128736,128741,14,128747,128748,14,128755,128755,14,128762,128762,14,128981,128991,14,129009,129023,14,129160,129167,14,129296,129304,14,129320,129327,14,129340,129342,14,129356,129356,14,129388,129392,14,129399,129400,14,129404,129407,14,129432,129442,14,129454,129455,14,129473,129474,14,129485,129487,14,129648,129651,14,129659,129660,14,129671,129679,14,129709,129711,14,129728,129730,14,129751,129753,14,129776,129782,14,917505,917505,4,917760,917999,5,10,10,3,127,159,4,768,879,5,1471,1471,5,1536,1541,1,1648,1648,5,1767,1768,5,1840,1866,5,2070,2073,5,2137,2139,5,2274,2274,1,2363,2363,7,2377,2380,7,2402,2403,5,2494,2494,5,2507,2508,7,2558,2558,5,2622,2624,7,2641,2641,5,2691,2691,7,2759,2760,5,2786,2787,5,2876,2876,5,2881,2884,5,2901,2902,5,3006,3006,5,3014,3016,7,3072,3072,5,3134,3136,5,3157,3158,5,3260,3260,5,3266,3266,5,3274,3275,7,3328,3329,5,3391,3392,7,3405,3405,5,3457,3457,5,3536,3537,7,3551,3551,5,3636,3642,5,3764,3772,5,3895,3895,5,3967,3967,7,3993,4028,5,4146,4151,5,4182,4183,7,4226,4226,5,4253,4253,5,4957,4959,5,5940,5940,7,6070,6070,7,6087,6088,7,6158,6158,4,6432,6434,5,6448,6449,7,6679,6680,5,6742,6742,5,6754,6754,5,6783,6783,5,6912,6915,5,6966,6970,5,6978,6978,5,7042,7042,7,7080,7081,5,7143,7143,7,7150,7150,7,7212,7219,5,7380,7392,5,7412,7412,5,8203,8203,4,8232,8232,4,8265,8265,14,8400,8412,5,8421,8432,5,8617,8618,14,9167,9167,14,9200,9200,14,9410,9410,14,9723,9726,14,9733,9733,14,9745,9745,14,9752,9752,14,9760,9760,14,9766,9766,14,9774,9774,14,9786,9786,14,9794,9794,14,9823,9823,14,9828,9828,14,9833,9850,14,9855,9855,14,9875,9875,14,9880,9880,14,9885,9887,14,9896,9897,14,9906,9916,14,9926,9927,14,9935,9935,14,9939,9939,14,9962,9962,14,9972,9972,14,9978,9978,14,9986,9986,14,9997,9997,14,10002,10002,14,10017,10017,14,10055,10055,14,10071,10071,14,10133,10135,14,10548,10549,14,11093,11093,14,12330,12333,5,12441,12442,5,42608,42610,5,43010,43010,5,43045,43046,5,43188,43203,7,43302,43309,5,43392,43394,5,43446,43449,5,43493,43493,5,43571,43572,7,43597,43597,7,43703,43704,5,43756,43757,5,44003,44004,7,44009,44010,7,44033,44059,12,44089,44115,12,44145,44171,12,44201,44227,12,44257,44283,12,44313,44339,12,44369,44395,12,44425,44451,12,44481,44507,12,44537,44563,12,44593,44619,12,44649,44675,12,44705,44731,12,44761,44787,12,44817,44843,12,44873,44899,12,44929,44955,12,44985,45011,12,45041,45067,12,45097,45123,12,45153,45179,12,45209,45235,12,45265,45291,12,45321,45347,12,45377,45403,12,45433,45459,12,45489,45515,12,45545,45571,12,45601,45627,12,45657,45683,12,45713,45739,12,45769,45795,12,45825,45851,12,45881,45907,12,45937,45963,12,45993,46019,12,46049,46075,12,46105,46131,12,46161,46187,12,46217,46243,12,46273,46299,12,46329,46355,12,46385,46411,12,46441,46467,12,46497,46523,12,46553,46579,12,46609,46635,12,46665,46691,12,46721,46747,12,46777,46803,12,46833,46859,12,46889,46915,12,46945,46971,12,47001,47027,12,47057,47083,12,47113,47139,12,47169,47195,12,47225,47251,12,47281,47307,12,47337,47363,12,47393,47419,12,47449,47475,12,47505,47531,12,47561,47587,12,47617,47643,12,47673,47699,12,47729,47755,12,47785,47811,12,47841,47867,12,47897,47923,12,47953,47979,12,48009,48035,12,48065,48091,12,48121,48147,12,48177,48203,12,48233,48259,12,48289,48315,12,48345,48371,12,48401,48427,12,48457,48483,12,48513,48539,12,48569,48595,12,48625,48651,12,48681,48707,12,48737,48763,12,48793,48819,12,48849,48875,12,48905,48931,12,48961,48987,12,49017,49043,12,49073,49099,12,49129,49155,12,49185,49211,12,49241,49267,12,49297,49323,12,49353,49379,12,49409,49435,12,49465,49491,12,49521,49547,12,49577,49603,12,49633,49659,12,49689,49715,12,49745,49771,12,49801,49827,12,49857,49883,12,49913,49939,12,49969,49995,12,50025,50051,12,50081,50107,12,50137,50163,12,50193,50219,12,50249,50275,12,50305,50331,12,50361,50387,12,50417,50443,12,50473,50499,12,50529,50555,12,50585,50611,12,50641,50667,12,50697,50723,12,50753,50779,12,50809,50835,12,50865,50891,12,50921,50947,12,50977,51003,12,51033,51059,12,51089,51115,12,51145,51171,12,51201,51227,12,51257,51283,12,51313,51339,12,51369,51395,12,51425,51451,12,51481,51507,12,51537,51563,12,51593,51619,12,51649,51675,12,51705,51731,12,51761,51787,12,51817,51843,12,51873,51899,12,51929,51955,12,51985,52011,12,52041,52067,12,52097,52123,12,52153,52179,12,52209,52235,12,52265,52291,12,52321,52347,12,52377,52403,12,52433,52459,12,52489,52515,12,52545,52571,12,52601,52627,12,52657,52683,12,52713,52739,12,52769,52795,12,52825,52851,12,52881,52907,12,52937,52963,12,52993,53019,12,53049,53075,12,53105,53131,12,53161,53187,12,53217,53243,12,53273,53299,12,53329,53355,12,53385,53411,12,53441,53467,12,53497,53523,12,53553,53579,12,53609,53635,12,53665,53691,12,53721,53747,12,53777,53803,12,53833,53859,12,53889,53915,12,53945,53971,12,54001,54027,12,54057,54083,12,54113,54139,12,54169,54195,12,54225,54251,12,54281,54307,12,54337,54363,12,54393,54419,12,54449,54475,12,54505,54531,12,54561,54587,12,54617,54643,12,54673,54699,12,54729,54755,12,54785,54811,12,54841,54867,12,54897,54923,12,54953,54979,12,55009,55035,12,55065,55091,12,55121,55147,12,55177,55203,12,65024,65039,5,65520,65528,4,66422,66426,5,68152,68154,5,69291,69292,5,69633,69633,5,69747,69748,5,69811,69814,5,69826,69826,5,69932,69932,7,70016,70017,5,70079,70080,7,70095,70095,5,70196,70196,5,70367,70367,5,70402,70403,7,70464,70464,5,70487,70487,5,70709,70711,7,70725,70725,7,70833,70834,7,70843,70844,7,70849,70849,7,71090,71093,5,71103,71104,5,71227,71228,7,71339,71339,5,71344,71349,5,71458,71461,5,71727,71735,5,71985,71989,7,71998,71998,5,72002,72002,7,72154,72155,5,72193,72202,5,72251,72254,5,72281,72283,5,72344,72345,5,72766,72766,7,72874,72880,5,72885,72886,5,73023,73029,5,73104,73105,5,73111,73111,5,92912,92916,5,94095,94098,5,113824,113827,4,119142,119142,7,119155,119162,4,119362,119364,5,121476,121476,5,122888,122904,5,123184,123190,5,125252,125258,5,127183,127183,14,127340,127343,14,127377,127386,14,127491,127503,14,127548,127551,14,127744,127756,14,127761,127761,14,127769,127769,14,127773,127774,14,127780,127788,14,127796,127797,14,127820,127823,14,127869,127869,14,127894,127895,14,127902,127903,14,127943,127943,14,127947,127950,14,127972,127972,14,127988,127988,14,127992,127994,14,128009,128011,14,128019,128019,14,128023,128041,14,128064,128064,14,128102,128107,14,128174,128181,14,128238,128238,14,128246,128247,14,128254,128254,14,128264,128264,14,128278,128299,14,128329,128330,14,128348,128359,14,128371,128377,14,128392,128393,14,128401,128404,14,128421,128421,14,128433,128434,14,128450,128452,14,128476,128478,14,128483,128483,14,128495,128495,14,128506,128506,14,128519,128520,14,128528,128528,14,128534,128534,14,128538,128538,14,128540,128542,14,128544,128549,14,128552,128555,14,128557,128557,14,128560,128563,14,128565,128565,14,128567,128576,14,128581,128591,14,128641,128642,14,128646,128646,14,128648,128648,14,128650,128651,14,128653,128653,14,128655,128655,14,128657,128659,14,128661,128661,14,128663,128663,14,128665,128666,14,128674,128674,14,128676,128677,14,128679,128685,14,128690,128690,14,128694,128694,14,128697,128702,14,128704,128704,14,128710,128714,14,128716,128716,14,128720,128720,14,128723,128724,14,128726,128727,14,128733,128735,14,128742,128744,14,128746,128746,14,128749,128751,14,128753,128754,14,128756,128758,14,128761,128761,14,128763,128764,14,128884,128895,14,128992,129003,14,129008,129008,14,129036,129039,14,129114,129119,14,129198,129279,14,129293,129295,14,129305,129310,14,129312,129319,14,129328,129328,14,129331,129338,14,129343,129343,14,129351,129355,14,129357,129359,14,129375,129387,14,129393,129393,14,129395,129398,14,129401,129401,14,129403,129403,14,129408,129412,14,129426,129431,14,129443,129444,14,129451,129453,14,129456,129465,14,129472,129472,14,129475,129482,14,129484,129484,14,129488,129510,14,129536,129647,14,129652,129652,14,129656,129658,14,129661,129663,14,129667,129670,14,129680,129685,14,129705,129708,14,129712,129718,14,129723,129727,14,129731,129733,14,129744,129750,14,129754,129759,14,129768,129775,14,129783,129791,14,917504,917504,4,917506,917535,4,917632,917759,4,918000,921599,4,0,9,4,11,12,4,14,31,4,169,169,14,174,174,14,1155,1159,5,1425,1469,5,1473,1474,5,1479,1479,5,1552,1562,5,1611,1631,5,1750,1756,5,1759,1764,5,1770,1773,5,1809,1809,5,1958,1968,5,2045,2045,5,2075,2083,5,2089,2093,5,2192,2193,1,2250,2273,5,2275,2306,5,2362,2362,5,2364,2364,5,2369,2376,5,2381,2381,5,2385,2391,5,2433,2433,5,2492,2492,5,2495,2496,7,2503,2504,7,2509,2509,5,2530,2531,5,2561,2562,5,2620,2620,5,2625,2626,5,2635,2637,5,2672,2673,5,2689,2690,5,2748,2748,5,2753,2757,5,2761,2761,7,2765,2765,5,2810,2815,5,2818,2819,7,2878,2878,5,2880,2880,7,2887,2888,7,2893,2893,5,2903,2903,5,2946,2946,5,3007,3007,7,3009,3010,7,3018,3020,7,3031,3031,5,3073,3075,7,3132,3132,5,3137,3140,7,3146,3149,5,3170,3171,5,3202,3203,7,3262,3262,7,3264,3265,7,3267,3268,7,3271,3272,7,3276,3277,5,3298,3299,5,3330,3331,7,3390,3390,5,3393,3396,5,3402,3404,7,3406,3406,1,3426,3427,5,3458,3459,7,3535,3535,5,3538,3540,5,3544,3550,7,3570,3571,7,3635,3635,7,3655,3662,5,3763,3763,7,3784,3789,5,3893,3893,5,3897,3897,5,3953,3966,5,3968,3972,5,3981,3991,5,4038,4038,5,4145,4145,7,4153,4154,5,4157,4158,5,4184,4185,5,4209,4212,5,4228,4228,7,4237,4237,5,4352,4447,8,4520,4607,10,5906,5908,5,5938,5939,5,5970,5971,5,6068,6069,5,6071,6077,5,6086,6086,5,6089,6099,5,6155,6157,5,6159,6159,5,6313,6313,5,6435,6438,7,6441,6443,7,6450,6450,5,6457,6459,5,6681,6682,7,6741,6741,7,6743,6743,7,6752,6752,5,6757,6764,5,6771,6780,5,6832,6845,5,6847,6862,5,6916,6916,7,6965,6965,5,6971,6971,7,6973,6977,7,6979,6980,7,7040,7041,5,7073,7073,7,7078,7079,7,7082,7082,7,7142,7142,5,7144,7145,5,7149,7149,5,7151,7153,5,7204,7211,7,7220,7221,7,7376,7378,5,7393,7393,7,7405,7405,5,7415,7415,7,7616,7679,5,8204,8204,5,8206,8207,4,8233,8233,4,8252,8252,14,8288,8292,4,8294,8303,4,8413,8416,5,8418,8420,5,8482,8482,14,8596,8601,14,8986,8987,14,9096,9096,14,9193,9196,14,9199,9199,14,9201,9202,14,9208,9210,14,9642,9643,14,9664,9664,14,9728,9729,14,9732,9732,14,9735,9741,14,9743,9744,14,9746,9746,14,9750,9751,14,9753,9756,14,9758,9759,14,9761,9761,14,9764,9765,14,9767,9769,14,9771,9773,14,9775,9775,14,9784,9785,14,9787,9791,14,9793,9793,14,9795,9799,14,9812,9822,14,9824,9824,14,9827,9827,14,9829,9830,14,9832,9832,14,9851,9851,14,9854,9854,14,9856,9861,14,9874,9874,14,9876,9876,14,9878,9879,14,9881,9881,14,9883,9884,14,9888,9889,14,9895,9895,14,9898,9899,14,9904,9905,14,9917,9918,14,9924,9925,14,9928,9928,14,9934,9934,14,9936,9936,14,9938,9938,14,9940,9940,14,9961,9961,14,9963,9967,14,9970,9971,14,9973,9973,14,9975,9977,14,9979,9980,14,9982,9985,14,9987,9988,14,9992,9996,14,9998,9998,14,10000,10001,14,10004,10004,14,10013,10013,14,10024,10024,14,10052,10052,14,10060,10060,14,10067,10069,14,10083,10083,14,10085,10087,14,10145,10145,14,10175,10175,14,11013,11015,14,11088,11088,14,11503,11505,5,11744,11775,5,12334,12335,5,12349,12349,14,12951,12951,14,42607,42607,5,42612,42621,5,42736,42737,5,43014,43014,5,43043,43044,7,43047,43047,7,43136,43137,7,43204,43205,5,43263,43263,5,43335,43345,5,43360,43388,8,43395,43395,7,43444,43445,7,43450,43451,7,43454,43456,7,43561,43566,5,43569,43570,5,43573,43574,5,43596,43596,5,43644,43644,5,43698,43700,5,43710,43711,5,43755,43755,7,43758,43759,7,43766,43766,5,44005,44005,5,44008,44008,5,44012,44012,7,44032,44032,11,44060,44060,11,44088,44088,11,44116,44116,11,44144,44144,11,44172,44172,11,44200,44200,11,44228,44228,11,44256,44256,11,44284,44284,11,44312,44312,11,44340,44340,11,44368,44368,11,44396,44396,11,44424,44424,11,44452,44452,11,44480,44480,11,44508,44508,11,44536,44536,11,44564,44564,11,44592,44592,11,44620,44620,11,44648,44648,11,44676,44676,11,44704,44704,11,44732,44732,11,44760,44760,11,44788,44788,11,44816,44816,11,44844,44844,11,44872,44872,11,44900,44900,11,44928,44928,11,44956,44956,11,44984,44984,11,45012,45012,11,45040,45040,11,45068,45068,11,45096,45096,11,45124,45124,11,45152,45152,11,45180,45180,11,45208,45208,11,45236,45236,11,45264,45264,11,45292,45292,11,45320,45320,11,45348,45348,11,45376,45376,11,45404,45404,11,45432,45432,11,45460,45460,11,45488,45488,11,45516,45516,11,45544,45544,11,45572,45572,11,45600,45600,11,45628,45628,11,45656,45656,11,45684,45684,11,45712,45712,11,45740,45740,11,45768,45768,11,45796,45796,11,45824,45824,11,45852,45852,11,45880,45880,11,45908,45908,11,45936,45936,11,45964,45964,11,45992,45992,11,46020,46020,11,46048,46048,11,46076,46076,11,46104,46104,11,46132,46132,11,46160,46160,11,46188,46188,11,46216,46216,11,46244,46244,11,46272,46272,11,46300,46300,11,46328,46328,11,46356,46356,11,46384,46384,11,46412,46412,11,46440,46440,11,46468,46468,11,46496,46496,11,46524,46524,11,46552,46552,11,46580,46580,11,46608,46608,11,46636,46636,11,46664,46664,11,46692,46692,11,46720,46720,11,46748,46748,11,46776,46776,11,46804,46804,11,46832,46832,11,46860,46860,11,46888,46888,11,46916,46916,11,46944,46944,11,46972,46972,11,47000,47000,11,47028,47028,11,47056,47056,11,47084,47084,11,47112,47112,11,47140,47140,11,47168,47168,11,47196,47196,11,47224,47224,11,47252,47252,11,47280,47280,11,47308,47308,11,47336,47336,11,47364,47364,11,47392,47392,11,47420,47420,11,47448,47448,11,47476,47476,11,47504,47504,11,47532,47532,11,47560,47560,11,47588,47588,11,47616,47616,11,47644,47644,11,47672,47672,11,47700,47700,11,47728,47728,11,47756,47756,11,47784,47784,11,47812,47812,11,47840,47840,11,47868,47868,11,47896,47896,11,47924,47924,11,47952,47952,11,47980,47980,11,48008,48008,11,48036,48036,11,48064,48064,11,48092,48092,11,48120,48120,11,48148,48148,11,48176,48176,11,48204,48204,11,48232,48232,11,48260,48260,11,48288,48288,11,48316,48316,11,48344,48344,11,48372,48372,11,48400,48400,11,48428,48428,11,48456,48456,11,48484,48484,11,48512,48512,11,48540,48540,11,48568,48568,11,48596,48596,11,48624,48624,11,48652,48652,11,48680,48680,11,48708,48708,11,48736,48736,11,48764,48764,11,48792,48792,11,48820,48820,11,48848,48848,11,48876,48876,11,48904,48904,11,48932,48932,11,48960,48960,11,48988,48988,11,49016,49016,11,49044,49044,11,49072,49072,11,49100,49100,11,49128,49128,11,49156,49156,11,49184,49184,11,49212,49212,11,49240,49240,11,49268,49268,11,49296,49296,11,49324,49324,11,49352,49352,11,49380,49380,11,49408,49408,11,49436,49436,11,49464,49464,11,49492,49492,11,49520,49520,11,49548,49548,11,49576,49576,11,49604,49604,11,49632,49632,11,49660,49660,11,49688,49688,11,49716,49716,11,49744,49744,11,49772,49772,11,49800,49800,11,49828,49828,11,49856,49856,11,49884,49884,11,49912,49912,11,49940,49940,11,49968,49968,11,49996,49996,11,50024,50024,11,50052,50052,11,50080,50080,11,50108,50108,11,50136,50136,11,50164,50164,11,50192,50192,11,50220,50220,11,50248,50248,11,50276,50276,11,50304,50304,11,50332,50332,11,50360,50360,11,50388,50388,11,50416,50416,11,50444,50444,11,50472,50472,11,50500,50500,11,50528,50528,11,50556,50556,11,50584,50584,11,50612,50612,11,50640,50640,11,50668,50668,11,50696,50696,11,50724,50724,11,50752,50752,11,50780,50780,11,50808,50808,11,50836,50836,11,50864,50864,11,50892,50892,11,50920,50920,11,50948,50948,11,50976,50976,11,51004,51004,11,51032,51032,11,51060,51060,11,51088,51088,11,51116,51116,11,51144,51144,11,51172,51172,11,51200,51200,11,51228,51228,11,51256,51256,11,51284,51284,11,51312,51312,11,51340,51340,11,51368,51368,11,51396,51396,11,51424,51424,11,51452,51452,11,51480,51480,11,51508,51508,11,51536,51536,11,51564,51564,11,51592,51592,11,51620,51620,11,51648,51648,11,51676,51676,11,51704,51704,11,51732,51732,11,51760,51760,11,51788,51788,11,51816,51816,11,51844,51844,11,51872,51872,11,51900,51900,11,51928,51928,11,51956,51956,11,51984,51984,11,52012,52012,11,52040,52040,11,52068,52068,11,52096,52096,11,52124,52124,11,52152,52152,11,52180,52180,11,52208,52208,11,52236,52236,11,52264,52264,11,52292,52292,11,52320,52320,11,52348,52348,11,52376,52376,11,52404,52404,11,52432,52432,11,52460,52460,11,52488,52488,11,52516,52516,11,52544,52544,11,52572,52572,11,52600,52600,11,52628,52628,11,52656,52656,11,52684,52684,11,52712,52712,11,52740,52740,11,52768,52768,11,52796,52796,11,52824,52824,11,52852,52852,11,52880,52880,11,52908,52908,11,52936,52936,11,52964,52964,11,52992,52992,11,53020,53020,11,53048,53048,11,53076,53076,11,53104,53104,11,53132,53132,11,53160,53160,11,53188,53188,11,53216,53216,11,53244,53244,11,53272,53272,11,53300,53300,11,53328,53328,11,53356,53356,11,53384,53384,11,53412,53412,11,53440,53440,11,53468,53468,11,53496,53496,11,53524,53524,11,53552,53552,11,53580,53580,11,53608,53608,11,53636,53636,11,53664,53664,11,53692,53692,11,53720,53720,11,53748,53748,11,53776,53776,11,53804,53804,11,53832,53832,11,53860,53860,11,53888,53888,11,53916,53916,11,53944,53944,11,53972,53972,11,54000,54000,11,54028,54028,11,54056,54056,11,54084,54084,11,54112,54112,11,54140,54140,11,54168,54168,11,54196,54196,11,54224,54224,11,54252,54252,11,54280,54280,11,54308,54308,11,54336,54336,11,54364,54364,11,54392,54392,11,54420,54420,11,54448,54448,11,54476,54476,11,54504,54504,11,54532,54532,11,54560,54560,11,54588,54588,11,54616,54616,11,54644,54644,11,54672,54672,11,54700,54700,11,54728,54728,11,54756,54756,11,54784,54784,11,54812,54812,11,54840,54840,11,54868,54868,11,54896,54896,11,54924,54924,11,54952,54952,11,54980,54980,11,55008,55008,11,55036,55036,11,55064,55064,11,55092,55092,11,55120,55120,11,55148,55148,11,55176,55176,11,55216,55238,9,64286,64286,5,65056,65071,5,65438,65439,5,65529,65531,4,66272,66272,5,68097,68099,5,68108,68111,5,68159,68159,5,68900,68903,5,69446,69456,5,69632,69632,7,69634,69634,7,69744,69744,5,69759,69761,5,69808,69810,7,69815,69816,7,69821,69821,1,69837,69837,1,69927,69931,5,69933,69940,5,70003,70003,5,70018,70018,7,70070,70078,5,70082,70083,1,70094,70094,7,70188,70190,7,70194,70195,7,70197,70197,7,70206,70206,5,70368,70370,7,70400,70401,5,70459,70460,5,70463,70463,7,70465,70468,7,70475,70477,7,70498,70499,7,70512,70516,5,70712,70719,5,70722,70724,5,70726,70726,5,70832,70832,5,70835,70840,5,70842,70842,5,70845,70845,5,70847,70848,5,70850,70851,5,71088,71089,7,71096,71099,7,71102,71102,7,71132,71133,5,71219,71226,5,71229,71229,5,71231,71232,5,71340,71340,7,71342,71343,7,71350,71350,7,71453,71455,5,71462,71462,7,71724,71726,7,71736,71736,7,71984,71984,5,71991,71992,7,71997,71997,7,71999,71999,1,72001,72001,1,72003,72003,5,72148,72151,5,72156,72159,7,72164,72164,7,72243,72248,5,72250,72250,1,72263,72263,5,72279,72280,7,72324,72329,1,72343,72343,7,72751,72751,7,72760,72765,5,72767,72767,5,72873,72873,7,72881,72881,7,72884,72884,7,73009,73014,5,73020,73021,5,73030,73030,1,73098,73102,7,73107,73108,7,73110,73110,7,73459,73460,5,78896,78904,4,92976,92982,5,94033,94087,7,94180,94180,5,113821,113822,5,118528,118573,5,119141,119141,5,119143,119145,5,119150,119154,5,119163,119170,5,119210,119213,5,121344,121398,5,121461,121461,5,121499,121503,5,122880,122886,5,122907,122913,5,122918,122922,5,123566,123566,5,125136,125142,5,126976,126979,14,126981,127182,14,127184,127231,14,127279,127279,14,127344,127345,14,127374,127374,14,127405,127461,14,127489,127490,14,127514,127514,14,127538,127546,14,127561,127567,14,127570,127743,14,127757,127758,14,127760,127760,14,127762,127762,14,127766,127768,14,127770,127770,14,127772,127772,14,127775,127776,14,127778,127779,14,127789,127791,14,127794,127795,14,127798,127798,14,127819,127819,14,127824,127824,14,127868,127868,14,127870,127871,14,127892,127893,14,127896,127896,14,127900,127901,14,127904,127940,14,127942,127942,14,127944,127944,14,127946,127946,14,127951,127955,14,127968,127971,14,127973,127984,14,127987,127987,14,127989,127989,14,127991,127991,14,127995,127999,5,128008,128008,14,128012,128014,14,128017,128018,14,128020,128020,14,128022,128022,14,128042,128042,14,128063,128063,14,128065,128065,14,128101,128101,14,128108,128109,14,128173,128173,14,128182,128183,14,128236,128237,14,128239,128239,14,128245,128245,14,128248,128248,14,128253,128253,14,128255,128258,14,128260,128263,14,128265,128265,14,128277,128277,14,128300,128301,14,128326,128328,14,128331,128334,14,128336,128347,14,128360,128366,14,128369,128370,14,128378,128378,14,128391,128391,14,128394,128397,14,128400,128400,14,128405,128406,14,128420,128420,14,128422,128423,14,128425,128432,14,128435,128443,14,128445,128449,14,128453,128464,14,128468,128475,14,128479,128480,14,128482,128482,14,128484,128487,14,128489,128494,14,128496,128498,14,128500,128505,14,128507,128511,14,128513,128518,14,128521,128525,14,128527,128527,14,128529,128529,14,128533,128533,14,128535,128535,14,128537,128537,14]");
}
var AmbiguousCharacters = class _AmbiguousCharacters {
  constructor(confusableDictionary) {
    this.confusableDictionary = confusableDictionary;
  }
  static {
    this.ambiguousCharacterData = new Lazy(() => {
      return JSON.parse(
        '{"_common":[8232,32,8233,32,5760,32,8192,32,8193,32,8194,32,8195,32,8196,32,8197,32,8198,32,8200,32,8201,32,8202,32,8287,32,8199,32,8239,32,2042,95,65101,95,65102,95,65103,95,8208,45,8209,45,8210,45,65112,45,1748,45,8259,45,727,45,8722,45,10134,45,11450,45,1549,44,1643,44,184,44,42233,44,894,59,2307,58,2691,58,1417,58,1795,58,1796,58,5868,58,65072,58,6147,58,6153,58,8282,58,1475,58,760,58,42889,58,8758,58,720,58,42237,58,451,33,11601,33,660,63,577,63,2429,63,5038,63,42731,63,119149,46,8228,46,1793,46,1794,46,42510,46,68176,46,1632,46,1776,46,42232,46,1373,96,65287,96,8219,96,1523,96,8242,96,1370,96,8175,96,65344,96,900,96,8189,96,8125,96,8127,96,8190,96,697,96,884,96,712,96,714,96,715,96,756,96,699,96,701,96,700,96,702,96,42892,96,1497,96,2036,96,2037,96,5194,96,5836,96,94033,96,94034,96,65339,91,10088,40,10098,40,12308,40,64830,40,65341,93,10089,41,10099,41,12309,41,64831,41,10100,123,119060,123,10101,125,65342,94,8270,42,1645,42,8727,42,66335,42,5941,47,8257,47,8725,47,8260,47,9585,47,10187,47,10744,47,119354,47,12755,47,12339,47,11462,47,20031,47,12035,47,65340,92,65128,92,8726,92,10189,92,10741,92,10745,92,119311,92,119355,92,12756,92,20022,92,12034,92,42872,38,708,94,710,94,5869,43,10133,43,66203,43,8249,60,10094,60,706,60,119350,60,5176,60,5810,60,5120,61,11840,61,12448,61,42239,61,8250,62,10095,62,707,62,119351,62,5171,62,94015,62,8275,126,732,126,8128,126,8764,126,65372,124,65293,45,118002,50,120784,50,120794,50,120804,50,120814,50,120824,50,130034,50,42842,50,423,50,1000,50,42564,50,5311,50,42735,50,119302,51,118003,51,120785,51,120795,51,120805,51,120815,51,120825,51,130035,51,42923,51,540,51,439,51,42858,51,11468,51,1248,51,94011,51,71882,51,118004,52,120786,52,120796,52,120806,52,120816,52,120826,52,130036,52,5070,52,71855,52,118005,53,120787,53,120797,53,120807,53,120817,53,120827,53,130037,53,444,53,71867,53,118006,54,120788,54,120798,54,120808,54,120818,54,120828,54,130038,54,11474,54,5102,54,71893,54,119314,55,118007,55,120789,55,120799,55,120809,55,120819,55,120829,55,130039,55,66770,55,71878,55,2819,56,2538,56,2666,56,125131,56,118008,56,120790,56,120800,56,120810,56,120820,56,120830,56,130040,56,547,56,546,56,66330,56,2663,57,2920,57,2541,57,3437,57,118009,57,120791,57,120801,57,120811,57,120821,57,120831,57,130041,57,42862,57,11466,57,71884,57,71852,57,71894,57,9082,97,65345,97,119834,97,119886,97,119938,97,119990,97,120042,97,120094,97,120146,97,120198,97,120250,97,120302,97,120354,97,120406,97,120458,97,593,97,945,97,120514,97,120572,97,120630,97,120688,97,120746,97,65313,65,117974,65,119808,65,119860,65,119912,65,119964,65,120016,65,120068,65,120120,65,120172,65,120224,65,120276,65,120328,65,120380,65,120432,65,913,65,120488,65,120546,65,120604,65,120662,65,120720,65,5034,65,5573,65,42222,65,94016,65,66208,65,119835,98,119887,98,119939,98,119991,98,120043,98,120095,98,120147,98,120199,98,120251,98,120303,98,120355,98,120407,98,120459,98,388,98,5071,98,5234,98,5551,98,65314,66,8492,66,117975,66,119809,66,119861,66,119913,66,120017,66,120069,66,120121,66,120173,66,120225,66,120277,66,120329,66,120381,66,120433,66,42932,66,914,66,120489,66,120547,66,120605,66,120663,66,120721,66,5108,66,5623,66,42192,66,66178,66,66209,66,66305,66,65347,99,8573,99,119836,99,119888,99,119940,99,119992,99,120044,99,120096,99,120148,99,120200,99,120252,99,120304,99,120356,99,120408,99,120460,99,7428,99,1010,99,11429,99,43951,99,66621,99,128844,67,71913,67,71922,67,65315,67,8557,67,8450,67,8493,67,117976,67,119810,67,119862,67,119914,67,119966,67,120018,67,120174,67,120226,67,120278,67,120330,67,120382,67,120434,67,1017,67,11428,67,5087,67,42202,67,66210,67,66306,67,66581,67,66844,67,8574,100,8518,100,119837,100,119889,100,119941,100,119993,100,120045,100,120097,100,120149,100,120201,100,120253,100,120305,100,120357,100,120409,100,120461,100,1281,100,5095,100,5231,100,42194,100,8558,68,8517,68,117977,68,119811,68,119863,68,119915,68,119967,68,120019,68,120071,68,120123,68,120175,68,120227,68,120279,68,120331,68,120383,68,120435,68,5024,68,5598,68,5610,68,42195,68,8494,101,65349,101,8495,101,8519,101,119838,101,119890,101,119942,101,120046,101,120098,101,120150,101,120202,101,120254,101,120306,101,120358,101,120410,101,120462,101,43826,101,1213,101,8959,69,65317,69,8496,69,117978,69,119812,69,119864,69,119916,69,120020,69,120072,69,120124,69,120176,69,120228,69,120280,69,120332,69,120384,69,120436,69,917,69,120492,69,120550,69,120608,69,120666,69,120724,69,11577,69,5036,69,42224,69,71846,69,71854,69,66182,69,119839,102,119891,102,119943,102,119995,102,120047,102,120099,102,120151,102,120203,102,120255,102,120307,102,120359,102,120411,102,120463,102,43829,102,42905,102,383,102,7837,102,1412,102,119315,70,8497,70,117979,70,119813,70,119865,70,119917,70,120021,70,120073,70,120125,70,120177,70,120229,70,120281,70,120333,70,120385,70,120437,70,42904,70,988,70,120778,70,5556,70,42205,70,71874,70,71842,70,66183,70,66213,70,66853,70,65351,103,8458,103,119840,103,119892,103,119944,103,120048,103,120100,103,120152,103,120204,103,120256,103,120308,103,120360,103,120412,103,120464,103,609,103,7555,103,397,103,1409,103,117980,71,119814,71,119866,71,119918,71,119970,71,120022,71,120074,71,120126,71,120178,71,120230,71,120282,71,120334,71,120386,71,120438,71,1292,71,5056,71,5107,71,42198,71,65352,104,8462,104,119841,104,119945,104,119997,104,120049,104,120101,104,120153,104,120205,104,120257,104,120309,104,120361,104,120413,104,120465,104,1211,104,1392,104,5058,104,65320,72,8459,72,8460,72,8461,72,117981,72,119815,72,119867,72,119919,72,120023,72,120179,72,120231,72,120283,72,120335,72,120387,72,120439,72,919,72,120494,72,120552,72,120610,72,120668,72,120726,72,11406,72,5051,72,5500,72,42215,72,66255,72,731,105,9075,105,65353,105,8560,105,8505,105,8520,105,119842,105,119894,105,119946,105,119998,105,120050,105,120102,105,120154,105,120206,105,120258,105,120310,105,120362,105,120414,105,120466,105,120484,105,618,105,617,105,953,105,8126,105,890,105,120522,105,120580,105,120638,105,120696,105,120754,105,1110,105,42567,105,1231,105,43893,105,5029,105,71875,105,65354,106,8521,106,119843,106,119895,106,119947,106,119999,106,120051,106,120103,106,120155,106,120207,106,120259,106,120311,106,120363,106,120415,106,120467,106,1011,106,1112,106,65322,74,117983,74,119817,74,119869,74,119921,74,119973,74,120025,74,120077,74,120129,74,120181,74,120233,74,120285,74,120337,74,120389,74,120441,74,42930,74,895,74,1032,74,5035,74,5261,74,42201,74,119844,107,119896,107,119948,107,120000,107,120052,107,120104,107,120156,107,120208,107,120260,107,120312,107,120364,107,120416,107,120468,107,8490,75,65323,75,117984,75,119818,75,119870,75,119922,75,119974,75,120026,75,120078,75,120130,75,120182,75,120234,75,120286,75,120338,75,120390,75,120442,75,922,75,120497,75,120555,75,120613,75,120671,75,120729,75,11412,75,5094,75,5845,75,42199,75,66840,75,1472,108,8739,73,9213,73,65512,73,1633,108,1777,73,66336,108,125127,108,118001,108,120783,73,120793,73,120803,73,120813,73,120823,73,130033,73,65321,73,8544,73,8464,73,8465,73,117982,108,119816,73,119868,73,119920,73,120024,73,120128,73,120180,73,120232,73,120284,73,120336,73,120388,73,120440,73,65356,108,8572,73,8467,108,119845,108,119897,108,119949,108,120001,108,120053,108,120105,73,120157,73,120209,73,120261,73,120313,73,120365,73,120417,73,120469,73,448,73,120496,73,120554,73,120612,73,120670,73,120728,73,11410,73,1030,73,1216,73,1493,108,1503,108,1575,108,126464,108,126592,108,65166,108,65165,108,1994,108,11599,73,5825,73,42226,73,93992,73,66186,124,66313,124,119338,76,8556,76,8466,76,117985,76,119819,76,119871,76,119923,76,120027,76,120079,76,120131,76,120183,76,120235,76,120287,76,120339,76,120391,76,120443,76,11472,76,5086,76,5290,76,42209,76,93974,76,71843,76,71858,76,66587,76,66854,76,65325,77,8559,77,8499,77,117986,77,119820,77,119872,77,119924,77,120028,77,120080,77,120132,77,120184,77,120236,77,120288,77,120340,77,120392,77,120444,77,924,77,120499,77,120557,77,120615,77,120673,77,120731,77,1018,77,11416,77,5047,77,5616,77,5846,77,42207,77,66224,77,66321,77,119847,110,119899,110,119951,110,120003,110,120055,110,120107,110,120159,110,120211,110,120263,110,120315,110,120367,110,120419,110,120471,110,1400,110,1404,110,65326,78,8469,78,117987,78,119821,78,119873,78,119925,78,119977,78,120029,78,120081,78,120185,78,120237,78,120289,78,120341,78,120393,78,120445,78,925,78,120500,78,120558,78,120616,78,120674,78,120732,78,11418,78,42208,78,66835,78,3074,111,3202,111,3330,111,3458,111,2406,111,2662,111,2790,111,3046,111,3174,111,3302,111,3430,111,3664,111,3792,111,4160,111,1637,111,1781,111,65359,111,8500,111,119848,111,119900,111,119952,111,120056,111,120108,111,120160,111,120212,111,120264,111,120316,111,120368,111,120420,111,120472,111,7439,111,7441,111,43837,111,959,111,120528,111,120586,111,120644,111,120702,111,120760,111,963,111,120532,111,120590,111,120648,111,120706,111,120764,111,11423,111,4351,111,1413,111,1505,111,1607,111,126500,111,126564,111,126596,111,65259,111,65260,111,65258,111,65257,111,1726,111,64428,111,64429,111,64427,111,64426,111,1729,111,64424,111,64425,111,64423,111,64422,111,1749,111,3360,111,4125,111,66794,111,71880,111,71895,111,66604,111,1984,79,2534,79,2918,79,12295,79,70864,79,71904,79,118000,79,120782,79,120792,79,120802,79,120812,79,120822,79,130032,79,65327,79,117988,79,119822,79,119874,79,119926,79,119978,79,120030,79,120082,79,120134,79,120186,79,120238,79,120290,79,120342,79,120394,79,120446,79,927,79,120502,79,120560,79,120618,79,120676,79,120734,79,11422,79,1365,79,11604,79,4816,79,2848,79,66754,79,42227,79,71861,79,66194,79,66219,79,66564,79,66838,79,9076,112,65360,112,119849,112,119901,112,119953,112,120005,112,120057,112,120109,112,120161,112,120213,112,120265,112,120317,112,120369,112,120421,112,120473,112,961,112,120530,112,120544,112,120588,112,120602,112,120646,112,120660,112,120704,112,120718,112,120762,112,120776,112,11427,112,65328,80,8473,80,117989,80,119823,80,119875,80,119927,80,119979,80,120031,80,120083,80,120187,80,120239,80,120291,80,120343,80,120395,80,120447,80,929,80,120504,80,120562,80,120620,80,120678,80,120736,80,11426,80,5090,80,5229,80,42193,80,66197,80,119850,113,119902,113,119954,113,120006,113,120058,113,120110,113,120162,113,120214,113,120266,113,120318,113,120370,113,120422,113,120474,113,1307,113,1379,113,1382,113,8474,81,117990,81,119824,81,119876,81,119928,81,119980,81,120032,81,120084,81,120188,81,120240,81,120292,81,120344,81,120396,81,120448,81,11605,81,119851,114,119903,114,119955,114,120007,114,120059,114,120111,114,120163,114,120215,114,120267,114,120319,114,120371,114,120423,114,120475,114,43847,114,43848,114,7462,114,11397,114,43905,114,119318,82,8475,82,8476,82,8477,82,117991,82,119825,82,119877,82,119929,82,120033,82,120189,82,120241,82,120293,82,120345,82,120397,82,120449,82,422,82,5025,82,5074,82,66740,82,5511,82,42211,82,94005,82,65363,115,119852,115,119904,115,119956,115,120008,115,120060,115,120112,115,120164,115,120216,115,120268,115,120320,115,120372,115,120424,115,120476,115,42801,115,445,115,1109,115,43946,115,71873,115,66632,115,65331,83,117992,83,119826,83,119878,83,119930,83,119982,83,120034,83,120086,83,120138,83,120190,83,120242,83,120294,83,120346,83,120398,83,120450,83,1029,83,1359,83,5077,83,5082,83,42210,83,94010,83,66198,83,66592,83,119853,116,119905,116,119957,116,120009,116,120061,116,120113,116,120165,116,120217,116,120269,116,120321,116,120373,116,120425,116,120477,116,8868,84,10201,84,128872,84,65332,84,117993,84,119827,84,119879,84,119931,84,119983,84,120035,84,120087,84,120139,84,120191,84,120243,84,120295,84,120347,84,120399,84,120451,84,932,84,120507,84,120565,84,120623,84,120681,84,120739,84,11430,84,5026,84,42196,84,93962,84,71868,84,66199,84,66225,84,66325,84,119854,117,119906,117,119958,117,120010,117,120062,117,120114,117,120166,117,120218,117,120270,117,120322,117,120374,117,120426,117,120478,117,42911,117,7452,117,43854,117,43858,117,651,117,965,117,120534,117,120592,117,120650,117,120708,117,120766,117,1405,117,66806,117,71896,117,8746,85,8899,85,117994,85,119828,85,119880,85,119932,85,119984,85,120036,85,120088,85,120140,85,120192,85,120244,85,120296,85,120348,85,120400,85,120452,85,1357,85,4608,85,66766,85,5196,85,42228,85,94018,85,71864,85,8744,118,8897,118,65366,118,8564,118,119855,118,119907,118,119959,118,120011,118,120063,118,120115,118,120167,118,120219,118,120271,118,120323,118,120375,118,120427,118,120479,118,7456,118,957,118,120526,118,120584,118,120642,118,120700,118,120758,118,1141,118,1496,118,71430,118,43945,118,71872,118,119309,86,1639,86,1783,86,8548,86,117995,86,119829,86,119881,86,119933,86,119985,86,120037,86,120089,86,120141,86,120193,86,120245,86,120297,86,120349,86,120401,86,120453,86,1140,86,11576,86,5081,86,5167,86,42719,86,42214,86,93960,86,71840,86,66845,86,623,119,119856,119,119908,119,119960,119,120012,119,120064,119,120116,119,120168,119,120220,119,120272,119,120324,119,120376,119,120428,119,120480,119,7457,119,1121,119,1309,119,1377,119,71434,119,71438,119,71439,119,43907,119,71910,87,71919,87,117996,87,119830,87,119882,87,119934,87,119986,87,120038,87,120090,87,120142,87,120194,87,120246,87,120298,87,120350,87,120402,87,120454,87,1308,87,5043,87,5076,87,42218,87,5742,120,10539,120,10540,120,10799,120,65368,120,8569,120,119857,120,119909,120,119961,120,120013,120,120065,120,120117,120,120169,120,120221,120,120273,120,120325,120,120377,120,120429,120,120481,120,5441,120,5501,120,5741,88,9587,88,66338,88,71916,88,65336,88,8553,88,117997,88,119831,88,119883,88,119935,88,119987,88,120039,88,120091,88,120143,88,120195,88,120247,88,120299,88,120351,88,120403,88,120455,88,42931,88,935,88,120510,88,120568,88,120626,88,120684,88,120742,88,11436,88,11613,88,5815,88,42219,88,66192,88,66228,88,66327,88,66855,88,611,121,7564,121,65369,121,119858,121,119910,121,119962,121,120014,121,120066,121,120118,121,120170,121,120222,121,120274,121,120326,121,120378,121,120430,121,120482,121,655,121,7935,121,43866,121,947,121,8509,121,120516,121,120574,121,120632,121,120690,121,120748,121,1199,121,4327,121,71900,121,65337,89,117998,89,119832,89,119884,89,119936,89,119988,89,120040,89,120092,89,120144,89,120196,89,120248,89,120300,89,120352,89,120404,89,120456,89,933,89,978,89,120508,89,120566,89,120624,89,120682,89,120740,89,11432,89,1198,89,5033,89,5053,89,42220,89,94019,89,71844,89,66226,89,119859,122,119911,122,119963,122,120015,122,120067,122,120119,122,120171,122,120223,122,120275,122,120327,122,120379,122,120431,122,120483,122,7458,122,43923,122,71876,122,71909,90,66293,90,65338,90,8484,90,8488,90,117999,90,119833,90,119885,90,119937,90,119989,90,120041,90,120197,90,120249,90,120301,90,120353,90,120405,90,120457,90,918,90,120493,90,120551,90,120609,90,120667,90,120725,90,5059,90,42204,90,71849,90,65282,34,65283,35,65284,36,65285,37,65286,38,65290,42,65291,43,65294,46,65295,47,65296,48,65298,50,65299,51,65300,52,65301,53,65302,54,65303,55,65304,56,65305,57,65308,60,65309,61,65310,62,65312,64,65316,68,65318,70,65319,71,65324,76,65329,81,65330,82,65333,85,65334,86,65335,87,65343,95,65346,98,65348,100,65350,102,65355,107,65357,109,65358,110,65361,113,65362,114,65364,116,65365,117,65367,119,65370,122,65371,123,65373,125,119846,109],"_default":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8216,96,8217,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"cs":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"de":[65374,126,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"es":[8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"fr":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"it":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"ja":[8211,45,8218,44,65281,33,8216,96,8245,96,180,96,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65292,44,65297,49,65307,59],"ko":[8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"pl":[65374,126,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"pt-BR":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"qps-ploc":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"ru":[65374,126,8218,44,65306,58,65281,33,8216,96,8245,96,180,96,12494,47,305,105,921,73,1009,112,215,120,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"tr":[160,32,8211,45,65374,126,8218,44,65306,58,65281,33,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65288,40,65289,41,65292,44,65297,49,65307,59,65311,63],"zh-hans":[160,32,65374,126,8218,44,8245,96,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89,65297,49],"zh-hant":[8211,45,65374,126,8218,44,180,96,12494,47,1047,51,1073,54,1072,97,1040,65,1068,98,1042,66,1089,99,1057,67,1077,101,1045,69,1053,72,305,105,1050,75,921,73,1052,77,1086,111,1054,79,1009,112,1088,112,1056,80,1075,114,1058,84,215,120,1093,120,1061,88,1091,121,1059,89]}'
      );
    });
  }
  static {
    this.cache = new LRUCachedFunction({ getCacheKey: JSON.stringify }, (locales) => {
      function arrayToMap(arr) {
        const result = /* @__PURE__ */ new Map();
        for (let i = 0; i < arr.length; i += 2) {
          result.set(arr[i], arr[i + 1]);
        }
        return result;
      }
      function mergeMaps(map1, map2) {
        const result = new Map(map1);
        for (const [key, value] of map2) {
          result.set(key, value);
        }
        return result;
      }
      function intersectMaps(map1, map2) {
        if (!map1) {
          return map2;
        }
        const result = /* @__PURE__ */ new Map();
        for (const [key, value] of map1) {
          if (map2.has(key)) {
            result.set(key, value);
          }
        }
        return result;
      }
      const data = this.ambiguousCharacterData.value;
      let filteredLocales = locales.filter(
        (l) => !l.startsWith("_") && l in data
      );
      if (filteredLocales.length === 0) {
        filteredLocales = ["_default"];
      }
      let languageSpecificMap = void 0;
      for (const locale of filteredLocales) {
        const map2 = arrayToMap(data[locale]);
        languageSpecificMap = intersectMaps(languageSpecificMap, map2);
      }
      const commonMap = arrayToMap(data["_common"]);
      const map = mergeMaps(commonMap, languageSpecificMap);
      return new _AmbiguousCharacters(map);
    });
  }
  static getInstance(locales) {
    return _AmbiguousCharacters.cache.get(Array.from(locales));
  }
  static {
    this._locales = new Lazy(
      () => Object.keys(_AmbiguousCharacters.ambiguousCharacterData.value).filter(
        (k) => !k.startsWith("_")
      )
    );
  }
  static getLocales() {
    return _AmbiguousCharacters._locales.value;
  }
  isAmbiguous(codePoint) {
    return this.confusableDictionary.has(codePoint);
  }
  containsAmbiguousCharacter(str) {
    for (let i = 0; i < str.length; i++) {
      const codePoint = str.codePointAt(i);
      if (typeof codePoint === "number" && this.isAmbiguous(codePoint)) {
        return true;
      }
    }
    return false;
  }
  /**
   * Returns the non basic ASCII code point that the given code point can be confused,
   * or undefined if such code point does note exist.
   */
  getPrimaryConfusable(codePoint) {
    return this.confusableDictionary.get(codePoint);
  }
  getConfusableCodePoints() {
    return new Set(this.confusableDictionary.keys());
  }
};
var InvisibleCharacters = class _InvisibleCharacters {
  static getRawData() {
    return JSON.parse('{"_common":[11,12,13,127,847,1564,4447,4448,6068,6069,6155,6156,6157,6158,7355,7356,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8204,8205,8206,8207,8234,8235,8236,8237,8238,8239,8287,8288,8289,8290,8291,8292,8293,8294,8295,8296,8297,8298,8299,8300,8301,8302,8303,10240,12644,65024,65025,65026,65027,65028,65029,65030,65031,65032,65033,65034,65035,65036,65037,65038,65039,65279,65440,65520,65521,65522,65523,65524,65525,65526,65527,65528,65532,78844,119155,119156,119157,119158,119159,119160,119161,119162,917504,917505,917506,917507,917508,917509,917510,917511,917512,917513,917514,917515,917516,917517,917518,917519,917520,917521,917522,917523,917524,917525,917526,917527,917528,917529,917530,917531,917532,917533,917534,917535,917536,917537,917538,917539,917540,917541,917542,917543,917544,917545,917546,917547,917548,917549,917550,917551,917552,917553,917554,917555,917556,917557,917558,917559,917560,917561,917562,917563,917564,917565,917566,917567,917568,917569,917570,917571,917572,917573,917574,917575,917576,917577,917578,917579,917580,917581,917582,917583,917584,917585,917586,917587,917588,917589,917590,917591,917592,917593,917594,917595,917596,917597,917598,917599,917600,917601,917602,917603,917604,917605,917606,917607,917608,917609,917610,917611,917612,917613,917614,917615,917616,917617,917618,917619,917620,917621,917622,917623,917624,917625,917626,917627,917628,917629,917630,917631,917760,917761,917762,917763,917764,917765,917766,917767,917768,917769,917770,917771,917772,917773,917774,917775,917776,917777,917778,917779,917780,917781,917782,917783,917784,917785,917786,917787,917788,917789,917790,917791,917792,917793,917794,917795,917796,917797,917798,917799,917800,917801,917802,917803,917804,917805,917806,917807,917808,917809,917810,917811,917812,917813,917814,917815,917816,917817,917818,917819,917820,917821,917822,917823,917824,917825,917826,917827,917828,917829,917830,917831,917832,917833,917834,917835,917836,917837,917838,917839,917840,917841,917842,917843,917844,917845,917846,917847,917848,917849,917850,917851,917852,917853,917854,917855,917856,917857,917858,917859,917860,917861,917862,917863,917864,917865,917866,917867,917868,917869,917870,917871,917872,917873,917874,917875,917876,917877,917878,917879,917880,917881,917882,917883,917884,917885,917886,917887,917888,917889,917890,917891,917892,917893,917894,917895,917896,917897,917898,917899,917900,917901,917902,917903,917904,917905,917906,917907,917908,917909,917910,917911,917912,917913,917914,917915,917916,917917,917918,917919,917920,917921,917922,917923,917924,917925,917926,917927,917928,917929,917930,917931,917932,917933,917934,917935,917936,917937,917938,917939,917940,917941,917942,917943,917944,917945,917946,917947,917948,917949,917950,917951,917952,917953,917954,917955,917956,917957,917958,917959,917960,917961,917962,917963,917964,917965,917966,917967,917968,917969,917970,917971,917972,917973,917974,917975,917976,917977,917978,917979,917980,917981,917982,917983,917984,917985,917986,917987,917988,917989,917990,917991,917992,917993,917994,917995,917996,917997,917998,917999],"cs":[173,8203,12288],"de":[173,8203,12288],"es":[8203,12288],"fr":[173,8203,12288],"it":[160,173,12288],"ja":[173],"ko":[173,12288],"pl":[173,8203,12288],"pt-BR":[173,8203,12288],"qps-ploc":[160,173,8203,12288],"ru":[173,12288],"tr":[160,173,8203,12288],"zh-hans":[160,173,8203,12288],"zh-hant":[173,12288]}');
  }
  static {
    this._data = void 0;
  }
  static getData() {
    if (!this._data) {
      this._data = new Set([...Object.values(_InvisibleCharacters.getRawData())].flat());
    }
    return this._data;
  }
  static isInvisibleCharacter(codePoint) {
    return _InvisibleCharacters.getData().has(codePoint);
  }
  static containsInvisibleCharacter(str) {
    for (let i = 0; i < str.length; i++) {
      const codePoint = str.codePointAt(i);
      if (typeof codePoint === "number" && (_InvisibleCharacters.isInvisibleCharacter(codePoint) || codePoint === 32 /* space */)) {
        return true;
      }
    }
    return false;
  }
  static get codePoints() {
    return _InvisibleCharacters.getData();
  }
};

// src/platform/tokenizer/node/tokenizer.ts
var import_prompt_tsx = __toESM(require_base());

// src/util/common/cache.ts
var Node2 = class {
  constructor(key, value) {
    this.prev = null;
    this.next = null;
    this.key = key;
    this.value = value;
  }
};
var LRUCache = class {
  constructor(size = 10) {
    if (size < 1) {
      throw new Error("Cache size must be at least 1");
    }
    this._capacity = size;
    this._cache = /* @__PURE__ */ new Map();
    this._head = new Node2("", null);
    this._tail = new Node2("", null);
    this._head.next = this._tail;
    this._tail.prev = this._head;
  }
  _addNode(node) {
    node.prev = this._head;
    node.next = this._head.next;
    this._head.next.prev = node;
    this._head.next = node;
  }
  _removeNode(node) {
    const prev = node.prev;
    const next = node.next;
    prev.next = next;
    next.prev = prev;
  }
  _moveToHead(node) {
    this._removeNode(node);
    this._addNode(node);
  }
  _popTail() {
    const res = this._tail.prev;
    this._removeNode(res);
    return res;
  }
  clear() {
    this._cache.clear();
    this._head.next = this._tail;
    this._tail.prev = this._head;
  }
  /**
   * Deletes the cache entry for the given key, if it exists.
   * @param key The key of the cache entry to delete.
   * @returns The value of the deleted cache entry, or undefined if the key was not found.
   */
  deleteKey(key) {
    const node = this._cache.get(key);
    if (!node) {
      return void 0;
    }
    this._removeNode(node);
    this._cache.delete(key);
    return node.value;
  }
  get(key) {
    const node = this._cache.get(key);
    if (!node) {
      return void 0;
    }
    this._moveToHead(node);
    return node.value;
  }
  /**
   * Return a copy of all the keys stored in the LRU cache, in LRU order.
   *
   * The returned array is safe to modify, as this call allocates a copy of a
   * private array used to represent those keys.
   */
  keys() {
    const keys = [];
    let current = this._head.next;
    while (current !== this._tail) {
      keys.push(current.key);
      current = current.next;
    }
    return keys;
  }
  getValues() {
    const values = [];
    let current = this._head.next;
    while (current !== this._tail) {
      values.push(current.value);
      current = current.next;
    }
    return values;
  }
  /** @returns the evicted [key, value]  */
  put(key, value) {
    let node = this._cache.get(key);
    if (node) {
      node.value = value;
      this._moveToHead(node);
    } else {
      node = new Node2(key, value);
      this._cache.set(key, node);
      this._addNode(node);
      if (this._cache.size > this._capacity) {
        const tail = this._popTail();
        this._cache.delete(tail.key);
        return [tail.key, tail.value];
      }
    }
  }
  entries() {
    const entries = [];
    let current = this._head.next;
    while (current !== this._tail) {
      entries.push([current.key, current.value]);
      current = current.next;
    }
    return entries;
  }
};

// src/util/common/imageUtils.ts
function getImageDimensions(base64) {
  if (!base64.startsWith("data:image/")) {
    throw new Error("Could not read image: invalid base64 image string");
  }
  const rawString = base64.split(",")[1];
  switch (getMimeType(rawString)) {
    case "image/png":
      return getPngDimensions(rawString);
    case "image/gif":
      return getGifDimensions(rawString);
    case "image/jpeg":
    case "image/jpg":
      return getJpegDimensions(rawString);
    case "image/webp":
      return getWebPDimensions(rawString);
    default:
      throw new Error("Unsupported image format");
  }
}
function getPngDimensions(base64) {
  const header = atob(base64.slice(0, 50)).slice(16, 24);
  const uint8 = Uint8Array.from(header, (c) => c.charCodeAt(0));
  const dataView = new DataView(uint8.buffer);
  return {
    width: dataView.getUint32(0, false),
    height: dataView.getUint32(4, false)
  };
}
function getGifDimensions(base64) {
  const header = atob(base64.slice(0, 50));
  const uint8 = Uint8Array.from(header, (c) => c.charCodeAt(0));
  const dataView = new DataView(uint8.buffer);
  return {
    width: dataView.getUint16(6, true),
    height: dataView.getUint16(8, true)
  };
}
function getJpegDimensions(base64) {
  const binary = atob(base64);
  const uint8 = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const length = uint8.length;
  let offset = 2;
  while (offset < length) {
    const marker = uint8[offset] << 8 | uint8[offset + 1];
    const segmentLength = uint8[offset + 2] << 8 | uint8[offset + 3];
    if (marker >= 65472 && marker <= 65474) {
      const dataView = new DataView(uint8.buffer, offset + 5, 4);
      return {
        height: dataView.getUint16(0, false),
        width: dataView.getUint16(2, false)
      };
    }
    offset += 2 + segmentLength;
  }
  throw new Error("JPEG dimensions not found");
}
function getWebPDimensions(base64String) {
  const binaryString = atob(base64String);
  const binaryData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryData[i] = binaryString.charCodeAt(i);
  }
  if (binaryString.slice(0, 4) !== "RIFF" || binaryString.slice(8, 12) !== "WEBP") {
    throw new Error("Not a valid WebP image.");
  }
  const chunkHeader = binaryString.slice(12, 16);
  if (chunkHeader === "VP8 ") {
    const width = (binaryData[26] | binaryData[27] << 8) & 16383;
    const height = (binaryData[28] | binaryData[29] << 8) & 16383;
    return { width, height };
  } else if (chunkHeader === "VP8L") {
    const width = (binaryData[21] | binaryData[22] << 8) & 16383;
    const height = (binaryData[23] | binaryData[24] << 8) & 16383;
    return { width, height };
  } else if (chunkHeader === "VP8X") {
    const width = ((binaryData[24] | binaryData[25] << 8 | binaryData[26] << 16) & 16777215) + 1;
    const height = ((binaryData[27] | binaryData[28] << 8 | binaryData[29] << 16) & 16777215) + 1;
    return { width, height };
  } else {
    throw new Error("Unsupported WebP format.");
  }
}
function getMimeType(base64String) {
  const mimeTypes = {
    "/9j/": "image/jpeg",
    "iVBOR": "image/png",
    "R0lGOD": "image/gif",
    "UklGR": "image/webp"
  };
  for (const prefix of Object.keys(mimeTypes)) {
    if (base64String.startsWith(prefix)) {
      return mimeTypes[prefix];
    }
  }
}

// src/util/vs/platform/instantiation/common/instantiation.ts
var _util;
((_util2) => {
  _util2.serviceIds = /* @__PURE__ */ new Map();
  _util2.DI_TARGET = "$di$target";
  _util2.DI_DEPENDENCIES = "$di$dependencies";
  function getServiceDependencies(ctor) {
    return ctor[_util2.DI_DEPENDENCIES] || [];
  }
  _util2.getServiceDependencies = getServiceDependencies;
})(_util || (_util = {}));
var IInstantiationService = createDecorator("instantiationService");
function storeServiceDependency(id2, target, index) {
  if (target[_util.DI_TARGET] === target) {
    target[_util.DI_DEPENDENCIES].push({ id: id2, index });
  } else {
    target[_util.DI_DEPENDENCIES] = [{ id: id2, index }];
    target[_util.DI_TARGET] = target;
  }
}
function createDecorator(serviceId) {
  if (_util.serviceIds.has(serviceId)) {
    return _util.serviceIds.get(serviceId);
  }
  const id2 = function(target, key, index) {
    if (arguments.length !== 3) {
      throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
    }
    storeServiceDependency(id2, target, index);
  };
  id2.toString = () => serviceId;
  _util.serviceIds.set(serviceId, id2);
  return id2;
}

// src/util/vs/base/common/extpath.ts
function isPathSeparator2(code) {
  return code === 47 /* Slash */ || code === 92 /* Backslash */;
}
function toSlashes(osPath) {
  return osPath.replace(/[\\/]/g, posix.sep);
}
function toPosixPath(osPath) {
  if (osPath.indexOf("/") === -1) {
    osPath = toSlashes(osPath);
  }
  if (/^[a-zA-Z]:(\/|$)/.test(osPath)) {
    osPath = "/" + osPath;
  }
  return osPath;
}
function getRoot(path2, sep2 = posix.sep) {
  if (!path2) {
    return "";
  }
  const len = path2.length;
  const firstLetter = path2.charCodeAt(0);
  if (isPathSeparator2(firstLetter)) {
    if (isPathSeparator2(path2.charCodeAt(1))) {
      if (!isPathSeparator2(path2.charCodeAt(2))) {
        let pos2 = 3;
        const start = pos2;
        for (; pos2 < len; pos2++) {
          if (isPathSeparator2(path2.charCodeAt(pos2))) {
            break;
          }
        }
        if (start !== pos2 && !isPathSeparator2(path2.charCodeAt(pos2 + 1))) {
          pos2 += 1;
          for (; pos2 < len; pos2++) {
            if (isPathSeparator2(path2.charCodeAt(pos2))) {
              return path2.slice(0, pos2 + 1).replace(/[\\/]/g, sep2);
            }
          }
        }
      }
    }
    return sep2;
  } else if (isWindowsDriveLetter(firstLetter)) {
    if (path2.charCodeAt(1) === 58 /* Colon */) {
      if (isPathSeparator2(path2.charCodeAt(2))) {
        return path2.slice(0, 2) + sep2;
      } else {
        return path2.slice(0, 2);
      }
    }
  }
  let pos = path2.indexOf("://");
  if (pos !== -1) {
    pos += 3;
    for (; pos < len; pos++) {
      if (isPathSeparator2(path2.charCodeAt(pos))) {
        return path2.slice(0, pos + 1);
      }
    }
  }
  return "";
}
function isEqualOrParent(base, parentCandidate, ignoreCase, separator = sep) {
  if (base === parentCandidate) {
    return true;
  }
  if (!base || !parentCandidate) {
    return false;
  }
  if (parentCandidate.length > base.length) {
    return false;
  }
  if (ignoreCase) {
    const beginsWith = startsWithIgnoreCase(base, parentCandidate);
    if (!beginsWith) {
      return false;
    }
    if (parentCandidate.length === base.length) {
      return true;
    }
    let sepOffset = parentCandidate.length;
    if (parentCandidate.charAt(parentCandidate.length - 1) === separator) {
      sepOffset--;
    }
    return base.charAt(sepOffset) === separator;
  }
  if (parentCandidate.charAt(parentCandidate.length - 1) !== separator) {
    parentCandidate += separator;
  }
  return base.indexOf(parentCandidate) === 0;
}
function isWindowsDriveLetter(char0) {
  return char0 >= 65 /* A */ && char0 <= 90 /* Z */ || char0 >= 97 /* a */ && char0 <= 122 /* z */;
}

// src/util/vs/base/common/network.ts
var Schemas;
((Schemas2) => {
  Schemas2.inMemory = "inmemory";
  Schemas2.vscode = "vscode";
  Schemas2.internal = "private";
  Schemas2.walkThrough = "walkThrough";
  Schemas2.walkThroughSnippet = "walkThroughSnippet";
  Schemas2.http = "http";
  Schemas2.https = "https";
  Schemas2.file = "file";
  Schemas2.mailto = "mailto";
  Schemas2.untitled = "untitled";
  Schemas2.data = "data";
  Schemas2.command = "command";
  Schemas2.vscodeRemote = "vscode-remote";
  Schemas2.vscodeRemoteResource = "vscode-remote-resource";
  Schemas2.vscodeManagedRemoteResource = "vscode-managed-remote-resource";
  Schemas2.vscodeUserData = "vscode-userdata";
  Schemas2.vscodeCustomEditor = "vscode-custom-editor";
  Schemas2.vscodeNotebookCell = "vscode-notebook-cell";
  Schemas2.vscodeNotebookCellMetadata = "vscode-notebook-cell-metadata";
  Schemas2.vscodeNotebookCellMetadataDiff = "vscode-notebook-cell-metadata-diff";
  Schemas2.vscodeNotebookCellOutput = "vscode-notebook-cell-output";
  Schemas2.vscodeNotebookCellOutputDiff = "vscode-notebook-cell-output-diff";
  Schemas2.vscodeNotebookMetadata = "vscode-notebook-metadata";
  Schemas2.vscodeInteractiveInput = "vscode-interactive-input";
  Schemas2.vscodeSettings = "vscode-settings";
  Schemas2.vscodeWorkspaceTrust = "vscode-workspace-trust";
  Schemas2.vscodeTerminal = "vscode-terminal";
  Schemas2.vscodeChatCodeBlock = "vscode-chat-code-block";
  Schemas2.vscodeChatCodeCompareBlock = "vscode-chat-code-compare-block";
  Schemas2.vscodeChatEditor = "vscode-chat-editor";
  Schemas2.vscodeChatInput = "chatSessionInput";
  Schemas2.vscodeChatSession = "vscode-chat-session";
  Schemas2.webviewPanel = "webview-panel";
  Schemas2.vscodeWebview = "vscode-webview";
  Schemas2.extension = "extension";
  Schemas2.vscodeFileResource = "vscode-file";
  Schemas2.tmp = "tmp";
  Schemas2.vsls = "vsls";
  Schemas2.vscodeSourceControl = "vscode-scm";
  Schemas2.commentsInput = "comment";
  Schemas2.codeSetting = "code-setting";
  Schemas2.outputChannel = "output";
  Schemas2.accessibleView = "accessible-view";
  Schemas2.chatEditingSnapshotScheme = "chat-editing-snapshot-text-model";
  Schemas2.chatEditingModel = "chat-editing-text-model";
})(Schemas || (Schemas = {}));
var connectionTokenQueryName = "tkn";
var RemoteAuthoritiesImpl = class {
  constructor() {
    this._hosts = /* @__PURE__ */ Object.create(null);
    this._ports = /* @__PURE__ */ Object.create(null);
    this._connectionTokens = /* @__PURE__ */ Object.create(null);
    this._preferredWebSchema = "http";
    this._delegate = null;
    this._serverRootPath = "/";
  }
  setPreferredWebSchema(schema) {
    this._preferredWebSchema = schema;
  }
  setDelegate(delegate) {
    this._delegate = delegate;
  }
  setServerRootPath(product, serverBasePath) {
    this._serverRootPath = posix.join(serverBasePath ?? "/", getServerProductSegment(product));
  }
  getServerRootPath() {
    return this._serverRootPath;
  }
  get _remoteResourcesPath() {
    return posix.join(this._serverRootPath, Schemas.vscodeRemoteResource);
  }
  set(authority, host, port2) {
    this._hosts[authority] = host;
    this._ports[authority] = port2;
  }
  setConnectionToken(authority, connectionToken) {
    this._connectionTokens[authority] = connectionToken;
  }
  getPreferredWebSchema() {
    return this._preferredWebSchema;
  }
  rewrite(uri) {
    if (this._delegate) {
      try {
        return this._delegate(uri);
      } catch (err) {
        onUnexpectedError(err);
        return uri;
      }
    }
    const authority = uri.authority;
    let host = this._hosts[authority];
    if (host && host.indexOf(":") !== -1 && host.indexOf("[") === -1) {
      host = `[${host}]`;
    }
    const port2 = this._ports[authority];
    const connectionToken = this._connectionTokens[authority];
    let query = `path=${encodeURIComponent(uri.path)}`;
    if (typeof connectionToken === "string") {
      query += `&${connectionTokenQueryName}=${encodeURIComponent(connectionToken)}`;
    }
    return URI.from({
      scheme: isWeb ? this._preferredWebSchema : Schemas.vscodeRemoteResource,
      authority: `${host}:${port2}`,
      path: this._remoteResourcesPath,
      query
    });
  }
};
var RemoteAuthorities = new RemoteAuthoritiesImpl();
function getServerProductSegment(product) {
  return `${product.quality ?? "oss"}-${product.commit ?? "dev"}`;
}
var VSCODE_AUTHORITY = "vscode-app";
var FileAccessImpl = class _FileAccessImpl {
  static {
    this.FALLBACK_AUTHORITY = VSCODE_AUTHORITY;
  }
  /**
   * Returns a URI to use in contexts where the browser is responsible
   * for loading (e.g. fetch()) or when used within the DOM.
   *
   * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
   */
  asBrowserUri(resourcePath) {
    const uri = this.toUri(resourcePath);
    return this.uriToBrowserUri(uri);
  }
  /**
   * Returns a URI to use in contexts where the browser is responsible
   * for loading (e.g. fetch()) or when used within the DOM.
   *
   * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
   */
  uriToBrowserUri(uri) {
    if (uri.scheme === Schemas.vscodeRemote) {
      return RemoteAuthorities.rewrite(uri);
    }
    if (
      // ...only ever for `file` resources
      uri.scheme === Schemas.file && // ...and we run in native environments
      (isNative || // ...or web worker extensions on desktop
      webWorkerOrigin === `${Schemas.vscodeFileResource}://${_FileAccessImpl.FALLBACK_AUTHORITY}`)
    ) {
      return uri.with({
        scheme: Schemas.vscodeFileResource,
        // We need to provide an authority here so that it can serve
        // as origin for network and loading matters in chromium.
        // If the URI is not coming with an authority already, we
        // add our own
        authority: uri.authority || _FileAccessImpl.FALLBACK_AUTHORITY,
        query: null,
        fragment: null
      });
    }
    return uri;
  }
  /**
   * Returns the `file` URI to use in contexts where node.js
   * is responsible for loading.
   */
  asFileUri(resourcePath) {
    const uri = this.toUri(resourcePath);
    return this.uriToFileUri(uri);
  }
  /**
   * Returns the `file` URI to use in contexts where node.js
   * is responsible for loading.
   */
  uriToFileUri(uri) {
    if (uri.scheme === Schemas.vscodeFileResource) {
      return uri.with({
        scheme: Schemas.file,
        // Only preserve the `authority` if it is different from
        // our fallback authority. This ensures we properly preserve
        // Windows UNC paths that come with their own authority.
        authority: uri.authority !== _FileAccessImpl.FALLBACK_AUTHORITY ? uri.authority : null,
        query: null,
        fragment: null
      });
    }
    return uri;
  }
  toUri(uriOrModule) {
    if (URI.isUri(uriOrModule)) {
      return uriOrModule;
    }
    if (globalThis._VSCODE_FILE_ROOT) {
      const rootUriOrPath = globalThis._VSCODE_FILE_ROOT;
      if (/^\w[\w\d+.-]*:\/\//.test(rootUriOrPath)) {
        return URI.joinPath(URI.parse(rootUriOrPath, true), uriOrModule);
      }
      const modulePath = join(rootUriOrPath, uriOrModule);
      return URI.file(modulePath);
    }
    throw new Error("Cannot determine URI for module id!");
  }
};
var FileAccess = new FileAccessImpl();
var CacheControlheaders = Object.freeze({
  "Cache-Control": "no-cache, no-store"
});
var DocumentPolicyheaders = Object.freeze({
  "Document-Policy": "include-js-call-stacks-in-crash-reports"
});
var COI;
((COI2) => {
  const coiHeaders = /* @__PURE__ */ new Map([
    ["1", { "Cross-Origin-Opener-Policy": "same-origin" }],
    ["2", { "Cross-Origin-Embedder-Policy": "require-corp" }],
    ["3", { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp" }]
  ]);
  COI2.CoopAndCoep = Object.freeze(coiHeaders.get("3"));
  const coiSearchParamName = "vscode-coi";
  function getHeadersFromQuery(url) {
    let params;
    if (typeof url === "string") {
      params = new URL(url).searchParams;
    } else if (url instanceof URL) {
      params = url.searchParams;
    } else if (URI.isUri(url)) {
      params = new URL(url.toString(true)).searchParams;
    }
    const value = params?.get(coiSearchParamName);
    if (!value) {
      return void 0;
    }
    return coiHeaders.get(value);
  }
  COI2.getHeadersFromQuery = getHeadersFromQuery;
  function addSearchParam(urlOrSearch, coop, coep) {
    if (!globalThis.crossOriginIsolated) {
      return;
    }
    const value = coop && coep ? "3" : coep ? "2" : "1";
    if (urlOrSearch instanceof URLSearchParams) {
      urlOrSearch.set(coiSearchParamName, value);
    } else {
      urlOrSearch[coiSearchParamName] = value;
    }
  }
  COI2.addSearchParam = addSearchParam;
})(COI || (COI = {}));

// src/util/vs/base/common/resources.ts
function originalFSPath(uri) {
  return uriToFsPath(uri, true);
}
var ExtUri = class {
  constructor(_ignorePathCasing) {
    this._ignorePathCasing = _ignorePathCasing;
  }
  compare(uri1, uri2, ignoreFragment = false) {
    if (uri1 === uri2) {
      return 0;
    }
    return compare(this.getComparisonKey(uri1, ignoreFragment), this.getComparisonKey(uri2, ignoreFragment));
  }
  isEqual(uri1, uri2, ignoreFragment = false) {
    if (uri1 === uri2) {
      return true;
    }
    if (!uri1 || !uri2) {
      return false;
    }
    return this.getComparisonKey(uri1, ignoreFragment) === this.getComparisonKey(uri2, ignoreFragment);
  }
  getComparisonKey(uri, ignoreFragment = false) {
    return uri.with({
      path: this._ignorePathCasing(uri) ? uri.path.toLowerCase() : void 0,
      fragment: ignoreFragment ? null : void 0
    }).toString();
  }
  ignorePathCasing(uri) {
    return this._ignorePathCasing(uri);
  }
  isEqualOrParent(base, parentCandidate, ignoreFragment = false) {
    if (base.scheme === parentCandidate.scheme) {
      if (base.scheme === Schemas.file) {
        return isEqualOrParent(originalFSPath(base), originalFSPath(parentCandidate), this._ignorePathCasing(base)) && base.query === parentCandidate.query && (ignoreFragment || base.fragment === parentCandidate.fragment);
      }
      if (isEqualAuthority(base.authority, parentCandidate.authority)) {
        return isEqualOrParent(base.path, parentCandidate.path, this._ignorePathCasing(base), "/") && base.query === parentCandidate.query && (ignoreFragment || base.fragment === parentCandidate.fragment);
      }
    }
    return false;
  }
  // --- path math
  joinPath(resource, ...pathFragment) {
    return URI.joinPath(resource, ...pathFragment);
  }
  basenameOrAuthority(resource) {
    return basename2(resource) || resource.authority;
  }
  basename(resource) {
    return posix.basename(resource.path);
  }
  extname(resource) {
    return posix.extname(resource.path);
  }
  dirname(resource) {
    if (resource.path.length === 0) {
      return resource;
    }
    let dirname3;
    if (resource.scheme === Schemas.file) {
      dirname3 = URI.file(dirname(originalFSPath(resource))).path;
    } else {
      dirname3 = posix.dirname(resource.path);
      if (resource.authority && dirname3.length && dirname3.charCodeAt(0) !== 47 /* Slash */) {
        console.error(`dirname("${resource.toString})) resulted in a relative path`);
        dirname3 = "/";
      }
    }
    return resource.with({
      path: dirname3
    });
  }
  normalizePath(resource) {
    if (!resource.path.length) {
      return resource;
    }
    let normalizedPath;
    if (resource.scheme === Schemas.file) {
      normalizedPath = URI.file(normalize(originalFSPath(resource))).path;
    } else {
      normalizedPath = posix.normalize(resource.path);
    }
    return resource.with({
      path: normalizedPath
    });
  }
  relativePath(from, to) {
    if (from.scheme !== to.scheme || !isEqualAuthority(from.authority, to.authority)) {
      return void 0;
    }
    if (from.scheme === Schemas.file) {
      const relativePath2 = relative(originalFSPath(from), originalFSPath(to));
      return isWindows ? toSlashes(relativePath2) : relativePath2;
    }
    let fromPath = from.path || "/";
    const toPath = to.path || "/";
    if (this._ignorePathCasing(from)) {
      let i = 0;
      for (const len = Math.min(fromPath.length, toPath.length); i < len; i++) {
        if (fromPath.charCodeAt(i) !== toPath.charCodeAt(i)) {
          if (fromPath.charAt(i).toLowerCase() !== toPath.charAt(i).toLowerCase()) {
            break;
          }
        }
      }
      fromPath = toPath.substr(0, i) + fromPath.substr(i);
    }
    return posix.relative(fromPath, toPath);
  }
  resolvePath(base, path2) {
    if (base.scheme === Schemas.file) {
      const newURI = URI.file(resolve(originalFSPath(base), path2));
      return base.with({
        authority: newURI.authority,
        path: newURI.path
      });
    }
    path2 = toPosixPath(path2);
    return base.with({
      path: posix.resolve(base.path, path2)
    });
  }
  // --- misc
  isAbsolutePath(resource) {
    return !!resource.path && resource.path[0] === "/";
  }
  isEqualAuthority(a1, a2) {
    return a1 === a2 || a1 !== void 0 && a2 !== void 0 && equalsIgnoreCase(a1, a2);
  }
  hasTrailingPathSeparator(resource, sep2 = sep) {
    if (resource.scheme === Schemas.file) {
      const fsp = originalFSPath(resource);
      return fsp.length > getRoot(fsp).length && fsp[fsp.length - 1] === sep2;
    } else {
      const p = resource.path;
      return p.length > 1 && p.charCodeAt(p.length - 1) === 47 /* Slash */ && !/^[a-zA-Z]:(\/$|\\$)/.test(resource.fsPath);
    }
  }
  removeTrailingPathSeparator(resource, sep2 = sep) {
    if (hasTrailingPathSeparator(resource, sep2)) {
      return resource.with({ path: resource.path.substr(0, resource.path.length - 1) });
    }
    return resource;
  }
  addTrailingPathSeparator(resource, sep2 = sep) {
    let isRootSep = false;
    if (resource.scheme === Schemas.file) {
      const fsp = originalFSPath(resource);
      isRootSep = fsp !== void 0 && fsp.length === getRoot(fsp).length && fsp[fsp.length - 1] === sep2;
    } else {
      sep2 = "/";
      const p = resource.path;
      isRootSep = p.length === 1 && p.charCodeAt(p.length - 1) === 47 /* Slash */;
    }
    if (!isRootSep && !hasTrailingPathSeparator(resource, sep2)) {
      return resource.with({ path: resource.path + "/" });
    }
    return resource;
  }
};
var extUri = new ExtUri(() => false);
var extUriBiasedIgnorePathCase = new ExtUri((uri) => {
  return uri.scheme === Schemas.file ? !isLinux : true;
});
var extUriIgnorePathCase = new ExtUri((_) => true);
var isEqual = extUri.isEqual.bind(extUri);
var isEqualOrParent2 = extUri.isEqualOrParent.bind(extUri);
var getComparisonKey = extUri.getComparisonKey.bind(extUri);
var basenameOrAuthority = extUri.basenameOrAuthority.bind(extUri);
var basename2 = extUri.basename.bind(extUri);
var extname2 = extUri.extname.bind(extUri);
var dirname2 = extUri.dirname.bind(extUri);
var joinPath = extUri.joinPath.bind(extUri);
var normalizePath = extUri.normalizePath.bind(extUri);
var relativePath = extUri.relativePath.bind(extUri);
var resolvePath = extUri.resolvePath.bind(extUri);
var isAbsolutePath = extUri.isAbsolutePath.bind(extUri);
var isEqualAuthority = extUri.isEqualAuthority.bind(extUri);
var hasTrailingPathSeparator = extUri.hasTrailingPathSeparator.bind(extUri);
var removeTrailingPathSeparator = extUri.removeTrailingPathSeparator.bind(extUri);
var addTrailingPathSeparator = extUri.addTrailingPathSeparator.bind(extUri);
var DataUri;
((DataUri2) => {
  DataUri2.META_DATA_LABEL = "label";
  DataUri2.META_DATA_DESCRIPTION = "description";
  DataUri2.META_DATA_SIZE = "size";
  DataUri2.META_DATA_MIME = "mime";
  function parseMetaData(dataUri) {
    const metadata = /* @__PURE__ */ new Map();
    const meta = dataUri.path.substring(dataUri.path.indexOf(";") + 1, dataUri.path.lastIndexOf(";"));
    meta.split(";").forEach((property) => {
      const [key, value] = property.split(":");
      if (key && value) {
        metadata.set(key, value);
      }
    });
    const mime = dataUri.path.substring(0, dataUri.path.indexOf(";"));
    if (mime) {
      metadata.set(DataUri2.META_DATA_MIME, mime);
    }
    return metadata;
  }
  DataUri2.parseMetaData = parseMetaData;
})(DataUri || (DataUri = {}));

// src/util/vs/base/common/symbols.ts
var MicrotaskDelay = Symbol("MicrotaskDelay");

// src/util/vs/base/common/async.ts
var Limiter = class {
  constructor(maxDegreeOfParalellism) {
    this._size = 0;
    this._isDisposed = false;
    this.maxDegreeOfParalellism = maxDegreeOfParalellism;
    this.outstandingPromises = [];
    this.runningPromises = 0;
    this._onDrained = new Emitter();
  }
  /**
   *
   * @returns A promise that resolved when all work is done (onDrained) or when
   * there is nothing to do
   */
  whenIdle() {
    return this.size > 0 ? Event.toPromise(this.onDrained) : Promise.resolve();
  }
  get onDrained() {
    return this._onDrained.event;
  }
  get size() {
    return this._size;
  }
  queue(factory) {
    if (this._isDisposed) {
      throw new Error("Object has been disposed");
    }
    this._size++;
    return new Promise((c, e) => {
      this.outstandingPromises.push({ factory, c, e });
      this.consume();
    });
  }
  consume() {
    while (this.outstandingPromises.length && this.runningPromises < this.maxDegreeOfParalellism) {
      const iLimitedTask = this.outstandingPromises.shift();
      this.runningPromises++;
      const promise = iLimitedTask.factory();
      promise.then(iLimitedTask.c, iLimitedTask.e);
      promise.then(() => this.consumed(), () => this.consumed());
    }
  }
  consumed() {
    if (this._isDisposed) {
      return;
    }
    this.runningPromises--;
    if (--this._size === 0) {
      this._onDrained.fire();
    }
    if (this.outstandingPromises.length > 0) {
      this.consume();
    }
  }
  clear() {
    if (this._isDisposed) {
      throw new Error("Object has been disposed");
    }
    this.outstandingPromises.length = 0;
    this._size = this.runningPromises;
  }
  dispose() {
    this._isDisposed = true;
    this.outstandingPromises.length = 0;
    this._size = 0;
    this._onDrained.dispose();
  }
};
var runWhenGlobalIdle;
var _runWhenIdle;
(function() {
  const safeGlobal = globalThis;
  if (typeof safeGlobal.requestIdleCallback !== "function" || typeof safeGlobal.cancelIdleCallback !== "function") {
    _runWhenIdle = (_targetWindow, runner, timeout) => {
      setTimeout0(() => {
        if (disposed) {
          return;
        }
        const end = Date.now() + 15;
        const deadline = {
          didTimeout: true,
          timeRemaining() {
            return Math.max(0, end - Date.now());
          }
        };
        runner(Object.freeze(deadline));
      });
      let disposed = false;
      return {
        dispose() {
          if (disposed) {
            return;
          }
          disposed = true;
        }
      };
    };
  } else {
    _runWhenIdle = (targetWindow, runner, timeout) => {
      const handle = targetWindow.requestIdleCallback(runner, typeof timeout === "number" ? { timeout } : void 0);
      let disposed = false;
      return {
        dispose() {
          if (disposed) {
            return;
          }
          disposed = true;
          targetWindow.cancelIdleCallback(handle);
        }
      };
    };
  }
  runWhenGlobalIdle = (runner, timeout) => _runWhenIdle(globalThis, runner, timeout);
})();
var DeferredPromise = class _DeferredPromise {
  static fromPromise(promise) {
    const deferred = new _DeferredPromise();
    deferred.settleWith(promise);
    return deferred;
  }
  get isRejected() {
    return this.outcome?.outcome === 1 /* Rejected */;
  }
  get isResolved() {
    return this.outcome?.outcome === 0 /* Resolved */;
  }
  get isSettled() {
    return !!this.outcome;
  }
  get value() {
    return this.outcome?.outcome === 0 /* Resolved */ ? this.outcome?.value : void 0;
  }
  constructor() {
    this.p = new Promise((c, e) => {
      this.completeCallback = c;
      this.errorCallback = e;
    });
  }
  complete(value) {
    if (this.isSettled) {
      return Promise.resolve();
    }
    return new Promise((resolve2) => {
      this.completeCallback(value);
      this.outcome = { outcome: 0 /* Resolved */, value };
      resolve2();
    });
  }
  error(err) {
    if (this.isSettled) {
      return Promise.resolve();
    }
    return new Promise((resolve2) => {
      this.errorCallback(err);
      this.outcome = { outcome: 1 /* Rejected */, value: err };
      resolve2();
    });
  }
  settleWith(promise) {
    return promise.then(
      (value) => this.complete(value),
      (error) => this.error(error)
    );
  }
  cancel() {
    return this.error(new CancellationError());
  }
};
var Promises;
((Promises2) => {
  async function settled(promises) {
    let firstError = void 0;
    const result = await Promise.all(promises.map((promise) => promise.then((value) => value, (error) => {
      if (!firstError) {
        firstError = error;
      }
      return void 0;
    })));
    if (typeof firstError !== "undefined") {
      throw firstError;
    }
    return result;
  }
  Promises2.settled = settled;
  function withAsyncBody(bodyFn) {
    return new Promise(async (resolve2, reject) => {
      try {
        await bodyFn(resolve2, reject);
      } catch (error) {
        reject(error);
      }
    });
  }
  Promises2.withAsyncBody = withAsyncBody;
})(Promises || (Promises = {}));
var AsyncIterableObject = class _AsyncIterableObject {
  static fromArray(items) {
    return new _AsyncIterableObject((writer) => {
      writer.emitMany(items);
    });
  }
  static fromPromise(promise) {
    return new _AsyncIterableObject(async (emitter) => {
      emitter.emitMany(await promise);
    });
  }
  static fromPromisesResolveOrder(promises) {
    return new _AsyncIterableObject(async (emitter) => {
      await Promise.all(promises.map(async (p) => emitter.emitOne(await p)));
    });
  }
  static merge(iterables) {
    return new _AsyncIterableObject(async (emitter) => {
      await Promise.all(iterables.map(async (iterable) => {
        for await (const item of iterable) {
          emitter.emitOne(item);
        }
      }));
    });
  }
  static {
    this.EMPTY = _AsyncIterableObject.fromArray([]);
  }
  constructor(executor, onReturn) {
    this._state = 0 /* Initial */;
    this._results = [];
    this._error = null;
    this._onReturn = onReturn;
    this._onStateChanged = new Emitter();
    queueMicrotask(async () => {
      const writer = {
        emitOne: (item) => this.emitOne(item),
        emitMany: (items) => this.emitMany(items),
        reject: (error) => this.reject(error)
      };
      try {
        await Promise.resolve(executor(writer));
        this.resolve();
      } catch (err) {
        this.reject(err);
      } finally {
        writer.emitOne = void 0;
        writer.emitMany = void 0;
        writer.reject = void 0;
      }
    });
  }
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      next: async () => {
        do {
          if (this._state === 2 /* DoneError */) {
            throw this._error;
          }
          if (i < this._results.length) {
            return { done: false, value: this._results[i++] };
          }
          if (this._state === 1 /* DoneOK */) {
            return { done: true, value: void 0 };
          }
          await Event.toPromise(this._onStateChanged.event);
        } while (true);
      },
      return: async () => {
        this._onReturn?.();
        return { done: true, value: void 0 };
      }
    };
  }
  static map(iterable, mapFn) {
    return new _AsyncIterableObject(async (emitter) => {
      for await (const item of iterable) {
        emitter.emitOne(mapFn(item));
      }
    });
  }
  map(mapFn) {
    return _AsyncIterableObject.map(this, mapFn);
  }
  static filter(iterable, filterFn) {
    return new _AsyncIterableObject(async (emitter) => {
      for await (const item of iterable) {
        if (filterFn(item)) {
          emitter.emitOne(item);
        }
      }
    });
  }
  filter(filterFn) {
    return _AsyncIterableObject.filter(this, filterFn);
  }
  static coalesce(iterable) {
    return _AsyncIterableObject.filter(iterable, (item) => !!item);
  }
  coalesce() {
    return _AsyncIterableObject.coalesce(this);
  }
  static async toPromise(iterable) {
    const result = [];
    for await (const item of iterable) {
      result.push(item);
    }
    return result;
  }
  toPromise() {
    return _AsyncIterableObject.toPromise(this);
  }
  /**
   * The value will be appended at the end.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  emitOne(value) {
    if (this._state !== 0 /* Initial */) {
      return;
    }
    this._results.push(value);
    this._onStateChanged.fire();
  }
  /**
   * The values will be appended at the end.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  emitMany(values) {
    if (this._state !== 0 /* Initial */) {
      return;
    }
    this._results = this._results.concat(values);
    this._onStateChanged.fire();
  }
  /**
   * Calling `resolve()` will mark the result array as complete.
   *
   * **NOTE** `resolve()` must be called, otherwise all consumers of this iterable will hang indefinitely, similar to a non-resolved promise.
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  resolve() {
    if (this._state !== 0 /* Initial */) {
      return;
    }
    this._state = 1 /* DoneOK */;
    this._onStateChanged.fire();
  }
  /**
   * Writing an error will permanently invalidate this iterable.
   * The current users will receive an error thrown, as will all future users.
   *
   * **NOTE** If `resolve()` or `reject()` have already been called, this method has no effect.
   */
  reject(error) {
    if (this._state !== 0 /* Initial */) {
      return;
    }
    this._state = 2 /* DoneError */;
    this._error = error;
    this._onStateChanged.fire();
  }
};
var ProducerConsumer = class {
  constructor() {
    this._unsatisfiedConsumers = [];
    this._unconsumedValues = [];
  }
  get hasFinalValue() {
    return !!this._finalValue;
  }
  produce(value) {
    this._ensureNoFinalValue();
    if (this._unsatisfiedConsumers.length > 0) {
      const deferred = this._unsatisfiedConsumers.shift();
      this._resolveOrRejectDeferred(deferred, value);
    } else {
      this._unconsumedValues.push(value);
    }
  }
  produceFinal(value) {
    this._ensureNoFinalValue();
    this._finalValue = value;
    for (const deferred of this._unsatisfiedConsumers) {
      this._resolveOrRejectDeferred(deferred, value);
    }
    this._unsatisfiedConsumers.length = 0;
  }
  _ensureNoFinalValue() {
    if (this._finalValue) {
      throw new BugIndicatingError("ProducerConsumer: cannot produce after final value has been set");
    }
  }
  _resolveOrRejectDeferred(deferred, value) {
    if (value.ok) {
      deferred.complete(value.value);
    } else {
      deferred.error(value.error);
    }
  }
  consume() {
    if (this._unconsumedValues.length > 0 || this._finalValue) {
      const value = this._unconsumedValues.length > 0 ? this._unconsumedValues.shift() : this._finalValue;
      if (value.ok) {
        return Promise.resolve(value.value);
      } else {
        return Promise.reject(value.error);
      }
    } else {
      const deferred = new DeferredPromise();
      this._unsatisfiedConsumers.push(deferred);
      return deferred.p;
    }
  }
};
var AsyncIterableProducer = class _AsyncIterableProducer {
  constructor(executor, _onReturn) {
    this._onReturn = _onReturn;
    this._producerConsumer = new ProducerConsumer();
    this._iterator = {
      next: () => this._producerConsumer.consume(),
      return: () => {
        this._onReturn?.();
        return Promise.resolve({ done: true, value: void 0 });
      },
      throw: async (e) => {
        this._finishError(e);
        return { done: true, value: void 0 };
      }
    };
    queueMicrotask(async () => {
      const p = executor({
        emitOne: (value) => this._producerConsumer.produce({ ok: true, value: { done: false, value } }),
        emitMany: (values) => {
          for (const value of values) {
            this._producerConsumer.produce({ ok: true, value: { done: false, value } });
          }
        },
        reject: (error) => this._finishError(error)
      });
      if (!this._producerConsumer.hasFinalValue) {
        try {
          await p;
          this._finishOk();
        } catch (error) {
          this._finishError(error);
        }
      }
    });
  }
  static fromArray(items) {
    return new _AsyncIterableProducer((writer) => {
      writer.emitMany(items);
    });
  }
  static fromPromise(promise) {
    return new _AsyncIterableProducer(async (emitter) => {
      emitter.emitMany(await promise);
    });
  }
  static fromPromisesResolveOrder(promises) {
    return new _AsyncIterableProducer(async (emitter) => {
      await Promise.all(promises.map(async (p) => emitter.emitOne(await p)));
    });
  }
  static merge(iterables) {
    return new _AsyncIterableProducer(async (emitter) => {
      await Promise.all(iterables.map(async (iterable) => {
        for await (const item of iterable) {
          emitter.emitOne(item);
        }
      }));
    });
  }
  static {
    this.EMPTY = _AsyncIterableProducer.fromArray([]);
  }
  static map(iterable, mapFn) {
    return new _AsyncIterableProducer(async (emitter) => {
      for await (const item of iterable) {
        emitter.emitOne(mapFn(item));
      }
    });
  }
  map(mapFn) {
    return _AsyncIterableProducer.map(this, mapFn);
  }
  static coalesce(iterable) {
    return _AsyncIterableProducer.filter(iterable, (item) => !!item);
  }
  coalesce() {
    return _AsyncIterableProducer.coalesce(this);
  }
  static filter(iterable, filterFn) {
    return new _AsyncIterableProducer(async (emitter) => {
      for await (const item of iterable) {
        if (filterFn(item)) {
          emitter.emitOne(item);
        }
      }
    });
  }
  filter(filterFn) {
    return _AsyncIterableProducer.filter(this, filterFn);
  }
  _finishOk() {
    if (!this._producerConsumer.hasFinalValue) {
      this._producerConsumer.produceFinal({ ok: true, value: { done: true, value: void 0 } });
    }
  }
  _finishError(error) {
    if (!this._producerConsumer.hasFinalValue) {
      this._producerConsumer.produceFinal({ ok: false, error });
    }
  }
  [Symbol.asyncIterator]() {
    return this._iterator;
  }
};
var AsyncReaderEndOfStream = Symbol("AsyncReaderEndOfStream");

// src/util/vs/platform/instantiation/common/instantiationService.ts
var Trace = class _Trace {
  constructor(type, name) {
    this.type = type;
    this.name = name;
    this._start = Date.now();
    this._dep = [];
  }
  static {
    this.all = /* @__PURE__ */ new Set();
  }
  static {
    this._None = new class extends _Trace {
      constructor() {
        super(0 /* None */, null);
      }
      stop() {
      }
      branch() {
        return this;
      }
    }();
  }
  static traceInvocation(_enableTracing, ctor) {
    return !_enableTracing ? _Trace._None : new _Trace(2 /* Invocation */, ctor.name || new Error().stack.split("\n").slice(3, 4).join("\n"));
  }
  static traceCreation(_enableTracing, ctor) {
    return !_enableTracing ? _Trace._None : new _Trace(1 /* Creation */, ctor.name);
  }
  static {
    this._totals = 0;
  }
  branch(id2, first) {
    const child = new _Trace(3 /* Branch */, id2.toString());
    this._dep.push([id2, first, child]);
    return child;
  }
  stop() {
    const dur = Date.now() - this._start;
    _Trace._totals += dur;
    let causedCreation = false;
    function printChild(n, trace) {
      const res = [];
      const prefix = new Array(n + 1).join("	");
      for (const [id2, first, child] of trace._dep) {
        if (first && child) {
          causedCreation = true;
          res.push(`${prefix}CREATES -> ${id2}`);
          const nested = printChild(n + 1, child);
          if (nested) {
            res.push(nested);
          }
        } else {
          res.push(`${prefix}uses -> ${id2}`);
        }
      }
      return res.join("\n");
    }
    const lines = [
      `${this.type === 1 /* Creation */ ? "CREATE" : "CALL"} ${this.name}`,
      `${printChild(1, this)}`,
      `DONE, took ${dur.toFixed(2)}ms (grand total ${_Trace._totals.toFixed(2)}ms)`
    ];
    if (dur > 2 || causedCreation) {
      _Trace.all.add(lines.join("\n"));
    }
  }
};

// src/platform/authentication/common/copilotTokenStore.ts
var ICopilotTokenStore = createDecorator("ICopilotTokenStore");

// src/platform/telemetry/common/telemetry.ts
var ITelemetryUserConfig = createDecorator("ITelemetryUserConfig");
var TelemetryUserConfigImpl = class {
  constructor(trackingId, optedIn, _tokenStore) {
    this._tokenStore = _tokenStore;
    this.trackingId = trackingId;
    this.optedIn = optedIn ?? false;
    this.setupUpdateOnToken();
  }
  setupUpdateOnToken() {
    this._tokenStore.onDidStoreUpdate(() => {
      const token = this._tokenStore.copilotToken;
      if (!token) {
        return;
      }
      const enhancedTelemetry = token.getTokenValue("rt") === "1";
      const trackingId = token.getTokenValue("tid");
      if (trackingId !== void 0) {
        this.trackingId = trackingId;
        this.organizationsList = token.organizationList.toString();
        this.optedIn = enhancedTelemetry;
      }
    });
  }
};
TelemetryUserConfigImpl = __decorateClass([
  __decorateParam(2, ICopilotTokenStore)
], TelemetryUserConfigImpl);
var ITelemetryService = createDecorator("ITelemetryService");

// src/platform/tokenizer/node/tikTokenizerImpl.ts
var import_tiktokenizer = __toESM(require_dist());

// src/util/vs/base/common/numbers.ts
var MovingAverage = class {
  constructor() {
    this._n = 1;
    this._val = 0;
  }
  update(value) {
    this._val = this._val + (value - this._val) / this._n;
    this._n += 1;
    return this._val;
  }
  get value() {
    return this._val;
  }
};

// src/platform/tokenizer/node/parseTikTokens.ts
var import_fs = require("fs");

// src/util/vs/base/common/buffer.ts
var hasBuffer = typeof Buffer !== "undefined";
var indexOfTable = new Lazy(() => new Uint8Array(256));
var textEncoder;
var textDecoder;
var VSBuffer = class _VSBuffer {
  /**
   * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
   * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
   */
  static alloc(byteLength) {
    if (hasBuffer) {
      return new _VSBuffer(Buffer.allocUnsafe(byteLength));
    } else {
      return new _VSBuffer(new Uint8Array(byteLength));
    }
  }
  /**
   * When running in a nodejs context, if `actual` is not a nodejs Buffer, the backing store for
   * the returned `VSBuffer` instance might use a nodejs Buffer allocated from node's Buffer pool,
   * which is not transferrable.
   */
  static wrap(actual) {
    if (hasBuffer && !Buffer.isBuffer(actual)) {
      actual = Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength);
    }
    return new _VSBuffer(actual);
  }
  /**
   * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
   * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
   */
  static fromString(source, options) {
    const dontUseNodeBuffer = options?.dontUseNodeBuffer || false;
    if (!dontUseNodeBuffer && hasBuffer) {
      return new _VSBuffer(Buffer.from(source));
    } else {
      if (!textEncoder) {
        textEncoder = new TextEncoder();
      }
      return new _VSBuffer(textEncoder.encode(source));
    }
  }
  /**
   * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
   * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
   */
  static fromByteArray(source) {
    const result = _VSBuffer.alloc(source.length);
    for (let i = 0, len = source.length; i < len; i++) {
      result.buffer[i] = source[i];
    }
    return result;
  }
  /**
   * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
   * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
   */
  static concat(buffers, totalLength) {
    if (typeof totalLength === "undefined") {
      totalLength = 0;
      for (let i = 0, len = buffers.length; i < len; i++) {
        totalLength += buffers[i].byteLength;
      }
    }
    const ret = _VSBuffer.alloc(totalLength);
    let offset = 0;
    for (let i = 0, len = buffers.length; i < len; i++) {
      const element = buffers[i];
      ret.set(element, offset);
      offset += element.byteLength;
    }
    return ret;
  }
  static isNativeBuffer(buffer) {
    return hasBuffer && Buffer.isBuffer(buffer);
  }
  constructor(buffer) {
    this.buffer = buffer;
    this.byteLength = this.buffer.byteLength;
  }
  /**
   * When running in a nodejs context, the backing store for the returned `VSBuffer` instance
   * might use a nodejs Buffer allocated from node's Buffer pool, which is not transferrable.
   */
  clone() {
    const result = _VSBuffer.alloc(this.byteLength);
    result.set(this);
    return result;
  }
  toString() {
    if (hasBuffer) {
      return this.buffer.toString();
    } else {
      if (!textDecoder) {
        textDecoder = new TextDecoder();
      }
      return textDecoder.decode(this.buffer);
    }
  }
  slice(start, end) {
    return new _VSBuffer(this.buffer.subarray(start, end));
  }
  set(array, offset) {
    if (array instanceof _VSBuffer) {
      this.buffer.set(array.buffer, offset);
    } else if (array instanceof Uint8Array) {
      this.buffer.set(array, offset);
    } else if (array instanceof ArrayBuffer) {
      this.buffer.set(new Uint8Array(array), offset);
    } else if (ArrayBuffer.isView(array)) {
      this.buffer.set(new Uint8Array(array.buffer, array.byteOffset, array.byteLength), offset);
    } else {
      throw new Error(`Unknown argument 'array'`);
    }
  }
  readUInt32BE(offset) {
    return readUInt32BE(this.buffer, offset);
  }
  writeUInt32BE(value, offset) {
    writeUInt32BE(this.buffer, value, offset);
  }
  readUInt32LE(offset) {
    return readUInt32LE(this.buffer, offset);
  }
  writeUInt32LE(value, offset) {
    writeUInt32LE(this.buffer, value, offset);
  }
  readUInt8(offset) {
    return readUInt8(this.buffer, offset);
  }
  writeUInt8(value, offset) {
    writeUInt8(this.buffer, value, offset);
  }
  indexOf(subarray, offset = 0) {
    return binaryIndexOf(this.buffer, subarray instanceof _VSBuffer ? subarray.buffer : subarray, offset);
  }
  equals(other) {
    if (this === other) {
      return true;
    }
    if (this.byteLength !== other.byteLength) {
      return false;
    }
    return this.buffer.every((value, index) => value === other.buffer[index]);
  }
};
function binaryIndexOf(haystack, needle, offset = 0) {
  const needleLen = needle.byteLength;
  const haystackLen = haystack.byteLength;
  if (needleLen === 0) {
    return 0;
  }
  if (needleLen === 1) {
    return haystack.indexOf(needle[0]);
  }
  if (needleLen > haystackLen - offset) {
    return -1;
  }
  const table = indexOfTable.value;
  table.fill(needle.length);
  for (let i2 = 0; i2 < needle.length; i2++) {
    table[needle[i2]] = needle.length - i2 - 1;
  }
  let i = offset + needle.length - 1;
  let j = i;
  let result = -1;
  while (i < haystackLen) {
    if (haystack[i] === needle[j]) {
      if (j === 0) {
        result = i;
        break;
      }
      i--;
      j--;
    } else {
      i += Math.max(needle.length - j, table[haystack[i]]);
      j = needle.length - 1;
    }
  }
  return result;
}
function readUInt32BE(source, offset) {
  return source[offset] * 2 ** 24 + source[offset + 1] * 2 ** 16 + source[offset + 2] * 2 ** 8 + source[offset + 3];
}
function writeUInt32BE(destination, value, offset) {
  destination[offset + 3] = value;
  value = value >>> 8;
  destination[offset + 2] = value;
  value = value >>> 8;
  destination[offset + 1] = value;
  value = value >>> 8;
  destination[offset] = value;
}
function readUInt32LE(source, offset) {
  return source[offset + 0] << 0 >>> 0 | source[offset + 1] << 8 >>> 0 | source[offset + 2] << 16 >>> 0 | source[offset + 3] << 24 >>> 0;
}
function writeUInt32LE(destination, value, offset) {
  destination[offset + 0] = value & 255;
  value = value >>> 8;
  destination[offset + 1] = value & 255;
  value = value >>> 8;
  destination[offset + 2] = value & 255;
  value = value >>> 8;
  destination[offset + 3] = value & 255;
}
function readUInt8(source, offset) {
  return source[offset];
}
function writeUInt8(destination, value, offset) {
  destination[offset] = value;
}

// src/util/common/variableLengthQuantity.ts
function readVariableLengthQuantity(buffer, offset) {
  let result = 0;
  let consumed = 0;
  let byte;
  do {
    byte = buffer.readUInt8(offset + consumed);
    result |= (byte & 127) << consumed * 7;
    consumed++;
  } while (byte & 128);
  return { value: result, consumed };
}

// src/platform/tokenizer/node/parseTikTokens.ts
var parseTikTokenBinary = (file) => {
  const contents = (0, import_fs.readFileSync)(file);
  const result = /* @__PURE__ */ new Map();
  for (let i = 0; i < contents.length; ) {
    const termLength = readVariableLengthQuantity(VSBuffer.wrap(contents), i);
    i += termLength.consumed;
    result.set(contents.subarray(i, i + termLength.value), result.size);
    i += termLength.value;
  }
  return result;
};

// src/platform/tokenizer/node/tikTokenizerImpl.ts
var TikTokenImpl = class _TikTokenImpl {
  constructor() {
    this._values = [];
    this._stats = {
      encodeDuration: new MovingAverage(),
      textLength: new MovingAverage(),
      callCount: 0
    };
  }
  static get instance() {
    if (!this._instance) {
      this._instance = new _TikTokenImpl();
    }
    return this._instance;
  }
  init(tokenFilePath, encoderName, useBinaryTokens) {
    const handle = this._values.length;
    const parser = useBinaryTokens ? parseTikTokenBinary : (f) => f;
    this._values.push((0, import_tiktokenizer.createTokenizer)(
      parser(tokenFilePath),
      (0, import_tiktokenizer.getSpecialTokensByEncoder)(encoderName),
      (0, import_tiktokenizer.getRegexByEncoder)(encoderName),
      64e3
    ));
    return handle;
  }
  encode(handle, text, allowedSpecial) {
    const sw = StopWatch.create(true);
    const result = this._values[handle].encode(text, allowedSpecial);
    this._stats.callCount += 1;
    this._stats.encodeDuration.update(sw.elapsed());
    this._stats.textLength.update(text.length);
    return result;
  }
  destroy(handle) {
    this._values[handle] = void 0;
  }
  resetStats() {
    const oldValue = this._stats;
    const result = {
      callCount: oldValue.callCount,
      encodeDuration: oldValue.encodeDuration.value,
      textLength: oldValue.textLength.value
    };
    this._stats.encodeDuration = new MovingAverage();
    this._stats.textLength = new MovingAverage();
    this._stats.callCount = 0;
    return result;
  }
};

// src/platform/tokenizer/node/tokenizer.ts
var ITokenizerProvider = createDecorator("ITokenizerProvider");
var BaseTokensPerMessage = 3;
var BaseTokensPerName = 1;
var TokenizerProvider = class {
  constructor(useWorker, telmetryService) {
    this._cl100kTokenizer = new Lazy(() => new BPETokenizer(useWorker, join(__dirname, "./cl100k_base.tiktoken"), "cl100k_base", telmetryService));
    this._o200kTokenizer = new Lazy(() => new BPETokenizer(useWorker, join(__dirname, "./o200k_base.tiktoken"), "o200k_base", telmetryService));
  }
  dispose() {
    this._cl100kTokenizer.rawValue?.dispose();
    this._o200kTokenizer.rawValue?.dispose();
  }
  /**
   * Gets a tokenizer for a given model family
   * @param endpoint The endpoint you want to acquire a tokenizer for
   */
  acquireTokenizer(endpoint) {
    switch (endpoint.tokenizer) {
      case "cl100k_base" /* CL100K */:
        return this._cl100kTokenizer.value;
      case "o200k_base" /* O200K */:
        return this._o200kTokenizer.value;
      default:
        throw new Error(`Unknown tokenizer: ${endpoint.tokenizer}`);
    }
  }
};
TokenizerProvider = __decorateClass([
  __decorateParam(1, ITelemetryService)
], TokenizerProvider);
var BPETokenizer = class extends Disposable {
  constructor(_useWorker, _tokenFilePath, _encoderName, _telemetryService) {
    super();
    this._useWorker = _useWorker;
    this._tokenFilePath = _tokenFilePath;
    this._encoderName = _encoderName;
    this._telemetryService = _telemetryService;
    /**
     * TikToken has its own cache, but it still does some processing
     * until a cache hit. We can have a much more efficient cache that
     * directly looks up string -> token length
     */
    this._cache = new LRUCache(5e3);
    this.baseTokensPerMessage = BaseTokensPerMessage;
    this.baseTokensPerName = BaseTokensPerName;
    this.mode = import_prompt_tsx.OutputMode.Raw;
  }
  async countMessagesTokens(messages) {
    let numTokens = BaseTokensPerMessage;
    for (const message of messages) {
      numTokens += await this.countMessageTokens(message);
    }
    return numTokens;
  }
  /**
   * Tokenizes the given text.
   * @param text The text to tokenize.
   * @returns The tokenized text.
   */
  async tokenize(text) {
    return (await this.ensureTokenizer()).encode(text);
  }
  /**
   * Calculates the token length of the given text.
   * @param text The text to calculate the token length for.
   * @returns The number of tokens in the text.
   */
  async tokenLength(text) {
    if (typeof text === "string") {
      return this._textTokenLength(text);
    }
    switch (text.type) {
      case import_prompt_tsx.Raw.ChatCompletionContentPartKind.Text:
        return this._textTokenLength(text.text);
      case import_prompt_tsx.Raw.ChatCompletionContentPartKind.Opaque:
        return text.tokenUsage || 0;
      case import_prompt_tsx.Raw.ChatCompletionContentPartKind.Image:
        if (text.imageUrl.url.startsWith("data:image/")) {
          try {
            return calculateImageTokenCost(text.imageUrl.url, text.imageUrl.detail);
          } catch {
            return this._textTokenLength(text.imageUrl.url);
          }
        }
        return this._textTokenLength(text.imageUrl.url);
      case import_prompt_tsx.Raw.ChatCompletionContentPartKind.CacheBreakpoint:
        return 0;
      default:
        assertNever(text, `unknown content part (${JSON.stringify(text)})`);
    }
  }
  async _textTokenLength(text) {
    if (!text) {
      return 0;
    }
    let cacheValue = this._cache.get(text);
    if (!cacheValue) {
      cacheValue = (await this.tokenize(text)).length;
      this._cache.put(text, cacheValue);
    }
    return cacheValue;
  }
  /**
   * Counts tokens for a single chat message within a completion request.
   *
   * Follows https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb for GPT 3.5/4 models.
   *
   * **Note**: The result does not include base tokens for the completion itself.
   */
  async countMessageTokens(message) {
    return this.baseTokensPerMessage + await this.countMessageObjectTokens((0, import_prompt_tsx.toMode)(import_prompt_tsx.OutputMode.OpenAI, message));
  }
  async countToolTokens(tools) {
    const baseToolTokens = 16;
    let numTokens = 0;
    if (tools.length) {
      numTokens += baseToolTokens;
    }
    const baseTokensPerTool = 8;
    for (const tool of tools) {
      numTokens += baseTokensPerTool;
      numTokens += await this.countObjectTokens({ name: tool.name, description: tool.description, parameters: tool.inputSchema });
    }
    return Math.floor(numTokens * 1.1);
  }
  async countMessageObjectTokens(obj) {
    let numTokens = 0;
    for (const [key, value] of Object.entries(obj)) {
      if (!value) {
        continue;
      }
      if (typeof value === "string") {
        numTokens += await this.tokenLength(value);
      } else if (value) {
        const casted = value;
        if (casted.type === "text") {
          numTokens += await this.tokenLength(casted.text);
        } else if (casted.type === "image_url" && casted.image_url) {
          if (casted.image_url.url.startsWith("data:image/")) {
            try {
              numTokens += calculateImageTokenCost(casted.image_url.url, casted.image_url.detail);
            } catch {
              numTokens += await this.tokenLength(casted.image_url.url);
            }
          } else {
            numTokens += await this.tokenLength(casted.image_url.url);
          }
        } else {
          let newTokens = await this.countMessageObjectTokens(value);
          if (key === "tool_calls") {
            newTokens = Math.floor(newTokens * 1.5);
          }
          numTokens += newTokens;
        }
      }
      if (key === "name" && value !== void 0) {
        numTokens += this.baseTokensPerName;
      }
    }
    return numTokens;
  }
  async countObjectTokens(obj) {
    let numTokens = 0;
    for (const [key, value] of Object.entries(obj)) {
      if (!value) {
        continue;
      }
      numTokens += await this.tokenLength(key);
      if (typeof value === "string") {
        numTokens += await this.tokenLength(value);
      } else if (value) {
        numTokens += await this.countMessageObjectTokens(value);
      }
    }
    return numTokens;
  }
  ensureTokenizer() {
    this._tokenizer ??= this.doInitTokenizer();
    return this._tokenizer;
  }
  async doInitTokenizer() {
    const useBinaryTokens = basename(__dirname) === "dist";
    if (!this._useWorker) {
      const handle = TikTokenImpl.instance.init(this._tokenFilePath, this._encoderName, useBinaryTokens);
      const cleanup = toDisposable(() => {
        TikTokenImpl.instance.destroy(handle);
        this._store.deleteAndLeak(cleanup);
        this._tokenizer = void 0;
      });
      this._store.add(cleanup);
      return {
        encode: async (text, allowedSpecial) => {
          return TikTokenImpl.instance.encode(handle, text, allowedSpecial);
        }
      };
    } else {
      const workerPath = join(__dirname, "tikTokenizerWorker.js");
      const worker = new WorkerWithRpcProxy(workerPath, { name: `TikToken worker (${this._encoderName})` });
      const handle = await worker.proxy.init(this._tokenFilePath, this._encoderName, useBinaryTokens);
      const cleanup = toDisposable(() => {
        worker.terminate();
        this._store.deleteAndLeak(cleanup);
        this._tokenizer = void 0;
      });
      let timeout;
      return {
        encode: (text, allowedSpecial) => {
          const result = worker.proxy.encode(handle, text, allowedSpecial);
          clearTimeout(timeout);
          timeout = setTimeout(() => cleanup.dispose(), 15e3);
          if (Math.random() < 1 / 1e3) {
            worker.proxy.resetStats().then((stats) => {
              this._telemetryService.sendMSFTTelemetryEvent("tokenizer.stats", void 0, stats);
            });
          }
          return result;
        }
      };
    }
  }
};
BPETokenizer = __decorateClass([
  __decorateParam(3, ITelemetryService)
], BPETokenizer);
function calculateImageTokenCost(imageUrl, detail) {
  let { width, height } = getImageDimensions(imageUrl);
  if (detail === "low") {
    return 85;
  }
  if (width > 2048 || height > 2048) {
    const scaleFactor2 = 2048 / Math.max(width, height);
    width = Math.round(width * scaleFactor2);
    height = Math.round(height * scaleFactor2);
  }
  const scaleFactor = 768 / Math.min(width, height);
  width = Math.round(width * scaleFactor);
  height = Math.round(height * scaleFactor);
  const tiles = Math.ceil(width / 512) * Math.ceil(height / 512);
  return tiles * 170 + 85;
}

// src/platform/chunking/node/naiveChunker.ts
var MAX_CHUNK_SIZE_TOKENS = 250;
var NaiveChunker = class {
  constructor(endpoint, tokenizerProvider) {
    this.tokenizer = tokenizerProvider.acquireTokenizer(endpoint);
  }
  async chunkFile(uri, text, {
    maxTokenLength = MAX_CHUNK_SIZE_TOKENS,
    removeEmptyLines = true
  }, token) {
    const chunks = [];
    for await (const chunk of this._processLinesIntoChunks(
      uri,
      text,
      maxTokenLength,
      true,
      removeEmptyLines,
      token
    )) {
      if (token.isCancellationRequested) {
        return [];
      }
      if (!removeEmptyLines || !!chunk.text.length && /[\w\d]{2}/.test(chunk.text)) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }
  async *_processLinesIntoChunks(uri, text, maxTokenLength, shouldDedent, removeEmptyLines, token) {
    const originalLines = splitLines(text);
    const accumulatingChunk = [];
    let usedTokensInChunk = 0;
    let longestCommonWhitespaceInChunk;
    for (let i = 0; i < originalLines.length; ++i) {
      const line = originalLines[i];
      if (removeEmptyLines && isFalsyOrWhitespace(line)) {
        continue;
      }
      const lineText = line.slice(0, maxTokenLength * 4).trimEnd();
      const lineTokenCount = await this.tokenizer.tokenLength(lineText);
      if (token.isCancellationRequested) {
        return;
      }
      if (longestCommonWhitespaceInChunk === void 0 || longestCommonWhitespaceInChunk.length > 0) {
        const leadingWhitespaceMatches = line.match(/^\s+/);
        const currentLeadingWhitespace = leadingWhitespaceMatches ? leadingWhitespaceMatches[0] : "";
        longestCommonWhitespaceInChunk = longestCommonWhitespaceInChunk ? commonLeadingStr(longestCommonWhitespaceInChunk, currentLeadingWhitespace) : currentLeadingWhitespace;
      }
      if (usedTokensInChunk + lineTokenCount > maxTokenLength) {
        const chunk = this.finalizeChunk(uri, accumulatingChunk, shouldDedent, longestCommonWhitespaceInChunk ?? "", false);
        if (chunk) {
          yield chunk;
        }
        accumulatingChunk.length = 0;
        usedTokensInChunk = 0;
        longestCommonWhitespaceInChunk = void 0;
      }
      accumulatingChunk.push({
        text: lineText,
        lineNumber: i
      });
      usedTokensInChunk += lineTokenCount;
    }
    const finalChunk = this.finalizeChunk(uri, accumulatingChunk, shouldDedent, longestCommonWhitespaceInChunk ?? "", true);
    if (finalChunk) {
      yield finalChunk;
    }
  }
  finalizeChunk(file, chunkLines, shouldDedent, leadingWhitespace, isLastChunk) {
    if (!chunkLines.length) {
      return void 0;
    }
    const finalizedChunkText = shouldDedent ? chunkLines.map((x) => x.text.substring(leadingWhitespace.length)).join("\n") : chunkLines.map((x) => x.text).join("\n");
    const lastLine = chunkLines[chunkLines.length - 1];
    return {
      file,
      // For naive chunking, the raw text is the same as the processed text
      text: finalizedChunkText,
      rawText: finalizedChunkText,
      isFullFile: isLastChunk && chunkLines[0].lineNumber === 0,
      range: new Range(
        chunkLines[0].lineNumber,
        0,
        lastLine.lineNumber,
        lastLine.text.length
      )
    };
  }
};
NaiveChunker = __decorateClass([
  __decorateParam(1, ITokenizerProvider)
], NaiveChunker);
function commonLeadingStr(str1, str2) {
  const prefixLength = commonPrefixLength(str1, str2);
  return str1.substring(0, prefixLength);
}

// src/platform/telemetry/common/nullTelemetryService.ts
var NullTelemetryService = class {
  dispose() {
    return;
  }
  sendInternalMSFTTelemetryEvent(eventName, properties, measurements) {
    return;
  }
  sendMSFTTelemetryEvent(eventName, properties, measurements) {
    return;
  }
  sendMSFTTelemetryErrorEvent(eventName, properties, measurements) {
    return;
  }
  sendGHTelemetryEvent(eventName, properties, measurements) {
    return;
  }
  sendGHTelemetryErrorEvent(eventName, properties, measurements) {
    return;
  }
  sendGHTelemetryException(maybeError, origin) {
    return;
  }
  sendTelemetryEvent(eventName, destination, properties, measurements) {
    return;
  }
  sendTelemetryErrorEvent(eventName, destination, properties, measurements) {
    return;
  }
  setSharedProperty(name, value) {
    return;
  }
  setAdditionalExpAssignments(expAssignments) {
    return;
  }
  postEvent(eventName, props) {
    return;
  }
  sendEnhancedGHTelemetryEvent(eventName, properties, measurements) {
    return;
  }
  sendEnhancedGHTelemetryErrorEvent(eventName, properties, measurements) {
    return;
  }
};

// src/platform/tfidf/node/tfidf.ts
var import_fs2 = __toESM(require("fs"));
var import_node_sqlite = __toESM(require("node:sqlite"));
var import_path3 = __toESM(require("path"));

// src/util/common/glob.ts
var import_picomatch = __toESM(require_picomatch2());
function isMatch(uri, glob) {
  if (typeof glob === "string") {
    return import_picomatch.default.isMatch(uri.fsPath, glob, { dot: true, windows: isWindows });
  } else {
    if (uri.fsPath === glob.baseUri.fsPath && glob.pattern === "*") {
      return true;
    }
    const relativePath2 = relative(glob.baseUri.fsPath, uri.fsPath);
    if (!relativePath2.startsWith("..")) {
      return import_picomatch.default.isMatch(relativePath2, glob.pattern, { dot: true, windows: isWindows });
    }
    return import_picomatch.default.isMatch(uri.fsPath, glob.pattern, { dot: true, windows: isWindows });
  }
}
function shouldInclude(uri, options) {
  if (!options) {
    return true;
  }
  if (options.exclude?.some((x) => isMatch(uri, x))) {
    return false;
  }
  if (options.include) {
    return options.include.some((x) => isMatch(uri, x));
  }
  return true;
}

// src/platform/tfidf/node/tfidf.ts
function countRecordFrom(values) {
  const map = /* @__PURE__ */ Object.create(null);
  for (const value of values) {
    map[value] = (map[value] ?? 0) + 1;
  }
  return map;
}
function termFrequencies(input) {
  return countRecordFrom(splitTerms(input));
}
function* splitTerms(input) {
  const normalize2 = (word) => word.toLowerCase();
  for (const [word] of input.matchAll(/(?<![\p{Alphabetic}\p{Number}_$])[\p{Letter}_$][\p{Alphabetic}\p{Number}_$]{2,}(?![\p{Alphabetic}\p{Number}_$])/gu)) {
    const parts = /* @__PURE__ */ new Set();
    parts.add(normalize2(word));
    const subParts = [];
    const camelParts = word.split(/(?<=[a-z$])(?=[A-Z])/g);
    if (camelParts.length > 1) {
      subParts.push(...camelParts);
    }
    const snakeParts = word.split("_");
    if (snakeParts.length > 1) {
      subParts.push(...snakeParts);
    }
    const nonDigitPrefixMatch = word.match(/^([\D]+)\p{Number}+$/u);
    if (nonDigitPrefixMatch) {
      subParts.push(nonDigitPrefixMatch[1]);
    }
    for (const part of subParts) {
      if (part.length > 2 && /[\p{Alphabetic}_$]{3,}/gu.test(part)) {
        parts.add(normalize2(part));
      }
    }
    yield* parts;
  }
}
var SimpleHeap = class {
  constructor(maxSize, minScore = -Infinity) {
    this.maxSize = maxSize;
    this.minScore = minScore;
    this.store = [];
  }
  toArray(maxSpread) {
    if (this.store.length && typeof maxSpread === "number") {
      const minScore = this.store.at(0).score * (1 - maxSpread);
      return this.store.filter((x) => x.score >= minScore).map((x) => x.value);
    }
    return this.store.map((x) => x.value);
  }
  add(score, value) {
    if (score <= this.minScore) {
      return;
    }
    const index = this.store.findIndex((entry) => entry.score < score);
    this.store.splice(index >= 0 ? index : this.store.length, 0, { score, value });
    while (this.store.length > this.maxSize) {
      this.store.pop();
    }
    if (this.store.length === this.maxSize) {
      this.minScore = this.store.at(-1)?.score ?? this.minScore;
    }
  }
};
var PersistentTfIdf = class {
  constructor(dbPath) {
    const syncOptions = {
      open: true,
      enableForeignKeyConstraints: true
    };
    if (dbPath !== ":memory:" && dbPath.scheme === Schemas.file) {
      try {
        import_fs2.default.mkdirSync(import_path3.default.dirname(dbPath.fsPath), { recursive: true });
        this.db = new import_node_sqlite.default.DatabaseSync(dbPath.fsPath, syncOptions);
      } catch (e) {
        console.error("Failed to open SQLite database on disk. Trying memory db", e);
      }
    }
    if (!this.db) {
      this.db = new import_node_sqlite.default.DatabaseSync(":memory:", syncOptions);
    }
    this.db.exec(`
			PRAGMA journal_mode = OFF;
			PRAGMA synchronous = 0;
			PRAGMA cache_size = 1000000;
			PRAGMA locking_mode = EXCLUSIVE;
			PRAGMA temp_store = MEMORY;
		`);
    this.db.exec(`
			CREATE TABLE IF NOT EXISTS Documents (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				uri TEXT,
				contentVersionId TEXT NOT NULL
			);

			CREATE TABLE IF NOT EXISTS Chunks (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				documentId INTEGER NOT NULL,
				text TEXT NOT NULL,
				startLineNumber INTEGER NOT NULL,
				startColumn INTEGER NOT NULL,
				endLineNumber INTEGER NOT NULL,
				endColumn INTEGER NOT NULL,
				isFullFile INTEGER NOT NULL,
				termFrequencies BLOB NOT NULL, -- JSONB object storing term frequencies
				FOREIGN KEY (documentId) REFERENCES Documents(id) ON DELETE CASCADE
			);

			CREATE TABLE IF NOT EXISTS ChunkOccurrences (
				term TEXT PRIMARY KEY,
				chunkCount INTEGER NOT NULL
			);

			CREATE INDEX IF NOT EXISTS idx_documents_uri ON Documents(uri);
			CREATE INDEX IF NOT EXISTS idx_chunks_documentId ON Chunks(documentId);
		`);
  }
  /**
   * @returns a list of URIs that are out of sync and need to be re-indexed.
   */
  initialize(workspaceDocsIn) {
    const inDocsToContentIds = new ResourceMap();
    for (const { uri, contentId } of workspaceDocsIn) {
      inDocsToContentIds.set(uri, contentId);
    }
    const allDbDocs = this.db.prepare(
      "SELECT * FROM Documents"
    ).all();
    const dbDocsToContentIds = new ResourceMap();
    for (const docEntry of allDbDocs) {
      try {
        const uri = URI.parse(docEntry.uri);
        dbDocsToContentIds.set(uri, docEntry.contentVersionId);
      } catch (e) {
        console.error(`Failed to parse URI from database entry: ${docEntry.uri}`, e);
      }
    }
    const deletedDocs = new ResourceSet();
    const outOfSyncDocs = new ResourceSet();
    for (const [dbDocUri, dbDocContentId] of dbDocsToContentIds) {
      const inDocContentId = inDocsToContentIds.get(dbDocUri);
      if (!inDocContentId) {
        deletedDocs.add(dbDocUri);
      } else if (inDocContentId !== dbDocContentId) {
        outOfSyncDocs.add(dbDocUri);
      }
    }
    const newDocs = new ResourceSet();
    for (const uri of inDocsToContentIds.keys()) {
      if (!dbDocsToContentIds.has(uri)) {
        newDocs.add(uri);
      }
    }
    this.delete(Array.from(deletedDocs));
    return { outOfSyncDocs, newDocs, deletedDocs };
  }
  async isUpToDate(toCheck) {
    return this.getDocContentVersionId(toCheck.uri) === await toCheck.getContentVersionId();
  }
  getDocContentVersionId(uri) {
    const result = this.db.prepare(
      "SELECT contentVersionId FROM Documents WHERE uri = ?"
    ).get(uri.toString());
    return result?.contentVersionId;
  }
  async addOrUpdate(documents) {
    const chunkLimiter = new Limiter(20);
    try {
      const toUpdate = await Promise.all(documents.map(async (doc) => {
        try {
          if (await this.isUpToDate(doc)) {
            return;
          }
          return {
            uri: doc.uri,
            getDoc: async () => {
              const chunks = [];
              for (const chunk of await chunkLimiter.queue(() => doc.getChunks())) {
                const tf = termFrequencies(chunk.text);
                chunks.push({ chunk, tf });
              }
              return { contentVersionId: await doc.getContentVersionId(), chunks };
            }
          };
        } catch {
        }
      }));
      await this.addOrUpdateDocs(toUpdate.filter((doc) => !!doc));
    } finally {
      chunkLimiter.dispose();
    }
  }
  delete(uris) {
    this.db.exec("BEGIN TRANSACTION");
    for (const uri of uris) {
      const doc = this.getDoc(uri);
      if (!doc) {
        continue;
      }
      this.db.prepare(`
				DELETE FROM Documents WHERE uri = ?
			`).run(uri.toString());
      this._cachedChunkCount = void 0;
      const allOccurrences = countRecordFrom(doc.chunks.flatMap((chunk) => Object.keys(chunk.tf)));
      for (const [term, count] of Object.entries(allOccurrences)) {
        this.db.prepare(`
					UPDATE ChunkOccurrences
					SET chunkCount = chunkCount - ?
					WHERE term = ?;
				`).run(count, term);
      }
    }
    this.db.exec("COMMIT");
    this.db.prepare(`
			DELETE FROM ChunkOccurrences
			WHERE chunkCount < 1;
		`).run();
  }
  get fileCount() {
    return this.db.prepare(
      `SELECT COUNT(*) as count FROM Documents`
    ).get().count ?? 0;
  }
  /**
   * Rank the documents by their cosine similarity to a set of search queries.
   */
  async search(query, options) {
    const heap = new SimpleHeap(options?.maxResults ?? Infinity, -Infinity);
    const queryEmbeddings = this.computeEmbeddings(query);
    if (!queryEmbeddings.size) {
      return [];
    }
    const idfCache = /* @__PURE__ */ new Map();
    for (const entry of await this.getAllChunksWithTerms(Array.from(queryEmbeddings.keys()))) {
      if (!shouldInclude(entry.chunk.file, options?.globPatterns)) {
        continue;
      }
      const score = this.score(entry, queryEmbeddings, idfCache);
      if (score > 0) {
        heap.add(score, entry.chunk);
      }
    }
    return heap.toArray(options?.maxSpread);
  }
  computeEmbeddings(input) {
    const tf = termFrequencies(input);
    return this.computeTfidf(tf);
  }
  score(chunk, queryEmbedding, idfCache) {
    let sum = 0;
    for (const [term, termTfidf] of queryEmbedding.entries()) {
      const chunkTf = chunk.tf[term];
      if (!chunkTf) {
        continue;
      }
      let chunkIdf = idfCache.get(term);
      if (typeof chunkIdf !== "number") {
        chunkIdf = this.idf(term);
        idfCache.set(term, chunkIdf);
      }
      const chunkTfidf = chunkTf * chunkIdf;
      sum += chunkTfidf * termTfidf;
    }
    return sum;
  }
  idf(term) {
    const chunkOccurrences = this.getChunkOccurrences(term) ?? 0;
    return chunkOccurrences > 0 ? Math.log((this.getChunkCount() + 1) / chunkOccurrences) : 0;
  }
  computeTfidf(termFrequencies2) {
    const embedding = /* @__PURE__ */ new Map();
    for (const [word, occurrences] of Object.entries(termFrequencies2)) {
      const idf = this.idf(word);
      if (idf > 0) {
        embedding.set(word, occurrences * idf);
      }
    }
    return embedding;
  }
  getChunkCount() {
    if (typeof this._cachedChunkCount === "number") {
      return this._cachedChunkCount;
    }
    const result = this.db.prepare(
      "SELECT COUNT(*) as count FROM Chunks"
    ).get();
    return result?.count ?? 0;
  }
  getChunkOccurrences(term) {
    const result = this.db.prepare(
      "SELECT chunkCount FROM ChunkOccurrences WHERE term = ?"
    ).get(term);
    return result?.chunkCount ?? 0;
  }
  async addOrUpdateDocs(docs) {
    this._cachedChunkCount = void 0;
    const allChunkOccurrences = /* @__PURE__ */ Object.create(null);
    const processBatch = (docs2) => {
      this.delete(docs2.map((doc) => doc.uri));
      this.db.exec("BEGIN TRANSACTION");
      try {
        for (const { uri, doc } of docs2) {
          const docId = this.db.prepare(
            "INSERT OR REPLACE INTO Documents (uri, contentVersionId) VALUES (?, ?)"
          ).run(uri.toString(), doc.contentVersionId).lastInsertRowid;
          const insertChunkOp = this.db.prepare(
            "INSERT INTO Chunks (documentId, text, startLineNumber, startColumn, endLineNumber, endColumn, isFullFile, termFrequencies) VALUES (?, ?, ?, ?, ?, ?, ?, jsonb(?))"
          );
          for (const chunk of doc.chunks) {
            insertChunkOp.run(
              docId,
              chunk.chunk.text,
              chunk.chunk.range.startLineNumber,
              chunk.chunk.range.startColumn,
              chunk.chunk.range.endLineNumber,
              chunk.chunk.range.endColumn,
              chunk.chunk.isFullFile ? 1 : 0,
              JSON.stringify(chunk.tf)
            );
            for (const term of Object.keys(chunk.tf)) {
              allChunkOccurrences[term] = (allChunkOccurrences[term] ?? 0) + 1;
            }
          }
        }
        this.db.exec("COMMIT");
      } catch (e) {
        this.db.exec("ROLLBACK");
        throw e;
      }
    };
    const batchSize = 200;
    const batch = [];
    for (const doc of docs) {
      batch.push({ uri: doc.uri, doc: await doc.getDoc() });
      if (batch.length >= batchSize) {
        processBatch(batch);
        batch.length = 0;
      }
    }
    processBatch(batch);
    const insertOccurrencesOp = this.db.prepare(`
			INSERT INTO ChunkOccurrences (term, chunkCount)
			VALUES (?, ?)
			ON CONFLICT(term) DO UPDATE SET chunkCount = chunkCount + ?;
		`);
    this.db.exec("BEGIN TRANSACTION");
    for (const [term, count] of Object.entries(allChunkOccurrences)) {
      insertOccurrencesOp.run(term, count, count);
    }
    this.db.exec("COMMIT");
  }
  getDoc(uri) {
    const doc = this.db.prepare(
      "SELECT id, contentVersionId FROM Documents WHERE uri = ?"
    ).get(uri.toString());
    if (!doc) {
      return void 0;
    }
    const chunks = this.db.prepare(
      "SELECT text, startLineNumber, startColumn, endLineNumber, endColumn, isFullFile, json(termFrequencies) as termFrequencies FROM Chunks WHERE documentId = ?"
    ).all(doc.id);
    return {
      contentVersionId: doc.contentVersionId,
      chunks: chunks.map((row) => {
        return this.reviveDocumentChunkEntry({ ...row, uri: uri.toString() });
      })
    };
  }
  async getAllChunksWithTerms(searchTerms) {
    if (!searchTerms.length) {
      return [];
    }
    const chunkResults = this.db.prepare(`
			SELECT c.id, c.documentId, c.text, c.startLineNumber, c.startColumn, c.endLineNumber, c.endColumn, c.isFullFile,
				json(c.termFrequencies) as termFrequencies, d.uri
			FROM Chunks c
			JOIN Documents d ON c.documentId = d.id
			WHERE EXISTS (
				SELECT 1 FROM json_each(c.termFrequencies)
				WHERE json_each.key IN (${searchTerms.map((_) => `?`).join(",")})
			)
		`).all(...searchTerms);
    return Iterable.map(chunkResults, (row) => this.reviveDocumentChunkEntry(row));
  }
  reviveDocumentChunkEntry(row) {
    return {
      tf: JSON.parse(row.termFrequencies),
      get chunk() {
        return {
          file: URI.isUri(row.uri) ? row.uri : URI.parse(row.uri),
          text: row.text,
          rawText: row.text,
          range: new Range(
            row.startLineNumber,
            row.startColumn,
            row.endLineNumber,
            row.endColumn
          ),
          isFullFile: Boolean(row.isFullFile)
        };
      }
    };
  }
};

// src/platform/tfidf/node/tfidfMessaging.ts
function rewriteObject(value, transform2) {
  if (!value) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((x) => rewriteObject(x, transform2));
  }
  if (typeof value === "object") {
    const t = transform2(value);
    if (t) {
      return t;
    }
    const newValue = {};
    for (const key in value) {
      newValue[key] = rewriteObject(value[key], transform2);
    }
    return newValue;
  }
  return value;
}

// src/platform/tfidf/node/tfidfWorker.ts
function isIRange(obj) {
  return obj && typeof obj.startLineNumber === "number" && typeof obj.startColumn === "number" && typeof obj.endLineNumber === "number" && typeof obj.endColumn === "number";
}
function serialize(value) {
  return rewriteObject(value, (obj) => {
    if (URI.isUri(obj)) {
      return { $mid: "uri", ...obj };
    }
    if (isIRange(obj)) {
      return { $mid: "range", ...obj };
    }
  });
}
function revive(value) {
  return rewriteObject(value, (obj) => {
    if (obj["$mid"] === "uri") {
      return URI.from(obj);
    }
  });
}
var Host = class {
  constructor(port2, impl) {
    this._handler = new RcpResponseHandler();
    this.proxy = createRpcProxy((name, args) => {
      const { id: id2, result } = this._handler.createHandler();
      port2.postMessage({ id: id2, fn: name, args });
      return result;
    });
    port2.on("message", async (msg) => {
      if ("fn" in msg) {
        try {
          const res = await impl[msg.fn](...revive(msg.args));
          port2.postMessage({ id: msg.id, res: serialize(res) });
        } catch (err) {
          port2.postMessage({ id: msg.id, err });
        }
      } else {
        this._handler.handleResponse(msg);
      }
    });
  }
};
var TfidfWorker = class {
  constructor(port2, workerData2) {
    this._pendingChanges = new ResourceMap();
    this._tfIdf = new PersistentTfIdf(workerData2.dbPath === ":memory:" ? ":memory:" : URI.from(workerData2.dbPath));
    this._chunker = new NaiveChunker(workerData2.endpoint, new TokenizerProvider(false, new NullTelemetryService()));
    this._host = new Host(port2, this);
  }
  initialize(workspaceDocsIn) {
    const { outOfSyncDocs, newDocs, deletedDocs } = this._tfIdf.initialize(workspaceDocsIn.map((entry) => ({
      uri: URI.from(entry.uri),
      contentId: entry.contentId
    })));
    for (const uri of Iterable.concat(outOfSyncDocs, newDocs)) {
      this._pendingChanges.set(uri, "update");
    }
    return {
      newFileCount: newDocs.size,
      outOfSyncFileCount: outOfSyncDocs.size,
      deletedFileCount: deletedDocs.size
    };
  }
  addOrUpdate(documents) {
    for (const uri of documents) {
      const revivedUri = URI.from(uri);
      this._pendingChanges.set(revivedUri, "update");
    }
  }
  delete(uris) {
    for (const uri of uris) {
      const revivedUri = URI.from(uri);
      this._pendingChanges.set(revivedUri, "delete");
    }
  }
  async search(query, options) {
    const sw = new StopWatch();
    const updatedFileCount = this._pendingChanges.size;
    await this._flushPendingChanges();
    const updateTime = sw.elapsed();
    sw.reset();
    const results = await this._tfIdf.search(query, options);
    const searchTime = sw.elapsed();
    return {
      results,
      telemetry: {
        fileCount: this._tfIdf.fileCount,
        updatedFileCount,
        updateTime,
        searchTime
      }
    };
  }
  async _flushPendingChanges() {
    if (!this._pendingChanges.size) {
      return;
    }
    const toDelete = Array.from(
      Iterable.filter(this._pendingChanges.entries(), ([_uri, op]) => op === "delete"),
      ([uri]) => uri
    );
    this._tfIdf.delete(toDelete);
    const updatedDocs = Array.from(
      Iterable.filter(this._pendingChanges.entries(), ([_uri, op]) => op === "update"),
      ([uri]) => {
        const contentVersionId = new Lazy(() => this._host.proxy.getContentVersionId(uri));
        return {
          uri,
          getContentVersionId: () => contentVersionId.value,
          getChunks: async () => this.getRawNaiveChunks(uri, await this._host.proxy.readFile(uri), CancellationToken.None)
        };
      }
    );
    if (updatedDocs.length) {
      await this._tfIdf.addOrUpdate(updatedDocs);
    }
    this._pendingChanges.clear();
  }
  async getRawNaiveChunks(uri, text, token) {
    try {
      const naiveChunks = await this._chunker.chunkFile(uri, text, {}, token);
      return Iterable.map(naiveChunks, (e) => {
        return {
          file: uri,
          text: e.text,
          rawText: e.rawText,
          range: Range.lift(e.range),
          isFullFile: e.isFullFile
        };
      });
    } catch (e) {
      console.error(`Could not chunk: ${uri}`, e);
      return [];
    }
  }
};
var port = import_worker_threads2.parentPort;
if (!port) {
  throw new Error(`This module should only be used in a worker thread.`);
}
if (!import_worker_threads2.workerData) {
  throw new Error(`Expected 'workerData' to be provided to the worker thread.`);
}
new TfidfWorker(port, import_worker_threads2.workerData);
//!!! DO NOT modify, this file was COPIED from 'microsoft/vscode'
/*! Bundled license information:

@vscode/prompt-tsx/dist/base/util/vs/nls.js:
@vscode/prompt-tsx/dist/base/util/vs/common/platform.js:
@vscode/prompt-tsx/dist/base/util/vs/common/process.js:
@vscode/prompt-tsx/dist/base/util/vs/common/path.js:
@vscode/prompt-tsx/dist/base/util/vs/common/uri.js:
  (*!!! DO NOT modify, this file was COPIED from 'microsoft/vscode' *)
*/
//# sourceMappingURL=tfidfWorker.js.map
