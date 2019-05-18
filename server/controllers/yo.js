const mongoose = require('mongoose');
mongoose.promise = Promise;
const redis = require('redis');
const keys = require('../config/redis');
const Yo = mongoose.model('yo');
const logger = require('../services/logger');
const config = require('../config/config');
const redisClient = redis.createClient(keys.redisUrl);


// GET YO FROM DB
exports.get = (req, res) => {
    const ip = req.headers["x-real-ip"];
    const linkName = req.params.name.toLowerCase();
    
    Yo.findOneAndUpdate({ linkName: linkName }, {$inc : {urlHits : 1}, $set:{lastAccess:Date.now()}})
        .catch( error => {
            logger.warn("Unable to find any entries for: " + linkName + '; ' + error);
            return res.redirect(config.errorUrl);
        })
        .then( item => {
            logger.info("User from " + ip + " loaded " + item.originalUrl + " as alias: " + linkName);
            return res.redirect(item.originalUrl);
        });

}

// GET YO FROM CACHE
exports.getCached = (req, res) => {
    const ip = req.headers["x-real-ip"];
    const linkName = req.params.name.toLowerCase();

    redisClient.hget('linkName', JSON.stringify({linkName}), (error, item)=> {
        if(error){ //there was an error in redis
            logger.warn("There was an error with cache while trying to find " + linkName + '; ' + error);
            return res.redirect(config.errorUrl);
        }
        else if (item) { //Item exists in cache, redirect using item from cache
            logger.info("User from " + ip + " loaded " + item.originalUrl + " as alias: " + linkName + " from cache");
            return res.redirect(JSON.parse(item).originalUrl);
        }
        else { //Item does not exist in cache, pull from the database
            Yo.findOne({ linkName: linkName })
                .catch( error => {
                    logger.warn("Unable to find any entries for: " + linkName + '; ' + error);
                    return res.redirect(config.errorUrl);
                })
                .then( item => {
                    logger.info("User from " + ip + " loaded " + item.originalUrl + " as alias: " + linkName);
                    return res.redirect(item.originalUrl);
                });
        }
    });
        
}