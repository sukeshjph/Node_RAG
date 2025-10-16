/**
 * Evaluation CLI Entry Point
 * 
 * Usage:
 *   npm run eval           # Run with default k=5
 *   npm run eval -- --k=10 # Run with custom k
 */

import { config as loadEnv } from 'dotenv';
import { runEval } from './evalRunner';

// Load environment variables
loadEnv();

async function main() {
    try {
        // Parse command line arguments
        const args = process.argv.slice(2);
        let k = 5;

        // Simple argument parsing
        args.forEach(arg => {
            if (arg.startsWith('--k=')) {
                k = parseInt(arg.split('=')[1], 10);
            }
        });

        console.log('🚀 Retrieval Evaluation Harness');
        console.log();

        // Run evaluation
        const summary = await runEval(k);

        // Exit with success
        process.exit(0);

    } catch (error) {
        console.error('❌ Evaluation failed:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}

main();

