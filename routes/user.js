import express from "express";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "../lib/email.verification.js";
import { generateVerificationCode } from "generate-verification-code";
import prisma from "../lib/prisma.js";
import jsonwebtoken from "jsonwebtoken";
import axios from "axios";
import crypto from "crypto";

const userRouter = express.Router();

userRouter
  .get("/user", async (req, res) => {
    res.json({
      name: "Tgb",
      age: 34,
    });
  })
  .get("/user/:id", async (req, res) => {
    const { id } = req.params;
    try {
      res.json(
        await prisma.user.findUnique({
          where: {
            id: parseInt(id),
          },
          select: {
            name: true,
            email: true,
            image: true,
            createdAt: true,
            role: true,
            imagePublicId: true,
            position: true,
            projects:{
              include:{
                images:{
                  select:{
                    projectId:true,
                    url:true
                  }
                }
              }
            }
          },
      
        })
      );
    } catch (error) {
      res.json({ msg: "error fetching the data" });
      console.error(error);
    }
  })
  .post("/user", async (req, res) => {
    try {
      const { email, password, name } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser)
        return res.status(400).json({ error: "Email already registered" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationCode = generateVerificationCode({
        length: 4,
        type: "string",
      });
      const hashedVerificationCode = await bcrypt.hash(verificationCode, 10);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          verificationCode: hashedVerificationCode,
          name,
        },
      });

      await sendVerificationEmail(email, verificationCode);
      res.json({
        message: "Verification code sent to email",
        created: true,
        email,
      });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: "error", created: false });
    }
  })
  .post("/user/verify", async (req, res) => {
    try {
      const { email, code } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(400).json({ error: "User not found" });
      const compare = await bcrypt.compare(code, user.verificationCode);
      if (!compare) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      await prisma.user.update({
        where: { email },
        data: { verified: true, verificationCode: null },
      });

      res.json({ message: "Email verified successfully!", verified: true });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: "error" });
    }
  })
  .post("/user/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await prisma.user.findFirst({
        where: {
          AND: [{ email: { equals: email } }, { verified: { equals: true } }],
        },
      });
      if (!user)
        return res.json({
          error: "User not found or not verfied",
          logged: false,
        });
      const result = await bcrypt.compare(req.body.password, user.password);
      if (result) {
        res.json({
          id: user.id,
          email: user.email,
          logged: true,
          access_token: jsonwebtoken.sign(
            {
              data: {
                id: user.id,
              },
            },
            "my-secret",
            { expiresIn: "1h" }
          ),
          refresh_token: jsonwebtoken.sign(
            {
              data: {
                id: user.id,
              },
            },
            "my-secret",
            { expiresIn: "6h" }
          ),
        });
      } else {
        res.json({
          logged: false,
          message: "wrong credentials",
        });
      }
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: "error", logged: false });
    }
  })
  .post("/user/forgotpassword", async (req, res) => {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(400).json({ error: "Email not registered" });

      const verificationCode = generateVerificationCode({
        length: 4,
        type: "string",
      });
      const hashedVerificationCode = await bcrypt.hash(verificationCode, 10);
      await prisma.user.update({
        where: {
          email,
        },
        data: {
          verificationCode: hashedVerificationCode,
          verified: false,
        },
      });

      await sendVerificationEmail(email, verificationCode);
      res.json({ message: "Verification code sent to email", codeSend: true });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: "error" });
    }
  })
  .post("/user/resetpassword", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          AND: [{ email: { equals: email } }, { verified: { equals: true } }],
        },
      });
      if (!user) return res.status(400).json({ error: "Email not registered" });
      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
        },
      });

      res.json({ message: "Password successfully reset", successRest: true });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: "error" });
    }
  })
  .post("/user/refreshtoken", async (req, res) => {
    try {
      await jsonwebtoken.verify(
        req.body.refresh_token,
        "my-secret",
        (err, decoded) => {
          if (decoded?.data?.id) {
            res.json({
              valid_access_token: true,
              access_token: jsonwebtoken.sign(
                {
                  data: {
                    id: decoded?.data?.id,
                    accountType: "candidate",
                  },
                },
                "my-secret",
                { expiresIn: "1h" }
              ),
            });
          } else {
            res.json({
              valid_access_token: false,
            });
          }
        }
      );
    } catch (err) {
      console.log(err);

      res.json({
        error: true,
      });
    }
  })
  .patch("/user/:id", async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
      const updatedUser = await prisma.user.update({
        where: {
          id: parseInt(id),
        },
        data,
      });
      res.json({ id: updatedUser.id });
    } catch (error) {
      console.error(error);
      res.json({ msg: "error while updating" });
    }
  })
  .patch("/user/delete-image/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const foundUser = await prisma.user.findUnique({
        where: {
          id: parseInt(id),
        },
      });
      const timestamp = Math.floor(Date.now() / 1000);
      const stringToSign = `invalidate=true&public_id=${foundUser.imagePublicId}&timestamp=${timestamp}`;

      const signature = crypto
        .createHash("sha1")
        .update(stringToSign + process.env.CLOUDINARY_API_SECRET)
        .digest("hex");

      const result = axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.CLOUD_NAME}/image/destroy`,
        {
          public_id: foundUser.imagePublicId,
          signature,
          api_key: process.env.CLOUDINARY_API_KEY,
          timestamp,
          invalidate: true,
        }
      );
      await prisma.user.update({
        where: {
          id: parseInt(id),
        },
        data: {
          image: null,
          imagePublicId: null,
        },
      });
      res.json({ msg: "image deleted" });
    } catch (error) {
      console.error(error);
      res.json({ msg: "error deleting image" });
    }
  })
  .get("/cloudinary-signature", (req, res) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `timestamp=${timestamp}&upload_preset=yana-app2`; // Optional: add public_id if custom

    const signature = crypto
      .createHash("sha1")
      .update(paramsToSign + process.env.CLOUDINARY_API_SECRET)
      .digest("hex");

    res.json({
      timestamp,
      signature,
      api_key: process.env.CLOUDINARY_API_KEY,
      upload_preset: "yana-app2",
    });
    } catch (error) {
      console.error(error)
      res.json(null)
    }
  });

export default userRouter;
