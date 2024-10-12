// yoRoutes.d.ts
import { Router } from 'express';

declare module './yo' {
    const router: Router;
    export default router;
}