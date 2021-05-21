import * as fs from 'fs'
import * as path from 'path'
[
    '../archive/',
    '../info/',
    '../info/classes/',
    '../info/courses/'
].map(val=>path.join(__dirname,val)).forEach(val=>{
    if(!fs.existsSync(val))fs.mkdirSync(val)
})
export const config={
    collectOldCourses:false,
    useFirmURL:true,
    timeout:10,
}
let path0=path.join(__dirname,'../config.json')
if(!fs.existsSync(path0))fs.writeFileSync(path0,JSON.stringify(config,null,4))
path0=path.join(__dirname,'../passwords.csv')
if(!fs.existsSync(path0))fs.writeFileSync(path0,'studentId,password\n# 1x000xxxxx,xxxxxxxx\n# 1x000xxxxx,xxxxxxxx\n')