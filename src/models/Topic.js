import mongoose from "mongoose";

const TopicSchema = new mongoose.Schema({
    title: {type: String, required: true},
    description: {type: String, required: true},
    expertise: {type: String, required: true},
    tools: [{type: String}],
    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "staffs", required: true}
})

export const TopicModel = mongoose.model("topics", TopicSchema)