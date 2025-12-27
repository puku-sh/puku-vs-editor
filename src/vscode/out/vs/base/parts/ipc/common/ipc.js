/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { getRandomElement } from '../../../common/arrays.js';
import { createCancelablePromise, timeout } from '../../../common/async.js';
import { VSBuffer } from '../../../common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../common/cancellation.js';
import { memoize } from '../../../common/decorators.js';
import { CancellationError, ErrorNoTelemetry } from '../../../common/errors.js';
import { Emitter, Event, EventMultiplexer, Relay } from '../../../common/event.js';
import { createSingleCallFunction } from '../../../common/functional.js';
import { DisposableStore, dispose, toDisposable } from '../../../common/lifecycle.js';
import { revive } from '../../../common/marshalling.js';
import * as strings from '../../../common/strings.js';
import { isFunction, isUndefinedOrNull } from '../../../common/types.js';
var RequestType;
(function (RequestType) {
    RequestType[RequestType["Promise"] = 100] = "Promise";
    RequestType[RequestType["PromiseCancel"] = 101] = "PromiseCancel";
    RequestType[RequestType["EventListen"] = 102] = "EventListen";
    RequestType[RequestType["EventDispose"] = 103] = "EventDispose";
})(RequestType || (RequestType = {}));
function requestTypeToStr(type) {
    switch (type) {
        case 100 /* RequestType.Promise */:
            return 'req';
        case 101 /* RequestType.PromiseCancel */:
            return 'cancel';
        case 102 /* RequestType.EventListen */:
            return 'subscribe';
        case 103 /* RequestType.EventDispose */:
            return 'unsubscribe';
    }
}
var ResponseType;
(function (ResponseType) {
    ResponseType[ResponseType["Initialize"] = 200] = "Initialize";
    ResponseType[ResponseType["PromiseSuccess"] = 201] = "PromiseSuccess";
    ResponseType[ResponseType["PromiseError"] = 202] = "PromiseError";
    ResponseType[ResponseType["PromiseErrorObj"] = 203] = "PromiseErrorObj";
    ResponseType[ResponseType["EventFire"] = 204] = "EventFire";
})(ResponseType || (ResponseType = {}));
function responseTypeToStr(type) {
    switch (type) {
        case 200 /* ResponseType.Initialize */:
            return `init`;
        case 201 /* ResponseType.PromiseSuccess */:
            return `reply:`;
        case 202 /* ResponseType.PromiseError */:
        case 203 /* ResponseType.PromiseErrorObj */:
            return `replyErr:`;
        case 204 /* ResponseType.EventFire */:
            return `event:`;
    }
}
var State;
(function (State) {
    State[State["Uninitialized"] = 0] = "Uninitialized";
    State[State["Idle"] = 1] = "Idle";
})(State || (State = {}));
/**
 * @see https://en.wikipedia.org/wiki/Variable-length_quantity
 */
function readIntVQL(reader) {
    let value = 0;
    for (let n = 0;; n += 7) {
        const next = reader.read(1);
        value |= (next.buffer[0] & 0b01111111) << n;
        if (!(next.buffer[0] & 0b10000000)) {
            return value;
        }
    }
}
const vqlZero = createOneByteBuffer(0);
/**
 * @see https://en.wikipedia.org/wiki/Variable-length_quantity
 */
function writeInt32VQL(writer, value) {
    if (value === 0) {
        writer.write(vqlZero);
        return;
    }
    let len = 0;
    for (let v2 = value; v2 !== 0; v2 = v2 >>> 7) {
        len++;
    }
    const scratch = VSBuffer.alloc(len);
    for (let i = 0; value !== 0; i++) {
        scratch.buffer[i] = value & 0b01111111;
        value = value >>> 7;
        if (value > 0) {
            scratch.buffer[i] |= 0b10000000;
        }
    }
    writer.write(scratch);
}
export class BufferReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.pos = 0;
    }
    read(bytes) {
        const result = this.buffer.slice(this.pos, this.pos + bytes);
        this.pos += result.byteLength;
        return result;
    }
}
export class BufferWriter {
    constructor() {
        this.buffers = [];
    }
    get buffer() {
        return VSBuffer.concat(this.buffers);
    }
    write(buffer) {
        this.buffers.push(buffer);
    }
}
var DataType;
(function (DataType) {
    DataType[DataType["Undefined"] = 0] = "Undefined";
    DataType[DataType["String"] = 1] = "String";
    DataType[DataType["Buffer"] = 2] = "Buffer";
    DataType[DataType["VSBuffer"] = 3] = "VSBuffer";
    DataType[DataType["Array"] = 4] = "Array";
    DataType[DataType["Object"] = 5] = "Object";
    DataType[DataType["Int"] = 6] = "Int";
})(DataType || (DataType = {}));
function createOneByteBuffer(value) {
    const result = VSBuffer.alloc(1);
    result.writeUInt8(value, 0);
    return result;
}
const BufferPresets = {
    Undefined: createOneByteBuffer(DataType.Undefined),
    String: createOneByteBuffer(DataType.String),
    Buffer: createOneByteBuffer(DataType.Buffer),
    VSBuffer: createOneByteBuffer(DataType.VSBuffer),
    Array: createOneByteBuffer(DataType.Array),
    Object: createOneByteBuffer(DataType.Object),
    Uint: createOneByteBuffer(DataType.Int),
};
export function serialize(writer, data) {
    if (typeof data === 'undefined') {
        writer.write(BufferPresets.Undefined);
    }
    else if (typeof data === 'string') {
        const buffer = VSBuffer.fromString(data);
        writer.write(BufferPresets.String);
        writeInt32VQL(writer, buffer.byteLength);
        writer.write(buffer);
    }
    else if (VSBuffer.isNativeBuffer(data)) {
        const buffer = VSBuffer.wrap(data);
        writer.write(BufferPresets.Buffer);
        writeInt32VQL(writer, buffer.byteLength);
        writer.write(buffer);
    }
    else if (data instanceof VSBuffer) {
        writer.write(BufferPresets.VSBuffer);
        writeInt32VQL(writer, data.byteLength);
        writer.write(data);
    }
    else if (Array.isArray(data)) {
        writer.write(BufferPresets.Array);
        writeInt32VQL(writer, data.length);
        for (const el of data) {
            serialize(writer, el);
        }
    }
    else if (typeof data === 'number' && (data | 0) === data) {
        // write a vql if it's a number that we can do bitwise operations on
        writer.write(BufferPresets.Uint);
        writeInt32VQL(writer, data);
    }
    else {
        const buffer = VSBuffer.fromString(JSON.stringify(data));
        writer.write(BufferPresets.Object);
        writeInt32VQL(writer, buffer.byteLength);
        writer.write(buffer);
    }
}
export function deserialize(reader) {
    const type = reader.read(1).readUInt8(0);
    switch (type) {
        case DataType.Undefined: return undefined;
        case DataType.String: return reader.read(readIntVQL(reader)).toString();
        case DataType.Buffer: return reader.read(readIntVQL(reader)).buffer;
        case DataType.VSBuffer: return reader.read(readIntVQL(reader));
        case DataType.Array: {
            const length = readIntVQL(reader);
            const result = [];
            for (let i = 0; i < length; i++) {
                result.push(deserialize(reader));
            }
            return result;
        }
        case DataType.Object: return JSON.parse(reader.read(readIntVQL(reader)).toString());
        case DataType.Int: return readIntVQL(reader);
    }
}
export class ChannelServer {
    constructor(protocol, ctx, logger = null, timeoutDelay = 1000) {
        this.protocol = protocol;
        this.ctx = ctx;
        this.logger = logger;
        this.timeoutDelay = timeoutDelay;
        this.channels = new Map();
        this.activeRequests = new Map();
        // Requests might come in for channels which are not yet registered.
        // They will timeout after `timeoutDelay`.
        this.pendingRequests = new Map();
        this.protocolListener = this.protocol.onMessage(msg => this.onRawMessage(msg));
        this.sendResponse({ type: 200 /* ResponseType.Initialize */ });
    }
    registerChannel(channelName, channel) {
        this.channels.set(channelName, channel);
        // https://github.com/microsoft/vscode/issues/72531
        setTimeout(() => this.flushPendingRequests(channelName), 0);
    }
    sendResponse(response) {
        switch (response.type) {
            case 200 /* ResponseType.Initialize */: {
                const msgLength = this.send([response.type]);
                this.logger?.logOutgoing(msgLength, 0, 1 /* RequestInitiator.OtherSide */, responseTypeToStr(response.type));
                return;
            }
            case 201 /* ResponseType.PromiseSuccess */:
            case 202 /* ResponseType.PromiseError */:
            case 204 /* ResponseType.EventFire */:
            case 203 /* ResponseType.PromiseErrorObj */: {
                const msgLength = this.send([response.type, response.id], response.data);
                this.logger?.logOutgoing(msgLength, response.id, 1 /* RequestInitiator.OtherSide */, responseTypeToStr(response.type), response.data);
                return;
            }
        }
    }
    send(header, body = undefined) {
        const writer = new BufferWriter();
        serialize(writer, header);
        serialize(writer, body);
        return this.sendBuffer(writer.buffer);
    }
    sendBuffer(message) {
        try {
            this.protocol.send(message);
            return message.byteLength;
        }
        catch (err) {
            // noop
            return 0;
        }
    }
    onRawMessage(message) {
        const reader = new BufferReader(message);
        const header = deserialize(reader);
        const body = deserialize(reader);
        const type = header[0];
        switch (type) {
            case 100 /* RequestType.Promise */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}: ${header[2]}.${header[3]}`, body);
                return this.onPromise({ type, id: header[1], channelName: header[2], name: header[3], arg: body });
            case 102 /* RequestType.EventListen */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}: ${header[2]}.${header[3]}`, body);
                return this.onEventListen({ type, id: header[1], channelName: header[2], name: header[3], arg: body });
            case 101 /* RequestType.PromiseCancel */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}`);
                return this.disposeActiveRequest({ type, id: header[1] });
            case 103 /* RequestType.EventDispose */:
                this.logger?.logIncoming(message.byteLength, header[1], 1 /* RequestInitiator.OtherSide */, `${requestTypeToStr(type)}`);
                return this.disposeActiveRequest({ type, id: header[1] });
        }
    }
    onPromise(request) {
        const channel = this.channels.get(request.channelName);
        if (!channel) {
            this.collectPendingRequest(request);
            return;
        }
        const cancellationTokenSource = new CancellationTokenSource();
        let promise;
        try {
            promise = channel.call(this.ctx, request.name, request.arg, cancellationTokenSource.token);
        }
        catch (err) {
            promise = Promise.reject(err);
        }
        const id = request.id;
        promise.then(data => {
            this.sendResponse({ id, data, type: 201 /* ResponseType.PromiseSuccess */ });
        }, err => {
            if (err instanceof Error) {
                this.sendResponse({
                    id, data: {
                        message: err.message,
                        name: err.name,
                        stack: err.stack ? err.stack.split('\n') : undefined
                    }, type: 202 /* ResponseType.PromiseError */
                });
            }
            else {
                this.sendResponse({ id, data: err, type: 203 /* ResponseType.PromiseErrorObj */ });
            }
        }).finally(() => {
            disposable.dispose();
            this.activeRequests.delete(request.id);
        });
        const disposable = toDisposable(() => cancellationTokenSource.cancel());
        this.activeRequests.set(request.id, disposable);
    }
    onEventListen(request) {
        const channel = this.channels.get(request.channelName);
        if (!channel) {
            this.collectPendingRequest(request);
            return;
        }
        const id = request.id;
        const event = channel.listen(this.ctx, request.name, request.arg);
        const disposable = event(data => this.sendResponse({ id, data, type: 204 /* ResponseType.EventFire */ }));
        this.activeRequests.set(request.id, disposable);
    }
    disposeActiveRequest(request) {
        const disposable = this.activeRequests.get(request.id);
        if (disposable) {
            disposable.dispose();
            this.activeRequests.delete(request.id);
        }
    }
    collectPendingRequest(request) {
        let pendingRequests = this.pendingRequests.get(request.channelName);
        if (!pendingRequests) {
            pendingRequests = [];
            this.pendingRequests.set(request.channelName, pendingRequests);
        }
        const timer = setTimeout(() => {
            console.error(`Unknown channel: ${request.channelName}`);
            if (request.type === 100 /* RequestType.Promise */) {
                this.sendResponse({
                    id: request.id,
                    data: { name: 'Unknown channel', message: `Channel name '${request.channelName}' timed out after ${this.timeoutDelay}ms`, stack: undefined },
                    type: 202 /* ResponseType.PromiseError */
                });
            }
        }, this.timeoutDelay);
        pendingRequests.push({ request, timeoutTimer: timer });
    }
    flushPendingRequests(channelName) {
        const requests = this.pendingRequests.get(channelName);
        if (requests) {
            for (const request of requests) {
                clearTimeout(request.timeoutTimer);
                switch (request.request.type) {
                    case 100 /* RequestType.Promise */:
                        this.onPromise(request.request);
                        break;
                    case 102 /* RequestType.EventListen */:
                        this.onEventListen(request.request);
                        break;
                }
            }
            this.pendingRequests.delete(channelName);
        }
    }
    dispose() {
        if (this.protocolListener) {
            this.protocolListener.dispose();
            this.protocolListener = null;
        }
        dispose(this.activeRequests.values());
        this.activeRequests.clear();
    }
}
export var RequestInitiator;
(function (RequestInitiator) {
    RequestInitiator[RequestInitiator["LocalSide"] = 0] = "LocalSide";
    RequestInitiator[RequestInitiator["OtherSide"] = 1] = "OtherSide";
})(RequestInitiator || (RequestInitiator = {}));
export class ChannelClient {
    constructor(protocol, logger = null) {
        this.protocol = protocol;
        this.isDisposed = false;
        this.state = State.Uninitialized;
        this.activeRequests = new Set();
        this.handlers = new Map();
        this.lastRequestId = 0;
        this._onDidInitialize = new Emitter();
        this.onDidInitialize = this._onDidInitialize.event;
        this.protocolListener = this.protocol.onMessage(msg => this.onBuffer(msg));
        this.logger = logger;
    }
    getChannel(channelName) {
        const that = this;
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            call(command, arg, cancellationToken) {
                if (that.isDisposed) {
                    return Promise.reject(new CancellationError());
                }
                return that.requestPromise(channelName, command, arg, cancellationToken);
            },
            listen(event, arg) {
                if (that.isDisposed) {
                    return Event.None;
                }
                return that.requestEvent(channelName, event, arg);
            }
        };
    }
    requestPromise(channelName, name, arg, cancellationToken = CancellationToken.None) {
        const id = this.lastRequestId++;
        const type = 100 /* RequestType.Promise */;
        const request = { id, type, channelName, name, arg };
        if (cancellationToken.isCancellationRequested) {
            return Promise.reject(new CancellationError());
        }
        let disposable;
        let disposableWithRequestCancel;
        const result = new Promise((c, e) => {
            if (cancellationToken.isCancellationRequested) {
                return e(new CancellationError());
            }
            const doRequest = () => {
                const handler = response => {
                    switch (response.type) {
                        case 201 /* ResponseType.PromiseSuccess */:
                            this.handlers.delete(id);
                            c(response.data);
                            break;
                        case 202 /* ResponseType.PromiseError */: {
                            this.handlers.delete(id);
                            const error = new Error(response.data.message);
                            error.stack = Array.isArray(response.data.stack) ? response.data.stack.join('\n') : response.data.stack;
                            error.name = response.data.name;
                            e(error);
                            break;
                        }
                        case 203 /* ResponseType.PromiseErrorObj */:
                            this.handlers.delete(id);
                            e(response.data);
                            break;
                    }
                };
                this.handlers.set(id, handler);
                this.sendRequest(request);
            };
            let uninitializedPromise = null;
            if (this.state === State.Idle) {
                doRequest();
            }
            else {
                uninitializedPromise = createCancelablePromise(_ => this.whenInitialized());
                uninitializedPromise.then(() => {
                    uninitializedPromise = null;
                    doRequest();
                });
            }
            const cancel = () => {
                if (uninitializedPromise) {
                    uninitializedPromise.cancel();
                    uninitializedPromise = null;
                }
                else {
                    this.sendRequest({ id, type: 101 /* RequestType.PromiseCancel */ });
                }
                e(new CancellationError());
            };
            disposable = cancellationToken.onCancellationRequested(cancel);
            disposableWithRequestCancel = {
                dispose: createSingleCallFunction(() => {
                    cancel();
                    disposable.dispose();
                })
            };
            this.activeRequests.add(disposableWithRequestCancel);
        });
        return result.finally(() => {
            disposable?.dispose(); // Seen as undefined in tests.
            this.activeRequests.delete(disposableWithRequestCancel);
        });
    }
    requestEvent(channelName, name, arg) {
        const id = this.lastRequestId++;
        const type = 102 /* RequestType.EventListen */;
        const request = { id, type, channelName, name, arg };
        let uninitializedPromise = null;
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                const doRequest = () => {
                    this.activeRequests.add(emitter);
                    this.sendRequest(request);
                };
                if (this.state === State.Idle) {
                    doRequest();
                }
                else {
                    uninitializedPromise = createCancelablePromise(_ => this.whenInitialized());
                    uninitializedPromise.then(() => {
                        uninitializedPromise = null;
                        doRequest();
                    });
                }
            },
            onDidRemoveLastListener: () => {
                if (uninitializedPromise) {
                    uninitializedPromise.cancel();
                    uninitializedPromise = null;
                }
                else {
                    this.activeRequests.delete(emitter);
                    this.sendRequest({ id, type: 103 /* RequestType.EventDispose */ });
                }
            }
        });
        const handler = (res) => emitter.fire(res.data);
        this.handlers.set(id, handler);
        return emitter.event;
    }
    sendRequest(request) {
        switch (request.type) {
            case 100 /* RequestType.Promise */:
            case 102 /* RequestType.EventListen */: {
                const msgLength = this.send([request.type, request.id, request.channelName, request.name], request.arg);
                this.logger?.logOutgoing(msgLength, request.id, 0 /* RequestInitiator.LocalSide */, `${requestTypeToStr(request.type)}: ${request.channelName}.${request.name}`, request.arg);
                return;
            }
            case 101 /* RequestType.PromiseCancel */:
            case 103 /* RequestType.EventDispose */: {
                const msgLength = this.send([request.type, request.id]);
                this.logger?.logOutgoing(msgLength, request.id, 0 /* RequestInitiator.LocalSide */, requestTypeToStr(request.type));
                return;
            }
        }
    }
    send(header, body = undefined) {
        const writer = new BufferWriter();
        serialize(writer, header);
        serialize(writer, body);
        return this.sendBuffer(writer.buffer);
    }
    sendBuffer(message) {
        try {
            this.protocol.send(message);
            return message.byteLength;
        }
        catch (err) {
            // noop
            return 0;
        }
    }
    onBuffer(message) {
        const reader = new BufferReader(message);
        const header = deserialize(reader);
        const body = deserialize(reader);
        const type = header[0];
        switch (type) {
            case 200 /* ResponseType.Initialize */:
                this.logger?.logIncoming(message.byteLength, 0, 0 /* RequestInitiator.LocalSide */, responseTypeToStr(type));
                return this.onResponse({ type: header[0] });
            case 201 /* ResponseType.PromiseSuccess */:
            case 202 /* ResponseType.PromiseError */:
            case 204 /* ResponseType.EventFire */:
            case 203 /* ResponseType.PromiseErrorObj */:
                this.logger?.logIncoming(message.byteLength, header[1], 0 /* RequestInitiator.LocalSide */, responseTypeToStr(type), body);
                return this.onResponse({ type: header[0], id: header[1], data: body });
        }
    }
    onResponse(response) {
        if (response.type === 200 /* ResponseType.Initialize */) {
            this.state = State.Idle;
            this._onDidInitialize.fire();
            return;
        }
        const handler = this.handlers.get(response.id);
        handler?.(response);
    }
    get onDidInitializePromise() {
        return Event.toPromise(this.onDidInitialize);
    }
    whenInitialized() {
        if (this.state === State.Idle) {
            return Promise.resolve();
        }
        else {
            return this.onDidInitializePromise;
        }
    }
    dispose() {
        this.isDisposed = true;
        if (this.protocolListener) {
            this.protocolListener.dispose();
            this.protocolListener = null;
        }
        dispose(this.activeRequests.values());
        this.activeRequests.clear();
    }
}
__decorate([
    memoize
], ChannelClient.prototype, "onDidInitializePromise", null);
/**
 * An `IPCServer` is both a channel server and a routing channel
 * client.
 *
 * As the owner of a protocol, you should extend both this
 * and the `IPCClient` classes to get IPC implementations
 * for your protocol.
 */
export class IPCServer {
    get connections() {
        const result = [];
        this._connections.forEach(ctx => result.push(ctx));
        return result;
    }
    constructor(onDidClientConnect, ipcLogger, timeoutDelay) {
        this.channels = new Map();
        this._connections = new Set();
        this._onDidAddConnection = new Emitter();
        this.onDidAddConnection = this._onDidAddConnection.event;
        this._onDidRemoveConnection = new Emitter();
        this.onDidRemoveConnection = this._onDidRemoveConnection.event;
        this.disposables = new DisposableStore();
        this.disposables.add(onDidClientConnect(({ protocol, onDidClientDisconnect }) => {
            const onFirstMessage = Event.once(protocol.onMessage);
            this.disposables.add(onFirstMessage(msg => {
                const reader = new BufferReader(msg);
                const ctx = deserialize(reader);
                const channelServer = new ChannelServer(protocol, ctx, ipcLogger, timeoutDelay);
                const channelClient = new ChannelClient(protocol, ipcLogger);
                this.channels.forEach((channel, name) => channelServer.registerChannel(name, channel));
                const connection = { channelServer, channelClient, ctx };
                this._connections.add(connection);
                this._onDidAddConnection.fire(connection);
                this.disposables.add(onDidClientDisconnect(() => {
                    channelServer.dispose();
                    channelClient.dispose();
                    this._connections.delete(connection);
                    this._onDidRemoveConnection.fire(connection);
                }));
            }));
        }));
    }
    getChannel(channelName, routerOrClientFilter) {
        const that = this;
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        return {
            call(command, arg, cancellationToken) {
                let connectionPromise;
                if (isFunction(routerOrClientFilter)) {
                    // when no router is provided, we go random client picking
                    const connection = getRandomElement(that.connections.filter(routerOrClientFilter));
                    connectionPromise = connection
                        // if we found a client, let's call on it
                        ? Promise.resolve(connection)
                        // else, let's wait for a client to come along
                        : Event.toPromise(Event.filter(that.onDidAddConnection, routerOrClientFilter));
                }
                else {
                    connectionPromise = routerOrClientFilter.routeCall(that, command, arg);
                }
                const channelPromise = connectionPromise
                    .then(connection => connection.channelClient.getChannel(channelName));
                return getDelayedChannel(channelPromise)
                    .call(command, arg, cancellationToken);
            },
            listen(event, arg) {
                if (isFunction(routerOrClientFilter)) {
                    return that.getMulticastEvent(channelName, routerOrClientFilter, event, arg);
                }
                const channelPromise = routerOrClientFilter.routeEvent(that, event, arg)
                    .then(connection => connection.channelClient.getChannel(channelName));
                return getDelayedChannel(channelPromise)
                    .listen(event, arg);
            }
        };
    }
    getMulticastEvent(channelName, clientFilter, eventName, arg) {
        const that = this;
        let disposables;
        // Create an emitter which hooks up to all clients
        // as soon as first listener is added. It also
        // disconnects from all clients as soon as the last listener
        // is removed.
        const emitter = new Emitter({
            onWillAddFirstListener: () => {
                disposables = new DisposableStore();
                // The event multiplexer is useful since the active
                // client list is dynamic. We need to hook up and disconnection
                // to/from clients as they come and go.
                const eventMultiplexer = new EventMultiplexer();
                const map = new Map();
                const onDidAddConnection = (connection) => {
                    const channel = connection.channelClient.getChannel(channelName);
                    const event = channel.listen(eventName, arg);
                    const disposable = eventMultiplexer.add(event);
                    map.set(connection, disposable);
                };
                const onDidRemoveConnection = (connection) => {
                    const disposable = map.get(connection);
                    if (!disposable) {
                        return;
                    }
                    disposable.dispose();
                    map.delete(connection);
                };
                that.connections.filter(clientFilter).forEach(onDidAddConnection);
                Event.filter(that.onDidAddConnection, clientFilter)(onDidAddConnection, undefined, disposables);
                that.onDidRemoveConnection(onDidRemoveConnection, undefined, disposables);
                eventMultiplexer.event(emitter.fire, emitter, disposables);
                disposables.add(eventMultiplexer);
            },
            onDidRemoveLastListener: () => {
                disposables?.dispose();
                disposables = undefined;
            }
        });
        that.disposables.add(emitter);
        return emitter.event;
    }
    registerChannel(channelName, channel) {
        this.channels.set(channelName, channel);
        for (const connection of this._connections) {
            connection.channelServer.registerChannel(channelName, channel);
        }
    }
    dispose() {
        this.disposables.dispose();
        for (const connection of this._connections) {
            connection.channelClient.dispose();
            connection.channelServer.dispose();
        }
        this._connections.clear();
        this.channels.clear();
        this._onDidAddConnection.dispose();
        this._onDidRemoveConnection.dispose();
    }
}
/**
 * An `IPCClient` is both a channel client and a channel server.
 *
 * As the owner of a protocol, you should extend both this
 * and the `IPCServer` classes to get IPC implementations
 * for your protocol.
 */
export class IPCClient {
    constructor(protocol, ctx, ipcLogger = null) {
        const writer = new BufferWriter();
        serialize(writer, ctx);
        protocol.send(writer.buffer);
        this.channelClient = new ChannelClient(protocol, ipcLogger);
        this.channelServer = new ChannelServer(protocol, ctx, ipcLogger);
    }
    getChannel(channelName) {
        return this.channelClient.getChannel(channelName);
    }
    registerChannel(channelName, channel) {
        this.channelServer.registerChannel(channelName, channel);
    }
    dispose() {
        this.channelClient.dispose();
        this.channelServer.dispose();
    }
}
export function getDelayedChannel(promise) {
    // eslint-disable-next-line local/code-no-dangerous-type-assertions
    return {
        call(command, arg, cancellationToken) {
            return promise.then(c => c.call(command, arg, cancellationToken));
        },
        listen(event, arg) {
            const relay = new Relay();
            promise.then(c => relay.input = c.listen(event, arg));
            return relay.event;
        }
    };
}
export function getNextTickChannel(channel) {
    let didTick = false;
    // eslint-disable-next-line local/code-no-dangerous-type-assertions
    return {
        call(command, arg, cancellationToken) {
            if (didTick) {
                return channel.call(command, arg, cancellationToken);
            }
            return timeout(0)
                .then(() => didTick = true)
                .then(() => channel.call(command, arg, cancellationToken));
        },
        listen(event, arg) {
            if (didTick) {
                return channel.listen(event, arg);
            }
            const relay = new Relay();
            timeout(0)
                .then(() => didTick = true)
                .then(() => relay.input = channel.listen(event, arg));
            return relay.event;
        }
    };
}
export class StaticRouter {
    constructor(fn) {
        this.fn = fn;
    }
    routeCall(hub) {
        return this.route(hub);
    }
    routeEvent(hub) {
        return this.route(hub);
    }
    async route(hub) {
        for (const connection of hub.connections) {
            if (await Promise.resolve(this.fn(connection.ctx))) {
                return Promise.resolve(connection);
            }
        }
        await Event.toPromise(hub.onDidAddConnection);
        return await this.route(hub);
    }
}
/**
 * Use ProxyChannels to automatically wrapping and unwrapping
 * services to/from IPC channels, instead of manually wrapping
 * each service method and event.
 *
 * Restrictions:
 * - If marshalling is enabled, only `URI` and `RegExp` is converted
 *   automatically for you
 * - Events must follow the naming convention `onUpperCase`
 * - `CancellationToken` is currently not supported
 * - If a context is provided, you can use `AddFirstParameterToFunctions`
 *   utility to signal this in the receiving side type
 */
export var ProxyChannel;
(function (ProxyChannel) {
    function fromService(service, disposables, options) {
        const handler = service;
        const disableMarshalling = options?.disableMarshalling;
        // Buffer any event that should be supported by
        // iterating over all property keys and finding them
        // However, this will not work for services that
        // are lazy and use a Proxy within. For that we
        // still need to check later (see below).
        const mapEventNameToEvent = new Map();
        for (const key in handler) {
            if (propertyIsEvent(key)) {
                mapEventNameToEvent.set(key, Event.buffer(handler[key], true, undefined, disposables));
            }
        }
        return new class {
            listen(_, event, arg) {
                const eventImpl = mapEventNameToEvent.get(event);
                if (eventImpl) {
                    return eventImpl;
                }
                const target = handler[event];
                if (typeof target === 'function') {
                    if (propertyIsDynamicEvent(event)) {
                        return target.call(handler, arg);
                    }
                    if (propertyIsEvent(event)) {
                        mapEventNameToEvent.set(event, Event.buffer(handler[event], true, undefined, disposables));
                        return mapEventNameToEvent.get(event);
                    }
                }
                throw new ErrorNoTelemetry(`Event not found: ${event}`);
            }
            call(_, command, args) {
                const target = handler[command];
                if (typeof target === 'function') {
                    // Revive unless marshalling disabled
                    if (!disableMarshalling && Array.isArray(args)) {
                        for (let i = 0; i < args.length; i++) {
                            args[i] = revive(args[i]);
                        }
                    }
                    let res = target.apply(handler, args);
                    if (!(res instanceof Promise)) {
                        res = Promise.resolve(res);
                    }
                    return res;
                }
                throw new ErrorNoTelemetry(`Method not found: ${command}`);
            }
        };
    }
    ProxyChannel.fromService = fromService;
    function toService(channel, options) {
        const disableMarshalling = options?.disableMarshalling;
        return new Proxy({}, {
            get(_target, propKey) {
                if (typeof propKey === 'string') {
                    // Check for predefined values
                    if (options?.properties?.has(propKey)) {
                        return options.properties.get(propKey);
                    }
                    // Dynamic Event
                    if (propertyIsDynamicEvent(propKey)) {
                        return function (arg) {
                            return channel.listen(propKey, arg);
                        };
                    }
                    // Event
                    if (propertyIsEvent(propKey)) {
                        return channel.listen(propKey);
                    }
                    // Function
                    return async function (...args) {
                        // Add context if any
                        let methodArgs;
                        if (options && !isUndefinedOrNull(options.context)) {
                            methodArgs = [options.context, ...args];
                        }
                        else {
                            methodArgs = args;
                        }
                        const result = await channel.call(propKey, methodArgs);
                        // Revive unless marshalling disabled
                        if (!disableMarshalling) {
                            return revive(result);
                        }
                        return result;
                    };
                }
                throw new ErrorNoTelemetry(`Property not found: ${String(propKey)}`);
            }
        });
    }
    ProxyChannel.toService = toService;
    function propertyIsEvent(name) {
        // Assume a property is an event if it has a form of "onSomething"
        return name[0] === 'o' && name[1] === 'n' && strings.isUpperAsciiLetter(name.charCodeAt(2));
    }
    function propertyIsDynamicEvent(name) {
        // Assume a property is a dynamic event (a method that returns an event) if it has a form of "onDynamicSomething"
        return /^onDynamic/.test(name) && strings.isUpperAsciiLetter(name.charCodeAt(9));
    }
})(ProxyChannel || (ProxyChannel = {}));
const colorTables = [
    ['#2977B1', '#FC802D', '#34A13A', '#D3282F', '#9366BA'],
    ['#8B564C', '#E177C0', '#7F7F7F', '#BBBE3D', '#2EBECD']
];
function prettyWithoutArrays(data) {
    if (Array.isArray(data)) {
        return data;
    }
    if (data && typeof data === 'object' && typeof data.toString === 'function') {
        const result = data.toString();
        if (result !== '[object Object]') {
            return result;
        }
    }
    return data;
}
function pretty(data) {
    if (Array.isArray(data)) {
        return data.map(prettyWithoutArrays);
    }
    return prettyWithoutArrays(data);
}
function logWithColors(direction, totalLength, msgLength, req, initiator, str, data) {
    data = pretty(data);
    const colorTable = colorTables[initiator];
    const color = colorTable[req % colorTable.length];
    let args = [`%c[${direction}]%c[${String(totalLength).padStart(7, ' ')}]%c[len: ${String(msgLength).padStart(5, ' ')}]%c${String(req).padStart(5, ' ')} - ${str}`, 'color: darkgreen', 'color: grey', 'color: grey', `color: ${color}`];
    if (/\($/.test(str)) {
        args = args.concat(data);
        args.push(')');
    }
    else {
        args.push(data);
    }
    console.log.apply(console, args);
}
export class IPCLogger {
    constructor(_outgoingPrefix, _incomingPrefix) {
        this._outgoingPrefix = _outgoingPrefix;
        this._incomingPrefix = _incomingPrefix;
        this._totalIncoming = 0;
        this._totalOutgoing = 0;
    }
    logOutgoing(msgLength, requestId, initiator, str, data) {
        this._totalOutgoing += msgLength;
        logWithColors(this._outgoingPrefix, this._totalOutgoing, msgLength, requestId, initiator, str, data);
    }
    logIncoming(msgLength, requestId, initiator, str, data) {
        this._totalIncoming += msgLength;
        logWithColors(this._incomingPrefix, this._totalIncoming, msgLength, requestId, initiator, str, data);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vaG9tZS9wb3JpZGhpL2RldmVsb3BtZW50L3B1a3UtdnMtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvY29tbW9uL2lwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM3RCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDbkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDbkcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hELE9BQU8sS0FBSyxPQUFPLE1BQU0sNEJBQTRCLENBQUM7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBdUJ6RSxJQUFXLFdBS1Y7QUFMRCxXQUFXLFdBQVc7SUFDckIscURBQWEsQ0FBQTtJQUNiLGlFQUFtQixDQUFBO0lBQ25CLDZEQUFpQixDQUFB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