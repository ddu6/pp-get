const fs= require('fs')
const path=require('path')
const path0=path.join(__dirname,'../passwords.csv')
if(!fs.existsSync(path0)){
    fs.writeFileSync(path0,'studentId,password\n# 1x000xxxxx,xxxxxxxx\n# 1x000xxxxx,xxxxxxxx\n')
}