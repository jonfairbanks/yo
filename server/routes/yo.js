const mongoose = require('mongoose');
const validUrl = require('valid-url');
const Yo = mongoose.model('yo');
const config = require('../config/config');
const logger = require('../services/logger');
const cache = require('../services/cache');

module.exports = app => {
  app.get('/', async (req, res) => {
    res.redirect(config.baseUrl);
  });
  
  app.get('/api/', async (req, res) => {
    const all = await Yo.find({}).sort({"linkName": 1});
    if(all) {
      return res.status(200).json(all);
    }else {
      logger.error("Error retrieving all Yo\'s: " + res.data);
      return res.status(500).json('Error retrieving all Yo\'s');
    }
  });

  app.get('/api/latest', async (req, res) => {
    const latest = await Yo.find({}).sort({"createdAt": -1}).limit(10);
    if(latest) {
      return res.status(200).json(latest);
    }else {
      logger.error("Error retrieving the latest Yo\'s: " + res.data);
      return res.status(500).json('Error retrieving the latest Yo\'s');
    }
  });

  app.get('/api/popular', async (req, res) => {
    const pop = await Yo.find({}).sort({"urlHits": -1}).limit(10);
    if(pop) {
      return res.status(200).json(pop);
    }else {
      logger.error("Error retrieving popular Yo\'s: " + res.data);
      return res.status(500).json('Error retrieving popular Yo\'s');
    }
  });

  app.get('/api/recent', async (req, res) => {
    const rec = await Yo.find({}).sort({"lastAccess": -1}).limit(10);
    if(rec) {
      return res.status(200).json(rec);
    }else {
      logger.error("Error retrieving recently used Yo\'s: " + res.data);
      return res.status(500).json('Error retrieving recently used Yo\'s');
    }
  });

  app.get('/api/stats', async (req, res) => {
    var hits = 0;
    const hits_data = await Yo.find({},{urlHits:1, _id:0}).sort({urlHits: -1});
    for(i = 0; i < hits_data.length; i++) { 
      if(hits_data[i].urlHits){
        hits += hits_data[i].urlHits;
      }
    }
    if(hits_data.length > 0) {
      return res.status(200).json({
        "totalYos": hits_data.length,
        "totalHits": hits
      });
    }else {
      logger.error("Error retrieving Yo stats: " + res.data);
      return res.status(500).json('Error retrieving Yo stats');
    }
  });

  app.get('/api/item/:name', async (req, res) => {
    const ip = req.headers["x-real-ip"];
    const linkName = req.params.name.toLowerCase();
    var item = null;

    /*
    try {
      item = await cache.getFromCache('linkName', JSON.stringify({ linkName }));
      await Yo.findOneAndUpdate({ linkName: linkName }, {$inc : {urlHits : 1}, $set:{lastAccess:Date.now()}}); // Make sure to update the DB values, not efficient :(
    }catch(e) {
      logger.warn("Failed to find " + linkName + " in the cache: " + JSON.stringify(e));
    }
    */
   
    // Check the cache and fallback to database if necessary
    if(!item){
      logger.info("Didn't find " + linkName + " in cache. Trying the database.")
      item = await Yo.findOneAndUpdate({ linkName: linkName }, {$inc : {urlHits : 1}, $set:{lastAccess:Date.now()}});
      if(item) {
        try{
          cache.addToCache('linkName', JSON.stringify({ linkName }), item);
          logger.info("Updated missing cache entry for " + linkName);
        }catch(e){
          logger.warn("Failed to update missing cache entry for " + linkName + ": " + JSON.stringify(e));
        }
      }
    }

    // Send user to originalUrl or errorUrl
    if(item) {
      logger.info("User from " + ip + " loaded " + item.originalUrl + " as alias: " + linkName);
      return res.redirect(item.originalUrl);
    }else {
      logger.warn("Unable to find any entries for: " + linkName);
      return res.redirect(config.errorUrl);
    }
  });

  app.post('/api/item', async (req, res) => {
    const { shortBaseUrl, originalUrl, linkName } = req.body;
    const ip = req.headers["x-real-ip"];
    if(validUrl.isUri(shortBaseUrl)) {
    }else {
      logger.error("The Base URL provided in the config is not valid: " + shortBaseUrl);
      return res.status(400).json('The Base URL provided in the config is not valid.');
    }

    const updatedAt = new Date();
    const queryOptions = { linkName };
    if(validUrl.isUri(originalUrl)) {
      let urlData;
      try {
        // Find the item in the cache
        urlData = await cache.getFromCache('linkName', JSON.stringify(queryOptions));

        if(!urlData) {
          // Find if the item is in the db
          urlData = await Yo.findOne(queryOptions).exec();
        }

        if(urlData) {
          logger.info("User " + ip + " could not create a Yo as the name is already in-use: " + queryOptions.linkName);
          res.status(401).json('This name is already in-use. Please select another name.');
        } else {
          shortUrl = shortBaseUrl + '/' + linkName;
          const itemToBeSaved = { originalUrl, shortUrl, linkName, updatedAt };

          // Add the item to db
          const item = new Yo(itemToBeSaved);
          await item.save();
          // Add the item to cache
          cache.addToCache('linkName', JSON.stringify(queryOptions), itemToBeSaved);
          logger.info("User from " + ip + " created alias: " + linkName + " -> " + originalUrl);
          res.status(200).json(itemToBeSaved);
        }
      }catch(err) {
        logger.error("Invalid Session: " + err);
        res.status(401).json('Invalid Session');
      }
    } else {
      logger.warn("The provided URL is improperly formatted: " + originalUrl);
      return res.status(400).json('The provided URL is improperly formatted.');
    }
  });
};
