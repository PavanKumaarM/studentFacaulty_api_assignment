const express=require("express");
require('dotenv').config();
const connectDB=require('./config/db')
const userRoutes = require('./routes/user.routes');
const cors = require('cors');

const app=express();
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use('/api/user',userRoutes);
const port=process.env.PORT
app.get('/',(req, res) => {
    res.status(200).json({message: 'Api is running'});
});

connectDB().then(()=>{
app.listen(port,()=>{
    console.log(`server is running on port ${port}`);
});
}).catch((err)=>{
    console.error('Failed to start serve due to DB connection error:',err.message);
    process.exit(1);
});