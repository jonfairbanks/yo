import {APIGatewayProxyEventV2, APIGatewayProxyResultV2} from "aws-lambda";

export const handler = async (
    event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2<string>> => {
    const message = "Hello World!";
    console.log(`The event: ${JSON.stringify(event)}`);
    console.log(`Returning ${message}`);
    return {
        statusCode: 200,
        body: JSON.stringify(message),
    } as APIGatewayProxyResultV2<string>;
}