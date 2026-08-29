import express from 'express';
import { inngest } from './inngest/inngest.js';
import { functions } from './inngest/function/functions.js';
import { serve } from 'inngest/express';

import "dotenv/config";

const app = express();

// add middle-ware
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.use("/api/inngest", serve({ client: inngest, functions: functions }));

app.listen(PORT, () => {
    console.log(`Server is running at port: ${PORT}`);
});