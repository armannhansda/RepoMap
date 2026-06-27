import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import repoRoutes from "./routes/repoRoutes.ts"
import fileRoutes from "./routes/fileRoutes.ts"
import aiRoutes from "./routes/aiRoutes.ts"

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use("/api/repo", repoRoutes);
app.use("/api/repo", fileRoutes);
app.use("/api/ai", aiRoutes);


app.get("/", (req, res) => {
  res.send("RepoMap api Running");
});

const DEFAULT_PORT = Number(process.env.PORT ?? 5000);

function listen(port: number) {
  const server = app.listen(port, (error?: NodeJS.ErrnoException) => {
    if (error?.code === "EADDRINUSE" && !process.env.PORT) {
      server.close();
      listen(port + 1);
      return;
    }

    if (error) {
      console.error(`server failed to start on port ${port}`);
      console.error(error.message);
      process.exitCode = 1;
      return;
    }

    console.log(`server running on port ${port}`);
  });

  return server;
}

export const server = listen(DEFAULT_PORT);
