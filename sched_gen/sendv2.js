const fs = require('fs');
const axiosInstance = require('axios').default;

async function readJSONFile(filePath) {
  const data = await fs.readFileSync(filePath);
  return JSON.parse(data.toString('utf-8'));
}

async function sendPOSTRequest(url, jsonData, headers, operator, travelDate,tenant) {
  try {
    console.log('sending the data');
    const response = await axiosInstance.post(url, jsonData, { headers });

    if (response.status === 200) {
      console.log('Post request successful!');
      const folderPath = `/var/www/html/GSE2/Schedules`;
      const newtravelDate = formatDate(travelDate);

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
      

      const filenameRegex = /out_(.*?)_(.*?)_(\d{6})_(\d+)\.json/; // Capture the tenant part

      let maxSerialNumber = 500;
      const existingFiles = fs.readdirSync(folderPath);

      for (const file of existingFiles) {
          const match = file.match(filenameRegex);
          if (match && match[1] === tenant && match[3] === newtravelDate) { 
              console.log("Entered the match case"); 
              const serialNumber = parseInt(match[4], 10); // Index adjusted for serial number
              maxSerialNumber = Math.max(maxSerialNumber, serialNumber);
              console.log("Matched file:", file, "Serial Number:", serialNumber);
          }
      }
      const nextSerialNumber = maxSerialNumber + 1;
      const filename = `${folderPath}/out_${tenant}_${operator}_${newtravelDate}_${nextSerialNumber}.json`;
      console.log("Generated filename:", filename);
      await fs.writeFileSync(filename, JSON.stringify(response.data));
      console.log(`${filename} created`);
      return filename;

    } else {
      console.log('Post request failed');
    }

  } catch (error) {
    throw error;
  }
}

async function sendata(filePath, operator, travelDate,tenant) {
  try {
    const jsonData = await readJSONFile(filePath);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (tenant.includes("_")) {
    console.log("Tenant contains underscores.");
    tenant = tenant.replace(/_/g, "");
    }
    if (operator.includes("_")) {
    console.log("Operator contains underscores.");
    operator = operator.replace(/_/g, "");
    }
    const filename = await sendPOSTRequest('http://localhost:3000', jsonData, headers, operator, travelDate,tenant);
    return filename;
  } catch (error) {
    console.log(error);
  }
}

function formatDate(originalDate) {
  const dateParts = originalDate.split('-');
  if (dateParts.length !== 3) {
    console.error("Invalid date format:", originalDate);
    return null;
  }

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthNumber = (monthNames.indexOf(dateParts[1].toUpperCase()) + 1).toString().padStart(2, '0');
  const formattedDate = `${monthNumber}${dateParts[0]}${dateParts[2].substring(2)}`;
  return formattedDate;
}

module.exports = sendata;
