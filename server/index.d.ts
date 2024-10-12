import * as express from 'express';
import { Server } from 'socket.io';

declare module 'express-serve-static-core' {
    interface Application {
        io: Server; // Add the type for `io`
    }
}