/*Version Info
-----Version-1.0----
*/
const fs = require('fs');
const oracledb = require('oracledb');
const dbConfig = require('../dbconfig');
const GSE_USER = 'GSE_USER';
async function resequenceStops(connection, segmentId, date) {
  console.log("starting resequenceStops, date is " + date );
  try {
    const result = await connection.execute(
      `BEGIN DEV.ITMS8_GSE20.RESEQUENCESEGMENTS(:pTravelDate, :pSegid); END;`,
      {
        pTravelDate: date,
        pSegid: segmentId
      }
    );
    await connection.commit();
    //console.log('Resequence stops result for segment:', segmentId, result);
  } catch (err) {
    console.error('Error resequencing stops for segment:', segmentId, err);
  }
}
function formatDateString(dateString) {
  const [day, month, year] = dateString.split('-');
  const months = {
    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
    'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
  };
  return `${months[month.toUpperCase()]}/${day}/${year}`;
}
async function readJsonFile(tenant,travelDate,filename) {
  console.log("readJsonFile() starts travelDate is " + travelDate);
  connection = await oracledb.getConnection(dbConfig[tenant]);
  const formattedDate = formatDateString(travelDate);
  await resequenceStops(connection, "ALL", formattedDate);
  return;
  const filePath = `/var/www/html/GSE2/Schedules/${filename}`;
  fs.readFile(filePath, "utf8", async (err, data) => {
    console.log("read json file starts");
    if (err) {
      console.error("Error reading the JSON file:", err);
      return;
    }
    try {
      const jsonData = JSON.parse(data);
      const segmentIds = new Set();
      const formattedDate = formatDateString(travelDate);
      jsonData.routes.forEach(route => {
        const segmentId = `S${route.vehicle}`;
        segmentIds.add(segmentId);
      });
      const connection = await oracledb.getConnection(dbConfig);
      for (const segmentId of segmentIds) {
        await resequenceStops(connection, segmentId, travelDate);
      }
      await connection.close();
    } catch (err) {
      console.error("Error parsing JSON:", err);
    }
    console.log("read json file ends");
  });
  console.log("readJsonFile() ends");
}
module.exports = readJsonFile;