import express from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt";
import {StaffModel} from "../models/Staff.js"
import { TopicModel } from "../models/Topic.js";
import { StudentModel } from "../models/Student.js";

const router = express.Router();

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

// Register staff in the platform
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

// Log in staff into the platform
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

    user.lastLogin = Date.now();
    user.save()
    const token = jwt.sign({id: user._id}, "secret");
    res.json({token, userId: user._id, role: user.role})
})

// Get details of logged in staff
router.get("/details", verifyToken, async (req, res) => {
    try {
        const id = req.headers.id;
        const user = await StaffModel.findById(id);
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }
        const {email, title, firstName, lastName, otherNames, image, role, password, qualifications, specialization, publishedDocuments, lastLogin} = user;
        return res.json({email, title, firstName, lastName, otherNames, image, role, password, qualifications, specialization, publishedDocuments, lastLogin});
    } catch (error) {
        console.log(error);
    }
})

// Staff adds a new topic to the database
router.post("/add", verifyToken, async (req, res) => {
    try {
        const {title, description, levelOfExpertise, tools, categories} = req.body;
        const userId = req.headers.id
        const user = await StaffModel.findById(userId);
        if (!user) {
            return res.status(401).json({message: "User details not found. Please log in again"});
        }
        const newTopic = await TopicModel({title, description, expertise: levelOfExpertise, tools, categories, createdBy: user._id})
        await newTopic.save();

        return res.json({message: "Topic created successfully"})
    } catch (error) {
        console.log(error);
    }
})

// Get all topics added by the currently logged in staff
router.get("/topics", verifyToken, async (req, res) => {
    try {
        const id = req.headers.id;
        const user = await StaffModel.findById(id);
        if (!user) {
            return res.json({message: "User not found"});
        }
        var topics = await TopicModel.find({createdBy: id});
        topics = topics.map(topic => {
            return {...topic._doc, createdAt: topic._id.getTimestamp()}
        })
        return res.json(topics?.reverse())
    } catch (e) {
        console.log(e)
    }
})

// Staff upload profile image
router.put("/uploadImage", verifyToken, async(req, res) => {
    try {
        const {newImage} = req.body;
        const id = req.headers.id;
        const user = await StaffModel.findById(id);
        if (!user) {
            return res.json({message: "User not found"});
        }
        user.image = newImage;
        await user.save();

        return res.json({message: "Image upload successful"})
    } catch (e) {
        console.log(e)
    }
})

// Get all the students under the supervision of a staff
router.get("/students", verifyToken, async (req, res) => {
    try {
        const staffId = req.headers.id;
        const user = await StaffModel.findById(staffId);
        var students = await StudentModel.find();
        const topics = await TopicModel.find();
        if (!user) {
            return res.json({message: "User not found"});
        }
        
        // Filter students with supervisor details in their profile
        students = students.filter(student => student?.supervisor?.toString() === staffId.toString())
        // Add topic detials to the student data returned
        students = students.map(student => {
            const topic = topics.filter(topic => topic._id.toString() === student.selectedTopic.toString())[0]
            // TODO: Restrict to return only necessary data like name, title, desctiption, etc only
            return {...student._doc, ...topic._doc}
        })
        return res.json(students)
    } catch (e) {
        console.log(e)
    }
})

// Staff update profile
router.put("/update-profile", verifyToken, async (req, res) => {
    const {email, title, firstName, lastName, otherNames, qualifications, publishedDocuments} = req.body;
    const staffId = req.headers.id
    const staff = await StaffModel.findById(staffId);

    if (!staff) {
        return res.status(400).json({message: "Profile does not exist!"});
    }

    const isValid = email && firstName && lastName && title && qualifications

    if (!isValid) {
        return res.status(400).json({message: "Please make sure all details are valid"})
    }

    staff.firstName = firstName;
    staff.lastName = lastName;
    staff.title = title;
    staff.otherNames = otherNames;
    staff.qualifications = qualifications;
    staff.publishedDocuments = publishedDocuments
    staff.email = email
    await staff.save();

    res.json({message: "Profile updated successfully"})
})

export {router as staffRouter}