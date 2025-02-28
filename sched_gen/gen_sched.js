/*Version Info
-----Version-1.4----
*/
const sendata = require('./sendv2.js');
const datacheck = require('./datacheck.js');
const insertSchedulingRunInfo = require('./insertrun.js');
const updateSchedulingRunInfo = require('./updaterun.js');
const updatestputime =require('./updateestputime.js');
const opcfetchData=require("./OPC_data-fetch-con1.js")
const errorhandling=require('./errorhandling.js')
const frwdcalcproc= require('./frwdcalcproc.js'); 
const editsegments=require('./editsegments.js');
const preassignstepsaddition = require('./parserv3.js');


// Function to run processes sequentially
async function gen_sched(travelDate, theJData) {
  try {
    const start = Date.now(); // Start timing
    
    console.log('The log within the code', theJData);
    var aTravelDate = getDateStr(travelDate);
    console.log('theJData before parsing:', theJData);
    const theJDataArray = JSON.parse(theJData); // Parse theJData
    //console.log('Parsed theJData:', theJDataArray);

    let result;
    var operatorValue;
    const element = theJDataArray[0];
    console.log("the element value is", element);
    let serializedFilePath = null;

    if(element.tenant === "OPC"){
      console.log("enters the OPC case ");
      await updatestputime(aTravelDate,element.tenant);
      result = await opcfetchData(aTravelDate, element.operator, element.tenant, element);
      operatorValue = 'OPC';
      await preassignstepsaddition(operatorValue, aTravelDate,theJDataArray[0].tenant,result[2]);
      await errorhandling(element.speedfactor,element.tenant,result[2]);
      serializedFilePath=result[2];   
    }

    if(serializedFilePath==null){
      console.log(`Data fetch failed for ${element.tenant}`)
      return;
    }


    // Continue with the existing process for other tenants
    console.log('Data Fetched.\n');

    vehicles = result[0];
    trips = result[1];
    
    console.log('Checking Data');
    await datacheck(serializedFilePath);
    console.log(' Data Checked.\n');

    console.log('Checking previous runs');
    //await stepsaddition(operatorValue, aTravelDate, element.tenant);
    console.log('Steps array Added.\n');

    console.log('sending the data to GSE2.0');
    const filename = await sendata(serializedFilePath, operatorValue, aTravelDate, element.tenant);
    console.log('output generated!!.\n');

    
      await editsegments(filename,serializedFilePath);
   

    console.log('Inserting scheduling run info...');
    //await insertSchedulingRunInfo(aTravelDate, element, filename, element.tenant); // Update to use theJDataArray
    await insertSchedulingRunInfo(aTravelDate, theJDataArray, filename,element.tenant); // Update to use theJDataArray
    console.log('Scheduling run info inserted.\n');

    console.log('Updating scheduling run info...');
    //await updateSchedulingRunInfo(aTravelDate, element, filename, vehicles, trips, element.tenant); // Update to use theJDataArray
    await updateSchedulingRunInfo(aTravelDate, element, filename, vehicles, trips,element.tenant); // Update to use theJDataArray    
    console.log('Scheduling run info Updated.\n');

    const end = Date.now(); // End timing
    console.log(`Function execution time: ${end - start} milliseconds`);

    console.log('All processes completed successfully!');
  } catch (error) {
    console.error('Error during process execution:', error);
    process.exit(1);
  }
}



function getDateStr(travelDate)
{
  try{
    var d = travelDate.split('-')[0];
    var m = travelDate.split('-')[1];
    var y = travelDate.split('-')[2];
    if(y.length > 2)
    {
      console.log('travelDate ' + travelDate);
      return travelDate;
    }else{
      console.log('travelDate ' + d+'-'+m+'-20'+y);
      return d+'-'+m+'-20'+y;
    }
  }catch(e){
    console.log('travelDate ' + travelDate);
    return travelDate;
  }
}

module.exports = gen_sched;