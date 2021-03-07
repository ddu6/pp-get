"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mod_1 = require("./mod");
(async () => {
    await mod_1.getCourseInfosAndClassInfos(await mod_1.getUserInfos());
})();
