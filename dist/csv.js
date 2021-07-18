"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringify = exports.parse = void 0;
const csv = require("csv");
async function parse(string) {
    const result = await new Promise((resolve) => {
        csv.parse(string, {
            columns: true,
            comment: '#',
            trim: true,
            skip_lines_with_error: true
        }, (err, val) => {
            if (err) {
                throw err;
            }
            resolve(val);
        });
    });
    return result;
}
exports.parse = parse;
async function stringify(json, columns) {
    const string = await new Promise((resolve) => {
        csv.stringify(json, {
            header: true,
            quoted_string: true,
            columns: columns
        }, (err, val) => {
            if (err) {
                throw err;
            }
            resolve(val);
        });
    });
    return string;
}
exports.stringify = stringify;
