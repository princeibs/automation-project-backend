import express from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt";
import {StaffModel} from "../models/Staff.js"
import { TopicModel } from "../models/Topic.js";

const router = express.Router()

router.post("/register", async (req, res) => {
    const {email, title, firstName, lastName, otherNames, image, password, qualifications, specialization} = req.body;
    const user = await StaffModel.findOne({ email });

    if (user) {
        return res.status(400).json({message: "User already exists!"});
    }

    const role = 1; // role Id for staffs
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await StaffModel({email, title, firstName, lastName, otherNames, role, image, password: hashedPassword, qualifications, specialization});
    await newUser.save();

    res.json({message: "User registered successfully"})
})

router.post("/login", async (req, res) => {
    const {email, password} = req.body;
    const user = await StaffModel.findOne({ email });

    if (!user) {
        return res.status(401).json({message: "Invalid email (or password)"});
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(401).json({message: "Email or password is incorrect!"});
    }

    const token = jwt.sign({id: user._id}, "secret");
    res.json({token, userId: user._id, role: user.role})
})

router.post("/details", async (req, res) => {
    try {
        const {id} = req.body;
        const user = await StaffModel.findById(id);
        if (!user) {
            return res.json({message: "User not found"});
        }
        const {email, title, firstName, lastName, otherNames, image, role, password, qualifications, specialization} = user;
        return res.json({email, title, firstName, lastName, otherNames, image, role, password, qualifications, specialization});
    } catch (error) {
        console.log(error);
    }
})

router.post("/add", async (req, res) => {
    try {
        const {userId, title, description, levelOfExpertise, tools} = req.body;
        const user = await StaffModel.findById(userId);
        if (!user) {
            return res.status(401).json({message: "User details not found. Please log in again"});
        }
        const newTopic = await TopicModel({title, description, expertise: levelOfExpertise, tools, createdBy: user._id})
        await newTopic.save();

        return res.json({message: "Topic created successfully"})
    } catch (error) {
        console.log(error);
    }
})

router.post("/topics", async (req, res) => {
    try {
        const {id} = req.body;
        const user = await StaffModel.findById(id);
        if (!user) {
            return res.json({message: "User not found"});
        }
        const topics = await TopicModel.find({createdBy: id});
        return res.json(topics?.reverse())
    } catch (e) {
        console.log(e)
    }
})

export {router as staffRouter}