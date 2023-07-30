import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
    matricNo: {type: String, required: true, unique: true},
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    otherNames: {type: String},
    role: {type: String},
    password: {type: String, required: true},
    savedTopics: [{type: mongoose.Schema.Types.ObjectId, ref: "topics"}],
    selectedTopic: {type: mongoose.Schema.Types.ObjectId, ref: "topics"},
    supervisor: {type: mongoose.Schema.Types.ObjectId, ref: "staff"}
})

export const StudentModel = mongoose.model("students", StudentSchema)