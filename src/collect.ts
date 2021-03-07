import {getUserInfos,getCourseInfosAndClassInfos} from './mod'
;(async()=>{
    await getCourseInfosAndClassInfos(await getUserInfos())
})()
