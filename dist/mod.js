"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.download = exports.collect = void 0;
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const init_1 = require("./init");
const csv = require("csv");
Object.assign(init_1.config, JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), { encoding: 'utf8' })));
function getDate() {
    const date = new Date();
    return [date.getMonth() + 1, date.getDate()].map(val => val.toString().padStart(2, '0')).join('-') + ' ' + [date.getHours(), date.getMinutes(), date.getSeconds()].map(val => val.toString().padStart(2, '0')).join(':') + ':' + date.getMilliseconds().toString().padStart(3, '0');
}
function semilog(msg) {
    let string = getDate() + '  ';
    if (typeof msg !== 'string') {
        const { stack } = msg;
        if (stack !== undefined) {
            string += stack;
        }
        else {
            string += msg.message;
        }
    }
    else {
        string += msg;
    }
    string = string.replace(/\n */g, '\n                    ');
    fs.appendFileSync(path.join(__dirname, '../info/semilog.txt'), string + '\n\n');
    return string;
}
function log(msg) {
    const string = semilog(msg);
    console.log(string + '\n');
}
async function basicallyGet(url, params = {}, form = {}, cookie = '', referer = '', noUserAgent = false) {
    let paramsStr = new URL(url).searchParams.toString();
    if (paramsStr.length > 0) {
        paramsStr += '&';
    }
    paramsStr += new URLSearchParams(params).toString();
    if (paramsStr.length > 0) {
        paramsStr = '?' + paramsStr;
    }
    url = new URL(paramsStr, url).href;
    const formStr = new URLSearchParams(form).toString();
    const headers = {};
    if (cookie.length > 0) {
        headers.Cookie = cookie;
    }
    if (referer.length > 0) {
        headers.Referer = referer;
    }
    if (!noUserAgent) {
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36';
    }
    if (formStr.length > 0) {
        Object.assign(headers, {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
        });
    }
    const options = {
        method: formStr.length > 0 ? 'POST' : 'GET',
        headers: headers
    };
    const result = await new Promise((resolve) => {
        setTimeout(() => {
            resolve(500);
        }, init_1.config.timeout * 1000);
        const httpsOrHTTP = url.startsWith('https://') ? https : http;
        const req = httpsOrHTTP.request(url, options, async (res) => {
            const { statusCode } = res;
            if (statusCode === undefined) {
                resolve(500);
                return;
            }
            if (statusCode >= 400) {
                resolve(statusCode);
                return;
            }
            let cookie;
            const cookie0 = res.headers["set-cookie"];
            if (cookie0 === undefined) {
                cookie = '';
            }
            else {
                cookie = cookie0.map(val => val.split(';')[0]).join('; ');
            }
            let body = '';
            const buffers = [];
            res.on('data', chunk => {
                if (typeof chunk === 'string') {
                    body += chunk;
                }
                else if (chunk instanceof Buffer) {
                    body += chunk;
                    buffers.push(chunk);
                }
            });
            res.on('end', () => {
                resolve({
                    body: body,
                    buffer: Buffer.concat(buffers),
                    cookie: cookie,
                    headers: res.headers,
                    status: statusCode
                });
            });
            res.on('error', err => {
                semilog(err);
                resolve(500);
            });
        }).on('error', err => {
            semilog(err);
            resolve(500);
        });
        if (formStr.length > 0) {
            req.write(formStr);
        }
        req.end();
    });
    return result;
}
async function get(url, params = {}, cookie = '', referer = '') {
    const result = await basicallyGet(url, params, {}, cookie, referer);
    if (typeof result === 'number')
        throw new Error(`${result.toString()}. Fail to get ${url}.`);
    return result;
}
async function post(url, form = {}, cookie = '', referer = '') {
    const result = await basicallyGet(url, {}, form, cookie, referer);
    if (typeof result === 'number')
        throw new Error(`${result.toString()}. Fail to post ${url}.`);
    return result;
}
async function parseCSV(string) {
    const result = await new Promise((resolve) => {
        csv.parse(string, {
            columns: true,
            comment: '#',
            trim: true,
            skip_lines_with_error: true
        }, (err, val) => {
            if (err)
                throw err;
            resolve(val);
        });
    });
    return result;
}
async function stringifyCSV(json, columns) {
    const string = await new Promise((resolve) => {
        csv.stringify(json, {
            header: true,
            quoted_string: true,
            columns: columns
        }, (err, val) => {
            if (err)
                throw err;
            resolve(val);
        });
    });
    return string;
}
async function getUserInfos() {
    const users = {};
    const path0 = path.join(__dirname, '../info/user.json');
    const passwordsStr = fs.readFileSync(path.join(__dirname, '../passwords.csv'), { encoding: 'utf8' });
    let users0;
    try {
        users0 = JSON.parse(fs.readFileSync(path0, { encoding: 'utf8' }));
    }
    catch (err) {
        users0 = {};
    }
    const passwords = await parseCSV(passwordsStr);
    if (passwords.length === 0)
        throw new Error('passwords.csv is not filled in correctly.');
    for (let i = 0; i < passwords.length; i++) {
        const { studentId, password } = passwords[i];
        const user = {
            password: password,
            blackboardSession: await getBlackboardSession(studentId, password),
            hqyToken: await getHQYToken(studentId, password)
        };
        users[studentId] = user;
        users0[studentId] = user;
        log(`Get cookies of user ${studentId}.`);
    }
    fs.writeFileSync(path0, JSON.stringify(users0));
    return users;
}
async function getLoginCookie(studentId, password, appId, appName, redirectURL) {
    let { cookie } = await get('https://iaaa.pku.edu.cn/iaaa/oauth.jsp', {
        appID: appId,
        appName: appName,
        redirectUrl: redirectURL
    });
    const { body } = await post('https://iaaa.pku.edu.cn/iaaa/oauthlogin.do', {
        appid: appId,
        userName: studentId,
        password: password,
        randCode: '',
        smsCode: '',
        otpCode: '',
        redirUrl: redirectURL
    }, `remember=true; userName=${studentId}; ${cookie}`, 'https://iaaa.pku.edu.cn/iaaa/oauth.jsp');
    const { token } = JSON.parse(body);
    if (typeof token !== 'string')
        throw new Error(`Fail to get login cookie of app ${appId}.`);
    cookie = (await get(redirectURL, {
        _rand: Math.random().toString(),
        token: token
    })).cookie;
    return cookie;
}
async function getBlackboardSession(studentId, password) {
    let cookie = await getLoginCookie(studentId, password, 'blackboard', '1', 'https://course.pku.edu.cn/webapps/bb-sso-bb_bb60/execute/authValidate/campusLogin');
    const result = cookie.match(/s_session_id=([^;]{8,}?)(?:;|$)/);
    if (result === null)
        throw new Error(`Fail to get blackboard session of user ${studentId}.`);
    const session = result[1];
    if (typeof session !== 'string')
        throw new Error(`Fail to get blackboard session of user ${studentId}.`);
    return session;
}
async function getHQYToken(studentId, password) {
    let cookie = await getLoginCookie(studentId, password, 'portal2017', '北京大学校内信息门户新版', 'https://portal.pku.edu.cn/portal2017/ssoLogin.do');
    const { body } = await post('https://portal.pku.edu.cn/portal2017/account/getBasicInfo.do', {}, cookie);
    const { name } = JSON.parse(body);
    if (typeof name !== 'string')
        throw new Error(`Fail to get hqy token of user ${studentId}.`);
    cookie = (await get('https://passportnewhqy.pku.edu.cn/index.php', {
        r: 'auth/login',
        tenant_code: '1',
        auType: 'account',
        name: name,
        account: studentId
    })).cookie;
    const result = cookie.match(/_token=([^;]{16,}?)(?:;|$)/);
    if (result === null)
        throw new Error(`Fail to get hqy token of user ${studentId}.`);
    const token = result[1];
    if (typeof token !== 'string')
        throw new Error(`Fail to get hqy token of user ${studentId}.`);
    return token;
}
async function getCourseInfosAndClassInfos(users) {
    const courseInfos = {};
    const allClassInfos = [];
    const classInfos = [];
    const path0 = path.join(__dirname, '../info/course.json');
    let allCourseInfos;
    try {
        allCourseInfos = JSON.parse(fs.readFileSync(path0, { encoding: 'utf8' }));
    }
    catch (err) {
        allCourseInfos = {};
    }
    const studentIds = Object.keys(users);
    for (let i = 0; i < studentIds.length; i++) {
        const studentId = studentIds[i];
        const { blackboardSession } = users[studentId];
        const courseIds = await getCourseIds(blackboardSession);
        for (let i = 0; i < courseIds.length; i++) {
            const courseId = courseIds[i];
            let courseInfo;
            const tmp = allCourseInfos[courseId];
            if (typeof tmp === 'object' && tmp !== null) {
                courseInfo = tmp;
                courseInfo.studentId = studentId;
            }
            else {
                courseInfo = {
                    studentId: studentId,
                    classIds: [],
                    classInfos: {}
                };
                allCourseInfos[courseId] = courseInfo;
            }
            courseInfos[courseId] = courseInfo;
        }
    }
    const courseIds = Object.keys(courseInfos);
    for (let i = 0; i < courseIds.length; i++) {
        const courseId = courseIds[i];
        const courseInfo = courseInfos[courseId];
        const { studentId, classInfos } = courseInfo;
        const { blackboardSession, hqyToken } = users[studentId];
        const classIds = await getClassIds(blackboardSession, courseId);
        courseInfo.classIds = classIds;
        log(`Find ${classIds.length} class videos of course ${courseId}.`);
        for (let i = 0; i < classIds.length; i++) {
            const classId = classIds[i];
            let classInfo;
            const tmp = classInfos[classId];
            if (typeof tmp === 'object' && tmp !== null) {
                classInfo = tmp;
            }
            else {
                const tmp = await getClassInfo(hqyToken, classId);
                if (tmp === undefined)
                    continue;
                classInfos[classId] = tmp;
                classInfo = tmp;
            }
            allClassInfos.push(Object.assign({
                classId: classId,
                courseId: courseId
            }, classInfo));
        }
    }
    fs.writeFileSync(path0, JSON.stringify(allCourseInfos));
    allClassInfos.sort((a, b) => {
        if (a.courseName < b.courseName)
            return -1;
        if (a.courseName > b.courseName)
            return 1;
        if (a.courseId < b.courseId)
            return -1;
        if (a.courseId > b.courseId)
            return 1;
        if (a.className < b.className)
            return -1;
        if (a.className > b.className)
            return 1;
        if (a.classId < b.classId)
            return -1;
        return 1;
    });
    fs.writeFileSync(path.join(__dirname, '../classes-all.csv'), await stringifyCSV(allClassInfos, ['courseName', 'courseId', 'className', 'classId', 'url', 'firmURL']));
    for (let i = 0; i < allClassInfos.length; i++) {
        const classInfo = allClassInfos[i];
        const { courseId, courseName, className } = classInfo;
        const path0 = path.join(__dirname, `../archive/${courseName} ${courseId}/${className}.mp4`);
        if (fs.existsSync(path0))
            continue;
        classInfos.push(classInfo);
    }
    fs.writeFileSync(path.join(__dirname, '../classes.csv'), await stringifyCSV(classInfos, ['courseName', 'courseId', 'className', 'classId', 'url', 'firmURL']));
    log('Finished.');
}
async function getCourseIds(blackboardSession) {
    let body = '';
    if (init_1.config.collectOldCourses) {
        body += (await get('https://course.pku.edu.cn/webapps/portal/execute/tabs/tabAction', {
            action: 'refreshAjaxModule',
            modId: '_978_1',
            tabId: '_1_1'
        }, `s_session_id=${blackboardSession}`)).body;
    }
    try {
        body += (await get('https://course.pku.edu.cn/webapps/portal/execute/tabs/tabAction', {
            action: 'refreshAjaxModule',
            modId: '_977_1',
            tabId: '_1_1'
        }, `s_session_id=${blackboardSession}`)).body;
    }
    catch (err) {
        semilog(err);
    }
    const result = body.match(/key=_\d+/g);
    if (result === null) {
        semilog(`No course ids are got under blackboard session ${blackboardSession}.`);
        return [];
    }
    const courseIds = result.map(val => val.split('_')[1]);
    return courseIds;
}
async function getClassIds(blackboardSession, courseId) {
    const { body } = await get('https://course.pku.edu.cn/webapps/bb-streammedia-hqy-bb_bb60/videoList.action', {
        course_id: `_${courseId}_1`
    }, `s_session_id=${blackboardSession}`);
    fs.writeFileSync(path.join(__dirname, `../info/courses/${courseId}.html`), body);
    try {
        let result = body.match(/hqyCourseId=\d+/);
        if (result === null)
            throw new Error();
        const hqyCourseId = result.map(val => val.slice('hqyCourseId='.length))[0];
        result = body.match(/hqySubId=\d+/g);
        if (result === null)
            throw new Error();
        const classIds = result.map(val => hqyCourseId + '-' + val.slice('hqySubId='.length));
        return classIds;
    }
    catch (err) {
        if (err instanceof Error) {
            err.message = `${err.message} Fail to get class ids of course ${courseId}.`.trimStart();
        }
        semilog(err);
        return [];
    }
}
async function getClassInfo(hqyToken, classId) {
    const [hqyCourseId, hqySubId] = classId.split('-');
    try {
        const { body } = await get('https://livingroomhqy.pku.edu.cn/courseapi/v2/schedule/search-live-course-list', {
            all: '1',
            course_id: hqyCourseId,
            sub_id: hqySubId,
            with_sub_data: '1'
        }, `_token=${hqyToken}`);
        fs.writeFileSync(path.join(__dirname, `../info/classes/${classId}.json`), body);
        const { title, sub_title: subTitle, sub_content: sub } = JSON.parse(body).list[0];
        const { firm_source: { contents: firmURL }, save_playback: { contents: url } } = JSON.parse(sub);
        const info = {
            courseName: title,
            className: subTitle,
            url: url,
            firmURL: firmURL
        };
        log(`Get urls of class video ${classId}.`);
        return info;
    }
    catch (err) {
        semilog(err);
        log(`Fail to get urls of class video ${classId}.`);
    }
}
async function collect() {
    await getCourseInfosAndClassInfos(await getUserInfos());
}
exports.collect = collect;
async function getVideo(path0, url) {
    const httpOrHTTPS = url.startsWith('https://') ? https : http;
    const result = await new Promise((resolve) => {
        httpOrHTTPS.get(url, {
            headers: {
                'Referer': 'https://livingroomhqy.pku.edu.cn/'
            }
        }, res => {
            const { statusCode } = res;
            if (statusCode === undefined) {
                resolve(500);
                return;
            }
            if (statusCode !== 200 && statusCode !== 206) {
                resolve(statusCode);
                return;
            }
            const tmp = res.headers["content-length"];
            if (tmp === undefined) {
                semilog('Lack content-length.');
                resolve(500);
                return;
            }
            const contentLength = Number(tmp);
            let currentLength = 0;
            let delta = 0;
            let stream;
            try {
                stream = fs.createWriteStream(path0);
            }
            catch (err) {
                semilog(err);
                resolve(500);
                return;
            }
            res.on('error', err => {
                semilog(err);
                resolve(500);
            });
            stream.on('error', err => {
                semilog(err);
                resolve(500);
            });
            res.pipe(stream);
            process.stdout.write(`${(currentLength / contentLength * 100).toFixed(3)}% of ${(contentLength / 1024 / 1024 / 1024).toFixed(1)}GiB downloaded to ${path0}.\r`);
            res.on('data', chunk => {
                delta += chunk.length;
                // if(delta<1000000)return
                currentLength += delta;
                delta = 0;
                process.stdout.write(`${(currentLength / contentLength * 100).toFixed(3)}% of ${(contentLength / 1024 / 1024 / 1024).toFixed(1)}GiB downloaded to ${path0}.\r`);
            });
            res.on('end', () => {
                currentLength += delta;
                process.stdout.write(`${(currentLength / contentLength * 100).toFixed(3)}% of ${(contentLength / 1024 / 1024 / 1024).toFixed(1)}GiB downloaded to ${path0}.\r`);
                if (currentLength === contentLength) {
                    resolve(200);
                    return;
                }
                resolve(500);
            });
        }).on('error', err => {
            semilog(err);
            resolve(500);
        });
    });
    return result;
}
async function download() {
    const classInfosStr = fs.readFileSync(path.join(__dirname, '../classes.csv'), { encoding: 'utf8' });
    const classInfos = await parseCSV(classInfosStr);
    for (let i = 0; i < classInfos.length; i++) {
        const { courseId, courseName, className, url, firmURL } = classInfos[i];
        let path0 = path.join(__dirname, `../archive/${courseName} ${courseId}/`);
        if (!fs.existsSync(path0)) {
            fs.mkdirSync(path0);
        }
        path0 = path.join(__dirname, `../archive/${courseName} ${courseId}/${className}.mp4`);
        if (fs.existsSync(path0))
            continue;
        if (!init_1.config.useFirmURL) {
            const result = await getVideo(path0, url);
            if (result === 200) {
                log(`Download ${url} to ${path0}.`);
                continue;
            }
            log(`${result}. Fail to download ${url} to ${path0}.`);
            try {
                fs.unlinkSync(path0);
            }
            catch (err) {
                semilog(err);
            }
            continue;
        }
        let result = await getVideo(path0, firmURL);
        if (result === 200) {
            log(`Download ${firmURL} to ${path0}.`);
            continue;
        }
        log(`${result}. Fail to download ${firmURL} to ${path0}.`);
        result = await getVideo(path0, url);
        if (result === 200) {
            log(`Download ${url} to ${path0}.`);
            continue;
        }
        log(`${result}. Fail to download ${url} to ${path0}.`);
        try {
            fs.unlinkSync(path0);
        }
        catch (err) {
            semilog(err);
        }
    }
    log('Finished.');
}
exports.download = download;
