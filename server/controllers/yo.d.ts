import { Request, Response, NextFunction } from 'express';

declare module './yo' {
    export const getYo: (req: Request, res: Response) => Promise<void>;
    export const postYo: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    export const updateYo: (req: Request, res: Response) => Promise<void>;
    export const deleteYo: (req: Request, res: Response) => Promise<void>;
    export const getStats: (req: Request, res: Response) => Promise<void>;
    export const getRecent: (req: Request, res: Response) => Promise<void>;
    export const getPopular: (req: Request, res: Response) => Promise<void>;
    export const getLatest: (req: Request, res: Response) => Promise<void>;
    export const getAll: (req: Request, res: Response) => Promise<void>;
    export const emitSocketUpdate: (req: Request) => Promise<void>;
}