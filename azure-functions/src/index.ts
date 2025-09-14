// Import all function modules
import "./functions/httpTrigger";
import "./functions/ingestDocuments";
import "./functions/testFunction";

// ======================
// Azure Functions Entry Point
// ======================
import { app } from "@azure/functions";

// This file serves as the entry point for Azure Functions
// All functions are registered through their respective modules

// Ensure the app is properly initialized
console.log('Azure Functions app initialized');

// Export the app to ensure it's included in the bundle
export { app };
