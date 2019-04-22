const mongoose = require('mongoose');
const validUrl = require('valid-url');
const Yo = mongoose.model('yo');
const constants = require('../config/constants');
const shortCode = require('../middlewares/uniqueUrlCode');

const cache = require('../services/cache');
module.exports = app => {
  app.get('/api/health', async (req, res) => {
    return res.status(200).send('OK');
  });

  app.get('/api/item/:name', async (req, res) => {
    const urlName = req.params.name;
    const item = await Yo.findOne({ linkName: urlName });
    if (item) {
      return res.redirect(item.originalUrl);
    } else {
      return res.redirect(constants.errorUrl);
    }
  });

  app.post('/api/item', async (req, res) => {
    console.dir(req.body)
    const { shortBaseUrl, originalUrl, linkName } = req.body;
    if (validUrl.isUri(shortBaseUrl)) {
      console.log("URL is valid.")
    }
    else {
      console.log('Invalid Base URL format');
      return res.status(404).json('Invalid Base URL format');
    }

    const updatedAt = new Date();
    const queryOptions = { originalUrl };
    if (validUrl.isUri(originalUrl)) {
      let urlData;
      try {
        console.log("Checking Redis cache...")
        // Find the item is in the cache
        //urlData = await cache.getFromCache('originalUrl', JSON.stringify(queryOptions));

        if (!urlData) {
          // Find the item is in the database
          urlData = await Yo.findOne(queryOptions).exec();
        }

        if (urlData) {
          res.status(200).json(urlData);
        } else {
          console.log("Generating Short Code");
          const urlCode = shortCode.generate();
          //shortUrl = shortBaseUrl + '/' + urlCode;
          shortUrl = shortBaseUrl + '/' + linkName;
          const itemToBeSaved = { originalUrl, shortUrl, urlCode, linkName, updatedAt };

          // Add the item to db
          const item = new Yo(itemToBeSaved);
          await item.save();
          // Add the item to cache
          cache.addToCache('originalUrl', JSON.stringify(queryOptions), itemToBeSaved);
          res.status(200).json(itemToBeSaved);
        }
      } catch (err) {
        console.log('Invalid User ID');
        res.status(401).json('Invalid User ID');
      }
    } else {
      console.log('Invalid Original URL');
      return res.status(401).json('Invalid Original URL');
    }
  });
};
