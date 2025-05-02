import express from "express";
import prisma from "../lib/prisma.js";

const projectRouter = express.Router();

projectRouter
  .get("/project", async (req, res) => {
    try {
      res.json(
        await prisma.project.findMany({
          include: {
            images: {
              take: 1,
              select: {
                url: true,
              },
            },
            user: {
              select: {
                name: true,
                email: true,
                id: true,
                isOnline:true
              },
            },
          },
        })
      );
    } catch (err) {
      console.error(err);
      res.json({ msg: "error fetching data" });
    }
  })
  .get("/project/:id", async (req, res) => {
    const { id } = req.params;
    const userId = req.query.userId;
    try {
      res.json(
        await prisma.project.findUnique({
          where: {
            id,
          },
          include: {
            user: {
              select: {
                name: true,
                position: true,
                image: true,
                email:true,
              },
            },
            images: {
              select: {
                publicId: true,
                url: true,
              },
            },
            comments: {
              select: {
                id: true,
                text: true,
                createdAt: true,
                user: {
                  select: {
                    name: true,
                    image: true,
                  },
                },
              },
            },
            _count:{
              select:{
                likes:true,
                views:true
              }
            },
            likes:{
              take:1,
              where:{
                userId:parseInt(userId)
              }
            }
          },
        })
      );
    } catch (err) {
      console.error(err);
      res.json({ msg: "error fetching data" });
    }
  })
  .post("/project", async (req, res) => {
    const data = req.body;
    try {
      const created = await prisma.project.create({
        data: { ...data, userId: parseInt(data.userId) },
      });
      res.json({ projectId: created.id });
    } catch (err) {
      console.error(err);
      res.json({ msg: "error creating project" });
    }
  })
  .post("/project/image", async (req, res) => {
    const data = req.body;
    try {
      const created = await prisma.projectImages.create({
        data,
      });
      res.json({ imageId: created.id });
    } catch (err) {
      console.error(err);
      res.json({ msg: "error creating image" });
    }
  })
  .post("/project/comment", async (req, res) => {
    const data = req.body;
    try {
      const created = await prisma.comments.create({
        data: {
          ...data,
          userId: Number(data.userId),
        },
      });
      res.json({ commentId: created.id });
    } catch (err) {
      console.error(err);
      res.json({ msg: "error creating commment" });
    }
  })
  .post("/project/like", async (req, res) => {
    const data = req.body;
    try {
      const created = await prisma.like.create({
        data: {
          ...data,
          userId: Number(data.userId),
        },
      });
      res.json({ likeId: created.id });
    } catch (err) {
      console.error(err);
      res.json({ msg: "error creating like" });
    }
  })
  .patch("/project/dislike", async (req, res) => {
    const { userId, projectId } = req.body;
    try {
      const deleted = await prisma.like.delete({
        where: {
          userId_projectId: {
            userId: parseInt(userId),
            projectId,
          },
        },
      });
      res.json({ deletedLikeId: deleted.id });
    } catch (err) {
      console.error(err);
      res.json({ msg: "error deleting like" });
    }
  }).post("/project/view", async (req, res) => {
    const { userId, projectId } = req.body;
  
    try {
      await prisma.projectView.upsert({
        where: {
          userId_projectId: {
            userId:parseInt(userId),
            projectId,
          },
        },
        update: {
          viewedAt: new Date(), // update timestamp if needed
        },
        create: {
          userId:parseInt(userId),
          projectId,
        },
      });
  
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to track view" });
    }
  });

export default projectRouter;
