const mongoose = require('mongoose');
const validUrl = require('valid-url');
const Yo = mongoose.model('yo');
const config = require('../config/config');
const cache = require('../services/cache');

module.exports = app => {
  app.get('/api/', async (req, res) => {
    const all = await Yo.find({}).sort({"linkName": 1});
    if (all) {
      return res.status(200).json(all);
    } else {
      return res.status(500).json('Error retrieving all Yo\'s');
    }
  });

  app.get('/api/popular', async (req, res) => {
    const pop = await Yo.find({}).sort({"urlHits": -1}).limit(10);
    if (pop) {
      return res.status(200).json(pop);
    } else {
      return res.status(500).json('Error retrieving popular Yo\'s');
    }
  });

  app.get('/api/recent', async (req, res) => {
    const rec = await Yo.find({}).sort({"lastAccess": -1}).limit(10);
    if (rec) {
      return res.status(200).json(rec);
    } else {
      return res.status(500).json('Error retrieving recently used Yo\'s');
    }
  });

  app.get('/api/latest', async (req, res) => {
    const latest = await Yo.find({}).sort({"createdAt": -1}).limit(10);
    if (latest) {
      return res.status(200).json(latest);
    } else {
      return res.status(500).json('Error retrieving the latest Yo\'s');
    }
  });

  app.get('/api/item/:name', async (req, res) => {
    const urlName = req.params.name.toLowerCase();
    const item = await Yo.findOneAndUpdate({ linkName: urlName }, {$inc : {urlHits : 1}, $set:{lastAccess:Date.now()}});
    if (item) {
      return res.redirect(item.originalUrl);
    } else {
      return res.redirect(config.errorUrl);
    }
  });

  app.post('/api/item', async (req, res) => {
    const { shortBaseUrl, originalUrl, linkName } = req.body;
    if (validUrl.isUri(shortBaseUrl)) {
    }
    else {
      return res.status(400).json('The Base URL provided in the config is not valid.');
    }

    const updatedAt = new Date();
    const queryOptions = { linkName };
    if (validUrl.isUri(originalUrl)) {
      let urlData;
      try {
        // Find the item in the cache
        urlData = await cache.getFromCache('linkName', JSON.stringify(queryOptions));
        // TODO: Should this call fallback to database?

        if (!urlData) {
          // Find if the item is in the database
          urlData = await Yo.findOne(queryOptions).exec();
        }

        if (urlData) {
          res.status(401).json('This name is already in-use. Please select another name.');
        } else {
          shortUrl = shortBaseUrl + '/' + linkName;
          const itemToBeSaved = { originalUrl, shortUrl, linkName, updatedAt };

          // Add the item to db
          const item = new Yo(itemToBeSaved);
          await item.save();
          // Add the item to cache
          cache.addToCache('linkName', JSON.stringify(queryOptions), itemToBeSaved);
          res.status(200).json(itemToBeSaved);
        }
      } catch (err) {
        console.log("Session Error: " + err);
        res.status(401).json('Invalid Session');
      }
    } else {
      return res.status(400).json('The provided URL is improperly formatted.');
    }
  });
};
