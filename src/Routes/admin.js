import express from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt";
import {AdminModel} from "../models/Admin.js"
import { TopicModel } from "../models/Topic.js";
import { StaffModel } from "../models/Staff.js";
import { StudentModel } from "../models/Student.js";

const router = express.Router()

export const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (token) {
        jwt.verify(token, "secret", (err) => {
            if (err) return res.sendStatus(403);
            next();
        })
    } else {
        res.sendStatus(401).json({message: "Invalid token sent"})
    }
}


router.post("/register", async (req, res) => {
    const {username, password} = req.body;
    const user = await AdminModel.findOne({username})

    if (user) {
        return res.status(400).json({message: "User already exists!"});
    }

    const role = 0; // role Id for admins
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await AdminModel({username, password: hashedPassword, role, lastLogin: Date.now()});
    await newUser.save();

    res.json({message: "Registration successful"})
})

router.post("/login", async (req, res) => {
    const {username, password} = req.body;
    const user = await AdminModel.findOne({ username });

    if (!user) {
        return res.status(401).json({message: "Username does not exist"});
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
        return res.status(401).json({message: "Incorrect password"});
    }

    user.lastLogin = Date.now();
    user.save()
    const token = jwt.sign({id: user._id}, "secret");
    res.json({token, userId: user._id, role: user.role})
})

router.get("/details", verifyToken, async (req, res) => {
    try {
        const id = req.headers.id;
        const user = await AdminModel.findById(id);
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }
        const {username, role} = user;
        return res.json({username, role});
    } catch (error) {
        console.log(error)
    }
})

router.get("/students", async (req, res) => {
    try {
        const adminId = req.headers.id;
        const user = await AdminModel.findById(adminId);
        var students = await StudentModel.find();
        const topics = await TopicModel.find();
        const staffs = await StaffModel.find();
        
        if (!user) {
            return res.json({message: "User not found"});
        }
        students = students.map(student => {
            var supervisor;
            var topic;
            if (student.supervisor && student.selectedTopic) {
                supervisor = staffs.filter(staff => staff._id.toString() === student.supervisor.toString())[0];
                topic = topics.filter(topic => topic._id.toString() === student.selectedTopic.toString())[0];
            }
            return {...student._doc, supervisor: {...supervisor?._doc}, topic: {...topic?._doc}}
        })
        return res.json(students)
    } catch (e) {
        console.log(e)
    }
})

export {router as adminRouter}