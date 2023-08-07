import express from "express"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt";
import {StudentModel} from "../models/Student.js"
import { TopicModel } from "../models/Topic.js";
import { StaffModel } from "../models/Staff.js";

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
        res.sendStatus(401)
    }
}

// Register student
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

// Log in student
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

    // Geenerate token using user ID
    const token = jwt.sign({id: user._id}, "secret");
    res.json({token, userId: user._id, role: user.role})
})

// Get student details
router.get("/details", verifyToken, async (req, res) => {
    try {
        const id = req.headers.id;
        const user = await StudentModel.findById(id);
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }
        const {firstName, lastName, otherNames, matricNo, role, savedTopics, selectedTopic, supervisor} = user;
        return res.json({firstName, lastName, otherNames, matricNo, role, savedTopics, selectedTopic, supervisor});
    } catch (error) {
        console.log(error)
    }
})

// Student search for topic 
router.get("/search", verifyToken, async (req, res) => {
    try {
        const {specialization, expertise, tools, type} = {
            specialization: req.headers.specialization, 
            expertise: req.headers.expertise, 
            tools: req.headers.tools, 
            type: req.headers.type
        };
        // Get all topics in database
        var topics = await TopicModel.find();
        // Get all staffs in database
        var staffs = await StaffModel.find();

        // Broad search
        // This will add a topic to the array of topics to be returned if it
        // matches at least one of the search parameter
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

        // Narrow Search
        // This will add a topic to array of topics ot be returned ONLY if it 
        // matches all the search parameters
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

        // Include details of staff who created the topic
        topics = topics.map(topic => {
            var staff = staffs.filter(staff => staff._id.equals(topic.createdBy))[0]
            staff = {
                _id: staff._id,
                title: staff.title,
                firstName: staff.firstName,
                lastName: staff.lastName,
                image: staff.image
            }
            // replace staff id with staff details
            return {...topic._doc, createdBy: staff}
        })

        return res.json(topics);
    } catch (error) {
        console.log(error);
    }
})

// Save topic 
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

// Unsave topic
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

// Get previously saved topics
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

// Get details of topic with identity of the user along with thr details 
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

// Get public details of staff using their id
router.get("/staff-details/:id", async (req, res) => {
    try {
        const {id: staffId} = req.params;
        const user = await StaffModel.findById(staffId);
        const students = await StudentModel.find();
        
        if (!user) {
            return res.status(404).json({message: "User not found"});
        }
        // Number of students under this supervisor
        var slotsOccupied = 0
        // If any student has the supervisor details in their profile, then
        // increment the students count of the supervisor
        students.forEach(student => {
            if (student?.supervisor?.toString() === staffId.toString()) slotsOccupied++
        })

        const {email, title, firstName, lastName, otherNames, image, qualifications, specialization, publishedDocuments} = user;
        return res.json({email, title, firstName, lastName, otherNames, image, qualifications, specialization, slotsOccupied, publishedDocuments});
    } catch (error) {
        console.log(error)
    }
})

// Select a topic
router.post("/select-topic", verifyToken, async (req, res) => {
    try {
        const {userId, topicId, topicCreator} = req.body;
        const user = await StudentModel.findById(userId);
        const topic = await TopicModel.findById(topicId);
        const staff = await StaffModel.findById(topicCreator)
        if (!user || !topic || !staff) {
            return res.status(404).json({message: "User or Topic or Staff not found"});
        }
        // Update selected topic of student with the selected topic id
        user.selectedTopic = topicId;
        // Update student supervisor with id of staff who created the topic
        user.supervisor = topicCreator
        // Save the updated data to the database
        await user.save();
        return res.json({message: "Select topic successful"})
    } catch (error) {
        console.log(error)
    }
})

// Unselect a topic and supervisor
router.post("/unselect-topic", verifyToken, async (req, res) => {
    try {
        const {userId, topicId} = req.body;
        const user = await StudentModel.findById(userId);
        const topic = await TopicModel.findById(topicId);
        if (!user || !topic) {
            return res.status(404).json({message: "User or Topic not found"});
        }
        user.selectedTopic = null;
        user.supervisor = null
        await user.save();
        return res.json({message: "Unselect topic successful"})
    } catch (error) {
        console.log(error)
    }
})

export {router as studentRouter}

