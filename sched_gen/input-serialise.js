/*Version Info
-----Version-1.0----
*/
const fs = require('fs');
const path = require('path');

// Function to serialize the input file
async function serializeInputData(jsonData, operator, travelDate, tenant) {
  const folderPath = `/var/www/html/GSE2/Ip-Files`;
  const formattedDate = formatDateForFilename(travelDate);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }

  // Regex to match existing serialized input files
  const filenameRegex = /in_(.*?)_(.*?)_(\d{6})_(\d+)\.json/;
  let maxSerialNumber = 500;

  // Read existing files in the directory to determine the latest serial number
  const existingFiles = fs.readdirSync(folderPath);
  for (const file of existingFiles) {
    const match = file.match(filenameRegex);
    if (match && match[1] === tenant && match[3] === formattedDate) {
      const serialNumber = parseInt(match[4], 10);
      maxSerialNumber = Math.max(maxSerialNumber, serialNumber);
    }
  }

  // Increment the serial number for the new file
  const nextSerialNumber = maxSerialNumber + 1;
  const filename = `${folderPath}/in_${tenant}_${operator}_${formattedDate}_${nextSerialNumber}.json`;

  // Write the new file
  fs.writeFileSync(filename, JSON.stringify(jsonData, null, 3));
  console.log(`Input file ${filename} created successfully.`);
  return filename;
}

// Helper function to format the date for the filename
function formatDateForFilename(originalDate) {
  const dateParts = originalDate.split('-');
  if (dateParts.length !== 3) {
    console.error("Invalid date format:", originalDate);
    return null;
  }

  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthNumber = (monthNames.indexOf(dateParts[1].toUpperCase()) + 1).toString().padStart(2, '0');
  return `${monthNumber}${dateParts[0]}${dateParts[2].substring(2)}`;
}

module.exports = serializeInputData;
