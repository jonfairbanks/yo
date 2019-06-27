const YoCtrl = require('../controllers/yo');
const axios = require('axios');

const authCheck = (req, res, next) => {
  try{ var authToken = req.headers['authorization'] }catch(e) {res.status(401).json('Authentication Error')}
  const headers = { 'Authorization': authToken }
  axios.get('https://' + process.env.AUTH0_DOMAIN + '/userinfo', {headers: headers})
  .then((res) => { next() })
  .catch((err) => { res.status(401).json('Authentication Error'); return })
}

module.exports = (app) => {
  /*
    Unprotected Paths
  */
  app.get('/', (req, res) => {res.redirect(process.env.BASE_URL)}) // Redirect lost users
  app.get('/api/link/:name', YoCtrl.getYo, YoCtrl.emitSocketUpdate) // Redirect to a Yo
  /*
    Protected Paths (if enabled)
  */
  if(process.env.AUTH === 'true'){
    console.log("\n** API Authentication Enabled **\n")
    app.use(authCheck)
  }
  app.get('/api/', YoCtrl.getAll) // Get all Yos
  app.get('/api/stats', YoCtrl.getStats) // Get statistics
  app.get('/api/latest', YoCtrl.getLatest) // Get latest Yos
  app.get('/api/popular', YoCtrl.getPopular) // Get popular Yos
  app.get('/api/recent', YoCtrl.getRecent) // Get recent Yos
  app.post('/api/link', YoCtrl.postYo, YoCtrl.emitSocketUpdate) // Create a new Yo
  app.post('/api/update/:name', YoCtrl.updateYo, YoCtrl.emitSocketUpdate) // Update a Yo
  app.post('/api/delete/:name', YoCtrl.deleteYo, YoCtrl.emitSocketUpdate) // Delete a Yo
};