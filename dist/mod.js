"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.download = exports.collect = void 0;
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const init_1 = require("./init");
const csv = require("./csv");
const cli_tools_1 = require("@ddu6/cli-tools");
const clit = new cli_tools_1.CLIT(__dirname);
async function get(url, params = {}, cookie = '', referer = '') {
    const result = await clit.request(url, params, {}, cookie, referer);
    if (typeof result === 'number') {
        throw new Error(`${result.toString()}. Fail to get ${url}.`);
    }
    return result;
}
async function post(url, form = {}, cookie = '', referer = '') {
    const result = await clit.request(url, {}, form, cookie, referer);
    if (typeof result === 'number') {
        throw new Error(`${result.toString()}. Fail to post ${url}.`);
    }
    return result;
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
    const passwords = await csv.parse(passwordsStr);
    if (passwords.length === 0) {
        throw new Error('passwords.csv is not filled in correctly.');
    }
    for (let i = 0; i < passwords.length; i++) {
        const { studentId, password } = passwords[i];
        if (studentId === undefined || password === undefined) {
            continue;
        }
        const user = {
            password: password,
            blackboardSession: await getBlackboardSession(studentId, password),
            hqyToken: await getHQYToken(studentId, password)
        };
        users[studentId] = user;
        users0[studentId] = user;
        clit.out(`Get cookies of user ${studentId}.`);
    }
    fs.writeFileSync(path0, JSON.stringify(users0, undefined, 4));
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
    if (typeof token !== 'string') {
        throw new Error(`Fail to get login cookie of app ${appId}.`);
    }
    cookie = (await get(redirectURL, {
        _rand: Math.random().toString(),
        token: token
    })).cookie;
    return cookie;
}
async function getBlackboardSession(studentId, password) {
    let cookie = await getLoginCookie(studentId, password, 'blackboard', '1', 'https://course.pku.edu.cn/webapps/bb-sso-bb_bb60/execute/authValidate/campusLogin');
    const result = cookie.match(/s_session_id=([^;]{8,}?)(?:;|$)/);
    if (result === null) {
        throw new Error(`Fail to get blackboard session of user ${studentId}.`);
    }
    const session = result[1];
    if (typeof session !== 'string') {
        throw new Error(`Fail to get blackboard session of user ${studentId}.`);
    }
    return session;
}
async function getHQYToken(studentId, password) {
    let cookie = await getLoginCookie(studentId, password, 'portal2017', '北京大学校内信息门户新版', 'https://portal.pku.edu.cn/portal2017/ssoLogin.do');
    const { body } = await post('https://portal.pku.edu.cn/portal2017/account/getBasicInfo.do', {}, cookie);
    const { name } = JSON.parse(body);
    if (typeof name !== 'string') {
        throw new Error(`Fail to get hqy token of user ${studentId}.`);
    }
    cookie = (await get('https://passportnewhqy.pku.edu.cn/index.php', {
        r: 'auth/login',
        tenant_code: '1',
        auType: 'account',
        name: name,
        account: studentId
    })).cookie;
    const result = cookie.match(/_token=([^;]{16,}?)(?:;|$)/);
    if (result === null) {
        throw new Error(`Fail to get hqy token of user ${studentId}.`);
    }
    const token = result[1];
    if (typeof token !== 'string') {
        throw new Error(`Fail to get hqy token of user ${studentId}.`);
    }
    return token;
}
async function getCourseInfosAndLessonInfos(users) {
    const courseInfos = {};
    const allLessonInfos = [];
    const lessonInfos = [];
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
                    lessonIds: [],
                    lessonInfos: {}
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
        const { studentId, lessonInfos } = courseInfo;
        const { blackboardSession, hqyToken } = users[studentId];
        const lessonIds = await getLessonIds(blackboardSession, courseId);
        courseInfo.lessonIds = lessonIds;
        clit.out(`Find ${lessonIds.length} lesson videos of course ${courseId}.`);
        for (let i = 0; i < lessonIds.length; i++) {
            const lessonId = lessonIds[i];
            let lessonInfo;
            const tmp = lessonInfos[lessonId];
            if (typeof tmp === 'object' && tmp !== null) {
                lessonInfo = tmp;
            }
            else {
                const tmp = await getLessonInfo(hqyToken, lessonId);
                if (tmp === undefined) {
                    continue;
                }
                lessonInfos[lessonId] = tmp;
                lessonInfo = tmp;
            }
            allLessonInfos.push(Object.assign({
                lessonId: lessonId,
                courseId: courseId
            }, lessonInfo));
        }
    }
    fs.writeFileSync(path0, JSON.stringify(allCourseInfos, undefined, 4));
    allLessonInfos.sort((a, b) => {
        if (a.courseName < b.courseName) {
            return -1;
        }
        if (a.courseName > b.courseName) {
            return 1;
        }
        if (a.courseId < b.courseId) {
            return -1;
        }
        if (a.courseId > b.courseId) {
            return 1;
        }
        if (a.lessonName < b.lessonName) {
            return -1;
        }
        if (a.lessonName > b.lessonName) {
            return 1;
        }
        if (a.lessonId < b.lessonId) {
            return -1;
        }
        return 1;
    });
    fs.writeFileSync(path.join(__dirname, '../lessons-all.csv'), await csv.stringify(allLessonInfos, ['courseName', 'courseId', 'lessonName', 'lessonId', 'url', 'firmURL']));
    for (let i = 0; i < allLessonInfos.length; i++) {
        const lessonInfo = allLessonInfos[i];
        const { courseId, courseName, lessonName } = lessonInfo;
        const path0 = path.join(__dirname, `../archive/${courseName} ${courseId}/${lessonName}.mp4`);
        if (fs.existsSync(path0)) {
            continue;
        }
        lessonInfos.push(lessonInfo);
    }
    fs.writeFileSync(path.join(__dirname, '../lessons.csv'), await csv.stringify(lessonInfos, ['courseName', 'courseId', 'lessonName', 'lessonId', 'url', 'firmURL']));
    clit.out('Finished.');
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
        clit.log(err);
    }
    const result = body.match(/key=_\d+/g);
    if (result === null) {
        clit.log(`No course ids are got under blackboard session ${blackboardSession}.`);
        return [];
    }
    const courseIds = result.map(val => val.split('_')[1]);
    return courseIds;
}
async function getLessonIds(blackboardSession, courseId) {
    const { body } = await get('https://course.pku.edu.cn/webapps/bb-streammedia-hqy-bb_bb60/videoList.action', {
        course_id: `_${courseId}_1`
    }, `s_session_id=${blackboardSession}`);
    fs.writeFileSync(path.join(__dirname, `../info/courses/${courseId}.html`), body);
    try {
        let result = body.match(/hqyCourseId=\d+/);
        if (result === null) {
            throw new Error();
        }
        const hqyCourseId = result.map(val => val.slice('hqyCourseId='.length))[0];
        result = body.match(/hqySubId=\d+/g);
        if (result === null) {
            throw new Error();
        }
        const lessonIds = result.map(val => hqyCourseId + '-' + val.slice('hqySubId='.length));
        return lessonIds;
    }
    catch (err) {
        if (err instanceof Error) {
            err.message = `${err.message} Fail to get lesson ids of course ${courseId}.`.trimStart();
        }
        clit.log(err);
        return [];
    }
}
async function getLessonInfo(hqyToken, lessonId) {
    const [hqyCourseId, hqySubId] = lessonId.split('-');
    try {
        const { body } = await get('https://livingroomhqy.pku.edu.cn/courseapi/v2/schedule/search-live-course-list', {
            all: '1',
            course_id: hqyCourseId,
            sub_id: hqySubId,
            with_sub_data: '1'
        }, `_token=${hqyToken}`);
        fs.writeFileSync(path.join(__dirname, `../info/lessons/${lessonId}.json`), body);
        const { title, sub_title: subTitle, sub_content: sub } = JSON.parse(body).list[0];
        const { firm_source: { contents: firmURL }, save_playback: { contents: url } } = JSON.parse(sub);
        const info = {
            courseName: title,
            lessonName: subTitle,
            url: url,
            firmURL: firmURL
        };
        clit.out(`Get urls of lesson video ${lessonId}.`);
        return info;
    }
    catch (err) {
        clit.log(err);
        clit.out(`Fail to get urls of lesson video ${lessonId}.`);
    }
}
async function collect() {
    await getCourseInfosAndLessonInfos(await getUserInfos());
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
                clit.log('Lack content-length.');
                resolve(500);
                return;
            }
            const contentLength = Number(tmp);
            let currentLength = 0;
            let stream;
            try {
                stream = fs.createWriteStream(path0);
            }
            catch (err) {
                clit.log(err);
                resolve(500);
                return;
            }
            res.on('error', err => {
                clit.log(err);
                resolve(500);
            });
            stream.on('error', err => {
                clit.log(err);
                resolve(500);
            });
            res.pipe(stream);
            process.stdout.write(`${(currentLength / contentLength * 100).toFixed(3)}% of ${(contentLength / 1024 / 1024 / 1024).toFixed(1)}GiB downloaded to ${path0}.\r`);
            res.on('data', chunk => {
                currentLength += chunk.length;
                process.stdout.write(`${(currentLength / contentLength * 100).toFixed(3)}% of ${(contentLength / 1024 / 1024 / 1024).toFixed(1)}GiB downloaded to ${path0}.\r`);
            });
            res.on('end', () => {
                process.stdout.write(`${(currentLength / contentLength * 100).toFixed(3)}% of ${(contentLength / 1024 / 1024 / 1024).toFixed(1)}GiB downloaded to ${path0}.\r`);
                if (currentLength === contentLength) {
                    resolve(200);
                    return;
                }
                resolve(500);
            });
        }).on('error', err => {
            clit.log(err);
            resolve(500);
        });
    });
    return result;
}
async function download() {
    const lessonInfosStr = fs.readFileSync(path.join(__dirname, '../lessons.csv'), { encoding: 'utf8' });
    const lessonInfos = await csv.parse(lessonInfosStr);
    for (let i = 0; i < lessonInfos.length; i++) {
        const { courseId, courseName, lessonName, url, firmURL } = lessonInfos[i];
        if (courseId === undefined || courseName === undefined || lessonName === undefined || url === undefined || firmURL === undefined) {
            continue;
        }
        let path0 = path.join(__dirname, `../archive/${courseName} ${courseId}/`);
        if (!fs.existsSync(path0)) {
            fs.mkdirSync(path0);
        }
        path0 = path.join(__dirname, `../archive/${courseName} ${courseId}/${lessonName}.mp4`);
        if (fs.existsSync(path0)) {
            continue;
        }
        if (!init_1.config.useFirmURL) {
            const result = await getVideo(path0, url);
            if (result === 200) {
                clit.out(`Download ${url} to ${path0}.`);
                continue;
            }
            clit.out(`${result}. Fail to download ${url} to ${path0}.`);
            try {
                fs.unlinkSync(path0);
            }
            catch (err) {
                clit.log(err);
            }
            continue;
        }
        let result = await getVideo(path0, firmURL);
        if (result === 200) {
            clit.out(`Download ${firmURL} to ${path0}.`);
            continue;
        }
        clit.out(`${result}. Fail to download ${firmURL} to ${path0}.`);
        result = await getVideo(path0, url);
        if (result === 200) {
            clit.out(`Download ${url} to ${path0}.`);
            continue;
        }
        clit.out(`${result}. Fail to download ${url} to ${path0}.`);
        try {
            fs.unlinkSync(path0);
        }
        catch (err) {
            clit.log(err);
        }
    }
    clit.out('Finished.');
}
exports.download = download;
