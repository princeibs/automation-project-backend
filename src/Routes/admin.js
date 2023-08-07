import express from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt";
import {AdminModel} from "../models/Admin.js"
import { TopicModel } from "../models/Topic.js";
import { StaffModel } from "../models/Staff.js";
import { StudentModel } from "../models/Student.js";

const router = express.Router()

// Verify the authentication token sent to the current user
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

// Register  the admin into the platform
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

// Log in the admin into the platform
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

// Get the details of the admin and send it upon request
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

// Get the details of registered student in the platform
router.get("/students", verifyToken, async (req, res) => {
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
            // if student has a supervisor and has selected topic
            if (student.supervisor && student.selectedTopic) {
                // Get student suepervisor details
                supervisor = staffs.filter(staff => staff._id.toString() === student.supervisor.toString())[0];
                // Get student topic details
                topic = topics.filter(topic => topic._id.toString() === student.selectedTopic.toString())[0];
            }
            return {...student._doc, supervisor: {...supervisor?._doc}, topic: {...topic?._doc}}
        })
        return res.json(students)
    } catch (e) {
        console.log(e)
    }
})

// Get list of all supervisors on the platform
router.get("/supervisors", verifyToken, async (req, res) => {
    try {
        const adminId = req.headers.id;
        const user = await AdminModel.findById(adminId);
        const students = await StudentModel.find();
        var supervisors = await StaffModel.find();
        
        if (!user) {
            return res.json({message: "User not found"});
        }
        supervisors = supervisors.map(supervisor => {
            var studentsCount = 0;
            // If supervisor id is found in a student profile
            students.forEach(student => {
                // Increment the student count of the supervisor returned to the frontend
                if (student?.supervisor?.toString() === supervisor._id.toString()) studentsCount++
            })
            return {...supervisor._doc, students: studentsCount}
        })
        return res.json(supervisors)
    } catch (e) {
        console.log(e)
    }
})

// Get details of a specific supervisor with id
router.get("/supervisor-details/:id", async (req, res) => {
    try {
        const staffId = req.params.id
        // const adminId = req.headers.id;
        // const user = await AdminModel.findById(adminId);
        const students = await StudentModel.find();
        const topics = await TopicModel.find();
        var supervisor = await StaffModel.findById(staffId);
        
        if (!supervisor) {
            return res.json({message: "Supervisor not found"});
        }


        // All students that have selected this supervisor's topic
        const allocatedStudents = students.filter(student => student?.supervisor?.toString() === supervisor._id.toString());
        // All topics the supervisor has created
        const createdTopics = topics.filter(topic => topic.createdBy.toString() === supervisor._id.toString())
 
        return res.json({...supervisor._doc, students: allocatedStudents, topics: createdTopics})
    } catch (e) {
        console.log(e)
    }
})

export {router as adminRouter}