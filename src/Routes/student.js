import express from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt";
import {StudentModel} from "../models/Student.js"
import { TopicModel } from "../models/Topic.js";
import { StaffModel } from "../models/Staff.js";

const router = express.Router()

export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (token) {
        jwt.verify(token, "secret", (err) => {
            if (err) return res.sendStatus(403);
            next();
        })
    } else {
        res.sendStatus(401)
    }
}

router.post("/register", async (req, res) => {
    const {firstName, lastName, otherNames, matricNo, password} = req.body;
    const user = await StudentModel.findOne({ matricNo });

    if (user) {
        return res.status(400).json({message: "User already exists!"});
    }

    const role = 2; // role id for students
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await StudentModel({matricNo, firstName, lastName, otherNames, role, password: hashedPassword});
    await newUser.save();

    res.json({message: "User registered successfully"})
})

router.post("/login", async (req, res) => {
    const {matricNo, password} = req.body;
    const user = await StudentModel.findOne({ matricNo });

    if (!user) {
        return res.status(404).json({message: "Invalid matric number (or password)"});
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(401).json({message: "Matric Number or Password is incorrect!"});
    }

    const token = jwt.sign({id: user._id}, "secret");
    res.json({token, userId: user._id, role: user.role})
})

router.get("/details", verifyToken, async (req, res) => {
    try {
        const id = req.headers.id;
        const user = await StudentModel.findById(id);
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }
        const {firstName, lastName, otherNames, matricNo, role, savedTopics} = user;
        return res.json({firstName, lastName, otherNames, matricNo, role, savedTopics});
    } catch (error) {
        console.log(error)
    }
})

router.get("/search", verifyToken, async (req, res) => {
    try {
        const {specialization, expertise, tools, type} = {
            specialization: req.headers.specialization, 
            expertise: req.headers.expertise, 
            tools: req.headers.tools, 
            type: req.headers.type
        };
        var topics = await TopicModel.find()

        if (type == "broad") {
            topics = topics.filter(topic => {
                if (
                    // filter by expertise
                    topic.expertise == expertise ||
                    // filter by tools
                    topic.tools.filter(tool => tools.includes(tool.trim())).length > 0 ||
                    // filter by specialization
                    topic.categories.includes(specialization.toString())
                ) {
                    return true
                } else {
                    return false
                }
            });
        } 

        if (type == "narrow") {
            topics = topics.filter(topic => {
                if (
                    // filter by expertise
                    topic.expertise == expertise &&
                    // filter by tools
                    topic.tools.filter(tool => tools.includes(tool.trim())).length > 0 &&
                    // filter by specialization
                    topic.categories.includes(specialization.toString())
                ) {
                    return true
                } else {
                    return false
                }
            });
        }

        return res.json(topics);
    } catch (error) {
        console.log(error);
    }
})

router.put("/save", verifyToken, async (req, res) => {
    try {
        const {userId, topicId} = req.body;
        const user = await StudentModel.findById(userId);
        const topic = await TopicModel.findById(topicId)
        if (!user || !topic) {
            return res.status(404).json({message: "User or Topic not found"});
        }
        if (user.savedTopics.includes(topicId)) {
            return res.status(400).json({message: "Topic already saved"})
        } 
        user.savedTopics.push(topicId);
        await user.save();
        return res.json({message: "Saved successful"})
    } catch (error) {
        console.log(error)
    }
})

router.put("/unsave", verifyToken, async (req, res) => {
    try {
        const {userId, topicId} = req.body;
        const user = await StudentModel.findById(userId);
        const topic = await TopicModel.findById(topicId)
        if (!user || !topic) {
            return res.status(404).json({message: "User or Topic not found"});
        }
        if (!user.savedTopics.includes(topicId)) {
            return res.status(404).json({message: "Topic not saved"})
        } 
        const topicIds = user.savedTopics.filter(topic => topic != topicId)
        user.savedTopics = topicIds;
        await user.save();
        return res.json({message: "Unsaved successful"})
    } catch (error) {
        console.log(error)
    }
})

router.get("/saved", verifyToken, async (req, res) => {
    try {
        const userId = req.headers.id;
        const user = await StudentModel.findById(userId);
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }
        
        return res.json(user.savedTopics?.reverse());
    } catch (error) {
        console.log(error);
    }
})

router.get("/topic/:id", async (req, res) => {
    try {
        const {id: topicId} = req.params;
        const topic = await TopicModel.findById(topicId);
        if (!topic) {
            return res.status(404).json({message: "Topic not found"});
        }

        return res.json(topic)
    } catch (error) {
        console.log(error)
    }
})

export {router as studentRouter}

