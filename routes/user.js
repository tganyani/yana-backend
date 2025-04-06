import express from "express";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "../lib/email.verification.js";
import { generateVerificationCode } from "generate-verification-code";
import prisma from "../lib/prisma.js";
import jsonwebtoken from "jsonwebtoken";

const userRouter = express.Router();

userRouter
  .get("/user", async (req, res) => {
    res.json({
      name: "Tgb",
      age: 34,
    });
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
      res.json({ message: "Verification code sent to email" ,created:true,email});
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: "error" ,created:false});
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

      res.json({ message: "Email verified successfully!",verified:true });
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
        return res.json({ error: "User not found or not verfied",logged: false, });
      const result = await bcrypt.compare(req.body.password, user.password);
      if (result) {
        res.json({
          id: user.id,
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
            { expiresIn: "1h" }
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
      return res.status(500).json({ error: "error" ,logged: false,});
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
      res.json({ message: "Verification code sent to email",codeSend:true });
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

      res.json({ message: "Password successfully reset",successRest:true });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ error: "error" });
    }
  });

export default userRouter;
