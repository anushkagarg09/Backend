import multer from "multer";

// memory storage bhi use kr skte h
// disc Storage use
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function(req, file, cb) {

        cb(null, file.originalname)
    }
})


export const upload = multer({ 
    storage: storage // or storage,
})