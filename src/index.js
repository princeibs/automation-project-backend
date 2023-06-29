import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv"

import {studentRouter} from "./Routes/student.js"
import {staffRouter} from "./Routes/staff.js"
import {adminRouter} from "./Routes/admin.js"

dotenv.config()
const CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING

const app = express();

app.use(express.json());
app.use(cors());

app.use("/auth", studentRouter);
app.use("/staff", staffRouter);
app.use("/admin", adminRouter);

mongoose.connect(CONNECTION_STRING)

app.listen(3001, () => console.log("Yo! Server has started"));