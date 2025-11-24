// AsynHandler benefit hr chiz ko try catch mai nhi daalna pdega
import { asyncHandler  } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { subscribe } from "diagnostics_channel";

const generateAccessAndRefreshTokens = async(userId)  =>
{
    try {
        const user = await User.findById(userId);
        const accessToken  = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // Object ke andar value add
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch(error) {
        throw new ApiError(500, "Something went wrong while generating refresh and accesss Token")
    }
}

const registerUser = asyncHandler( async (req,res) => {
    //get user details from frontened
    //validation - not empty
    //check if user already exist: username
    //check for images cheack for avatar
    //upload them for clodinary
    //create user object - creation call
    // remove password and refresh token
    // check for user creation
    //return response

    // 1. userDetails
    const { fullName, email, username, password } = req.body
    console.log("email: ",email);

    // if( fullName === "") {
    //     throw new ApiError(400, "fullname is required")
    // } or

    if (
        [fullName, email, username, password].some((field) =>
        field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    } 

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if( existedUser ) {
        throw new ApiError(409, "User with email or username already existed..")
    }

    // multer deta h files ka excess
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    if(!avatarLocalPath) {
        throw new ApiError(400, " Avatar file is required")
    }
    //  now use cloudinary

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    // user create and entry in database

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500,"Something went while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Sucessfully")
    )


} )

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    //password check
    //access and refresh Token generate
    // send in cookie
    // sucessfully login
    
    const {email, username, password} = req.body

    if(!username || !email) {
        throw new ApiError(400, "username or password is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user) {
        throw new ApiError(404, "User does not exist")
    }

    // capital User nhi krna h 
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentials")
    }


    const  {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)


    // send in cookies
    const loggedInUSer = await User.findById(user._id)
    select("-password -refreshToken")

    // these cookies only modify by server
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUSer, accessToken,
                refreshToken
            },
            "user logged In Successfully"
        )
    )
    
})


const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },  
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out")) 
})

const refreshAccessToken = asyncHandler(async (req, res) => 
    {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

        if(!incomingRefreshToken) {
            throw new  ApiError(401, "Unauthorized request")
        }

    try {
           const decodedToken = jwt.verify(
               incomingRefreshToken,
               process.env.REFRESH_TOKEN_SECRET
           )
   
           const user = await User.findById(decodedToken?._id)
   
           if(!user) {
               throw new ApiError(401, "Invalid refresh Token")
           }
   
           if(incomingRefreshToken != user?.refreshToken) {
               throw new ApiError(401, "Refresh token is expired or used")
           }
   
           const options = {
               httpOnly: true,
               secure: true
           }
   
           const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
   
           return res
           .status(200)
           .cookie("accessToken", accessToken, options)
           .cookie("refreshToken", newRefreshToken, options)
           .json(
               new ApiResponse(
                   200,
                   {accessToken, refreshToken: newRefreshToken},
                   "Access Token refreshed"
               )
           )
 } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh Token ")
    
 }


    }
)

const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect) {
        throw new ApiError(400,"Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200)
    .json(new ApiResponse(200, {}, "Password changed Successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res.status(200)
    .json(200, req.user, "current user fetched Successfully")
})


const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if(!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {   //Mongo db operator
                fullName,
                email: email

            }       
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated sucessfully"))
})

const updateUserAvatar = asyncHandler(async(req, res) => 
{

    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}

    ).select("-password")

})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    if(!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([   // Aggregrate pipeline
        {
            $match: {
               username: username?.toLowerCase() 
            }
        },

        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as:"subscribers"
            }
        },

        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"  //field ki wjh se dollar use kiya h
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false 
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    
    ])   

    if(!channel?.length) {
        throw new ApiError(404, "channel does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched Sucesfully")
    )


})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    getUserChannelProfile
}