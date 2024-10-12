import { Logger } from 'winston';

declare module './logger' {
    const logger: Logger;
    export default logger;
}