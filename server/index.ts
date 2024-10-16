import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from "aws-lambda";
import mongoose from 'mongoose';
import express from 'express';
import serverless from 'serverless-http';
import dotenv from 'dotenv';
import http from 'http';
import RateLimit from 'express-rate-limit';

import yoRoutes from './routes/yo';
import './models/yo';

dotenv.config();

// Global variable to track DB connection status
let isConnected = false;

mongoose.Promise = global.Promise;

// Connect to MongoDB
async function connectToDB() {
    if (isConnected) {
        console.log('=> Using existing database connection');
        return;
    }

    try {
        const connection = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/yo', {
            minPoolSize: 5,
            maxPoolSize: 10,
        });
        isConnected = mongoose.connection.readyState === 1;  // Set flag to true if connected
        console.log(`Connected to database: ${connection.connection.name}`);
        console.log(`Host: ${connection.connection.host}`);
        console.log(`Port: ${connection.connection.port}`);
        console.log(`Connected at: ${new Date().toLocaleString()}`);
    } catch (err) {
        console.error('MongoDB connection error:', err);
        setTimeout(connectToDB, 3000); // Retry connection after 3 seconds
    }
}

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

// Setup Rate Limiter
var limiter = RateLimit({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 150,
});

// Initialize Express app
const app = express();
app.use(express.json());
app.set('trust proxy', 1);
app.use(limiter);
app.use(yoRoutes);

// Wrap the Express app with serverless-http for AWS Lambda
const serverlessApp = serverless(app);

// Lambda handler
export const handler = async (
    event: APIGatewayProxyEventV2, 
    context: Context
): Promise<APIGatewayProxyResultV2<string>> => {
    context.callbackWaitsForEmptyEventLoop = false; // Allows Lambda to reuse the database connection

    try {
        // Connect to DB if not already connected
        if (mongoose.connection.readyState === 0) {
            await connectToDB();
        }

        // Pass the event and context to the serverless app
        const response: any = await serverlessApp(event, context);

        const headers = {
            ...response?.headers || {},
            'Access-Control-Allow-Origin': '*', // TODO: specify a domain instead of '*'
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        return {
            ...response,
            headers,
        };
    } catch (error) {
        console.error('Error handling the request:', error); // Log the error
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error' }),
        };
    }
};