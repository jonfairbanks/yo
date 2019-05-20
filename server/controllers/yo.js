const mongoose = require('mongoose');
mongoose.promise = Promise;
const Yo = mongoose.model('yo');
const logger = require('../services/logger');
const config = require('../config/config');
const validUrl = require('valid-url');


// Get a single Yo from DB
exports.getYo = (req, res) => {
    const ip = req.headers["x-real-ip"];
    const linkName = req.params.name.toLowerCase();
    
    Yo.findOneAndUpdate({ linkName: linkName }, {$inc : {urlHits : 1}, $set:{lastAccess:Date.now()}})
        .then( item => {
            if(item){ // item returned is not empty
                logger.info("User from " + ip + " loaded " + item.originalUrl + " as alias: " + linkName);
                return res.redirect(item.originalUrl);
            } else { //item returned is empty
                logger.warn("Unable to find any entries for: " + linkName);
                return res.redirect(config.errorUrl);
            }
 
        }).catch( error => {
            logger.warn("There was an error while searching database for: " + linkName + '; ' + error);
            return res.redirect(config.errorUrl);
        });
}

// Add new Yo to DB
exports.postYo = (req, res) => {
    const { shortBaseUrl, originalUrl, linkName } = req.body;
    const ip = req.headers["x-real-ip"];

    const updatedAt = new Date();
    const queryOptions = { linkName };

    if(validUrl.isUri(originalUrl)) {

        Yo.findOne(queryOptions)
            .then( urlData => {
                
                if(urlData) {
                    // URL already exists
                    logger.info("User " + ip + " could not create a Yo as the name is already in-use: " + queryOptions.linkName);
                    res.status(401).json('This name is already in-use. Please select another name.');

                } else {
                    // Define Yo object
                    shortUrl = shortBaseUrl + '/' + linkName;
                    const itemToBeSaved = { originalUrl, shortUrl, linkName, updatedAt };
        
                    // Add the item to db
                    const item = new Yo(itemToBeSaved);

                    item.save().then(()=>{
                        logger.info("User from " + ip + " created alias: " + linkName + " -> " + originalUrl);
                        res.status(200).json(itemToBeSaved);

                    }).catch(error=>{
                        logger.info("Error while trying to save Yo:" + linkName + " -> " + originalUrl + " to database: " + error);
                        itemToBeSaved.status = "Failed"
                        res.status(200).json(itemToBeSaved);
                    });

                }
            }).catch( error => {
                //Handle Error
            });

    } else {
      logger.warn("The provided URL is improperly formatted: " + originalUrl);
      return res.status(400).json('The provided URL is improperly formatted.');
    }
}

// Get Yo statistics
exports.getStats = (req, res) => {
    var hits = 0;
    Yo.find({},{urlHits:1, _id:0}).sort({urlHits: -1})
        .then( hits_data => {
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
        }).catch( error => {
            //Handle Error
        });
    
}

// Get recent Yos
exports.getRecent = (req, res) => {
    Yo.find({}).sort({"lastAccess": -1}).limit(10)
        .then(rec => {
            if(rec) {
                return res.status(200).json(rec);
            }else {
                logger.error("Error retrieving recently used Yo\'s: " + res.data);
                return res.status(500).json('Error retrieving recently used Yo\'s');
            }
        }).catch( error => {
            //Handle Error
        });
    
}

exports.getPopular = (req, res) => {
    Yo.find({}).sort({"urlHits": -1}).limit(10)
        .then(pop=>{
            if(pop) {
                return res.status(200).json(pop);
            }else {
                logger.error("Error retrieving popular Yo\'s: " + res.data);
                return res.status(500).json('Error retrieving popular Yo\'s');
            }
        }).catch( error => {
            //Handle Error
        });
        
}

exports.getLatest = (req, res) => {
    Yo.find({}).sort({"createdAt": -1}).limit(10)
        .then(latest=>{
            if(latest) {
                return res.status(200).json(latest);
            }else {
                logger.error("Error retrieving the latest Yo\'s: " + res.data);
                return res.status(500).json('Error retrieving the latest Yo\'s');
            }
        }).catch( error => {
            //Handle Error
        });
    
}

exports.getAll = (req, res) => {
    Yo.find({}).sort({"linkName": 1})
        .then(all => {
            if(all) {
                return res.status(200).json(all);
            }else {
                logger.error("Error retrieving all Yo\'s: " + res.data);
                return res.status(500).json('Error retrieving all Yo\'s');
            }
        }).catch( error => {
            //Handle Error
        });
    
  }