import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import prisma from "./lib/prisma.js";
import userRouter from "./routes/user.js";
import projectRouter from "./routes/project.js";
import roomChatRouter from "./routes/room.chat.js";

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

app.use(userRouter);
app.use(projectRouter);
app.use(roomChatRouter);
export const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });
  socket.on("sendMessage", async ({ roomId, message, name, userId }) => {
    const created = await prisma.chat.create({
      data: {
        roomId,
        userId: parseInt(userId),
        message,
      },
    });
    if (created) {
      io.to(name).emit("newMessage", message);
      io.to(name).emit("refresh", new Date());
    }
  });
  // sendMessageWithMedia
  socket.on("sendMessageWithMedia", async ({ roomId, message, name, userId },callback) => {
    const created = await prisma.chat.create({
      data: {
        roomId,
        userId: parseInt(userId),
        message,
      },
    });
    if (created) {
      io.to(name).emit("newMessage", message);
      io.to(name).emit("refresh", new Date());
      callback({chatId:created.id})
    }
    
  });
  // refreshMedia
  socket.on("refreshMedia",({roomName})=>{
    io.to(roomName).emit("refresh", new Date());
  })
  // join all rooma
  socket.on("allRooms", async ({ id }) => {
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(id),
      },
      select: {
        rooms: {
          select: {
            name: true,
            id:true
          },
        },
      },
    });
    if (user?.rooms?.length) {
      user.rooms.forEach(async (room) => {
        try {
          // join the rooma
          await socket.join(room.name);
          // update on delivered
          await prisma.room.update({
            where: {
              id: room.id,
            },
            data: {
              chats: {
                updateMany: {
                  where: {
                    delivered: false,
                    NOT: {
                      userId: Number(id),
                    },
                  },
                  data: {
                    delivered: true,
                  },
                },
              },
            },
          });
          // send to everyone in the room except the sender
          socket.to(room.name).emit("delivered", new Date());
        } catch (error) {
          console.error(error);
        }
      });
    }
  });
  socket.on("typing", ({ roomName, userId }) => {
    // send to everyone in the room except the sender
    socket.to(roomName).emit("userTyping", { userId });
  });
  //online user
  socket.on("online", async ({ userId }) => {
    try {
      await prisma.user.update({
        where: {
          id: parseInt(userId),
        },
        data: {
          isOnline: true,
        },
      });
      socket.broadcast.emit("userOnline", { userId });
    } catch (err) {
      console.error(err);
    }
  });
  // offline user
  socket.on("offline", async ({ userId }) => {
    try {
      await prisma.user.update({
        where: {
          id: parseInt(userId),
        },
        data: {
          isOnline: false,
          lastSeen: new Date(),
        },
      });
      socket.broadcast.emit("userOffline", { userId });
    } catch (err) {
      console.error(err);
    }
  });
  //  read
  socket.on("read", async ({ userId, roomId, roomName }) => {
    try {
      const updated = await prisma.room.update({
        where: {
          id: roomId,
        },
        data: {
          chats: {
            updateMany: {
              where: {
                read: false,
                NOT: {
                  userId:Number(userId),
                },
              },
              data: {
                read: true,
                delivered: true,
              },
            },
          },
        },
      });
      if (updated) {
        io.to(roomName).emit("refreshRead", new Date());
      }
    } catch (err) {
      console.error(err);
    }
  });
  socket.on("delivery", async ({ id }) => {
    const user = await prisma.user.findUnique({
      where: {
        id: parseInt(id),
      },
      select: {
        rooms: {
          select: {
            name: true,
            id:true
          },
        },
      },
    });
    if (user?.rooms?.length) {
      user.rooms.forEach(async (room) => {
        try {
          // update on delivered
          await prisma.room.update({
            where: {
              id: room.id,
            },
            data: {
              chats: {
                updateMany: {
                  where: {
                    delivered: false,
                    NOT: {
                      userId: Number(id),
                    },
                  },
                  data: {
                    delivered: true,
                  },
                },
              },
            },
          });
          // send to everyone in the room except the sender
          socket.to(room.name).emit("delivered", new Date());
        } catch (error) {
          console.error(error);
        }
      });
    }
  });
});

const port = process.env.PORT || 5000;

httpServer.listen(port, () =>
  console.log(`The server is up running on port ${port}`)
);
