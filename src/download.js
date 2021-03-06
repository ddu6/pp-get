const csv=require('csv')
const fs= require('fs')
const path=require('path')
const http=require('http')
const https=require('https')
async function getVideos(){
    let useFirmURL=true
    let string0
    const errs=[]
    try{
        string0=fs.readFileSync(path.join(__dirname,'../classes.csv'),{encoding:'utf8'})
    }catch(err){throw err}
    if(!fs.existsSync(path.join(__dirname,'../archive/'))){
        fs.mkdirSync(path.join(__dirname,'../archive/'))
    }
    const array0=await new Promise(resolve=>{
        csv.parse(string0,{columns:true,comment:'#',trim:true,skip_lines_with_error:true},
        (err,val)=>{
            if(err)throw err
            resolve(val)
        })
    })
    for(let i=0;i<array0.length;i++){
        const item=array0[i]
        const {courseId,courseName,className,url,firmURL}=item
        if(typeof courseId!=='string'
        ||typeof courseName!=='string'
        ||typeof className!=='string'
        ||typeof firmURL!=='string'
        ||typeof url!=='string')continue
        const path0=path.join(__dirname,`../archive/${courseName} ${courseId}/`)
        if(!fs.existsSync(path0)){
            fs.mkdirSync(path0)
        }
        const path1=path.join(__dirname,`../archive/${courseName} ${courseId}/${className}.mp4`)
        if(fs.existsSync(path1))continue
        if(!useFirmURL){
            const result=await getVideo(path1,url)
            if(!result)errs.push(item)
            continue
        }
        const result=await getVideo(path1,firmURL)
        if(!result){
            useFirmURL=false
            console.log('ignore errors above')
            const result=await getVideo(path1,url)
            if(!result)errs.push(item)
        }
    }
    console.log(errs)
    return errs
}
async function getVideo(path0,url){
    const httpOrHTTPS=url.startsWith('https://')?https:http
    const result=await new Promise(resolve=>{
        const req=httpOrHTTPS.get(url,{
            headers:{
                'Referer': 'https://livingroomhqy.pku.edu.cn/'
            }
        },res=>{
            const {statusCode}=res
            if(statusCode!==200&&statusCode!==206){
                console.log(statusCode)
                resolve(false)
                return
            }
            const size0=res.headers["content-length"]
            let size1=0
            let delta=0
            let stream0
            try{
                stream0=fs.createWriteStream(path0)
            }catch(err){
                console.log(err)
                resolve(false)
                return
            }
            res.on('error',err=>{
                console.log(err)
                resolve(false)
            })
            stream0.on('error',err=>{
                console.log(err)
                resolve(false)
            })
            res.pipe(stream0)
            console.log(`${size1} / ${size0} ${path0}`)
            res.on('data',chunk=>{
                delta+=chunk.length
                if(delta<10000000)return
                size1+=delta
                delta=0
                console.log(`${size1} / ${size0} ${path0}`)
            })
            res.on('end',()=>{
                size1+=delta
                console.log(`${size1} / ${size0} ${path0}\n`)
                resolve(true)
            })
        }).on('error',err=>{
            console.log(err)
            resolve(false)
        })
    })
    return result
}
(async()=>{
    const errs=await getVideos()
})();