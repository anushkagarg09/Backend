class ApiResponse {
    constructor(statusCode,data, message = "Success"){
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400 // less than 400 hi hona chahiye informational successful Redirection client Error Server Error 
    }
    
}

export { ApiResponse }