// Import all function modules
import "./functions/httpTrigger";
import "./functions/ingestDocuments";

// ======================
// Azure Functions Entry Point
// ======================
import { app } from "@azure/functions";

// This file serves as the entry point for Azure Functions
// All functions are registered through their respective modules
