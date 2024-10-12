import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda";
import mongoose from 'mongoose';
import express from 'express';
import serverless from 'serverless-http';
import dotenv from 'dotenv';
import http from 'http';
import RateLimit from 'express-rate-limit';
import { Server } from 'socket.io';

import yoRoutes from './routes/yo';
import './models/yo';

dotenv.config();

mongoose.Promise = global.Promise;

// Extend Express type to include `io`
declare global {
    namespace Express {
        interface Application {
            io?: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
        }
    }
}

// Connect to MongoDB
async function connectToDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/yo');
        console.log('MongoDB connected...');
    } catch (err) {
        console.error('MongoDB connection error:', err);
        setTimeout(connectToDB, 3000); // Retry connection
    }
}

// Ensure the MongoDB connection events are only registered once
if (mongoose.connection.readyState === 0) {
    mongoose.connection.on('disconnected', (err) => {
        console.warn(`MongoDB disconnected: ${err}`);
        setTimeout(() => connectToDB(), 3000);
    });

    mongoose.connection.on('error', (err) => {
        console.warn(`MongoDB error: ${err}`);
        setTimeout(() => connectToDB(), 3000);
    });
}

// Setup Rate Limiter:
var limiter = RateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 150,
});

// Initialize Express app
const app = express();
app.use(express.json());
app.use(limiter); // apply rate limiter to all requests
app.use(yoRoutes);

interface ServerToClientEvents {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;

    // Custom events for your application
    allYos: (data: any[]) => void;
    liveYos: (data: any[]) => void;
    popYos: (data: any[]) => void;
}

interface ClientToServerEvents {
    hello: () => void;
}

interface InterServerEvents {
    ping: () => void;
}

interface SocketData {
    name: string;
    age: number;
}

// Initialize Socket.io
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>();
app.io = io; // Assign io to the app

// Wrap the Express app with serverless-http for AWS Lambda
const serverlessApp = serverless(app);

// Lambda handler
export const handler = async (
    event: APIGatewayProxyEventV2, 
    context: Context
): Promise<APIGatewayProxyResultV2<string>> => {
    try {
        // Connect to DB if not already connected
        if (mongoose.connection.readyState === 0) {
            await connectToDB();
        }

        // Pass the event and context to the serverless app
        const response = await serverlessApp(event, context);
        return response;
    } catch (error) {
        console.error('Error handling the request:', error); // Log the error
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};