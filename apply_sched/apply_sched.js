/*Version Info
-----Version-1.2----
*/
const updatetrips = require('./parse-trips1.js');
const updateseg = require('./parse-seg1.js');
const processFiles=require('./update_shm.js');
const insertBreaks = require('./insertBreaks.js');
const forwardCalculateProcedure = require('./frwdcalc.js');
const reverseCalculateProcedure = require('./reversecalc.js');
const preassignupdatetrips = require('./preassign-parse-trips1.js');
const readJsonFile = require('./stopnum.js');




// Function to run processes sequentially
async function apply_sched(travelDate,fileno,theJData) {
  try {
    const start = Date.now();

    var aTravelDate = getDateStr(travelDate);
    console.log(theJData);
    console.log(typeof theJData);  // Added to check data type

    let theJDataArray;
    if (typeof theJData === 'string') {
      const cleanedJData = theJData.trim().replace(/^[^{[]+/, ''); 
      theJDataArray = JSON.parse(cleanedJData);
    } else {
      theJDataArray = theJData; // No parsing if it's already an object
    }
    console.log(theJDataArray);
    const tenant = theJDataArray[0].teanant;  // Corrected typo: 'teanant' -> 'tenant'
    console.log(tenant);
   
   // Process 1: Get the matching filename
   console.log('Processing files...');
   const filename = await processFiles(aTravelDate, fileno,tenant);
   console.log(filename);
   // Process 2: Update trips
   const oper=filename.split('_')[2];
   console.log(oper);
   
   console.log('Updating the Trips');
   if(oper==='RTA8' || tenant==='NOTA'||tenant==='WOTA'||tenant==='OPC'){
    console.log(`running ${tenant}`);
   await preassignupdatetrips(aTravelDate, filename,tenant,fileno);
   }else{
    console.log(`running ${tenant}`);
    await updatetrips(aTravelDate, filename,tenant,fileno);
   }
   console.log('Data Updated for Trips.\n');

   // Process 3: Update segments
   console.log('Updating the Segments');
   
   await updateseg(aTravelDate, filename,tenant);
   console.log('Data Updated for segments.\n');

   console.log('Waiting 30 seconds before forward calculating...');
   await delay(10 * 1000);
 if( tenant==='NOTA'||tenant==='WOTA'||tenant==='OPC'){
   await readJsonFile(tenant,aTravelDate,filename);
   }

   console.log('Inserting Breaks...');
   await insertBreaks(aTravelDate, filename,tenant);
   console.log('Breaks inserted.\n');

   console.log('Waiting 30 seconds before forward calculating...');
   await delay(10 * 1000);

   console.log('Updating Stop Numbers...');
   if(oper==='RTA8'||tenant==='NOTA'||tenant==='WOTA'||tenant==='OPC'){
    await readJsonFile(tenant,aTravelDate,filename);
   }

   console.log('Running Process 10...');
   if(oper!='RTA8'){
   await forwardCalculateProcedure(aTravelDate, filename,tenant);
   }
   console.log('Your new procedure completed.\n');

   const end = Date.now(); // End timing
   console.log(`Function execution time: ${end - start} milliseconds`);
  
  } catch (error) {
    console.error('Error during process execution:', error);
    process.exit(1);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

// Run the processes
// runProcesses('26-OCT-2034');

// Export the runProcesses function
module.exports = apply_sched;

