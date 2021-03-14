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
let path0=path.join(__dirname,'../passwords.csv')
if(!fs.existsSync(path0))fs.writeFileSync(path0,'studentId,password\n# 1x000xxxxx,xxxxxxxx\n# 1x000xxxxx,xxxxxxxx\n')
path0=path.join(__dirname,'../config.json')
if(!fs.existsSync(path0))fs.writeFileSync(path0,
`{
    "collectOldCourses":false,
    "useFirmURL":true
}`)
