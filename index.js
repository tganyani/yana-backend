import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import prisma from "./lib/prisma.js";
import userRouter from "./routes/user.js";

const app = express();
const httpServer = createServer(app);

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: "*",
  })
);


app.use(userRouter)

export const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// io.on("connection", socketHandeler);


const port = process.env.PORT || 5000;

httpServer.listen(port, () =>
  console.log(`The server is up running on port ${port}`)
);