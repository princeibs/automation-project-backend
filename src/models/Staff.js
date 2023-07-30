import mongoose from "mongoose";

const StaffSchema = new mongoose.Schema({
    email: {type: String, required: true, unique: true},
    title: {type: String},
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    otherNames: {type: String},
    role: {type: String},
    image: {type: String},
    password: {type: String, required: true},
    qualifications: {type: String, required: true},
    topcis: [{type: mongoose.Schema.Types.ObjectId, ref: "topics"}],
    specialization: [{type: String}],
    publishedDocuments: {type: String}
})

export const StaffModel = mongoose.model("staffs", StaffSchema)