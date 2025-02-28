const fs = require('fs');

//const { error } = require('console');
//const inputfiledata = '/var/www/html/GSE2/sched_gen/input-auto.json';

async function fetchBRKs(filename,inputfiledata ) {
try {
    const thirdData = fs.readFileSync(filename , 'utf8');
    const inpudata=fs.readFileSync(inputfiledata , 'utf8');
    const thirdJsonData = JSON.parse(thirdData);
    const inputJsonData = JSON.parse(inpudata);
    
    await parseShipmentData(thirdJsonData,inputJsonData);
    fs.writeFileSync(filename, JSON.stringify(thirdJsonData, null, 2), 'utf8');
  } catch (err) {
    throw err;
  }
}

async function parseShipmentData(jsonData,inputJsonData) {
//   const errorlog = [];
//const vehiclesWBreaks=[];

let vehiclesWBreaks = new Map();
  try {
   // console.log(jsonData.routes);

     for (let vehicle of inputJsonData.vehicles){
           if(vehicle.id%100!=0 && vehicle.breaks){
             const key=vehicle.id;
               if (vehiclesWBreaks.has(key)) {
              // If key exists, push the value into the array
              vehiclesWBreaks.get(key).push(vehicle);
               } else {
              // If key doesn't exist, create a new array with the value
              vehiclesWBreaks.set(key, [vehicle]);
               console.log(vehiclesWBreaks.get(key));
              }
           }
     }

    console.log("vehiclesWBreaks before ",vehiclesWBreaks);



    for (let route of jsonData.routes) {
        if(route.steps===undefined){
           continue; 
        }
        //let time=vehicle.time_window[0];
        //const numberMatch = route.description.match(/\d+/); // Match one or more digits
        const numberMatch = route.description.split(" ")[1]; // Match one or more digits
        let stop = numberMatch ? parseInt(numberMatch, 10) : null;

        if(stop===null){
          continue;
        }

        if (vehiclesWBreaks.get(route.vehicle)){
          vehiclesWBreaks.delete(route.vehicle);
        }
        //let stop=Number(route.description);
        for(let i=1;i<route.steps.length-1;i++){
            stop+=0.05;
            let step=route.steps[i];
            step["stop"]=stop.toFixed(2);
        }     
    }
     
    console.log("vehiclesWBreaks after",vehiclesWBreaks);

    if(vehiclesWBreaks.size){
      for (let [vehicle, vehicledata] of vehiclesWBreaks) {
        console.log(`Vehicle: ${vehicle}, Break: ${vehicledata[0]}`);
        console.log(`Vehicledata time window: ${vehicle}, Break: ${vehicledata[0].time_window}`);
        const numbers = vehicledata[0].description.match(/\d+/g);
        let tripId=undefined;
        
        if (numbers && numbers.length >= 2) {
            console.log(numbers[1]); 
            tripId=numbers[1];
        }


        const vehicleObject = {
          vehicle: vehicle,
          description: vehicledata[0].description,
          steps : [
          {
            "type": "start",
            "location": vehicledata[0].start,
            "waiting_time": 0,
            "load": [
                 0,
                 0
            ],
            "arrival": vehicledata[0].time_window[0],
             ...(tripId && { id: tripId })
           },
           {
            "type": "break",
            "id": vehicledata[0].breaks[0].id,
            "service": vehicledata[0].breaks[0].service,
            "waiting_time": 0,
            "load": [
               0,
               0
            ],
            "arrival": parseInt(vehicledata[0].breaks[0].time_windows[0][0]),
           },
           {
            "type": "end",
            "location": vehicledata[0].end,
            "waiting_time": 0,
            "load": [
               0,
               0
            ],
            "arrival":  vehicledata[0].time_window[1]
           }
          ]
        };

        console.log("vehicleObject",vehicleObject);
         
        jsonData.routes.push(vehicleObject);

    }
    }
  } catch (error) {
    console.error("This one :"+ error.message);
    throw error;
  }
}

module.exports = fetchBRKs;