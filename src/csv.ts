import * as csv from 'csv'
export async function parse(string:string){
    const result=await new Promise((resolve:(val:Record<string,string>[])=>void)=>{
        csv.parse(string,{
            columns:true,
            comment:'#',
            trim:true,
            skip_lines_with_error:true
        },(err,val)=>{
            if(err){
                throw err
            }
            resolve(val)
        })
    })
    return result
}
export async function stringify(json:any,columns:string[]){
    const string=await new Promise((resolve:(val:string)=>void)=>{
        csv.stringify(json,{
            header:true,
            quoted_string:true,
            columns:columns
        },(err,val)=>{
            if(err){
                throw err
            }
            resolve(val)
        })
    })
    return string
}