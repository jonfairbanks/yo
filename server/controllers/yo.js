const mongoose = require('mongoose');
mongoose.promise = Promise;
const Yo = mongoose.model('yo');
const logger = require('../services/logger');
const config = require('../config/config');
const validUrl = require('valid-url');


// Get a single Yo from DB and redirect
exports.getYo = (req, res, next) => {
    const ip = req.headers["x-real-ip"];
    const linkName = req.params.name.toLowerCase();
    Yo.findOneAndUpdate({ linkName: linkName }, {$inc : {urlHits : 1}, $set:{lastAccess:Date.now()}})
        .then( item => {
            if(item){
                logger.info("User from " + ip + " loaded " + item.originalUrl + " as alias: " + linkName);
                return res.redirect(item.originalUrl);
            } else {
                logger.warn("Unable to find any entries for: " + linkName);
                return res.redirect(config.errorUrl);
            }
        })
        .catch( error => {
            logger.error("There was an error while searching database for: " + linkName + ': ' + error);
            return res.redirect(config.errorUrl);
        });
    next()      
}

// Add new Yo to DB
exports.postYo = (req, res, next) => {
    const { shortBaseUrl, originalUrl, linkName } = req.body;
    const ip = req.headers["x-real-ip"];
    const updatedAt = new Date();
    const queryOptions = { linkName };
    if(validUrl.isUri(originalUrl)) {
        Yo.findOne(queryOptions)
            .then( urlData => {
                if(urlData) {
                    logger.info("User " + ip + " could not create a Yo as the name is already in-use: " + queryOptions.linkName);
                    res.status(401).json('This name is already in-use. Please select another name.');
                } else {
                    shortUrl = shortBaseUrl + '/' + linkName;
                    const itemToBeSaved = { originalUrl, shortUrl, linkName, updatedAt };
                    const item = new Yo(itemToBeSaved);
                    item.save().then(()=>{
                        logger.info("User from " + ip + " created alias: " + linkName + " -> " + originalUrl);
                        res.status(200).json(itemToBeSaved);
                    }).catch(error=>{
                        logger.error("Error while trying to save Yo:" + linkName + " -> " + originalUrl + " to database: " + error);
                        itemToBeSaved.status = "Failed"
                        res.status(500).json(itemToBeSaved);
                    });
                }
            });
        next()
    } else {
      logger.warn("The provided URL is improperly formatted: " + originalUrl);
      return res.status(400).json('The provided URL is improperly formatted.');
    }
}

// Update existing Yo in DB
exports.updateYo = (req, res) => {
    const originalUrl = req.body.originalUrl;
    const linkName = req.params.name.toLowerCase();
    const ip = req.headers["x-real-ip"];
    const updatedAt = new Date();
    if(validUrl.isUri(originalUrl)) {
        Yo.findOneAndUpdate({"linkName": linkName}, {$set: {"originalUrl": originalUrl, "updatedAt": updatedAt}}, {returnNewDocument: true})
            .then(data => {
                if(data) {
                    logger.info("User from " + ip + " updated " + originalUrl + " as alias: " + linkName);
                    return res.status(200).json(linkName + ' updated successfully.');
                } else {
                    logger.warn("User from " + ip + " tried updating alias: " + linkName + ", but it doesn't exist.");
                    return res.status(500).json('There was an error while updating that Yo');
                }
            })
            .catch( error => {
                logger.warn("There was an error while updating alias: " + linkName + ': ' + error);
                return res.status(500).json('There was an error while updating that Yo');
            });
    } else {
      logger.warn("The provided URL is improperly formatted: " + originalUrl);
      return res.status(400).json('The provided URL is improperly formatted.');
    }
}

// Delete a Yo from DB
exports.deleteYo = (req, res) => {
    const ip = req.headers["x-real-ip"];
    const linkName = req.params.name.toLowerCase();
    Yo.findOneAndDelete({ linkName: linkName })
        .then(item => {
            if(item){
                logger.info("User from " + ip + " deleted " + item.originalUrl + " as alias: " + linkName);
                return res.status(200).json(linkName + ' deleted successfully.');
            } else {
                logger.warn("Unable to delete alias: " + linkName);
                return res.status(500).json('Failed to delete ' + linkName);
            }
        })
        .catch( error => {
            logger.warn("There was an error while deleting alias: " + linkName + ': ' + error);
            return res.status(500).json('There was an error while deleting that Yo');
        });
}

// Get Yo statistics
exports.getStats = (req, res) => {
    var hits = 0;
    Yo.find({},{urlHits:1, _id:0}).sort({urlHits: -1})
        .then( hits_data => {
            for(i = 0; i < hits_data.length; i++) { 
                if(hits_data[i].urlHits) { hits += hits_data[i].urlHits }
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
        });
}

exports.emitSocketUpdate = (req, res) => {
    // All
    Yo.find({}).sort({"linkName": 1})
        .then(all => {
            if(all) {
                req.app.io.emit("allYos", all)
            }else {
                logger.error("Error retrieving all Yo\'s: " + res.data);   
            }
        });

    // Live
    Yo.find({}).sort({"lastAccess": -1}).limit(10)
        .then(latest=>{
            if(latest) {
                req.app.io.emit("liveYos", latest)
            }else {
                logger.error("Error retrieving the latest Yo\'s: " + res.data);
            }
        });

    // Popular
    Yo.find({}).sort({"urlHits": -1}).limit(10)
        .then(pop=>{
            if(pop) {
                req.app.io.emit("popYos", pop)
            }else {
                logger.error("Error retrieving popular Yo\'s: " + res.data);
            }
        });
}
