import path from 'path'
import { fileURLToPath } from 'url'
import de from 'dotenv'
import { existsSync } from 'fs';

const __dirname = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const __envfile = path.join(__dirname, '.env.local')

let nodeEnv: string | undefined;

if (existsSync(__envfile)) {
    de.config({ path: __envfile })
    nodeEnv = process.env.NODE_ENV
}

export default function loadEnv(dotenv: any) {
    if (!nodeEnv && (nodeEnv !== 'prod' && nodeEnv !== 'production')) {
        dotenv.config({ path: __envfile })
    }
}