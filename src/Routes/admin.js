import express from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt";
import {AdminModel} from "../models/Admin.js"

const router = express.Router()


export {router as adminRouter}