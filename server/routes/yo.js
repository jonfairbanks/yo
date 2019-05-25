const YoCtrl = require('../controllers/yo')
const config = require('../config/config');

module.exports = (app) => {
  app.get('/', (req, res) => {
    res.redirect(config.baseUrl);
  });
  
  app.get('/api/', YoCtrl.getAll) // Get all Yos
  app.get('/api/latest', YoCtrl.getLatest) // Get latest Yos
  app.get('/api/popular', YoCtrl.getPopular) // Get popular Yos
  app.get('/api/recent', YoCtrl.getRecent) // Get recent Yos
  app.get('/api/item/:name', YoCtrl.getYo, YoCtrl.emitSocketUpdate) // Get a single Yo and emit socket updates
  app.post('/api/item', YoCtrl.postYo, YoCtrl.emitSocketUpdate) // Post a single Yo  and emit socket updates
  //app.post('/api/item/update', YoCtrl.updateYo, YoCtrl.emitSocketUpdate) // Update a single Yo
  //app.post('/api/item/delete', YoCtrl.deleteYo, YoCtrl.emitSocketUpdate) // Delete a single Yo
  app.get('/api/stats', YoCtrl.getStats) // Get statistics
};