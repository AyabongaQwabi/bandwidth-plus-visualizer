const fs = require('fs');
const R = require('ramda');
const moment = require('moment');

module.exports.getUsageTotalsFromCsv = (csvFilePath) => {

  const data = fs.readFileSync(csvFilePath).toString();
  const toGigabytes = (mb) => Math.round(mb/1024).toFixed(2);

  let currentLine = '';
  const lines = R.map((lineChar) =>{
    if(lineChar !== '\n'){
      currentLine+=lineChar
    }
    else{
      const toReturn = currentLine;
      currentLine = '';
      return toReturn;
    }
  },data).filter((i) => !R.isNil(i))

  const columnHeaders = R.head(lines).split(',');
  const dataRecords = R.tail(lines)
  const dataRecordMap = R.map((record) => {
    const recordArr = record.split(',')
    const recordObjArr =
      R.map((col) =>
        R.assoc(col, recordArr[columnHeaders.indexOf(col)], {}), columnHeaders)
    return R.mergeAll(recordObjArr);
  },dataRecords)

  const months =
    R.uniq(
      R.map((record) =>
        moment(record['Date'], "YYYY-MM-DD").format('MMMM'), dataRecordMap));

  const totalUsageByMonth = R.map((month) => {
      const monthData =
        R.filter((record) =>
          month== moment(record['Date'], "YYYY-MM-DD").format('MMMM'), dataRecordMap)

      const monthDataTotals = R.map((md) => {
        const networkTotals = R.omit(['Date','Up','Down'], md);
        const networkTotalsInGigabytes =
          R.assoc('Total', toGigabytes(md['Total']), networkTotals);
        return networkTotalsInGigabytes;
      }, monthData)

      const monthObj = R.assoc(month,monthDataTotals,{});
      return monthObj;
  }, months)

  const totalUsageMap = R.map((monthlyUsage) => {
    return R.mapObjIndexed((monthlyUsageArr, month) => {
      const networks =
        R.uniq(
           R.map((selectedMonthData)=> selectedMonthData['Network'], monthlyUsageArr));

      const getSumOfNetwork =
        (selectedNetwork) =>
          R.reduce(
            (acc, data) =>
              (data['Network'] == selectedNetwork) ? (acc += parseFloat(data['Total'])) : (acc),
          0, monthlyUsageArr);

      const sum = R.map((net)=> R.assoc(net, getSumOfNetwork(net), {}),networks);
      return sum;
    }, monthlyUsage);
  },totalUsageByMonth)

 return totalUsageMap;
}

/**
  Returns data in the following format
  {
         Month1:[ { Network1: total-usage-in-gb }, { Network2: total-usage-in-gb } ...]
         Month2:[ { Network1: total-usage-in-gb }, { Network2: total-usage-in-gb } ...]
         Month3:[ { Network1: total-usage-in-gb }, { Network2: total-usage-in-gb } ...]
  }
**/
