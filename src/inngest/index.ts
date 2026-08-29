import { Inngest } from "inngest";
import "dotenv/config"

// initialise inngest
export const inngest = new Inngest({ id: 'code-review-agent' });

// export the functions
export const functions = [];