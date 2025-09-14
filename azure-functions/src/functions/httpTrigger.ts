import { HttpRequest, HttpResponseInit, InvocationContext, app } from "@azure/functions";

// ======================
// HTTP Trigger Function
// ======================
export async function httpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request.');

    const name = request.query.get('name') || (await request.json() as any)?.name;
    const responseMessage = name
        ? `Hello, ${name}. This HTTP triggered function executed successfully.`
        : `This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response.`;

    return {
        status: 200,
        body: responseMessage
    };
}

app.http('httpTrigger', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: httpTrigger
});

export default httpTrigger;
