const puppeteer = require('puppeteer');
const { getDistance } = require('./distance.js');
const { writeDataToFile } = require('./to-csv.js');

const MyAddress = "4880 Bennett, Burnaby, BC V5H 0C1"

const siteDomain = "https://www.healthspace.ca/"
const BurnabyDaycareUrl = `${siteDomain}Clients/FHA/FHA_Website.nsf/CCFL-Child-List-All?OpenView&Count=50&RestrictToCategory=23B11DF8A3C9C1E63649D5E3AD0748DC&start=100`
const Data = []

async function waitForSeconds(seconds) {
  return new Promise(resolve => {
    setTimeout(resolve, seconds * 1000);
  })
}

async function findElement(elements, text) {
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const textContent = await element.evaluate(element => element.innerText);
    if (textContent.includes(text)) {
      return element;
    }
  }
}

async function getNextUrl(page) {
  const paginationTags = await page.$$('body > div > a');
  let nextUrl;
  for (let i = 0; i < paginationTags.length; i++) {
    const paginationTag = paginationTags[i];
    const paginationText = await paginationTag.$eval('img', img => img.alt);
    if (paginationText === 'Next') {
      nextUrl = await paginationTag.evaluate(a => a.href);
    }
  }
  return nextUrl;
}


async function processRowData(dayCarePage) {
  try {
    const pTags = await dayCarePage.$$('p');
    // Find pTags contaning Facility Location text
    const addressPTag = await findElement(pTags, 'Facility Location');
    const address = await addressPTag.evaluate(p => p.innerText.replace('Facility Location:', '').replace(/\n/g, ' '));

    const facilityInformationsTags = await dayCarePage.$$('body > p > table > tbody > tr > td');
    const capacity = await findElement(facilityInformationsTags, 'Capacity');
    const capacityText = await capacity.evaluate(td => td.innerText.replace('Capacity: ', ''));
    const capacityNumber = parseInt(capacityText);
    const { distance, duration } = await getDistance(MyAddress, address);
    return {
      address,
      capacity: capacityNumber,
      distance,
      duration
    }
  } catch (e) {
    console.log(e);
    return {
      address: '',
      capacity: '',
      distance: '',
      duration: ''
    }
  }
}


async function main() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1024 });

  let nextPageUrl = BurnabyDaycareUrl;

  const childCarePage = await browser.newPage();
  await childCarePage.setViewport({ width: 1080, height: 1024 });

  let pageNumber = 2
  while (nextPageUrl) {
    console.log(`Processing page ${pageNumber}...`);
    console.log(`Navigating to ${nextPageUrl}...`);
    await page.goto(nextPageUrl);

    const table = await page.$('p > table');
    const rows = await table.$$('tr');
    nextPageUrl = await getNextUrl(page);

    const data = []
    for (let i = 1; i < rows.length; i++) {
      // Pause for 10 seconds before each request
      await waitForSeconds(3);
      console.log(`Processing row ${i}...`);
      const row = rows[i];
      const url = await row.$eval('td:nth-child(1) > a', a => a.href);
      const name = await row.$eval('td:nth-child(1) > a', a => a.innerText);
      const phone = await row.$eval('td:nth-child(2)', td => td.innerText.trim());
      const manager = await row.$eval('td:nth-child(3)', td => td.innerText.trim());

      console.info(`Processing ${name} ${url}...`);
      await childCarePage.goto(`${url}`);
      const rowData = await processRowData(childCarePage);

      data.push({
        manager,
        name,
        phone,
        url,
        ...rowData
      })
    }
    writeDataToFile(data, `data_${pageNumber}.csv`);
    pageNumber += 1;
    console.info(`Done processing ${pageNumber} rows...`)
    await waitForSeconds(60);
  }
  return Data;
}

main().then(data => {
  console.log('Done');
})

