const YoCtrl = require('../controllers/yo')
const config = require('../config/config');

module.exports = app => {
  app.get('/', (req, res) => {
    res.redirect(config.baseUrl);
  });
  
  app.get('/api/', YoCtrl.getAll) // Get all Yos
  app.get('/api/latest', YoCtrl.getLatest) // Get latest Yos
  app.get('/api/popular', YoCtrl.getPopular) // Get popular Yos
  app.get('/api/recent', YoCtrl.getRecent) // Get recent Yos
  app.get('/api/item/:name', YoCtrl.getYo) // Get a single Yo
  app.post('/api/item', YoCtrl.postYo) // Post a single Yo
  app.get('/api/stats', YoCtrl.getStats) // Get statistics
};
