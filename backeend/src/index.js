// require('dotenv').config({path: './env'})
import dotenv from "dotenv"
import connectDB from "./db/db.js";
import express from 'express'

const app = express()



dotenv.config({
    path: './.env'
})

connectDB()


    app.listen(process.env.PORT || 8000, () => {
        console.log(` Server is running at port : ${process.env.PORT}`);
    })




// Approach-01 to connect database
/* 
import mongoose from "mongoose";
import {DB_NAME} from "./constants";
import express from "express"
const app = express()
// database connection
(async () => {
    try {
        
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {  //listeners h hote h app ke pass
            console.log("Express ki app baat nhi kr paa rhi h uske liye messsage h",error)
            throw error
        })

        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.error("ERROR: ",error)
        throw err
    }
}) ()  //iffis javascript concept
*/



