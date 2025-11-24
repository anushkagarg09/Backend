import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken"



export const verifyJWT = asyncHandler(async(req, res, next) => {
    try {
        const Token = req.cookies?.accessToken || req.header
        ("Authorization")?.replace("Bearer ","")
    
        if(!Token) { // token
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken ")
    
        if(!user) {
            // NEXT_VIDEO: TODO discuss about frontened
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
        
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access Token")
        
    }


})