import express from "express";
import prisma from "../lib/prisma.js";

const roomChatRouter = express.Router();

roomChatRouter
  .get("/room/user/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
      res.json(
        await prisma.user.findUnique({
          where: {
            id: parseInt(userId),
          },

          select: {
            name: true,
            image: true,
            rooms: {
              select: {
                id: true,
                name: true,
                _count:{
                  select:{
                    chats:{
                      where:{
                        read:false,
                        NOT:{
                          userId:parseInt(userId)
                        }
                      }
                    }
                  }
                },
                users: {
                  select: {
                    name: true,
                    id: true,
                    image: true,
                    lastSeen:true,
                    isOnline:true
                  },
                },
                chats: {
                  orderBy: {
                    dateCreated: "desc",
                  },
                  take: 1,
                  select: {
                    message: true,
                    dateUpdated: true,
                    userId:true,
                    delivered:true,
                    read:true,
                  },
                },
              },
            },
          },
        })
      );
    } catch (err) {
      console.error(err);
      res.json({
        msg: "erro fetching rooms",
      });
    }
  })
  .get("/room/:id", async (req, res) => {
    const { id } = req.params;
    try {
      res.json(
        await prisma.room.findUnique({
          where: {
            id,
          },
          include: {
            chats:{
              orderBy:{
                dateCreated:"asc"
              },
              include:{
                media:{
                  select:{
                    url:true
                  }
                }
              }
            },
            users: {
              select: {
                name: true,
                id: true,
                image: true,
                isOnline:true,
                lastSeen:true
              },
            },
          },
        })
      );
    } catch (err) {
      console.error(err);
      res.json({ msq: "error fetching rooms" });
    }
  })
  .post("/room", async (req, res) => {
    const data = req.body;

    try {
      const foundRoom = await prisma.room.findUnique({
        where: {
          name: data.name,
        },
      });
      if (foundRoom) {
        res.json({ id: foundRoom.id });
      } else {
        const created = await prisma.room.create({
          data: {
            name: data.name,
            users: {
              connect: data.ids.map((id) => ({ id })),
            },
          },
        });
        res.json({
          id: created.id,
        });
      }
    } catch (err) {
      console.error(err);
      res.json({
        msg: "error while creating the room",
      });
    }
  }).post("/chat/media", async (req, res) => {
    const data = req.body;
    try {
      const created = await prisma.chatMedia.create({
        data,
      });
      res.json({ mediaId: created.id });
    } catch (err) {
      console.error(err);
      res.json({ msg: "error creating media" });
    }
  });
export default roomChatRouter;
