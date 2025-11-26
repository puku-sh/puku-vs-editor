/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Parses a simplified YAML-like input from a single string.
 * Supports objects, arrays, primitive types (string, number, boolean, null).
 * Tracks positions for error reporting and node locations.
 *
 * Limitations:
 * - No multi-line strings or block literals
 * - No anchors or references
 * - No complex types (dates, binary)
 * - No special handling for escape sequences in strings
 * - Indentation must be consistent (spaces only, no tabs)
 *
 * Notes:
 * - New line separators can be either "\n" or "\r\n". The input string is split into lines internally.
 *
 * @param input A string containing the YAML-like input
 * @param errors Array to collect parsing errors
 * @param options Parsing options
 * @returns The parsed representation (ObjectNode, ArrayNode, or primitive node)
 */
export function parse(input, errors = [], options = {}) {
    // Normalize both LF and CRLF by splitting on either; CR characters are not retained as part of line text.
    // This keeps the existing line/character based lexer logic intact.
    const lines = input.length === 0 ? [] : input.split(/\r\n|\n/);
    const parser = new YamlParser(lines, errors, options);
    return parser.parse();
}
// Helper functions for position and node creation
function createPosition(line, character) {
    return { line, character };
}
// Specialized node creation functions using a more concise approach
function createStringNode(value, start, end) {
    return { type: 'string', value, start, end };
}
function createNumberNode(value, start, end) {
    return { type: 'number', value, start, end };
}
function createBooleanNode(value, start, end) {
    return { type: 'boolean', value, start, end };
}
function createNullNode(start, end) {
    return { type: 'null', value: null, start, end };
}
function createObjectNode(properties, start, end) {
    return { type: 'object', start, end, properties };
}
function createArrayNode(items, start, end) {
    return { type: 'array', start, end, items };
}
// Utility functions for parsing
function isWhitespace(char) {
    return char === ' ' || char === '\t';
}
// Simplified number validation using regex
function isValidNumber(value) {
    return /^-?\d*\.?\d+$/.test(value);
}
// Lexer/Tokenizer for YAML content
class YamlLexer {
    constructor(lines) {
        this.currentLine = 0;
        this.currentChar = 0;
        this.lines = lines;
    }
    getCurrentPosition() {
        return createPosition(this.currentLine, this.currentChar);
    }
    getCurrentLineNumber() {
        return this.currentLine;
    }
    getCurrentCharNumber() {
        return this.currentChar;
    }
    getCurrentLineText() {
        return this.currentLine < this.lines.length ? this.lines[this.currentLine] : '';
    }
    savePosition() {
        return { line: this.currentLine, char: this.currentChar };
    }
    restorePosition(pos) {
        this.currentLine = pos.line;
        this.currentChar = pos.char;
    }
    isAtEnd() {
        return this.currentLine >= this.lines.length;
    }
    getCurrentChar() {
        if (this.isAtEnd() || this.currentChar >= this.lines[this.currentLine].length) {
            return '';
        }
        return this.lines[this.currentLine][this.currentChar];
    }
    peek(offset = 1) {
        const newChar = this.currentChar + offset;
        if (this.currentLine >= this.lines.length || newChar >= this.lines[this.currentLine].length) {
            return '';
        }
        return this.lines[this.currentLine][newChar];
    }
    advance() {
        const char = this.getCurrentChar();
        if (this.currentChar >= this.lines[this.currentLine].length && this.currentLine < this.lines.length - 1) {
            this.currentLine++;
            this.currentChar = 0;
        }
        else {
            this.currentChar++;
        }
        return char;
    }
    advanceLine() {
        this.currentLine++;
        this.currentChar = 0;
    }
    skipWhitespace() {
        while (!this.isAtEnd() && this.currentChar < this.lines[this.currentLine].length && isWhitespace(this.getCurrentChar())) {
            this.advance();
        }
    }
    skipToEndOfLine() {
        this.currentChar = this.lines[this.currentLine].length;
    }
    getIndentation() {
        if (this.isAtEnd()) {
            return 0;
        }
        let indent = 0;
        for (let i = 0; i < this.lines[this.currentLine].length; i++) {
            if (this.lines[this.currentLine][i] === ' ') {
                indent++;
            }
            else if (this.lines[this.currentLine][i] === '\t') {
                indent += 4; // Treat tab as 4 spaces
            }
            else {
                break;
            }
        }
        return indent;
    }
    moveToNextNonEmptyLine() {
        while (this.currentLine < this.lines.length) {
            // First check current line from current position
            if (this.currentChar < this.lines[this.currentLine].length) {
                const remainingLine = this.lines[this.currentLine].substring(this.currentChar).trim();
                if (remainingLine.length > 0 && !remainingLine.startsWith('#')) {
                    this.skipWhitespace();
                    return;
                }
            }
            // Move to next line and check from beginning
            this.currentLine++;
            this.currentChar = 0;
            if (this.currentLine < this.lines.length) {
                const line = this.lines[this.currentLine].trim();
                if (line.length > 0 && !line.startsWith('#')) {
                    this.skipWhitespace();
                    return;
                }
            }
        }
    }
}
// Parser class for handling YAML parsing
class YamlParser {
    constructor(lines, errors, options) {
        // Track nesting level of flow (inline) collections '[' ']' '{' '}'
        this.flowLevel = 0;
        this.lexer = new YamlLexer(lines);
        this.errors = errors;
        this.options = options;
    }
    addError(message, code, start, end) {
        this.errors.push({ message, code, start, end });
    }
    parseValue(expectedIndent) {
        this.lexer.skipWhitespace();
        if (this.lexer.isAtEnd()) {
            const pos = this.lexer.getCurrentPosition();
            return createStringNode('', pos, pos);
        }
        const char = this.lexer.getCurrentChar();
        // Handle quoted strings
        if (char === '"' || char === `'`) {
            return this.parseQuotedString(char);
        }
        // Handle inline arrays
        if (char === '[') {
            return this.parseInlineArray();
        }
        // Handle inline objects
        if (char === '{') {
            return this.parseInlineObject();
        }
        // Handle unquoted values
        return this.parseUnquotedValue();
    }
    parseQuotedString(quote) {
        const start = this.lexer.getCurrentPosition();
        this.lexer.advance(); // Skip opening quote
        let value = '';
        while (!this.lexer.isAtEnd() && this.lexer.getCurrentChar() !== '' && this.lexer.getCurrentChar() !== quote) {
            value += this.lexer.advance();
        }
        if (this.lexer.getCurrentChar() === quote) {
            this.lexer.advance(); // Skip closing quote
        }
        const end = this.lexer.getCurrentPosition();
        return createStringNode(value, start, end);
    }
    parseUnquotedValue() {
        const start = this.lexer.getCurrentPosition();
        let value = '';
        let endPos = start;
        // Helper function to check for value terminators
        const isTerminator = (char) => {
            if (char === '#') {
                return true;
            }
            // Comma, ']' and '}' only terminate inside flow collections
            if (this.flowLevel > 0 && (char === ',' || char === ']' || char === '}')) {
                return true;
            }
            return false;
        };
        // Handle opening quote that might not be closed
        const firstChar = this.lexer.getCurrentChar();
        if (firstChar === '"' || firstChar === `'`) {
            value += this.lexer.advance();
            endPos = this.lexer.getCurrentPosition();
            while (!this.lexer.isAtEnd() && this.lexer.getCurrentChar() !== '') {
                const char = this.lexer.getCurrentChar();
                if (char === firstChar || isTerminator(char)) {
                    break;
                }
                value += this.lexer.advance();
                endPos = this.lexer.getCurrentPosition();
            }
        }
        else {
            while (!this.lexer.isAtEnd() && this.lexer.getCurrentChar() !== '') {
                const char = this.lexer.getCurrentChar();
                if (isTerminator(char)) {
                    break;
                }
                value += this.lexer.advance();
                endPos = this.lexer.getCurrentPosition();
            }
        }
        const trimmed = value.trimEnd();
        const diff = value.length - trimmed.length;
        if (diff) {
            endPos = createPosition(start.line, endPos.character - diff);
        }
        const finalValue = (firstChar === '"' || firstChar === `'`) ? trimmed.substring(1) : trimmed;
        return this.createValueNode(finalValue, start, endPos);
    }
    createValueNode(value, start, end) {
        if (value === '') {
            return createStringNode('', start, start);
        }
        // Boolean values
        if (value === 'true') {
            return createBooleanNode(true, start, end);
        }
        if (value === 'false') {
            return createBooleanNode(false, start, end);
        }
        // Null values
        if (value === 'null' || value === '~') {
            return createNullNode(start, end);
        }
        // Number values
        const numberValue = Number(value);
        if (!isNaN(numberValue) && isFinite(numberValue) && isValidNumber(value)) {
            return createNumberNode(numberValue, start, end);
        }
        // Default to string
        return createStringNode(value, start, end);
    }
    parseInlineArray() {
        const start = this.lexer.getCurrentPosition();
        this.lexer.advance(); // Skip '['
        this.flowLevel++;
        const items = [];
        while (!this.lexer.isAtEnd()) {
            this.lexer.skipWhitespace();
            // Handle end of array
            if (this.lexer.getCurrentChar() === ']') {
                this.lexer.advance();
                break;
            }
            // Handle end of line - continue to next line for multi-line arrays
            if (this.lexer.getCurrentChar() === '') {
                this.lexer.advanceLine();
                continue;
            }
            // Handle comments - comments should terminate the array parsing
            if (this.lexer.getCurrentChar() === '#') {
                // Skip the rest of the line (comment)
                this.lexer.skipToEndOfLine();
                this.lexer.advanceLine();
                continue;
            }
            // Save position before parsing to detect if we're making progress
            const positionBefore = this.lexer.savePosition();
            // Parse array item
            const item = this.parseValue();
            // Skip implicit empty items that arise from a leading comma at the beginning of a new line
            // (e.g. a line starting with ",foo" after a comment). A legitimate empty string element
            // would have quotes and thus a non-zero span. We only filter zero-length spans.
            if (!(item.type === 'string' && item.value === '' && item.start.line === item.end.line && item.start.character === item.end.character)) {
                items.push(item);
            }
            // Check if we made progress - if not, we're likely stuck
            const positionAfter = this.lexer.savePosition();
            if (positionBefore.line === positionAfter.line && positionBefore.char === positionAfter.char) {
                // No progress made, advance at least one character to prevent infinite loop
                if (!this.lexer.isAtEnd() && this.lexer.getCurrentChar() !== '') {
                    this.lexer.advance();
                }
                else {
                    break;
                }
            }
            this.lexer.skipWhitespace();
            // Handle comma separator
            if (this.lexer.getCurrentChar() === ',') {
                this.lexer.advance();
            }
        }
        const end = this.lexer.getCurrentPosition();
        this.flowLevel--;
        return createArrayNode(items, start, end);
    }
    parseInlineObject() {
        const start = this.lexer.getCurrentPosition();
        this.lexer.advance(); // Skip '{'
        this.flowLevel++;
        const properties = [];
        while (!this.lexer.isAtEnd()) {
            this.lexer.skipWhitespace();
            // Handle end of object
            if (this.lexer.getCurrentChar() === '}') {
                this.lexer.advance();
                break;
            }
            // Handle comments - comments should terminate the object parsing
            if (this.lexer.getCurrentChar() === '#') {
                // Skip the rest of the line (comment)
                this.lexer.skipToEndOfLine();
                this.lexer.advanceLine();
                continue;
            }
            // Save position before parsing to detect if we're making progress
            const positionBefore = this.lexer.savePosition();
            // Parse key - read until colon
            const keyStart = this.lexer.getCurrentPosition();
            let keyValue = '';
            // Handle quoted keys
            if (this.lexer.getCurrentChar() === '"' || this.lexer.getCurrentChar() === `'`) {
                const quote = this.lexer.getCurrentChar();
                this.lexer.advance(); // Skip opening quote
                while (!this.lexer.isAtEnd() && this.lexer.getCurrentChar() !== '' && this.lexer.getCurrentChar() !== quote) {
                    keyValue += this.lexer.advance();
                }
                if (this.lexer.getCurrentChar() === quote) {
                    this.lexer.advance(); // Skip closing quote
                }
            }
            else {
                // Handle unquoted keys - read until colon
                while (!this.lexer.isAtEnd() && this.lexer.getCurrentChar() !== '' && this.lexer.getCurrentChar() !== ':') {
                    keyValue += this.lexer.advance();
                }
            }
            keyValue = keyValue.trim();
            const keyEnd = this.lexer.getCurrentPosition();
            const key = createStringNode(keyValue, keyStart, keyEnd);
            this.lexer.skipWhitespace();
            // Expect colon
            if (this.lexer.getCurrentChar() === ':') {
                this.lexer.advance();
            }
            this.lexer.skipWhitespace();
            // Parse value
            const value = this.parseValue();
            properties.push({ key, value });
            // Check if we made progress - if not, we're likely stuck
            const positionAfter = this.lexer.savePosition();
            if (positionBefore.line === positionAfter.line && positionBefore.char === positionAfter.char) {
                // No progress made, advance at least one character to prevent infinite loop
                if (!this.lexer.isAtEnd() && this.lexer.getCurrentChar() !== '') {
                    this.lexer.advance();
                }
                else {
                    break;
                }
            }
            this.lexer.skipWhitespace();
            // Handle comma separator
            if (this.lexer.getCurrentChar() === ',') {
                this.lexer.advance();
            }
        }
        const end = this.lexer.getCurrentPosition();
        this.flowLevel--;
        return createObjectNode(properties, start, end);
    }
    parseBlockArray(baseIndent) {
        const start = this.lexer.getCurrentPosition();
        const items = [];
        while (!this.lexer.isAtEnd()) {
            this.lexer.moveToNextNonEmptyLine();
            if (this.lexer.isAtEnd()) {
                break;
            }
            const currentIndent = this.lexer.getIndentation();
            // If indentation is less than expected, we're done with this array
            if (currentIndent < baseIndent) {
                break;
            }
            this.lexer.skipWhitespace();
            // Check for array item marker
            if (this.lexer.getCurrentChar() === '-') {
                this.lexer.advance(); // Skip '-'
                this.lexer.skipWhitespace();
                const itemStart = this.lexer.getCurrentPosition();
                // Check if this is a nested structure
                if (this.lexer.getCurrentChar() === '' || this.lexer.getCurrentChar() === '#') {
                    // Empty item - check if next lines form a nested structure
                    this.lexer.advanceLine();
                    if (!this.lexer.isAtEnd()) {
                        const nextIndent = this.lexer.getIndentation();
                        if (nextIndent > currentIndent) {
                            // Check if the next line starts with a dash (nested array) or has properties (nested object)
                            this.lexer.skipWhitespace();
                            if (this.lexer.getCurrentChar() === '-') {
                                // It's a nested array
                                const nestedArray = this.parseBlockArray(nextIndent);
                                items.push(nestedArray);
                            }
                            else {
                                // Check if it looks like an object property (has a colon)
                                const currentLine = this.lexer.getCurrentLineText();
                                const currentPos = this.lexer.getCurrentCharNumber();
                                const remainingLine = currentLine.substring(currentPos);
                                if (remainingLine.includes(':') && !remainingLine.trim().startsWith('#')) {
                                    // It's a nested object
                                    const nestedObject = this.parseBlockObject(nextIndent, this.lexer.getCurrentCharNumber());
                                    items.push(nestedObject);
                                }
                                else {
                                    // Not a nested structure, create empty string
                                    items.push(createStringNode('', itemStart, itemStart));
                                }
                            }
                        }
                        else {
                            // No nested content, empty item
                            items.push(createStringNode('', itemStart, itemStart));
                        }
                    }
                    else {
                        // End of input, empty item
                        items.push(createStringNode('', itemStart, itemStart));
                    }
                }
                else {
                    // Parse the item value
                    // Check if this is a multi-line object by looking for a colon and checking next lines
                    const currentLine = this.lexer.getCurrentLineText();
                    const currentPos = this.lexer.getCurrentCharNumber();
                    const remainingLine = currentLine.substring(currentPos);
                    // Check if there's a colon on this line (indicating object properties)
                    const hasColon = remainingLine.includes(':');
                    if (hasColon) {
                        // Any line with a colon should be treated as an object
                        // Parse as an object with the current item's indentation as the base
                        const item = this.parseBlockObject(itemStart.character, itemStart.character);
                        items.push(item);
                    }
                    else {
                        // No colon, parse as regular value
                        const item = this.parseValue();
                        items.push(item);
                        // Skip to end of line
                        while (!this.lexer.isAtEnd() && this.lexer.getCurrentChar() !== '' && this.lexer.getCurrentChar() !== '#') {
                            this.lexer.advance();
                        }
                        this.lexer.advanceLine();
                    }
                }
            }
            else {
                // No dash found at expected indent level, break
                break;
            }
        }
        // Calculate end position based on the last item
        let end = start;
        if (items.length > 0) {
            const lastItem = items[items.length - 1];
            end = lastItem.end;
        }
        else {
            // If no items, end is right after the start
            end = createPosition(start.line, start.character + 1);
        }
        return createArrayNode(items, start, end);
    }
    parseBlockObject(baseIndent, baseCharPosition) {
        const start = this.lexer.getCurrentPosition();
        const properties = [];
        const localKeysSeen = new Set();
        // For parsing from current position (inline object parsing)
        const fromCurrentPosition = baseCharPosition !== undefined;
        let firstIteration = true;
        while (!this.lexer.isAtEnd()) {
            if (!firstIteration || !fromCurrentPosition) {
                this.lexer.moveToNextNonEmptyLine();
            }
            firstIteration = false;
            if (this.lexer.isAtEnd()) {
                break;
            }
            const currentIndent = this.lexer.getIndentation();
            if (fromCurrentPosition) {
                // For current position parsing, check character position alignment
                this.lexer.skipWhitespace();
                const currentCharPosition = this.lexer.getCurrentCharNumber();
                if (currentCharPosition < baseCharPosition) {
                    break;
                }
            }
            else {
                // For normal block parsing, check indentation level
                if (currentIndent < baseIndent) {
                    break;
                }
                // Check for incorrect indentation
                if (currentIndent > baseIndent) {
                    const lineStart = createPosition(this.lexer.getCurrentLineNumber(), 0);
                    const lineEnd = createPosition(this.lexer.getCurrentLineNumber(), this.lexer.getCurrentLineText().length);
                    this.addError('Unexpected indentation', 'indentation', lineStart, lineEnd);
                    // Try to recover by treating it as a property anyway
                    this.lexer.skipWhitespace();
                }
                else {
                    this.lexer.skipWhitespace();
                }
            }
            // Parse key
            const keyStart = this.lexer.getCurrentPosition();
            let keyValue = '';
            while (!this.lexer.isAtEnd() && this.lexer.getCurrentChar() !== '' && this.lexer.getCurrentChar() !== ':') {
                keyValue += this.lexer.advance();
            }
            keyValue = keyValue.trim();
            const keyEnd = this.lexer.getCurrentPosition();
            const key = createStringNode(keyValue, keyStart, keyEnd);
            // Check for duplicate keys
            if (!this.options.allowDuplicateKeys && localKeysSeen.has(keyValue)) {
                this.addError(`Duplicate key '${keyValue}'`, 'duplicateKey', keyStart, keyEnd);
            }
            localKeysSeen.add(keyValue);
            // Expect colon
            if (this.lexer.getCurrentChar() === ':') {
                this.lexer.advance();
            }
            this.lexer.skipWhitespace();
            // Determine if value is on same line or next line(s)
            let value;
            const valueStart = this.lexer.getCurrentPosition();
            if (this.lexer.getCurrentChar() === '' || this.lexer.getCurrentChar() === '#') {
                // Value is on next line(s) or empty
                this.lexer.advanceLine();
                // Check next line for nested content
                if (!this.lexer.isAtEnd()) {
                    const nextIndent = this.lexer.getIndentation();
                    if (nextIndent > currentIndent) {
                        // Nested content - determine if it's an object, array, or just a scalar value
                        this.lexer.skipWhitespace();
                        if (this.lexer.getCurrentChar() === '-') {
                            value = this.parseBlockArray(nextIndent);
                        }
                        else {
                            // Check if this looks like an object property (has a colon)
                            const currentLine = this.lexer.getCurrentLineText();
                            const currentPos = this.lexer.getCurrentCharNumber();
                            const remainingLine = currentLine.substring(currentPos);
                            if (remainingLine.includes(':') && !remainingLine.trim().startsWith('#')) {
                                // It's a nested object
                                value = this.parseBlockObject(nextIndent);
                            }
                            else {
                                // It's just a scalar value on the next line
                                value = this.parseValue();
                            }
                        }
                    }
                    else if (!fromCurrentPosition && nextIndent === currentIndent) {
                        // Same indentation level - check if it's an array item
                        this.lexer.skipWhitespace();
                        if (this.lexer.getCurrentChar() === '-') {
                            value = this.parseBlockArray(currentIndent);
                        }
                        else {
                            value = createStringNode('', valueStart, valueStart);
                        }
                    }
                    else {
                        value = createStringNode('', valueStart, valueStart);
                    }
                }
                else {
                    value = createStringNode('', valueStart, valueStart);
                }
            }
            else {
                // Value is on the same line
                value = this.parseValue();
                // Skip any remaining content on this line (comments, etc.)
                while (!this.lexer.isAtEnd() && this.lexer.getCurrentChar() !== '' && this.lexer.getCurrentChar() !== '#') {
                    if (isWhitespace(this.lexer.getCurrentChar())) {
                        this.lexer.advance();
                    }
                    else {
                        break;
                    }
                }
                // Skip to end of line if we hit a comment
                if (this.lexer.getCurrentChar() === '#') {
                    this.lexer.skipToEndOfLine();
                }
                // Move to next line for next iteration
                if (!this.lexer.isAtEnd() && this.lexer.getCurrentChar() === '') {
                    this.lexer.advanceLine();
                }
            }
            properties.push({ key, value });
        }
        // Calculate the end position based on the last property
        let end = start;
        if (properties.length > 0) {
            const lastProperty = properties[properties.length - 1];
            end = lastProperty.value.end;
        }
        return createObjectNode(properties, start, end);
    }
    parse() {
        if (this.lexer.isAtEnd()) {
            return undefined;
        }
        this.lexer.moveToNextNonEmptyLine();
        if (this.lexer.isAtEnd()) {
            return undefined;
        }
        // Determine the root structure type
        this.lexer.skipWhitespace();
        if (this.lexer.getCurrentChar() === '-') {
            // Check if this is an array item or a negative number
            // Look at the character after the dash
            const nextChar = this.lexer.peek();
            if (nextChar === ' ' || nextChar === '\t' || nextChar === '' || nextChar === '#') {
                // It's an array item (dash followed by whitespace/end/comment)
                return this.parseBlockArray(0);
            }
            else {
                // It's likely a negative number or other value, treat as single value
                return this.parseValue();
            }
        }
        else if (this.lexer.getCurrentChar() === '[') {
            // Root is an inline array
            return this.parseInlineArray();
        }
        else if (this.lexer.getCurrentChar() === '{') {
            // Root is an inline object
            return this.parseInlineObject();
        }
        else {
            // Check if this looks like a key-value pair by looking for a colon
            // For single values, there shouldn't be a colon
            const currentLine = this.lexer.getCurrentLineText();
            const currentPos = this.lexer.getCurrentCharNumber();
            const remainingLine = currentLine.substring(currentPos);
            // Check if there's a colon that's not inside quotes
            let hasColon = false;
            let inQuotes = false;
            let quoteChar = '';
            for (let i = 0; i < remainingLine.length; i++) {
                const char = remainingLine[i];
                if (!inQuotes && (char === '"' || char === `'`)) {
                    inQuotes = true;
                    quoteChar = char;
                }
                else if (inQuotes && char === quoteChar) {
                    inQuotes = false;
                    quoteChar = '';
                }
                else if (!inQuotes && char === ':') {
                    hasColon = true;
                    break;
                }
                else if (!inQuotes && char === '#') {
                    // Comment starts, stop looking
                    break;
                }
            }
            if (hasColon) {
                // Root is an object
                return this.parseBlockObject(0);
            }
            else {
                // Root is a single value
                return this.parseValue();
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWFtbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3NhaGFtZWQvRGVza3RvcC9wdWt1LXZzLWVkaXRvci9wdWt1LWVkaXRvci9zcmMvdnNjb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3lhbWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQkc7QUFDSCxNQUFNLFVBQVUsS0FBSyxDQUFDLEtBQWEsRUFBRSxTQUEyQixFQUFFLEVBQUUsVUFBd0IsRUFBRTtJQUM3RiwwR0FBMEc7SUFDMUcsbUVBQW1FO0lBQ25FLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDL0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN0RCxPQUFPLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUN2QixDQUFDO0FBOERELGtEQUFrRDtBQUNsRCxTQUFTLGNBQWMsQ0FBQyxJQUFZLEVBQUUsU0FBaUI7SUFDdEQsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQztBQUM1QixDQUFDO0FBRUQsb0VBQW9FO0FBQ3BFLFNBQVMsZ0JBQWdCLENBQUMsS0FBYSxFQUFFLEtBQWUsRUFBRSxHQUFhO0lBQ3RFLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDOUMsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsS0FBYSxFQUFFLEtBQWUsRUFBRSxHQUFhO0lBQ3RFLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFF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