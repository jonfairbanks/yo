const axios = require('axios');
const YoCtrl = require('../controllers/yo');

const authCheck = (req, res, next) => {
  console.log(`Checking auth status @ ${Date.now()}`)
  let headers = null;
  if(process.env.AUTH === 'true' && req.headers && req.headers.authorization) {
    headers = { Authorization: req.headers.authorization };
  } else {
    res.status(401).json('Authentication Error');
  }

  if(headers) {
    axios.get(`https://${process.env.AUTH0_DOMAIN}/userinfo`, { headers })
      .then(x => console.log(`Authentication successful as ${x.data.nickname}`))
      .then(next())
      .catch(() => {
        res.status(401).json('Authentication Error')
      });
  }
};

module.exports = (app) => {
  /* Unprotected Paths */
  app.get('/', (_req, res) => { res.redirect(process.env.BASE_URL); }); // Redirect lost users
  app.get('/api/link/:name', YoCtrl.getYo, YoCtrl.emitSocketUpdate); // Redirect to a Yo
  /* Protected Paths (if enabled) */
  if(process.env.AUTH === 'true') {
    console.log('\n** API Authentication Enabled **\n'); // eslint-disable-line
    app.use(authCheck);
  }
  app.get('/api/', YoCtrl.getAll); // Get all Yos
  app.get('/api/stats', YoCtrl.getStats); // Get statistics
  app.get('/api/latest', YoCtrl.getLatest); // Get latest Yos
  app.get('/api/popular', YoCtrl.getPopular); // Get popular Yos
  app.get('/api/recent', YoCtrl.getRecent); // Get recent Yos
  app.post('/api/link', YoCtrl.postYo, YoCtrl.emitSocketUpdate); // Create a new Yo
  app.post('/api/update/:name', YoCtrl.updateYo, YoCtrl.emitSocketUpdate); // Update a Yo
  app.post('/api/delete/:name', YoCtrl.deleteYo, YoCtrl.emitSocketUpdate); // Delete a Yo
};
