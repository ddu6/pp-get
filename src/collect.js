const csv=require('csv')
const fs= require('fs')
const path=require('path')
const https=require('https')
const querystring=require('querystring')
async function getUsers(){
    let string0
    let users0
    const users1={}
    const path0=path.join(__dirname,'../info/user.json')
    try{
        string0=fs.readFileSync(path.join(__dirname,'../passwords.csv'),{encoding:'utf8'})
    }catch(err){throw err}
    try{
        if(fs.existsSync(path0)){
            users0=JSON.parse(fs.readFileSync(path0,{encoding:'utf8'}))
        }
        else users0={}
    }catch(err){users0={}}
    const array0=await new Promise(resolve=>{
        csv.parse(string0,{columns:true,comment:'#',trim:true,skip_lines_with_error:true},
        (err,val)=>{
            if(err)throw err
            resolve(val)
        })
    })
    if(array0.length===0)throw new Error()
    for(let i=0;i<array0.length;i++){
        const {studentId,password}=array0[i]
        console.log(studentId)
        if(typeof studentId!=='string'||typeof password!=='string')continue
        const session=await getSession(studentId,password)
        const token=await getToken(studentId,password)
        let item=users0[studentId]
        if(item===null||typeof item!=='object'){item={};users0[studentId]=item}
        users1[studentId]=item
        item.password=password
        item.session=session
        item.token=token
    }
    if(!fs.existsSync(path.join(__dirname,'../info/'))){
        fs.mkdirSync(path.join(__dirname,'../info/'))
    }
    fs.writeFileSync(path0,JSON.stringify(users0))
    return users1
}
async function getSession(studentId,password){
    const cookie0=await new Promise(resolve=>{
        const req=https.request('https://iaaa.pku.edu.cn/iaaa/oauth.jsp',{method:'POST'},
        res=>{
            const cookie=res.headers["set-cookie"].map(val=>val.split(';')[0]).join('; ')
            resolve(cookie)
        })
        req.write(querystring.stringify({
            appID:'blackboard',
            appName:'1',
            redirectUrl:'https://course.pku.edu.cn/webapps/bb-sso-bb_bb60/execute/authValidate/campusLogin'
        }))
        req.end()
    })
    console.log(cookie0)
    if(typeof cookie0!=='string')throw new Error()
    const token0=await new Promise(resolve=>{
        const req=https.request('https://iaaa.pku.edu.cn/iaaa/oauthlogin.do',{
            method:'POST',
            headers:{
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://iaaa.pku.edu.cn/iaaa/oauth.jsp',
                'Origin': 'https://iaaa.pku.edu.cn',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
                'Cookie': `remember=true; userName=${studentId}; ${cookie0}`
            }
        },
        res=>{
            let data=''
            res.on('data',chunk=>{data+=chunk})
            res.on('end',()=>{
                try{
                    const token=JSON.parse(data).token
                    resolve(token)
                }catch(err){console.log(err);resolve(false)}
            })
            res.on('error',err=>{console.log(err);resolve(false)})
        })
        req.write(querystring.stringify({
            appid:'blackboard',
            userName:studentId,
            password:password,
            randCode:'',
            smsCode:'',
            otpCode:'',
            redirUrl:'https://course.pku.edu.cn/webapps/bb-sso-bb_bb60/execute/authValidate/campusLogin'
        }))
        req.end()
    })
    console.log(token0)
    if(typeof token0!=='string')throw new Error()
    const session=await new Promise(resolve=>{
        const req=https.get(`https://course.pku.edu.cn/webapps/bb-sso-bb_bb60/execute/authValidate/campusLogin?_rand=${Math.random().toString()}&token=${token0}`,
        res=>{
            let session
            res.headers["set-cookie"].forEach(val=>{
                val=val.split(';')[0]
                if(val.startsWith('s_session_id='))
                session=val.slice('s_session_id='.length)
            })
            resolve(session)
        }).on('error',err=>{
            console.log(err)
            resolve(false)
        })
    })
    console.log(session)
    if(typeof session!=='string')throw new Error()
    return session
}
async function getToken(studentId,password){
    const cookie0=await new Promise(resolve=>{
        const req=https.get('https://iaaa.pku.edu.cn/iaaa/oauth.jsp?appID=portal2017&appName=%E5%8C%97%E4%BA%AC%E5%A4%A7%E5%AD%A6%E6%A0%A1%E5%86%85%E4%BF%A1%E6%81%AF%E9%97%A8%E6%88%B7%E6%96%B0%E7%89%88&redirectUrl=https%3A%2F%2Fportal.pku.edu.cn%2Fportal2017%2FssoLogin.do',
        res=>{
            const cookie=res.headers["set-cookie"].map(val=>val.split(';')[0]).join('; ')
            resolve(cookie)
        }).on('error',err=>{
            console.log(err)
            resolve(false)
        })
    })
    console.log(cookie0)
    if(typeof cookie0!=='string')throw new Error()
    const token0=await new Promise(resolve=>{
        const req=https.request('https://iaaa.pku.edu.cn/iaaa/oauthlogin.do',{
            method:'POST',
            headers:{
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': 'https://iaaa.pku.edu.cn/iaaa/oauth.jsp',
                'Origin': 'https://iaaa.pku.edu.cn',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
                'Cookie': `remember=true; userName=${studentId}; ${cookie0}`
            }
        },
        res=>{
            let data=''
            res.on('data',chunk=>{data+=chunk})
            res.on('end',()=>{
                try{
                    const token=JSON.parse(data).token
                    resolve(token)
                }catch(err){console.log(err);resolve(false)}
            })
            res.on('error',err=>{console.log(err);resolve(false)})
        })
        req.write(querystring.stringify({
            appid:'portal2017',
            userName:studentId,
            password:password,
            randCode:'',
            smsCode:'',
            otpCode:'',
            redirUrl:'https://portal.pku.edu.cn/portal2017/ssoLogin.do'
        }))
        req.end()
    })
    console.log(token0)
    if(typeof token0!=='string')throw new Error()
    const cookie1=await new Promise(resolve=>{
        const req=https.get(`https://portal.pku.edu.cn/portal2017/ssoLogin.do?_rand=${Math.random().toString()}&token=${token0}`,
        res=>{
            const cookie=res.headers["set-cookie"].map(val=>val.split(';')[0]).join('; ')
            resolve(cookie)
        }).on('error',err=>{
            console.log(err)
            resolve(false)
        })
    })
    console.log(cookie1)
    if(typeof cookie1!=='string')throw new Error()
    const name=await new Promise(resolve=>{
        const req=https.request('https://portal.pku.edu.cn/portal2017/account/getBasicInfo.do',{
            method:'POST',
            headers:{
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
                'Cookie': `${cookie1}`
            }
        },
        res=>{
            let data=''
            res.on('data',chunk=>{data+=chunk})
            res.on('end',()=>{
                try{
                    const name=JSON.parse(data).name
                    resolve(name)
                }catch(err){console.log(err);resolve(false)}
            })
            res.on('error',err=>{console.log(err);resolve(false)})
        })
        req.end()
    })
    console.log(name)
    if(typeof name!=='string')throw new Error()
    const token1=await new Promise(resolve=>{
        const req=https.get(`https://passportnewhqy.pku.edu.cn/index.php?r=auth/login&tenant_code=1&auType=account&name=${encodeURIComponent(name)}&account=${studentId}`,
        res=>{
            let token
            res.headers["set-cookie"].forEach(val=>{
                val=val.split(';')[0]
                if(val.startsWith('_token='))
                token=val.slice('_token='.length)
            })
            resolve(token)
        }).on('error',err=>{
            console.log(err)
            resolve(false)
        })
    })
    console.log(token1)
    if(typeof token1!=='string')throw new Error()
    return token1
}
async function getClasses1(users){
    let courses0
    const courses1={}
    const classes0=[]
    const classes1=[]
    const path0=path.join(__dirname,'../info/course.json')
    try{
        if(fs.existsSync(path0)){
            courses0=JSON.parse(fs.readFileSync(path0,{encoding:'utf8'}))
        }
        else courses0={}
    }catch(err){courses0={}}
    if(!fs.existsSync(path.join(__dirname,'../info/classes/'))){
        fs.mkdirSync(path.join(__dirname,'../info/classes/'))
    }
    if(!fs.existsSync(path.join(__dirname,'../info/courses/'))){
        fs.mkdirSync(path.join(__dirname,'../info/courses/'))
    }
    const keys0=Object.keys(users)
    for(let i=0;i<keys0.length;i++){
        const key=keys0[i]
        const {session}=users[key]
        if(typeof session!=='string')continue
        const array=await getCourses(session)
        for(let i=0;i<array.length;i++){
            const courseId=array[i]
            let item=courses0[courseId]
            if(item===null||typeof item!=='object'){item={};courses0[courseId]=item}
            courses1[courseId]=item
            item.user=key
        }
    }
    const keys1=Object.keys(courses1)
    for(let i=0;i<keys1.length;i++){
        const key=keys1[i]
        const item0=courses1[key]
        const {user}=item0
        if(typeof user!=='string')continue
        const {session,token}=users[user]
        if(typeof session!=='string'||typeof token!=='string')continue
        const array=await getClasses0(session,key)
        item0.classes=array
        for(let i=0;i<array.length;i++){
            const classId=array[i]
            let item1=item0[classId]
            if(typeof item1==='object'&&item1!==null){
                classes0.push(Object.assign({classId:classId,courseId:key},item1))
                continue
            }
            const info=await getClassInfo(token,classId)
            item0[classId]=info
            classes0.push(Object.assign({classId:classId,courseId:key},info))
        }
    }
    fs.writeFileSync(path0,JSON.stringify(courses0))
    classes0.sort((a,b)=>{
        if(a.courseName<b.courseName)return -1
        if(a.courseName>b.courseName)return 1
        if(a.className<b.className)return 1
        return -1
    })
    const string0=await new Promise(resolve=>{
        csv.stringify(classes0,{
            header:true,
            quoted_string:true,
            columns:['courseName','courseId','className','classId','url','firmURL']
        },
        (err,val)=>{
            if(err)throw err
            resolve(val)
        })
    })
    fs.writeFileSync(path.join(__dirname,'../classes-all.csv'),string0)
    for(let i=0;i<classes0.length;i++){
        const item=classes0[i]
        const {courseId,courseName,className}=item
        if(typeof courseId!=='string'
        ||typeof courseName!=='string'
        ||typeof className!=='string')continue
        const path0=path.join(__dirname,`../archive/${courseName}_${courseId}/${className}.mp4`)
        if(fs.existsSync(path0))continue
        classes1.push(item)
    }
    const string1=await new Promise(resolve=>{
        csv.stringify(classes1,{
            header:true,
            quoted_string:true,
            columns:['courseName','courseId','className','classId','url','firmURL']
        },
        (err,val)=>{
            if(err)throw err
            resolve(val)
        })
    })
    fs.writeFileSync(path.join(__dirname,'../classes.csv'),string1)
    return classes1
}
async function getCourses(session){
    const courses=await new Promise(resolve=>{
        const req=https.get('https://course.pku.edu.cn/webapps/portal/execute/tabs/tabAction?action=refreshAjaxModule&modId=_978_1&tabId=_1_1',
        {
            headers:{
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
                'Cookie': `s_session_id=${session}`
            }
        },res=>{
            let data=''
            res.on('data',chunk=>{data+=chunk})
            res.on('end',()=>{
                try{
                    const array=data.match(/key=_\d+/g).map(val=>val.split('_')[1])
                    resolve(array)
                }catch(err){console.log(err);resolve(false)}
            })
            res.on('error',err=>{console.log(err);resolve(false)})
        }).on('error',err=>{
            console.log(err)
            resolve(false)
        })
    })
    console.log(courses)
    if(!Array.isArray(courses))throw new Error()
    return courses
}
async function getClasses0(session,courseId){
    const classes=await new Promise(resolve=>{
        https.get(`https://course.pku.edu.cn/webapps/bb-streammedia-hqy-bb_bb60/videoList.action?course_id=_${courseId}_1`,{
            headers:{
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
                'Cookie': `s_session_id=${session}`
            }
        },res=>{
            let data=''
            res.on('data',chunk=>{data+=chunk})
            res.on('end',()=>{
                try{
                    const hqyCourseId=data.match(/hqyCourseId=\d+/).map(val=>val.slice('hqyCourseId='.length))[0]
                    const array=data.match(/hqySubId=\d+/g).map(val=>hqyCourseId+'_'+val.slice('hqySubId='.length))
                    resolve(array)
                    fs.writeFileSync(path.join(__dirname,`../info/courses/${courseId}.html`),data)
                }catch(err){resolve(false)}
            })
            res.on('error',err=>{console.log(err);resolve(false)})
        }).on('error',err=>{
            console.log(err)
            resolve(false)
        })
    })
    console.log(classes)
    if(!Array.isArray(classes))return []
    return classes
}
async function getClassInfo(token,classId){
    const [hqyCourseId,hqySubId]=classId.split('_')
    const info=await new Promise(resolve=>{
        https.get(`https://livingroomhqy.pku.edu.cn/courseapi/v2/schedule/search-live-course-list?all=1&course_id=${hqyCourseId}&sub_id=${hqySubId}&with_sub_data=1`,{
            headers:{
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
                'Cookie': `_token=${token}`
            }
        },res=>{
            let data=''
            res.on('data',chunk=>{data+=chunk})
            res.on('end',()=>{
                try{
                    const json=JSON.parse(data).list[0]
                    const title=json.title
                    const subTitle=json.sub_title
                    const subJSON=JSON.parse(json.sub_content)
                    const firmURL=subJSON.firm_source.contents
                    const url=subJSON.save_playback.contents
                    resolve({
                        courseName:title,
                        className:subTitle,
                        url:url,
                        firmURL:firmURL
                    })
                    fs.writeFileSync(path.join(__dirname,`../info/classes/${classId}.json`),data)
                }catch(err){console.log(err);resolve(false)}
            })
            res.on('error',err=>{console.log(err);resolve(false)})
        }).on('error',err=>{
            console.log(err)
            resolve(false)
        })
    })
    console.log(info)
    if(typeof info!=='object')return undefined
    return info
};
(async()=>{
    const users=await getUsers()
    const classes=await getClasses1(users)
})()