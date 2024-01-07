const { Client } = require("@googlemaps/google-maps-services-js");

require('dotenv').config()

const client = new Client({})

function getDistance(original, destination) {
  const address1 = original.replace(/\n/g, ' ').trim()
  const address2 = destination.replace(/\n/g, ' ').trim()
  return client.distancematrix({
    params: {
      origins: [address1],
      destinations: [address2],
      region: 'ca',
      key: process.env.GOOGLE_MAPS_API_KEY
    },
    timeout: 1000
  })
    .then(r => {
      if (r.data.status === 'OK') {
        return {
          distance: r.data.rows[0].elements[0].distance.value,
          duration: r.data.rows[0].elements[0].duration.value,
        }
      }
      else {
        console.log('Error: ', r.data.status)
        return -1
      }
    })
    .catch(e => {
      console.log('Error: ', e)
      return -1
    })
}

module.exports = {
  getDistance
}