/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual, ok } from 'assert';
import { parse } from '../../common/yaml.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
function assertValidParse(input, expected, expectedErrors, options) {
    const errors = [];
    const text = input.join('\n');
    const actual1 = parse(text, errors, options);
    deepStrictEqual(actual1, expected);
    deepStrictEqual(errors, expectedErrors);
}
function pos(line, character) {
    return { line, character };
}
suite('YAML Parser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('scalars', () => {
        test('numbers', () => {
            assertValidParse(['1'], { type: 'number', start: pos(0, 0), end: pos(0, 1), value: 1 }, []);
            assertValidParse(['1.234'], { type: 'number', start: pos(0, 0), end: pos(0, 5), value: 1.234 }, []);
            assertValidParse(['-42'], { type: 'number', start: pos(0, 0), end: pos(0, 3), value: -42 }, []);
        });
        test('boolean', () => {
            assertValidParse(['true'], { type: 'boolean', start: pos(0, 0), end: pos(0, 4), value: true }, []);
            assertValidParse(['false'], { type: 'boolean', start: pos(0, 0), end: pos(0, 5), value: false }, []);
        });
        test('null', () => {
            assertValidParse(['null'], { type: 'null', start: pos(0, 0), end: pos(0, 4), value: null }, []);
            assertValidParse(['~'], { type: 'null', start: pos(0, 0), end: pos(0, 1), value: null }, []);
        });
        test('string', () => {
            assertValidParse(['A Developer'], { type: 'string', start: pos(0, 0), end: pos(0, 11), value: 'A Developer' }, []);
            assertValidParse(['\'A Developer\''], { type: 'string', start: pos(0, 0), end: pos(0, 13), value: 'A Developer' }, []);
            assertValidParse(['"A Developer"'], { type: 'string', start: pos(0, 0), end: pos(0, 13), value: 'A Developer' }, []);
            assertValidParse(['*.js,*.ts'], { type: 'string', start: pos(0, 0), end: pos(0, 9), value: '*.js,*.ts' }, []);
        });
    });
    suite('objects', () => {
        test('simple properties', () => {
            assertValidParse(['name: John Doe'], {
                type: 'object', start: pos(0, 0), end: pos(0, 14), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 4), value: 'name' },
                        value: { type: 'string', start: pos(0, 6), end: pos(0, 14), value: 'John Doe' }
                    }
                ]
            }, []);
            assertValidParse(['age: 30'], {
                type: 'object', start: pos(0, 0), end: pos(0, 7), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 3), value: 'age' },
                        value: { type: 'number', start: pos(0, 5), end: pos(0, 7), value: 30 }
                    }
                ]
            }, []);
            assertValidParse(['active: true'], {
                type: 'object', start: pos(0, 0), end: pos(0, 12), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 6), value: 'active' },
                        value: { type: 'boolean', start: pos(0, 8), end: pos(0, 12), value: true }
                    }
                ]
            }, []);
            assertValidParse(['value: null'], {
                type: 'object', start: pos(0, 0), end: pos(0, 11), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 5), value: 'value' },
                        value: { type: 'null', start: pos(0, 7), end: pos(0, 11), value: null }
                    }
                ]
            }, []);
        });
        test('value on next line', () => {
            assertValidParse([
                'name:',
                '  John Doe',
                'colors:',
                '  [ Red, Green, Blue ]',
            ], {
                type: 'object', start: pos(0, 0), end: pos(3, 22), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 4), value: 'name' },
                        value: { type: 'string', start: pos(1, 2), end: pos(1, 10), value: 'John Doe' }
                    },
                    {
                        key: { type: 'string', start: pos(2, 0), end: pos(2, 6), value: 'colors' },
                        value: {
                            type: 'array', start: pos(3, 2), end: pos(3, 22), items: [
                                { type: 'string', start: pos(3, 4), end: pos(3, 7), value: 'Red' },
                                { type: 'string', start: pos(3, 9), end: pos(3, 14), value: 'Green' },
                                { type: 'string', start: pos(3, 16), end: pos(3, 20), value: 'Blue' }
                            ]
                        }
                    }
                ]
            }, []);
        });
        test('multiple properties', () => {
            assertValidParse([
                'name: John Doe',
                'age: 30'
            ], {
                type: 'object', start: pos(0, 0), end: pos(1, 7), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 4), value: 'name' },
                        value: { type: 'string', start: pos(0, 6), end: pos(0, 14), value: 'John Doe' }
                    },
                    {
                        key: { type: 'string', start: pos(1, 0), end: pos(1, 3), value: 'age' },
                        value: { type: 'number', start: pos(1, 5), end: pos(1, 7), value: 30 }
                    }
                ]
            }, []);
        });
        test('nested object', () => {
            assertValidParse([
                'person:',
                '  name: John Doe',
                '  age: 30'
            ], {
                type: 'object', start: pos(0, 0), end: pos(2, 9), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 6), value: 'person' },
                        value: {
                            type: 'object', start: pos(1, 2), end: pos(2, 9), properties: [
                                {
                                    key: { type: 'string', start: pos(1, 2), end: pos(1, 6), value: 'name' },
                                    value: { type: 'string', start: pos(1, 8), end: pos(1, 16), value: 'John Doe' }
                                },
                                {
                                    key: { type: 'string', start: pos(2, 2), end: pos(2, 5), value: 'age' },
                                    value: { type: 'number', start: pos(2, 7), end: pos(2, 9), value: 30 }
                                }
                            ]
                        }
                    }
                ]
            }, []);
        });
        test('nested objects with address', () => {
            assertValidParse([
                'person:',
                '  name: John Doe',
                '  age: 30',
                '  address:',
                '    street: 123 Main St',
                '    city: Example City'
            ], {
                type: 'object', start: pos(0, 0), end: pos(5, 22), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 6), value: 'person' },
                        value: {
                            type: 'object', start: pos(1, 2), end: pos(5, 22),
                            properties: [
                                {
                                    key: { type: 'string', start: pos(1, 2), end: pos(1, 6), value: 'name' },
                                    value: { type: 'string', start: pos(1, 8), end: pos(1, 16), value: 'John Doe' }
                                },
                                {
                                    key: { type: 'string', start: pos(2, 2), end: pos(2, 5), value: 'age' },
                                    value: { type: 'number', start: pos(2, 7), end: pos(2, 9), value: 30 }
                                },
                                {
                                    key: { type: 'string', start: pos(3, 2), end: pos(3, 9), value: 'address' },
                                    value: {
                                        type: 'object', start: pos(4, 4), end: pos(5, 22), properties: [
                                            {
                                                key: { type: 'string', start: pos(4, 4), end: pos(4, 10), value: 'street' },
                                                value: { type: 'string', start: pos(4, 12), end: pos(4, 23), value: '123 Main St' }
                                            },
                                            {
                                                key: { type: 'string', start: pos(5, 4), end: pos(5, 8), value: 'city' },
                                                value: { type: 'string', start: pos(5, 10), end: pos(5, 22), value: 'Example City' }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                ]
            }, []);
        });
        test('properties without space after colon', () => {
            assertValidParse(['name:John'], {
                type: 'object', start: pos(0, 0), end: pos(0, 9), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 4), value: 'name' },
                        value: { type: 'string', start: pos(0, 5), end: pos(0, 9), value: 'John' }
                    }
                ]
            }, []);
            // Test mixed: some properties with space, some without
            assertValidParse([
                'config:',
                '  database:',
                '    host:localhost',
                '    port: 5432',
                '    credentials:',
                '      username:admin',
                '      password: secret123'
            ], {
                type: 'object', start: pos(0, 0), end: pos(6, 25), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 6), value: 'config' },
                        value: {
                            type: 'object', start: pos(1, 2), end: pos(6, 25), properties: [
                                {
                                    key: { type: 'string', start: pos(1, 2), end: pos(1, 10), value: 'database' },
                                    value: {
                                        type: 'object', start: pos(2, 4), end: pos(6, 25), properties: [
                                            {
                                                key: { type: 'string', start: pos(2, 4), end: pos(2, 8), value: 'host' },
                                                value: { type: 'string', start: pos(2, 9), end: pos(2, 18), value: 'localhost' }
                                            },
                                            {
                                                key: { type: 'string', start: pos(3, 4), end: pos(3, 8), value: 'port' },
                                                value: { type: 'number', start: pos(3, 10), end: pos(3, 14), value: 5432 }
                                            },
                                            {
                                                key: { type: 'string', start: pos(4, 4), end: pos(4, 15), value: 'credentials' },
                                                value: {
                                                    type: 'object', start: pos(5, 6), end: pos(6, 25), properties: [
                                                        {
                                                            key: { type: 'string', start: pos(5, 6), end: pos(5, 14), value: 'username' },
                                                            value: { type: 'string', start: pos(5, 15), end: pos(5, 20), value: 'admin' }
                                                        },
                                                        {
                                                            key: { type: 'string', start: pos(6, 6), end: pos(6, 14), value: 'password' },
                                                            value: { type: 'string', start: pos(6, 16), end: pos(6, 25), value: 'secret123' }
                                                        }
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                ]
            }, []);
        });
        test('inline objects', () => {
            assertValidParse(['{name: John, age: 30}'], {
                type: 'object', start: pos(0, 0), end: pos(0, 21), properties: [
                    {
                        key: { type: 'string', start: pos(0, 1), end: pos(0, 5), value: 'name' },
                        value: { type: 'string', start: pos(0, 7), end: pos(0, 11), value: 'John' }
                    },
                    {
                        key: { type: 'string', start: pos(0, 13), end: pos(0, 16), value: 'age' },
                        value: { type: 'number', start: pos(0, 18), end: pos(0, 20), value: 30 }
                    }
                ]
            }, []);
            // Test with different data types
            assertValidParse(['{active: true, score: 85.5, role: null}'], {
                type: 'object', start: pos(0, 0), end: pos(0, 39), properties: [
                    {
                        key: { type: 'string', start: pos(0, 1), end: pos(0, 7), value: 'active' },
                        value: { type: 'boolean', start: pos(0, 9), end: pos(0, 13), value: true }
                    },
                    {
                        key: { type: 'string', start: pos(0, 15), end: pos(0, 20), value: 'score' },
                        value: { type: 'number', start: pos(0, 22), end: pos(0, 26), value: 85.5 }
                    },
                    {
                        key: { type: 'string', start: pos(0, 28), end: pos(0, 32), value: 'role' },
                        value: { type: 'null', start: pos(0, 34), end: pos(0, 38), value: null }
                    }
                ]
            }, []);
            // Test empty inline object
            assertValidParse(['{}'], {
                type: 'object', start: pos(0, 0), end: pos(0, 2), properties: []
            }, []);
            // Test inline object with quoted keys and values
            assertValidParse(['{"name": "John Doe", "age": 30}'], {
                type: 'object', start: pos(0, 0), end: pos(0, 31), properties: [
                    {
                        key: { type: 'string', start: pos(0, 1), end: pos(0, 7), value: 'name' },
                        value: { type: 'string', start: pos(0, 9), end: pos(0, 19), value: 'John Doe' }
                    },
                    {
                        key: { type: 'string', start: pos(0, 21), end: pos(0, 26), value: 'age' },
                        value: { type: 'number', start: pos(0, 28), end: pos(0, 30), value: 30 }
                    }
                ]
            }, []);
            // Test inline object without spaces
            assertValidParse(['{name:John,age:30}'], {
                type: 'object', start: pos(0, 0), end: pos(0, 18), properties: [
                    {
                        key: { type: 'string', start: pos(0, 1), end: pos(0, 5), value: 'name' },
                        value: { type: 'string', start: pos(0, 6), end: pos(0, 10), value: 'John' }
                    },
                    {
                        key: { type: 'string', start: pos(0, 11), end: pos(0, 14), value: 'age' },
                        value: { type: 'number', start: pos(0, 15), end: pos(0, 17), value: 30 }
                    }
                ]
            }, []);
            // Test multi-line inline object with internal comment line between properties
            assertValidParse(['{a:1, # comment about b', ' b:2, c:3}'], {
                type: 'object', start: pos(0, 0), end: pos(1, 10), properties: [
                    {
                        key: { type: 'string', start: pos(0, 1), end: pos(0, 2), value: 'a' },
                        value: { type: 'number', start: pos(0, 3), end: pos(0, 4), value: 1 }
                    },
                    {
                        key: { type: 'string', start: pos(1, 1), end: pos(1, 2), value: 'b' },
                        value: { type: 'number', start: pos(1, 3), end: pos(1, 4), value: 2 }
                    },
                    {
                        key: { type: 'string', start: pos(1, 6), end: pos(1, 7), value: 'c' },
                        value: { type: 'number', start: pos(1, 8), end: pos(1, 9), value: 3 }
                    }
                ]
            }, []);
        });
        test('special characters in values', () => {
            // Test values with special characters
            assertValidParse([`key: value with \t special chars`], {
                type: 'object', start: pos(0, 0), end: pos(0, 31), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 3), value: 'key' },
                        value: { type: 'string', start: pos(0, 5), end: pos(0, 31), value: `value with \t special chars` }
                    }
                ]
            }, []);
        });
        test('various whitespace types', () => {
            // Test different types of whitespace
            assertValidParse([`key:\t \t \t value`], {
                type: 'object', start: pos(0, 0), end: pos(0, 15), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 3), value: 'key' },
                        value: { type: 'string', start: pos(0, 10), end: pos(0, 15), value: 'value' }
                    }
                ]
            }, []);
        });
    });
    suite('arrays', () => {
        test('arrays', () => {
            assertValidParse([
                '- Boston Red Sox',
                '- Detroit Tigers',
                '- New York Yankees'
            ], {
                type: 'array', start: pos(0, 0), end: pos(2, 18), items: [
                    { type: 'string', start: pos(0, 2), end: pos(0, 16), value: 'Boston Red Sox' },
                    { type: 'string', start: pos(1, 2), end: pos(1, 16), value: 'Detroit Tigers' },
                    { type: 'string', start: pos(2, 2), end: pos(2, 18), value: 'New York Yankees' }
                ]
            }, []);
        });
        test('inline arrays', () => {
            assertValidParse(['[Apple, Banana, Cherry]'], {
                type: 'array', start: pos(0, 0), end: pos(0, 23), items: [
                    { type: 'string', start: pos(0, 1), end: pos(0, 6), value: 'Apple' },
                    { type: 'string', start: pos(0, 8), end: pos(0, 14), value: 'Banana' },
                    { type: 'string', start: pos(0, 16), end: pos(0, 22), value: 'Cherry' }
                ]
            }, []);
        });
        test('inline array with internal comment line', () => {
            assertValidParse(['[one # comment about two', ',two, three]'], {
                type: 'array', start: pos(0, 0), end: pos(1, 12), items: [
                    { type: 'string', start: pos(0, 1), end: pos(0, 4), value: 'one' },
                    { type: 'string', start: pos(1, 1), end: pos(1, 4), value: 'two' },
                    { type: 'string', start: pos(1, 6), end: pos(1, 11), value: 'three' }
                ]
            }, []);
        });
        test('multi-line inline arrays', () => {
            assertValidParse([
                '[',
                '    geen, ',
                '    yello, red]'
            ], {
                type: 'array', start: pos(0, 0), end: pos(2, 15), items: [
                    { type: 'string', start: pos(1, 4), end: pos(1, 8), value: 'geen' },
                    { type: 'string', start: pos(2, 4), end: pos(2, 9), value: 'yello' },
                    { type: 'string', start: pos(2, 11), end: pos(2, 14), value: 'red' }
                ]
            }, []);
        });
        test('arrays of arrays', () => {
            assertValidParse([
                '-',
                '  - Apple',
                '  - Banana',
                '  - Cherry'
            ], {
                type: 'array', start: pos(0, 0), end: pos(3, 10), items: [
                    {
                        type: 'array', start: pos(1, 2), end: pos(3, 10), items: [
                            { type: 'string', start: pos(1, 4), end: pos(1, 9), value: 'Apple' },
                            { type: 'string', start: pos(2, 4), end: pos(2, 10), value: 'Banana' },
                            { type: 'string', start: pos(3, 4), end: pos(3, 10), value: 'Cherry' }
                        ]
                    }
                ]
            }, []);
        });
        test('inline arrays of inline arrays', () => {
            assertValidParse([
                '[',
                '  [ee], [ff, gg]',
                ']',
            ], {
                type: 'array', start: pos(0, 0), end: pos(2, 1), items: [
                    {
                        type: 'array', start: pos(1, 2), end: pos(1, 6), items: [
                            { type: 'string', start: pos(1, 3), end: pos(1, 5), value: 'ee' },
                        ],
                    },
                    {
                        type: 'array', start: pos(1, 8), end: pos(1, 16), items: [
                            { type: 'string', start: pos(1, 9), end: pos(1, 11), value: 'ff' },
                            { type: 'string', start: pos(1, 13), end: pos(1, 15), value: 'gg' },
                        ],
                    }
                ]
            }, []);
        });
        test('object with array containing single object', () => {
            assertValidParse([
                'items:',
                '- name: John',
                '  age: 30'
            ], {
                type: 'object', start: pos(0, 0), end: pos(2, 9), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 5), value: 'items' },
                        value: {
                            type: 'array', start: pos(1, 0), end: pos(2, 9), items: [
                                {
                                    type: 'object', start: pos(1, 2), end: pos(2, 9), properties: [
                                        {
                                            key: { type: 'string', start: pos(1, 2), end: pos(1, 6), value: 'name' },
                                            value: { type: 'string', start: pos(1, 8), end: pos(1, 12), value: 'John' }
                                        },
                                        {
                                            key: { type: 'string', start: pos(2, 2), end: pos(2, 5), value: 'age' },
                                            value: { type: 'number', start: pos(2, 7), end: pos(2, 9), value: 30 }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            }, []);
        });
        test('arrays of objects', () => {
            assertValidParse([
                '-',
                '  name: one',
                '- name: two',
                '-',
                '  name: three'
            ], {
                type: 'array', start: pos(0, 0), end: pos(4, 13), items: [
                    {
                        type: 'object', start: pos(1, 2), end: pos(1, 11), properties: [
                            {
                                key: { type: 'string', start: pos(1, 2), end: pos(1, 6), value: 'name' },
                                value: { type: 'string', start: pos(1, 8), end: pos(1, 11), value: 'one' }
                            }
                        ]
                    },
                    {
                        type: 'object', start: pos(2, 2), end: pos(2, 11), properties: [
                            {
                                key: { type: 'string', start: pos(2, 2), end: pos(2, 6), value: 'name' },
                                value: { type: 'string', start: pos(2, 8), end: pos(2, 11), value: 'two' }
                            }
                        ]
                    },
                    {
                        type: 'object', start: pos(4, 2), end: pos(4, 13), properties: [
                            {
                                key: { type: 'string', start: pos(4, 2), end: pos(4, 6), value: 'name' },
                                value: { type: 'string', start: pos(4, 8), end: pos(4, 13), value: 'three' }
                            }
                        ]
                    }
                ]
            }, []);
        });
    });
    suite('complex structures', () => {
        test('array of objects', () => {
            assertValidParse([
                'products:',
                '  - name: Laptop',
                '    price: 999.99',
                '    in_stock: true',
                '  - name: Mouse',
                '    price: 25.50',
                '    in_stock: false'
            ], {
                type: 'object', start: pos(0, 0), end: pos(6, 19), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 8), value: 'products' },
                        value: {
                            type: 'array', start: pos(1, 2), end: pos(6, 19), items: [
                                {
                                    type: 'object', start: pos(1, 4), end: pos(3, 18), properties: [
                                        {
                                            key: { type: 'string', start: pos(1, 4), end: pos(1, 8), value: 'name' },
                                            value: { type: 'string', start: pos(1, 10), end: pos(1, 16), value: 'Laptop' }
                                        },
                                        {
                                            key: { type: 'string', start: pos(2, 4), end: pos(2, 9), value: 'price' },
                                            value: { type: 'number', start: pos(2, 11), end: pos(2, 17), value: 999.99 }
                                        },
                                        {
                                            key: { type: 'string', start: pos(3, 4), end: pos(3, 12), value: 'in_stock' },
                                            value: { type: 'boolean', start: pos(3, 14), end: pos(3, 18), value: true }
                                        }
                                    ]
                                },
                                {
                                    type: 'object', start: pos(4, 4), end: pos(6, 19), properties: [
                                        {
                                            key: { type: 'string', start: pos(4, 4), end: pos(4, 8), value: 'name' },
                                            value: { type: 'string', start: pos(4, 10), end: pos(4, 15), value: 'Mouse' }
                                        },
                                        {
                                            key: { type: 'string', start: pos(5, 4), end: pos(5, 9), value: 'price' },
                                            value: { type: 'number', start: pos(5, 11), end: pos(5, 16), value: 25.50 }
                                        },
                                        {
                                            key: { type: 'string', start: pos(6, 4), end: pos(6, 12), value: 'in_stock' },
                                            value: { type: 'boolean', start: pos(6, 14), end: pos(6, 19), value: false }
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                ]
            }, []);
        });
        test('inline array mixed primitives', () => {
            assertValidParse(['vals: [1, true, null, "str"]'], {
                type: 'object', start: pos(0, 0), end: pos(0, 28), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 4), value: 'vals' },
                        value: {
                            type: 'array', start: pos(0, 6), end: pos(0, 28), items: [
                                { type: 'number', start: pos(0, 7), end: pos(0, 8), value: 1 },
                                { type: 'boolean', start: pos(0, 10), end: pos(0, 14), value: true },
                                { type: 'null', start: pos(0, 16), end: pos(0, 20), value: null },
                                { type: 'string', start: pos(0, 22), end: pos(0, 27), value: 'str' }
                            ]
                        }
                    }
                ]
            }, []);
        });
        test('mixed inline structures', () => {
            assertValidParse(['config: {env: "prod", settings: [true, 42], debug: false}'], {
                type: 'object', start: pos(0, 0), end: pos(0, 57), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 6), value: 'config' },
                        value: {
                            type: 'object', start: pos(0, 8), end: pos(0, 57), properties: [
                                {
                                    key: { type: 'string', start: pos(0, 9), end: pos(0, 12), value: 'env' },
                                    value: { type: 'string', start: pos(0, 14), end: pos(0, 20), value: 'prod' }
                                },
                                {
                                    key: { type: 'string', start: pos(0, 22), end: pos(0, 30), value: 'settings' },
                                    value: {
                                        type: 'array', start: pos(0, 32), end: pos(0, 42), items: [
                                            { type: 'boolean', start: pos(0, 33), end: pos(0, 37), value: true },
                                            { type: 'number', start: pos(0, 39), end: pos(0, 41), value: 42 }
                                        ]
                                    }
                                },
                                {
                                    key: { type: 'string', start: pos(0, 44), end: pos(0, 49), value: 'debug' },
                                    value: { type: 'boolean', start: pos(0, 51), end: pos(0, 56), value: false }
                                }
                            ]
                        }
                    }
                ]
            }, []);
        });
        test('with comments', () => {
            assertValidParse([
                `# This is a comment`,
                'name: John Doe  # inline comment',
                'age: 30'
            ], {
                type: 'object', start: pos(1, 0), end: pos(2, 7), properties: [
                    {
                        key: { type: 'string', start: pos(1, 0), end: pos(1, 4), value: 'name' },
                        value: { type: 'string', start: pos(1, 6), end: pos(1, 14), value: 'John Doe' }
                    },
                    {
                        key: { type: 'string', start: pos(2, 0), end: pos(2, 3), value: 'age' },
                        value: { type: 'number', start: pos(2, 5), end: pos(2, 7), value: 30 }
                    }
                ]
            }, []);
        });
    });
    suite('edge cases and error handling', () => {
        // Edge cases
        test('duplicate keys error', () => {
            assertValidParse([
                'key: 1',
                'key: 2'
            ], {
                type: 'object', start: pos(0, 0), end: pos(1, 6), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 3), value: 'key' },
                        value: { type: 'number', start: pos(0, 5), end: pos(0, 6), value: 1 }
                    },
                    {
                        key: { type: 'string', start: pos(1, 0), end: pos(1, 3), value: 'key' },
                        value: { type: 'number', start: pos(1, 5), end: pos(1, 6), value: 2 }
                    }
                ]
            }, [
                {
                    message: 'Duplicate key \'key\'',
                    code: 'duplicateKey',
                    start: pos(1, 0),
                    end: pos(1, 3)
                }
            ]);
        });
        test('duplicate keys allowed with option', () => {
            assertValidParse([
                'key: 1',
                'key: 2'
            ], {
                type: 'object', start: pos(0, 0), end: pos(1, 6), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 3), value: 'key' },
                        value: { type: 'number', start: pos(0, 5), end: pos(0, 6), value: 1 }
                    },
                    {
                        key: { type: 'string', start: pos(1, 0), end: pos(1, 3), value: 'key' },
                        value: { type: 'number', start: pos(1, 5), end: pos(1, 6), value: 2 }
                    }
                ]
            }, [], { allowDuplicateKeys: true });
        });
        test('unexpected indentation error with recovery', () => {
            // Parser reports error but still captures the over-indented property.
            assertValidParse([
                'key: 1',
                '    stray: value'
            ], {
                type: 'object', start: pos(0, 0), end: pos(1, 16), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 3), value: 'key' },
                        value: { type: 'number', start: pos(0, 5), end: pos(0, 6), value: 1 }
                    },
                    {
                        key: { type: 'string', start: pos(1, 4), end: pos(1, 9), value: 'stray' },
                        value: { type: 'string', start: pos(1, 11), end: pos(1, 16), value: 'value' }
                    }
                ]
            }, [
                {
                    message: 'Unexpected indentation',
                    code: 'indentation',
                    start: pos(1, 0),
                    end: pos(1, 16)
                }
            ]);
        });
        test('empty values and inline empty array', () => {
            assertValidParse([
                'empty:',
                'array: []'
            ], {
                type: 'object', start: pos(0, 0), end: pos(1, 9), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 5), value: 'empty' },
                        value: { type: 'string', start: pos(0, 6), end: pos(0, 6), value: '' }
                    },
                    {
                        key: { type: 'string', start: pos(1, 0), end: pos(1, 5), value: 'array' },
                        value: { type: 'array', start: pos(1, 7), end: pos(1, 9), items: [] }
                    }
                ]
            }, []);
        });
        test('nested empty objects', () => {
            // Parser should create nodes for both parent and child, with child having empty string value.
            assertValidParse([
                'parent:',
                '  child:'
            ], {
                type: 'object', start: pos(0, 0), end: pos(1, 8), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 6), value: 'parent' },
                        value: {
                            type: 'object', start: pos(1, 2), end: pos(1, 8), properties: [
                                {
                                    key: { type: 'string', start: pos(1, 2), end: pos(1, 7), value: 'child' },
                                    value: { type: 'string', start: pos(1, 8), end: pos(1, 8), value: '' }
                                }
                            ]
                        }
                    }
                ]
            }, []);
        });
        test('empty object with only colons', () => {
            // Test object with empty values
            assertValidParse(['key1:', 'key2:', 'key3:'], {
                type: 'object', start: pos(0, 0), end: pos(2, 5), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 4), value: 'key1' },
                        value: { type: 'string', start: pos(0, 5), end: pos(0, 5), value: '' }
                    },
                    {
                        key: { type: 'string', start: pos(1, 0), end: pos(1, 4), value: 'key2' },
                        value: { type: 'string', start: pos(1, 5), end: pos(1, 5), value: '' }
                    },
                    {
                        key: { type: 'string', start: pos(2, 0), end: pos(2, 4), value: 'key3' },
                        value: { type: 'string', start: pos(2, 5), end: pos(2, 5), value: '' }
                    }
                ]
            }, []);
        });
        test('large input performance', () => {
            // Test that large inputs are handled efficiently
            const input = Array.from({ length: 1000 }, (_, i) => `key${i}: value${i}`);
            const expectedProperties = Array.from({ length: 1000 }, (_, i) => ({
                key: { type: 'string', start: pos(i, 0), end: pos(i, `key${i}`.length), value: `key${i}` },
                value: { type: 'string', start: pos(i, `key${i}: `.length), end: pos(i, `key${i}: value${i}`.length), value: `value${i}` }
            }));
            const start = Date.now();
            assertValidParse(input, {
                type: 'object',
                start: pos(0, 0),
                end: pos(999, 'key999: value999'.length),
                properties: expectedProperties
            }, []);
            const duration = Date.now() - start;
            ok(duration < 100, `Parsing took ${duration}ms, expected < 100ms`);
        });
        test('deeply nested structure performance', () => {
            // Test that deeply nested structures are handled efficiently
            const lines = [];
            for (let i = 0; i < 50; i++) {
                const indent = '  '.repeat(i);
                lines.push(`${indent}level${i}:`);
            }
            lines.push('  '.repeat(50) + 'deepValue: reached');
            const start = Date.now();
            const errors = [];
            const result = parse(lines.join('\n'), errors);
            const duration = Date.now() - start;
            ok(result);
            strictEqual(result.type, 'object');
            strictEqual(errors.length, 0);
            ok(duration < 100, `Parsing took ${duration}ms, expected < 100ms`);
        });
        test('malformed array with position issues', () => {
            // Test malformed arrays that might cause position advancement issues
            assertValidParse([
                'key: [',
                '',
                '',
                '',
                ''
            ], {
                type: 'object', start: pos(0, 0), end: pos(5, 0), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 3), value: 'key' },
                        value: { type: 'array', start: pos(0, 5), end: pos(5, 0), items: [] }
                    }
                ]
            }, []);
        });
        test('self-referential like structure', () => {
            // Test structures that might appear self-referential
            assertValidParse([
                'a:',
                '  b:',
                '    a:',
                '      b:',
                '        value: test'
            ], {
                type: 'object', start: pos(0, 0), end: pos(4, 19), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 1), value: 'a' },
                        value: {
                            type: 'object', start: pos(1, 2), end: pos(4, 19), properties: [
                                {
                                    key: { type: 'string', start: pos(1, 2), end: pos(1, 3), value: 'b' },
                                    value: {
                                        type: 'object', start: pos(2, 4), end: pos(4, 19), properties: [
                                            {
                                                key: { type: 'string', start: pos(2, 4), end: pos(2, 5), value: 'a' },
                                                value: {
                                                    type: 'object', start: pos(3, 6), end: pos(4, 19), properties: [
                                                        {
                                                            key: { type: 'string', start: pos(3, 6), end: pos(3, 7), value: 'b' },
                                                            value: {
                                                                type: 'object', start: pos(4, 8), end: pos(4, 19), properties: [
                                                                    {
                                                                        key: { type: 'string', start: pos(4, 8), end: pos(4, 13), value: 'value' },
                                                                        value: { type: 'string', start: pos(4, 15), end: pos(4, 19), value: 'test' }
                                                                    }
                                                                ]
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                }
                            ]
                        }
                    }
                ]
            }, []);
        });
        test('array with empty lines', () => {
            // Test arrays spanning multiple lines with empty lines
            assertValidParse(['arr: [', '', 'item1,', '', 'item2', '', ']'], {
                type: 'object', start: pos(0, 0), end: pos(6, 1), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 3), value: 'arr' },
                        value: {
                            type: 'array', start: pos(0, 5), end: pos(6, 1), items: [
                                { type: 'string', start: pos(2, 0), end: pos(2, 5), value: 'item1' },
                                { type: 'string', start: pos(4, 0), end: pos(4, 5), value: 'item2' }
                            ]
                        }
                    }
                ]
            }, []);
        });
        test('whitespace advancement robustness', () => {
            // Test that whitespace advancement works correctly
            assertValidParse([`key:      value`], {
                type: 'object', start: pos(0, 0), end: pos(0, 15), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 3), value: 'key' },
                        value: { type: 'string', start: pos(0, 10), end: pos(0, 15), value: 'value' }
                    }
                ]
            }, []);
        });
        test('missing end quote in string values', () => {
            // Test unclosed double quote - parser treats it as bare string with quote included
            assertValidParse(['name: "John'], {
                type: 'object', start: pos(0, 0), end: pos(0, 11), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 4), value: 'name' },
                        value: { type: 'string', start: pos(0, 6), end: pos(0, 11), value: 'John' }
                    }
                ]
            }, []);
            // Test unclosed single quote - parser treats it as bare string with quote included
            assertValidParse(['description: \'Hello world'], {
                type: 'object', start: pos(0, 0), end: pos(0, 25), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 11), value: 'description' },
                        value: { type: 'string', start: pos(0, 13), end: pos(0, 25), value: 'Hello world' }
                    }
                ]
            }, []);
            // Test unclosed quote in multi-line context
            assertValidParse([
                'data: "incomplete',
                'next: value'
            ], {
                type: 'object', start: pos(0, 0), end: pos(1, 11), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 4), value: 'data' },
                        value: { type: 'string', start: pos(0, 6), end: pos(0, 17), value: 'incomplete' }
                    },
                    {
                        key: { type: 'string', start: pos(1, 0), end: pos(1, 4), value: 'next' },
                        value: { type: 'string', start: pos(1, 6), end: pos(1, 11), value: 'value' }
                    }
                ]
            }, []);
            // Test properly quoted strings for comparison
            assertValidParse(['name: "John"'], {
                type: 'object', start: pos(0, 0), end: pos(0, 12), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 4), value: 'name' },
                        value: { type: 'string', start: pos(0, 6), end: pos(0, 12), value: 'John' }
                    }
                ]
            }, []);
        });
        test('comment in inline array #269078', () => {
            // Test malformed array with comment-like content - should not cause endless loop
            assertValidParse([
                'mode: agent',
                'tools: [#r'
            ], {
                type: 'object', start: pos(0, 0), end: pos(2, 0), properties: [
                    {
                        key: { type: 'string', start: pos(0, 0), end: pos(0, 4), value: 'mode' },
                        value: { type: 'string', start: pos(0, 6), end: pos(0, 11), value: 'agent' }
                    },
                    {
                        key: { type: 'string', start: pos(1, 0), end: pos(1, 5), value: 'tools' },
                        value: { type: 'array', start: pos(1, 7), end: pos(2, 0), items: [] }
                    }
                ]
            }, []);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieWFtbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvc2FoYW1lZC9EZXNrdG9wL3B1a3UtdnMtZWRpdG9yL3B1a3UtZWRpdG9yL3NyYy92c2NvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2NvbW1vbi95YW1sLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQW9ELE1BQU0sc0JBQXNCLENBQUM7QUFDL0YsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBR3JFLFNBQVMsZ0JBQWdCLENBQUMsS0FBZSxFQUFFLFFBQWtCLEVBQUUsY0FBZ0MsRUFBRSxPQUFzQjtJQUN0SCxNQUFNLE1BQU0sR0FBcUIsRUFBRSxDQUFDO0lBQ3BDLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDN0MsZUFBZSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNuQyxlQUFlLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQ3pDLENBQUM7QUFFRCxTQUFTLEdBQUcsQ0FBQyxJQUFZLEVBQUUsU0FBaUI7SUFDM0MsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQztBQUM1QixDQUFDO0FBRUQsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFFekIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtRQUVyQixJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtZQUNwQixnQkFBZ0IsQ0FBQyxD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RSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRTtpQ0FDdEU7Z0NBQ0Q7b0NBQ0MsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFO29DQUMzRSxLQUFLLEVBQUU7d0NBQ04sSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUU7NENBQzlEO2dEQUNDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRTtnREFDM0UsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFOzZDQUNuRjs0Q0FDRDtnREFDQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7Z0RBQ3hFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRTs2Q0FDcEY7eUNBQ0Q7cUNBQ0Q7aUNBQ0Q7NkJBQ0Q7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRCxFQUNELEVBQUUsQ0FDRixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO1lBQ2pELGdCQUFnQixDQUNmLENBQUMsV0FBVyxDQUFDLEVBQ2I7Z0JBQ0MsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUU7b0JBQzdEO3dCQUNDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTt3QkFDeEUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO3FCQUMxRTtpQkFDRDthQUNELEVBQ0QsRUFBRSxDQUNGLENBQUM7WUFFRix1REFBdUQ7WUFDdkQsZ0JBQWdCLENBQ2Y7Z0JBQ0MsU0FBUztnQkFDVCxhQUFhO2dCQUNiLG9CQUFvQjtnQkFDcEIsZ0JBQWdCO2dCQUNoQixrQkFBa0I7Z0JBQ2xCLHNCQUFzQjtnQkFDdEIsMkJBQTJCO2FBQzNCLEVBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUU7b0JBQzlEO3dCQUNDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRTt3QkFDMUUsS0FBSyxFQUFFOzRCQUNOLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFO2dDQUM5RDtvQ0FDQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUU7b0NBQzdFLEtBQUssRUFBRTt3Q0FDTixJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRTs0Q0FDOUQ7Z0RBQ0MsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO2dEQUN4RSxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUU7NkNBQ2hGOzRDQUNEO2dEQUNDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtnREFDeEUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFOzZDQUMxRTs0Q0FDRDtnREFDQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUU7Z0RBQ2hGLEtBQUssRUFBRTtvREFDTixJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRTt3REFDOUQ7NERBQ0MsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxH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Q0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRTtnQ0FDeEUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFOzZCQUMxRTt5QkFDRDtxQkFDRDtvQkFDRDt3QkFDQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRTs0QkFDOUQ7Z0NBQ0MsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO2dDQUN4RSxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUU7NkJBQzFFO3lCQUNEO3FCQUNEO29CQUNEO3dCQUNDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFOzRCQUM5RDtnQ0FDQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7Z0NBQ3hFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRTs2QkFDNUU7eUJBQ0Q7cUJBQ0Q7aUJBQ0Q7YUFDRCxFQUNELEVBQUUsQ0FDRixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7UUFFaEMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtZQUM3QixnQkFBZ0IsQ0FDZjtnQkFDQyxXQUFXO2dCQUNYLGtCQUFrQjtnQkFDbEIsbUJBQW1CO2dCQUNuQixvQkFBb0I7Z0JBQ3BCLGlCQUFpQjtnQkFDakIsa0JBQWtCO2dCQUNsQixxQkFBcUI7YUFDckIsRUFDRDtnQkFDQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRTtvQkFDOUQ7d0JBQ0MsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFO3dCQUM1RSxLQUFLLEVBQUU7NEJBQ04sSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUU7Z0NBQ3hEO29DQUNDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFO3dDQUM5RDs0Q0FDQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7NENBQ3hFLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRTt5Q0FDOUU7d0NBQ0Q7NENBQ0MsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFOzRDQUN6RSxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUU7eUNBQzVFO3dDQUNEOzRDQUNDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRTs0Q0FDN0UsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO3lDQUMzRTtxQ0FDRDtpQ0FDRDtnQ0FDRDtvQ0FDQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRTt3Q0FDOUQ7NENBQ0MsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFOzRDQUN4RSxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUU7eUNBQzdFO3dDQUNEOzRDQUNDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRTs0Q0FDekUsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFF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QUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFVBQVUsRUFBRTtnQ0FDOUQ7b0NBQ0MsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFO29DQUNyRSxLQUFLLEVBQUU7d0NBQ04sSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxVQUFVLEVBQUU7NENBQzlEO2dEQUNDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRTtnREFDckUsS0FBSyxFQUFFO29EQUNOLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFO3dEQUM5RDs0REFDQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUU7NERBQ3JFLEtBQUssRUFBRTtnRUFDTixJQUFJLEVBQUUsUUFBUSxFQUFF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