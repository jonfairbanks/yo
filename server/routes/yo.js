const mongoose = require('mongoose');
const validUrl = require('valid-url');
const Yo = mongoose.model('yo');
const config = require('../config/config');
const cache = require('../services/cache');

module.exports = app => {
  app.get('/api/health', async (req, res) => {
    return res.status(200).send('OK');
  });

  app.get('/api/item/:name', async (req, res) => {
    const urlName = req.params.name;
    console.log("Request for " + urlName + " received...");
    const item = await Yo.findOne({ linkName: urlName });
    if (item) {
      console.log("Result found for " + urlName);
      return res.redirect(item.originalUrl);
    } else {
      console.log("No results found for " + urlName);
      return res.redirect(config.errorUrl);
    }
  });

  app.post('/api/item', async (req, res) => {
    const { shortBaseUrl, originalUrl, linkName } = req.body;
    if (validUrl.isUri(shortBaseUrl)) {
    }
    else {
      return res.status(404).json('Invalid Base URL format');
    }

    const updatedAt = new Date();
    const queryOptions = { originalUrl };
    if (validUrl.isUri(originalUrl)) {
      let urlData;
      try {
        console.log("Checking Redis cache...")
        // Find the item in the cache
        //urlData = await cache.getFromCache('originalUrl', JSON.stringify(queryOptions));

        if (!urlData) {
          // Find the item is in the database
          urlData = await Yo.findOne(queryOptions).exec();
        }

        if (urlData) {
          res.status(200).json(urlData);
        } else {
          shortUrl = shortBaseUrl + '/' + linkName;
          const itemToBeSaved = { originalUrl, shortUrl, linkName, updatedAt };

          // Add the item to db
          const item = new Yo(itemToBeSaved);
          await item.save();
          // Add the item to cache
          cache.addToCache('originalUrl', JSON.stringify(queryOptions), itemToBeSaved);
          res.status(200).json(itemToBeSaved);
        }
      } catch (err) {
        res.status(401).json('Invalid User ID');
      }
    } else {
      return res.status(401).json('Invalid Original URL');
    }
  });
};
