/*Version Info
-----Version-1.1----
*/
const fs = require("fs");
const oracledb = require("oracledb");
const dbconfig = require('../dbconfig');
//r pickupAttributes = {},
  //liveryAttributes = {};

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  if(target === null || typeof target === undefined || target.length === 0)
  {
    return target;
  }
  return target.split(search).join(replacement);
};

async function updateDB(tenant,pickupAttributes,deliveryAttributes){
  let connection;
  try {
    connection=await oracledb.getConnection(dbconfig[tenant]);
    console.log(dbconfig[tenant]);
    console.log(connection);
    console.log('Pickup Attributes:', pickupAttributes);
    console.log('Delivery Attributes:', deliveryAttributes);

    var puSQLQry = `
      DECLARE
        pCount INTEGER := :pCount;
        pStopType VARCHAR2(50) := :pStopType;
      BEGIN
        DEV.ITMS8_GSE20.UpdateTripsTable( pCount, pStopType, 
          DEV.ITMS8_GSE20.DATE_ARRAY(`+JSON.stringify(pickupAttributes.TravelDate).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.VAR_ARRAY(`+JSON.stringify(pickupAttributes.id).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.VAR_ARRAY(`+JSON.stringify(pickupAttributes.SuggResNum).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.VAR_ARRAY(`+JSON.stringify(pickupAttributes.ResNum).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(pickupAttributes.Index).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(pickupAttributes.stopNumber).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(pickupAttributes.perftime).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(pickupAttributes.eta).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(pickupAttributes.etd).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(pickupAttributes.AmbOcc).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(pickupAttributes.WcOcc).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(pickupAttributes.PDistToNextStop).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(pickupAttributes.PTimeToNextStop).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.VAR_ARRAY(`+JSON.stringify(pickupAttributes.systemuser).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.VAR_ARRAY(`+JSON.stringify(pickupAttributes.OperId).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(pickupAttributes.pDriverWait).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(pickupAttributes.PassengerWait).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`)
        );
      END;
    `;
    var doSQLQry = `
      DECLARE
        pCount INTEGER := :pCount;
        pStopType VARCHAR2(50) := :pStopType;
      BEGIN
        DEV.ITMS8_GSE20.UpdateTripsTable( pCount, pStopType, 
          DEV.ITMS8_GSE20.DATE_ARRAY(`+JSON.stringify(deliveryAttributes.TravelDate).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.VAR_ARRAY(`+JSON.stringify(deliveryAttributes.id).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.VAR_ARRAY(`+JSON.stringify(deliveryAttributes.SuggResNum).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.VAR_ARRAY(`+JSON.stringify(deliveryAttributes.ResNum).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(deliveryAttributes.Index).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(deliveryAttributes.stopNumber).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(deliveryAttributes.perftime).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(deliveryAttributes.eta).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(deliveryAttributes.etd).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(deliveryAttributes.AmbOcc).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(deliveryAttributes.WcOcc).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(deliveryAttributes.DDistToNextStop).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(deliveryAttributes.DTimeToNextStop).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.VAR_ARRAY(`+JSON.stringify(deliveryAttributes.systemuser).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.VAR_ARRAY(`+JSON.stringify(deliveryAttributes.OperId).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(deliveryAttributes.dDriverWait).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`), 
          DEV.ITMS8_GSE20.NUM_ARRAY(`+JSON.stringify(deliveryAttributes.PassengerWait).replaceAll("\"","'").replaceAll("[","").replaceAll("]","")+`)
        );
      END;
    `;
    var puDataParams_Temp = {
        pCount: pickupAttributes.id.length,
        pStopType: 'P'
      };
    var doDataParams_Temp = {
      pCount: deliveryAttributes.id.length,
      pStopType: 'D'
    };  
    console.log("puSQLQry: " + puSQLQry);
    await connection.execute(puSQLQry, puDataParams_Temp);
    await connection.commit();
    //console.log("doSQLQry: " + doSQLQry);
    await connection.execute(doSQLQry, doDataParams_Temp);
    await connection.commit();
    console.log("Stored procedure executed successfully.");
  } catch (err) {
    console.error("Error calling stored procedure:", err);
  } finally {
    // Release the connection
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error("Error closing the connection:", err);
      }
    }
  }
}

async function readJsonFile(travelDate, filename, tenant, fileno) {
  if(tenant==='RTAIA' || tenant==='NOTA'|| tenant==='WOTA'|| tenant==='OPC'){
    await readJsonFile2(travelDate, filename, tenant, fileno);
    return;
  }
    console.log("readJsonFile() starts");
console.log("filename in aplus parse trips",filename);
    try {
      const jsonData = await fs.readFileSync(`/var/www/html/GSE2/Schedules/${filename}`, "utf8");
      const parsedData = JSON.parse(jsonData);
console.log(parsedData );
      const pickupData = [];
      const deliveryData = [];
      let prevStepLoad = [0, 0, 0];
      let pAmb = 0;
      let pWc = 0;
  
      for (const route of parsedData.routes) {
        console.log(" parsedData.routes", parsedData.routes);
        const tripDetails = route.steps;
        console.log("tripDetails",tripDetails);
        const breakIndexes = tripDetails
          .map((step, index) => (step.description && step.description.includes("Break") && step.type === "pickup") ? index : -1)
          .filter(index => index !== -1);
  
        console.log('Break indexes:', breakIndexes);
  
        let currentStopNumber = breakIndexes.length === 0 ? 5 : 1;
        let incrementValue = breakIndexes.length === 0 ? 5 : 0.05;
        let stopNumbers = [];
  
        for (let stepIndex = 0; stepIndex < tripDetails.length; stepIndex++) {
          const step = tripDetails[stepIndex];
          console.log("step",step);
  
          if (step.type === 'start' ) {
            continue;
          }
  
          if (breakIndexes.includes(stepIndex)) {

            if (tenant==='GADABOUT'){

            const description = step.description; // Get the description string
            const stopNumberMatch = description.match(/Stop (\d+)/);

            console.log("stopNumberMatch",stopNumberMatch[1]);

            currentStopNumber = parseFloat((parseFloat(stopNumberMatch[1]) + 0.05).toFixed(2));
            }else{

            const stepId = step.id.toString();  // Ensure step.id is a string
            const sliceLength= Number((route.vehicle).toString().length);
            currentStopNumber = parseFloat((parseFloat(stepId.slice(sliceLength)) + 0.05).toFixed(2));
            }


            stopNumbers[stepIndex] = currentStopNumber;
          } else {
            if (stepIndex > 0 && !breakIndexes.includes(stepIndex - 1) && !step.description) {
              currentStopNumber = parseFloat(((stopNumbers.length === 0 ? 1 :stopNumbers[stepIndex - 1]) + 0.05).toFixed(2));
            } else if (breakIndexes.length === 0) {
              currentStopNumber = parseFloat((currentStopNumber + incrementValue).toFixed(2));
            } else if (stepIndex < breakIndexes[0]) {
              currentStopNumber = parseFloat((currentStopNumber + incrementValue).toFixed(2));
            } else if (stepIndex > breakIndexes[breakIndexes.length - 1]) {
              currentStopNumber = parseFloat((currentStopNumber + 5).toFixed(2));
            }
            stopNumbers[stepIndex] = currentStopNumber;
          }
  
          const loadChange = step.load.map((value, index) => value - prevStepLoad[index]);
          const travelDateSeconds = Date.parse(travelDate.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')) / 1000 - 14400;
          let arrivalSeconds = parseFloat(step.arrival);
          pAmb += loadChange[0];
          pWc += loadChange[1];
  
          const commonData = {
            stopNumber: currentStopNumber,
            id: 'T' + String(step.job),
            eta: Math.ceil(arrivalSeconds / 60),
            perftime: Math.ceil(parseFloat(step.service) / 60),
            etd: Math.ceil((parseFloat(step.waiting_time) + arrivalSeconds + parseFloat(step.service)) / 60),
            systemuser: "GSE-" + fileno.toString(),
            OperId: route.description,
            TravelDate: travelDate,
            ResNum: (tenant === 'APLUS' ? 'S' + (route.vehicle < 100 ? '00' : '') :(tenant === 'GADABOUT' ? 'S' + (route.vehicle < 10 ? '00' : '0') :'S')) + route.vehicle.toString(),
            SuggResNum: (tenant === 'APLUS' ? 'S' + (route.vehicle < 100 ? '00' : '') :(tenant === 'GADABOUT' ? 'S' + (route.vehicle < 10 ? '00' : '0') :'S')) + route.vehicle.toString(),
            DistToNextStop:0,
            AmbOcc: pAmb,
            WcOcc: pWc,
            PassengerWait: 0,
            Index: 0,
          };
console.log("commondata",commonData );
  
          if (step.type === "pickup" && !step.description) {
            pickupData.push({
              ...commonData,
              type: "P",
              pDriverWait: Math.ceil(step.waiting_time / 60),
              PTimeToNextStop: stepIndex === 0 ? 0 : Math.ceil((parseFloat(step.duration) - parseFloat(tripDetails[stepIndex - 1].duration)) / 60),
            });
          } else if (step.type === "delivery" && !step.description) {
            deliveryData.push({
              ...commonData,
              type: "D",
              dDriverWait: Math.ceil(step.waiting_time / 60),
              DTimeToNextStop: stepIndex === 0 ? 0 : Math.ceil((parseFloat(step.duration) - parseFloat(tripDetails[stepIndex - 1].duration)) / 60),
            });
          }
  
          prevStepLoad = step.load.slice();
        }
      }
      //console.log("pickupdata",pickupData);
      //console.log("deliverydata",deliveryData);
      //const pickupFilePath = 'pickup_data.txt';
      //fs.writeFileSync(pickupFilePath, JSON.stringify(pickupData, null, 2));
      //console.log(`Pickup data written to ${pickupFilePath}`);
  
      //const deliveryFilePath = 'delivery_data.txt';
      //fs.writeFileSync(deliveryFilePath, JSON.stringify(deliveryData, null, 2));
      //console.log(`Delivery data written to ${deliveryFilePath}`);
  
      const pickupAttributes = {
        stopNumber: pickupData.map((item) => item.stopNumber),
        id: pickupData.map((item) => item.id),
        eta: pickupData.map((item) => item.eta),
        type: pickupData.map((item) => item.type),
        perftime: pickupData.map((item) => item.perftime),
        etd: pickupData.map((item) => item.etd),
        pDriverWait: pickupData.map((item) => item.pDriverWait),
        PDistToNextStop: pickupData.map((item) => item.DistToNextStop),
        PTimeToNextStop: pickupData.map((item) => item.PTimeToNextStop),
        systemuser: pickupData.map((item) => item.systemuser),
        OperId: pickupData.map((item) => item.OperId),
        TravelDate: pickupData.map((item) => item.TravelDate),
        ResNum: pickupData.map((item) => item.ResNum),
        SuggResNum: pickupData.map((item) => item.SuggResNum),
        AmbOcc: pickupData.map((item) => item.AmbOcc),
        WcOcc: pickupData.map((item) => item.WcOcc),
        PassengerWait: pickupData.map((item) => item.PassengerWait),
        Index: pickupData.map((item) => item.Index),
      };
  
      const deliveryAttributes = {
        stopNumber: deliveryData.map((item) => item.stopNumber),
        id: deliveryData.map((item) => item.id),
        eta: deliveryData.map((item) => item.eta),
        type: deliveryData.map((item) => item.type),
        perftime: deliveryData.map((item) => item.perftime),
        etd: deliveryData.map((item) => item.etd),
        dDriverWait: deliveryData.map((item) => item.dDriverWait),
        DDistToNextStop: deliveryData.map((item) => item.DistToNextStop),
        DTimeToNextStop: deliveryData.map((item) => item.DTimeToNextStop),
        systemuser: deliveryData.map((item) => item.systemuser),
        OperId: deliveryData.map((item) => item.OperId),
        TravelDate: deliveryData.map((item) => item.TravelDate),
        ResNum: deliveryData.map((item) => item.ResNum),
        SuggResNum: deliveryData.map((item) => item.SuggResNum),
        AmbOcc: deliveryData.map((item) => item.AmbOcc),
        WcOcc: deliveryData.map((item) => item.WcOcc),
        PassengerWait: deliveryData.map((item) => item.PassengerWait),
        Index: deliveryData.map((item) => item.Index),
      };
      
      // Log attributes if needed
      //console.log('Pickup Attributes:', pickupAttributes);
      //console.log('Delivery Attributes:', deliveryAttributes);
      await updateDB(tenant,pickupAttributes,deliveryAttributes);
      console.log("readJsonFile() ends");
    } catch (error) {
      console.error("Error in readJsonFile():", error);
    }
  }
///ne function start
async function readJsonFile2(travelDate, filename, tenant, fileno) {
    console.log("readJsonFile() starts");
console.log("filename in aplus parse trips",filename);
    try {
      const jsonData = await fs.readFileSync(`/var/www/html/GSE2/Schedules/${filename}`, "utf8");
      const parsedData = JSON.parse(jsonData);
//console.log(parsedData );
      const pickupData = [];
      const deliveryData = [];
      let prevStepLoad = [0, 0, 0];
      let pAmb = 0;
      let pWc = 0;
  
      for (const route of parsedData.routes) {
        // console.log(" parsedData.routes", parsedData.routes);
        const tripDetails = route.steps;
        // console.log("tripDetails",tripDetails);
       
        let currentStopNumber =  1;
        let incrementValue =  0.05;
        let stopNumbers = [];
  
        for (let stepIndex = 0; stepIndex < tripDetails.length; stepIndex++) {
          const step = tripDetails[stepIndex];
          // console.log("step",step);
  
          if (step.type === 'start' ) {
            continue;
          }
  
         
         /*   if (stepIndex > 0 && !breakIndexes.includes(stepIndex - 1) && !step.description) {
              currentStopNumber = parseFloat(((stopNumbers.length === 0 ? 1 :stopNumbers[stepIndex - 1]) + 0.05).toFixed(2));
            } else if (breakIndexes.length === 0) {
              currentStopNumber = parseFloat((currentStopNumber + incrementValue).toFixed(2));
            } else if (stepIndex < breakIndexes[0]) {
              currentStopNumber = parseFloat((currentStopNumber + incrementValue).toFixed(2));
            } else if (stepIndex > breakIndexes[breakIndexes.length - 1]) {
              currentStopNumber = parseFloat((currentStopNumber + 5).toFixed(2));
            }
            stopNumbers[stepIndex] = currentStopNumber; */
          
  
          const loadChange = step.load.map((value, index) => value - prevStepLoad[index]);
          const travelDateSeconds = Date.parse(travelDate.replace(/(\d+)-(\w+)-(\d+)/, '$2 $1, $3')) / 1000 - 14400;
          let arrivalSeconds = parseFloat(step.arrival);
          pAmb += loadChange[0];
          pWc += loadChange[1];
          currentStopNumber = step.stop;
          let resnum=Math.floor(route.vehicle/100);
  
          const commonData = {
            stopNumber: currentStopNumber,
            id: 'T' + String(step.job),
            eta: Math.ceil(arrivalSeconds / 60),
            perftime: Math.ceil(parseFloat(step.service) / 60),
            etd: Math.ceil((parseFloat(step.waiting_time) + arrivalSeconds + parseFloat(step.service)) / 60),
            systemuser: (step.description === 'SO pickup' || step.description === 'SO delivery') ? "" : "GSE-" + fileno.toString() ,
            //OperId: "RTA8",  ///remove numbers from here
	  OperId: route.description.split(' ')[0],
            TravelDate: travelDate,
            ResNum: (tenant === 'NOTA'||tenant==='OPC'||tenant==='WOTA' ? 'S' + (resnum < 10 ? '00' : '0') :'S')+ resnum.toString(),
            SuggResNum: (tenant === 'NOTA'||tenant==='OPC'||tenant==='WOTA' ? 'S' + (resnum < 10 ? '00' : '0') :'S')+ resnum.toString(),
            DistToNextStop:0,
            AmbOcc: pAmb,
            WcOcc: pWc,
            PassengerWait: 0,
            Index: 0,
          };
console.log("commondata",commonData );
  
          if (step.type === "pickup") {
            pickupData.push({
              ...commonData,
              type: "P",
              pDriverWait: Math.ceil(step.waiting_time / 60),
              PTimeToNextStop: stepIndex === 0 ? 0 : Math.ceil((parseFloat(step.duration) - parseFloat(tripDetails[stepIndex - 1].duration)) / 60),
            });
          } else if (step.type === "delivery") {
            deliveryData.push({
              ...commonData,
              type: "D",
              dDriverWait: Math.ceil(step.waiting_time / 60),
              DTimeToNextStop: stepIndex === 0 ? 0 : Math.ceil((parseFloat(step.duration) - parseFloat(tripDetails[stepIndex - 1].duration)) / 60),
            });
          }
  
          prevStepLoad = step.load.slice();
        }
      }
      //console.log("pickupdata",pickupData);
      //console.log("deliverydata",deliveryData);
      const pickupFilePath = 'pickup_data.txt';
      fs.writeFileSync(pickupFilePath, JSON.stringify(pickupData, null, 2));
      console.log(`Pickup data written to ${pickupFilePath}`);
  
      const deliveryFilePath = 'delivery_data.txt';
      fs.writeFileSync(deliveryFilePath, JSON.stringify(deliveryData, null, 2));
      console.log(`Delivery data written to ${deliveryFilePath}`);


  
      const pickupAttributes = {
        stopNumber: pickupData.map((item) => item.stopNumber),
        id: pickupData.map((item) => item.id),
        eta: pickupData.map((item) => item.eta),
        type: pickupData.map((item) => item.type),
        perftime: pickupData.map((item) => item.perftime),
        etd: pickupData.map((item) => item.etd),
        pDriverWait: pickupData.map((item) => item.pDriverWait),
        PDistToNextStop: pickupData.map((item) => item.DistToNextStop),
        PTimeToNextStop: pickupData.map((item) => item.PTimeToNextStop),
        systemuser: pickupData.map((item) => item.systemuser),
        OperId: pickupData.map((item) => item.OperId),
        TravelDate: pickupData.map((item) => item.TravelDate),
        ResNum: pickupData.map((item) => item.ResNum),
        SuggResNum: pickupData.map((item) => item.SuggResNum),
        AmbOcc: pickupData.map((item) => item.AmbOcc),
        WcOcc: pickupData.map((item) => item.WcOcc),
        PassengerWait: pickupData.map((item) => item.PassengerWait),
        Index: pickupData.map((item) => item.Index),
      };
  
      const deliveryAttributes = {
        stopNumber: deliveryData.map((item) => item.stopNumber),
        id: deliveryData.map((item) => item.id),
        eta: deliveryData.map((item) => item.eta),
        type: deliveryData.map((item) => item.type),
        perftime: deliveryData.map((item) => item.perftime),
        etd: deliveryData.map((item) => item.etd),
        dDriverWait: deliveryData.map((item) => item.dDriverWait),
        DDistToNextStop: deliveryData.map((item) => item.DistToNextStop),
        DTimeToNextStop: deliveryData.map((item) => item.DTimeToNextStop),
        systemuser: deliveryData.map((item) => item.systemuser),
        OperId: deliveryData.map((item) => item.OperId),
        TravelDate: deliveryData.map((item) => item.TravelDate),
        ResNum: deliveryData.map((item) => item.ResNum),
        SuggResNum: deliveryData.map((item) => item.SuggResNum),
        AmbOcc: deliveryData.map((item) => item.AmbOcc),
        WcOcc: deliveryData.map((item) => item.WcOcc),
        PassengerWait: deliveryData.map((item) => item.PassengerWait),
        Index: deliveryData.map((item) => item.Index),
      };
      
      // Log attributes if needed
      //console.log('Pickup Attributes:', pickupAttributes);
      //console.log('Delivery Attributes:', deliveryAttributes);
      await updateDB(tenant,pickupAttributes,deliveryAttributes);
      console.log("readJsonFile() ends");
    } catch (error) {
      console.error("Error in readJsonFile():", error);
    }
  }  
///new functionm end
async function updatetrips() {
  console.log("main() starts");
 // await get_pooling();
  readJsonFile();
  console.log("main() ends");
}
module.exports=updatetrips;
module.exports=readJsonFile;
//main();
