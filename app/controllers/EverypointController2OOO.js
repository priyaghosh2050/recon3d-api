const { BASE_URL,EVP_API_VERSION,EVP_BASE_URL,EVP_USER_ID,EVP_CUSTOMER_ID,EVP_API_USERNAME,EVP_API_PASSWORD,EVP_API_SRC_TYPE,FCM_KEY} = process.env;
const { body,validationResult } = require("express-validator");
const apiResponse = require("../helpers/apiResponse");
const everypointProcess = require("../helpers/everypointProcess2");
const join = require('path').join;
var FormData = require('form-data');
const fs = require('fs');
const utility = require("../helpers/utility");
const db = require("../models");
const {FileTaskModel:FileTaskModel,SubFileTaskModel:SubFileTaskModel,ChunkModel:ChunkModel} = db;

exports.completeEveryPointTask = [
async function (req, res)
{
  try
  {
    const errors = validationResult(req);
    const initiateId = req.body.initiateId;
    const userId = req.body.userId;
    let body=req.body;

    if (!errors.isEmpty())
    {
      return apiResponse.notFoundResponse(res, errors.array()[0].msg, errors.array());
    }
    else
    {
      FileTaskModel.findOne({where: {initiate_id: initiateId}}).then(async uploadDetails => {
        if(uploadDetails)
        {
          let task_request=JSON.stringify(req.body);
        let updateDataStatus = {internal_status:'1',collect_name:req.body.collect_name,task_request:task_request}
        
        FileTaskModel.update(updateDataStatus,{where: {initiate_id: initiateId}}).then(updatedData => {
        }).catch(processingDataError => {          
          console.log('Processing Files Error',processingDataError)
        });
        let scanSetting=body.scanSetting;
        settingBody={
            depth_map_dimension:scanSetting.depth_map_dimension?scanSetting.depth_map_dimension:'',
            ignore_failed_target_detection:scanSetting.ignore_failed_target_detection?scanSetting.ignore_failed_target_detection:'',
            point_spacing_in_meters:scanSetting.point_spacing_in_meters?scanSetting.point_spacing_in_meters:'',
            target_distance_in_meters:scanSetting.target_distance_in_meters?scanSetting.target_distance_in_meters:'',
            depth_map_maximum_depth:scanSetting.depth_map_maximum_depth?scanSetting.depth_map_maximum_depth:'',
            point_density:scanSetting.point_density?scanSetting.point_density:'',
        }
        console.log(settingBody);
        scanSetting.output_file_types=["e57"];
        if(uploadDetails.file_ext == 'epars' || uploadDetails.file_ext == 'eparls')
        {
            if(!body.epars)
            {
                delete scanSetting.depth_map_maximum_depth;
            }
            if(!settingBody.target_distance_in_meters)
            {
                delete scanSetting.target_distance_in_meters;
                delete scanSetting.ignore_failed_target_detection;
            }
            if(!settingBody.depth_map_maximum_depth)
            {
                delete scanSetting.depth_map_maximum_depth;
            }
            if(!settingBody.point_density)
            {
                delete scanSetting.point_density;
            }
            
        }
        else if(uploadDetails.file_type=='images')
        {
            /*delete scanSetting.target_distance_in_meters;
            delete scanSetting.ignore_failed_target_detection;
            delete scanSetting.point_spacing_in_meters;*/
            if(!settingBody.depth_map_maximum_depth)
            {
                delete scanSetting.depth_map_maximum_depth;
            }
            if(!settingBody.point_density)
            {
                delete scanSetting.point_density;
            }
            if(!settingBody.target_distance_in_meters)
            {
                delete scanSetting.target_distance_in_meters;
                delete scanSetting.ignore_failed_target_detection;
            }
            if(!settingBody.point_spacing_in_meters)
            {
                delete scanSetting.point_spacing_in_meters;
            }

        }
        else if(uploadDetails.file_type=='video')
        {
            //delete scanSetting.point_spacing_in_meters;
            if(!settingBody.point_density)
            {
                delete scanSetting.point_density;
            }
           
            if(!settingBody.target_distance_in_meters)
            {
                delete scanSetting.target_distance_in_meters;
                delete scanSetting.ignore_failed_target_detection;
            }
            if(!settingBody.depth_map_maximum_depth)
            {
                delete scanSetting.depth_map_maximum_depth;
            }
            if(!settingBody.point_spacing_in_meters)
            {
                delete scanSetting.point_spacing_in_meters;
            }
        }

        

        

        
        
       
        let depth_map_maximum_depth=req.body.depth_map_maximum_depth?req.body.depth_map_maximum_depth:'';

        let priorties = getPriorityForModel(req.body.priority)
        console.log('Get Priorites', priorties)
       // console.log(uploadDetails.file_type);
        console.log('uploadDetails  gggg',uploadDetails);
        if(uploadDetails.file_ext == 'eparls')
        {
          let requestBody = {
            fileName : 'new_collect_video.eparls',
            totalChunks : uploadDetails.chunks
          }
          let multipartRequestEndPoint = 'ar-lidar-sessions/start-multipart-upload';
          //let processPriority = checkProcessPriority(req.body.priority)

          let collectDetails = {
            collectName : req.body.collect_name?req.body.collect_name:'',
            dataSetType : (req.body.dataSetType == 1)?'EVERYPOINT':'EVERYPOINTDATASET',
            totalAssets : req.body.total_files?req.body.total_files:'',
            collectNotes : req.body.collect_notes?req.body.collect_notes:''
          }
          processDataToEveryPoint(uploadDetails.initiate_id,requestBody,multipartRequestEndPoint,scanSetting,collectDetails).then(async sucessResponse => {
            return apiResponse.successResponseWithData(res,"Data Processed Successfully for Creating Model.")
          }).catch(successResponseError => {
            console.log('In catch Upload block error',successResponseError)
            return apiResponse.ErrorResponse(res, successResponseError)
          })
        }
        else if(uploadDetails.file_ext == 'epars')
        {
          let requestBody = {
            fileName : 'new_collect_video.epars',
            totalChunks : uploadDetails.chunks
          }
          let multipartRequestEndPoint = 'ar-sessions/start-multipart-upload'
          
          let collectDetails = {
            collectName : req.body.collect_name?req.body.collect_name:'',
            dataSetType : (req.body.dataSetType == 1)?'EVERYPOINT':'EVERYPOINTDATASET',
            totalAssets : req.body.total_files?req.body.total_files:'',
            collectNotes : req.body.collect_notes?req.body.collect_notes:''
          }
          processDataToEveryPoint(uploadDetails.initiate_id,requestBody,multipartRequestEndPoint,scanSetting,collectDetails).then(async sucessResponse => {
            return apiResponse.successResponseWithData(res,"Data Processed Successfully for Creating Model.")
          }).catch(successResponseError => {
            console.log('In catch Upload block error',successResponseError)
            return apiResponse.ErrorResponse(res, successResponseError)
          })
        }
        else if(uploadDetails.file_type == 'video')
        {
          let requestBody = {
            fileName : 'new_collect_video.'+uploadDetails.file_ext,
            totalChunks : uploadDetails.chunks,
            totalFiles : uploadDetails.total_files,
            fileType:'video'
          }
          let multipartRequestEndPoint = 'videos/start-multipart-upload';
          /*
          if(req.body.scanSetting.target_distance_in_meters && req.body.scanSetting.target_distance_in_meters!='' && req.body.scanSetting.target_distance_in_meters!=0)
          {
            var outputSettings = {
              fileType : 'e57',
              depthMapDimension : req.body.scanSetting.depth_map_dimension?req.body.scanSetting.depth_map_dimension:'',
              //depth_map_maximum_depth:req.body.scanSetting.depth_map_maximum_depth?req.body.scanSetting.depth_map_maximum_depth:'',
              point_spacing_in_meters:req.body.scanSetting.point_spacing_in_meters?req.body.scanSetting.point_spacing_in_meters:'',
              target_distance_in_meters:req.body.scanSetting.target_distance_in_meters?req.body.scanSetting.target_distance_in_meters:'',
              ignore_failed_target_detection:req.body.scanSetting.ignore_failed_target_detection?req.body.scanSetting.ignore_failed_target_detection:'',
              pointDensity : req.body.scanSetting.point_density?req.body.scanSetting.point_density:'',
              processPriority:req.body.processPriority?checkProcessPriority(req.body.processPriority):''
            }
            
          }
          else
          {

            var outputSettings = {
              fileType : 'e57',
              depthMapDimension : req.body.scanSetting.depth_map_dimension?req.body.scanSetting.depth_map_dimension:'',
              depth_map_maximum_depth:req.body.scanSetting.depth_map_maximum_depth?req.body.scanSetting.depth_map_maximum_depth:'',
              point_spacing_in_meters:req.body.scanSetting.point_spacing_in_meters?req.body.scanSetting.point_spacing_in_meters:'',
              pointDensity : req.body.scanSetting.point_density?req.body.scanSetting.point_density:'',
              processPriority:req.body.processPriority?checkProcessPriority(req.body.processPriority):''
            }
           
          } */
          let collectDetails = {
            collectName : req.body.collect_name?req.body.collect_name:'',
            dataSetType : (req.body.dataSetType == 1)?'EVERYPOINT':'EVERYPOINTDATASET',
            totalAssets : req.body.total_files?req.body.total_files:'',
            collectNotes : req.body.collect_notes?req.body.collect_notes:''
          }
          processVideoToEveryPoint(uploadDetails.initiate_id,requestBody,multipartRequestEndPoint,scanSetting,collectDetails).then(async sucessResponse => {
            return apiResponse.successResponseWithData(res,"Data Processed Successfully for Creating Model.")
          }).catch(successResponseError => {
            console.log('In catch Upload block error',successResponseError)
            return apiResponse.ErrorResponse(res, successResponseError)
          })
        }
        else if(uploadDetails.file_type == 'images')
        {
          console.log('images');
          var testFolder='./uploads/3d-requests/'+initiateId+'/merges';
          var uploadUrlData=[]; 
          let multipartRequestEndPoint = 'images'
          fs.readdir(testFolder, (err, files) => {
            if(files.length>0)
            {
              var baseUrl='http://54.236.108.107:8080/3d-requests/'+initiateId+'/merges/';
              files.forEach(file => {
                let fileN=baseUrl+file;
                uploadUrlData.push(fileN);
              });
               processToEveryPoint(uploadUrlData,multipartRequestEndPoint,'image').then(processingData => {
                  console.log('processingData',processingData);
                  
                  jobRequestBody = {
                    "function": "/functions/pixels-to-point-cloud",
                    "inputs": processingData,
                    "settings":scanSetting,
                    "priority": 0
                  }

                   console.log('jobRequestBody',jobRequestBody);
                   return everypointProcess.makePostRequest('jobs',jobRequestBody).then(jobData => {
     
                     console.log('job data',jobData);
                   if(jobData.success === true)
                   {
                    console.log('After Success Update',jobData);
                     let updateData={
                       ep_collect_id:jobData.data.job.uri,
                       internal_status:'1',
                       collect_name:req.body.collect_name?req.body.collect_name:'',
                       src_type : (req.body.dataSetType == 1)?'EVERYPOINT':'EVERYPOINTDATASET',
                     }
                     FileTaskModel.update(updateData,{where: {initiate_id: initiateId}}).then(updatedData => {
                       console.log('Job Creation Details : ',jobData.data.job.uri)
                       return apiResponse.successResponseWithData(res,"Task Created Successfuly.");
                       //return apiResponse.successResponseWithData(res,"Uploaded Job Details", jobData.data.job)
                     }).catch(processingDataError => {          
                       console.log('Processing Files Error',processingDataError.data)
                       //return apiResponse.ErrorResponse(res, processingDataError)
                     }); 
                   }
                   else
                   {
                     return apiResponse.notFoundResponse(res, jobData.message)
                   }
     
                 }).catch(evJobError => {
                   console.log('Job Creation error : ',jobData.data.job)
                   return apiResponse.ErrorResponse(res, evJobError)
                 })
                 return apiResponse.successResponseWithDataInstant(res,"Task Created Successfuly.")
                 
     
               }).catch(processingDataError => {          
               console.log('Processing Files Error',processingDataError)
               return apiResponse.ErrorResponse(res, processingDataError)
               })
               return apiResponse.successResponseWithDataInstant(res,"Task Created Successfuly.");
  

            }
            
           
          });

         
        }
        
        }
       
        
      });
    }
  }
  catch(err)
  {
   console.log('In catch block error',err)
   return apiResponse.ErrorResponse(res, err);
  }
}]

//Process Video...
async function processVideoToEveryPoint(initiateId,requestBody,multipartRequestEndPoint,scanSetting,collectDetails)
{
  let total_file=requestBody['totalFiles'];
  let lidarSessionIdArr=[];
  let countProcess=[];
  for(let i=0;i<total_file;i++)
  {
    let folderNameChunk = './uploads/3d-requests/'+initiateId+'/TotalChunks/'+initiateId+'-'+i+'/';
    let folderNameFiles = './uploads/3d-requests/'+initiateId+'/merges/';
    chunks = fs.readdirSync(folderNameChunk);
    filesName = fs.readdirSync(folderNameFiles);
    console.log(filesName);
    let chunkSize=chunks.length;
    let formData = new FormData();
    formData.append('file_name', filesName[i]);
    formData.append('total_parts', chunkSize);
    //console.log(formData);
    everypointProcess.makeMultipartRequest(multipartRequestEndPoint,formData).then(async responseData => {
      //console.log('datatat',responseData.data);
      let arrValues = Object.values(responseData.data);
      let lidarSessionId = arrValues[0]['uri'];

      console.log(lidarSessionId);
      lidarSessionIdArr.push(arrValues[0]['uri']);
      
      await processVideoChunksToEveryPoint(lidarSessionId,initiateId,folderNameChunk).then(async uploadedChunkData => {
        //c++;
        console.log('uploadedChunkData',uploadedChunkData);
        //countProcess.push(i);
        countProcess.push(uploadedChunkData);

        console.log('countProcess',countProcess.length);
        console.log('Total File',total_file);
        var jobRequestBody='';
        
        
        

        console.log(jobRequestBody);
        if(lidarSessionIdArr.length==total_file && total_file==countProcess.length)
        {
            jobRequestBody = {
            "function": "/functions/pixels-to-point-cloud",
            "inputs": lidarSessionIdArr,
            "settings":scanSetting,
            "priority": 0
            }
            await everypointProcess.makePostRequest('jobs',jobRequestBody).then(jobData => {
            if(jobData.success === true)
            {
              console.log('After Success Update',jobData);
              let updateData = {
                ep_collect_id : jobData.data.job.uri,
                collect_name : collectDetails['collectName'],
                collect_notes : collectDetails['collectNotes'],
                src_type : collectDetails['dataSetType'],
              }
              FileTaskModel.update(updateData,{where: {initiate_id: initiateId}}).then(updatedData => {
                console.log('Job Creation Details : ',i,jobData.data.job.uri)
                console.log('Job Updated Data',updatedData)
                //return apiResponse.successResponseWithData(res,"Uploaded Job Details", jobData.data.job)
              }).catch(err => {          
                console.log('Processing Files Error',err)
              }); 
            }
            else
            {
              // return apiResponse.notFoundResponse(res, jobData.message)
            }
            });
        }
      });

    });
  }
}




async function processToEveryPoint (fileData,apiEndPoint,responsePoint)
{
  let count=1;
  var proecssData = []
  let result ;
  console.log('Req Typeeee',responsePoint);
  console.log('Formmmmm',fileData)
    for(let i=0;i<fileData.length; i++){
      let initiateForm = new FormData()
      initiateForm.append('file_url', fileData[i]);
      console.log('end point',apiEndPoint);
     
         result = await everypointProcess.makeMultipartRequest(apiEndPoint,initiateForm).then(async responseData => {
         console.log('Upload Response Data',responseData)
        if(responseData.success === true)
        {
          // console.log("Resolve==>",Promise.resolve(responseData.data.image))
          if(responsePoint=='image')
          {
            proecssData.push(responseData.data.image.uri)
          }
          else
          {
            proecssData.push(responseData.data.video)
          }
          
          console.log("procss",proecssData)
          // return Promise.all(proecssData)
          if(fileData.length === count)
          {
            console.log("success",proecssData)
            const l =  await  Promise.all(proecssData)
            console.log("promisefullfill",l)
            return l
             // return "Hello"
          }
          count++;

          
        }
        else
        {
          console.log('Upload Response From Everypoint',responseData.message)
          reject(responseData.message)
        }
      }).catch(evError => {
        console.log('Upload Response Error',evError)
        reject(evError)
      })
    }

return result

    console.log("result===>",proecssData)

}

//Process to eparls....
async function processVideoChunksToEveryPoint (apiEndPoint,initiateId,folderName=null) 
{
  console.log('folderName',folderName);
  let filePath='';
  if(folderName)
  {
      filePath = folderName;
  }
  else
  {
     filePath = "./uploads/3d-requests/"+initiateId+'/';
  }
  console.log('filePath',filePath);
  const allChunkFiles = fs.readdirSync(filePath);
  var excludeMerges = utility.excludeArray(allChunkFiles,'merges');
  var proecssData = []
  let count = 1;
  const chunkFiles = excludeMerges.sort(utility.sortArray);
  console.log('sorted Data',chunkFiles)
  console.log('lenghthhh',chunkFiles.length);
  for(let i=0;i<chunkFiles.length; i++)
  {
    console.log('Auto Inc',i);
    console.log('file ggg',filePath+chunkFiles[i]);
    let formData = new FormData();
    //var fileIndex = i;
    let c=i+1;
    formData.append('part', c.toString());
    formData.append('file', fs.createReadStream(filePath+chunkFiles[i]));
    await everypointProcess.makeMultipartRequestNew(apiEndPoint,formData).then(async responseData => {
      console.log('Resssssssssss',responseData,i.toString());
      if(responseData.success === true)
      {
        const partData = 
        {
          initiate_id: initiateId,
          chunk_file: chunkFiles[i],
          chunk_index: i,
          status:1,
        }
        ChunkModel.create(partData).then(async list => {});
        proecssData.push(responseData)
        if(excludeMerges.length === count)
        {
          console.log("success",proecssData)
          const l =  await Promise.all(proecssData)
          console.log("promisefullfill",l)
          return l
          // return "Hello"
        }
      }
      else
      {
        const partData = 
        {
          initiate_id: initiateId,
          chunk_file: chunkFiles[i],
          chunk_index: i,
          status:0,
        }
        ChunkModel.create(partData).then(async list => {});
      }  
      count++;
    });
  }
}


async function processChunksToEveryPoint (apiEndPoint,initiateId,folderName) 
{
  const filePath = "./uploads/3d-requests/"+initiateId+'/';
  const allChunkFiles = fs.readdirSync(filePath);
  var excludeMerges = utility.excludeArray(allChunkFiles,'merges');
  var proecssData = []
  let count = 1;
  const chunkFiles = excludeMerges.sort(utility.sortArray);
  console.log('sorted Data',chunkFiles)
  console.log('lenghthhh',chunkFiles.length);
  for(let i=0;i<chunkFiles.length; i++)
  {
    console.log('Auto Inc',i);
    console.log('file ggg',filePath+chunkFiles[i]);
    let formData = new FormData();
    //var fileIndex = i;
    let c=i+1;
    formData.append('part', c.toString());
    formData.append('file', fs.createReadStream(filePath+chunkFiles[i]));
    await everypointProcess.makeMultipartRequestNew(apiEndPoint,formData).then(async responseData => {
      console.log('Resssssssssss',responseData,i.toString());
      if(responseData.success === true)
      {
        const partData = 
        {
          initiate_id: initiateId,
          chunk_file: chunkFiles[i],
          chunk_index: i,
          status:1,
        }
        ChunkModel.create(partData).then(async list => {});
        proecssData.push(responseData)
        if(excludeMerges.length === count)
        {
          console.log("success",proecssData)
          const l =  await Promise.all(proecssData)
          console.log("promisefullfill",l)
          return l
          // return "Hello"
        }
      }
      else
      {
        const partData = 
        {
          initiate_id: initiateId,
          chunk_file: chunkFiles[i],
          chunk_index: i,
          status:0,
        }
        ChunkModel.create(partData).then(async list => {});
      }  
      count++;
    });
  }
}

async function processDataToEveryPoint(initiateId,requestBody,multipartRequestEndPoint,scanSetting,collectDetails)
{
  let folderName = 'uploads/3d-requests/'+initiateId;
  let formData = new FormData();
  formData.append('file_name', requestBody['fileName']);
  formData.append('total_parts', requestBody['totalChunks']);
  everypointProcess.makeMultipartRequest(multipartRequestEndPoint,formData).then(responseData => {
    console.log('Upload Response Data',responseData.data)
    let arrValues = Object.values(responseData.data);
    let lidarSessionId = arrValues[0]['uri'];
    console.log('Lidar Session Id',lidarSessionId)
    processChunksToEveryPoint(lidarSessionId,initiateId,folderName).then(uploadedChunkData => {
      console.log(uploadedChunkData);
      everypointProcess.makeGetRequestNew(lidarSessionId).then(videoResponseData => {
        console.log('Video Get Response',videoResponseData)
        let arrValues = Object.values(responseData.data);
        jobRequestBody = {
            "function": "/functions/pixels-to-point-cloud",
            "inputs": [lidarSessionId],
            "settings":scanSetting,
            "priority": 0
        }

        
        everypointProcess.makePostRequest('jobs',jobRequestBody).then(jobData => {
          if(jobData.success === true)
          {
            console.log('After Success Update',jobData);
            let updateData = {
              ep_collect_id : jobData.data.job.uri,
              collect_name : collectDetails['collectName'],
              collect_notes : collectDetails['collectNotes'],
              src_type : collectDetails['dataSetType'],
            }
            FileTaskModel.update(updateData,{where: {initiate_id: initiateId}}).then(updatedData => {
              console.log('Job Creation Details : ',jobData.data.job.uri)
              console.log('Job Updated Data',updatedData)
              //return apiResponse.successResponseWithData(res,"Uploaded Job Details", jobData.data.job)
            }).catch(err => {          
              console.log('Processing Files Error',err)
            }); 
          }
          else
          {
            // return apiResponse.notFoundResponse(res, jobData.message)
          }
        }).catch(evJobError => {
          console.log('Job Creation Error : ',evJobError)
        })
      }).catch(videoError => {
        console.log('Get Video Details Error : ',videoError)
      })
    }).catch(chunkError => {
      console.log('Chunk Upload Error : ',chunkError)
    })
  }).catch(evError => {
    console.log('Start Upload Response Error',evError)
  })
  // return apiResponse.successResponseWithData(res,"Task Created Successfuly.")
  return true
}




function getPriorityForModel(priorty)
{
  switch (priorty){
    case 'high':
      return [
        depth_map_dimension = 960,
        point_density = 2000
      ]
      break;
    case 'medium':
      return [ 
        depth_map_dimension = 768,
        point_density = 1400
      ]
      break;
    case 'low':
      return [
        depth_map_dimension = 640,
        point_density = 800
      ]
      break;
    default:
      return [
        depth_map_dimension = 640,
        point_density = 800
      ]
      break;
  }
}

function checkProcessPriority(priority) {
  if (priority) {
    return priority
  } else {
    return 0
  }
}