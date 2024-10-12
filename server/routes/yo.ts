import { Request, Response, NextFunction, Router } from 'express';
import axios from 'axios';
import * as YoCtrl from '../controllers/yo';

const router = Router();

// Authentication middleware
export const authCheck = (req: Request, res: Response, next: NextFunction) => {
    console.log(`Checking auth status @ ${Date.now()}`); // eslint-disable-line
    let headers: Record<string, string> = {};

    if (process.env.AUTH === 'true' && req.headers && req.headers.authorization) {
        headers = { Authorization: req.headers.authorization };
    } else {
        // Don't return here, just call next with an error
        return next(new Error('Authentication Error'));
    }

    if (headers) {
        axios.get(`https://${process.env.AUTH0_DOMAIN}/userinfo`, { headers })
            .then(response => {
                console.log(`Authentication successful as ${response.data.nickname}`); // eslint-disable-line
                next();
            })
            .catch(() => {
                next(new Error('Authentication Error'));
            });
    }
};

// Unprotected Paths
router.get('/', (_req: Request, res: Response) => {
    res.redirect(process.env.BASE_URL!); // Redirect lost users
});

// Controller functions must return void and not Response
router.get('/api/link/:name', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await YoCtrl.getYo(req, res, next);
        await YoCtrl.emitSocketUpdate(req, res, next);
    } catch (error) {
        next(error); // Pass error to error handler
    }
});

// Protected Paths (if enabled)
if (process.env.AUTH === 'true') {
    console.log('\n** API Authentication Enabled **\n'); // eslint-disable-line
    router.use(authCheck);
}

router.get('/api/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await YoCtrl.getAll(req, res, next);
    } catch (error) {
        next(error);
    }
});

router.get('/api/stats', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await YoCtrl.getStats(req, res, next);
    } catch (error) {
        next(error);
    }
});

router.get('/api/latest', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await YoCtrl.getLatest(req, res, next);
    } catch (error) {
        next(error);
    }
});

router.get('/api/popular', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await YoCtrl.getPopular(req, res, next);
    } catch (error) {
        next(error);
    }
});

router.get('/api/recent', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await YoCtrl.getRecent(req, res, next);
    } catch (error) {
        next(error);
    }
});

router.post('/api/link', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await YoCtrl.postYo(req, res, next);
        await YoCtrl.emitSocketUpdate(req, res, next);
    } catch (error) {
        next(error);
    }
});

router.post('/api/update/:name', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await YoCtrl.updateYo(req, res, next);
        await YoCtrl.emitSocketUpdate(req, res, next);
    } catch (error) {
        next(error);
    }
});

router.post('/api/delete/:name', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await YoCtrl.deleteYo(req, res, next);
        await YoCtrl.emitSocketUpdate(req, res, next);
    } catch (error) {
        next(error);
    }
});

export default router;