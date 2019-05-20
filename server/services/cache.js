const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const keys = require('../config/redis');

const client = redis.createClient(keys.redisUrl);
client.hget = util.promisify(client.hget);

client.on('error', function(err) {});

module.exports = {
  clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  },
  addToCache(hashKey, key, result) {
    client.hset(hashKey, key, JSON.stringify(result));
  },
  clearField(hashKey) {
    client.del(hashKey);
  },
  async getFromCache(hashKey, key) {
    const cacheValue = await client.hget(hashKey, key);
    if (cacheValue) {
      const result = JSON.parse(cacheValue);
      return result;
    }
    return null;
  },
};
