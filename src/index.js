// Load Environment Variables
import { config } from "dotenv";
config();

import cors from "cors";
import express, { Router, json } from "express";
import helmet from "helmet";
import nocache from "nocache";
import logger from 'morgan'
import compression from 'compression'
import responseTime from 'response-time'
import userRouter from "./routes/user.js"
import filesRouter from './routes/files.js'
import { validateAccessToken } from "./middleware/auth0.js";
import errorHandler from "./middleware/error.js";
import notFoundHandler from "./middleware/not-found.js";

if (!(process.env.PORT && process.env.CLIENT_ORIGIN_URL)) {
  throw new Error(
    "Missing required environment variables."
  );
}

const PORT = parseInt(process.env.PORT, 10);
const CLIENT_ORIGIN_URL = process.env.CLIENT_ORIGIN_URL;

const app = express();
const apiRouter = Router();

// Disable 'X-Powered-By' response header banner
app.disable('x-powered-by')

app.use(compression())
app.use(logger('dev'))
app.use(responseTime())
app.use(json());
app.use(express.urlencoded({extended: true}))
app.set("json spaces", 2);

app.use(
  helmet({
    hsts: {
      maxAge: 31536000,
    },
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'none'"],
        "frame-ancestors": ["'none'"],
      },
    },
    frameguard: {
      action: "deny",
    },
  })
);

app.use(nocache());

app.use(
  cors({
    origin: [CLIENT_ORIGIN_URL, 'https://vaultchain.asaifee.ml'],
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400,
  })
);

app.use("/api", apiRouter);
apiRouter.use("/user", validateAccessToken, userRouter);
apiRouter.use("/files", validateAccessToken, filesRouter);

app.use(errorHandler);
app.use(notFoundHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Listening on port ${PORT}.`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server.')
  server.close(() => {
    console.log('HTTP server closed.')
  })
})