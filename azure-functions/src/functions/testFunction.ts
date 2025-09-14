import { HttpRequest, HttpResponseInit, InvocationContext, app } from "@azure/functions";

export async function testFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Test function executed');
    return {
        status: 200,
        body: 'Test function works!'
    };
}

// Register the function
app.http('testFunction', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: testFunction
});
