"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const fs = require("fs");
const path = require("path");
[
    '../archive/',
    '../info/',
    '../info/lessons/',
    '../info/courses/'
].map(val => path.join(__dirname, val)).forEach(val => {
    if (!fs.existsSync(val)) {
        fs.mkdirSync(val);
    }
});
exports.config = {
    collectOldCourses: false,
    useFirmURL: true,
};
let path0 = path.join(__dirname, '../config.json');
if (!fs.existsSync(path0)) {
    fs.writeFileSync(path0, JSON.stringify(exports.config, undefined, 4));
}
else {
    Object.assign(exports.config, JSON.parse(fs.readFileSync(path0, { encoding: 'utf8' })));
}
path0 = path.join(__dirname, '../passwords.csv');
if (!fs.existsSync(path0)) {
    fs.writeFileSync(path0, 'studentId,password\n# 1x000xxxxx,xxxxxxxx\n# 1x000xxxxx,xxxxxxxx\n');
}
