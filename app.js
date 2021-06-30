// Import Modules
require('dotenv').config();
const express = require('express');;

const cors = require("cors");
const cookieParser = require("cookie-parser");
// Import Files
<<<<<<< HEAD
import './db/index';
import authRoutes from './routes/auth'
import userRoutes from './routes/user'
import domainRoutes from './routes/domain'
import coordinatorRoutes from './routes/coordinator'
import path from "path"
const sponsorRoutes = require('./routes/sponsor');
=======
require('./db/index');
const authRoutes = require('./routes/auth')
const userRoutes = require('./routes/user')
const domainRoutes = require('./routes/domain')
const coordinatorRoutes = require('./routes/coordinator')
const sponsorRoutes = require('./routes/sponsor')
const eventsRoutes = require('./routes/event')

>>>>>>> 5235f94378089c75f695eb5029a50ce12a5f37d7
// Constatns 
const PORT = process.env.PORT || 4000; //Server Port
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json())
app.use(cookieParser());
app.use(cors());

// Routes
app.use("/api", authRoutes);
app.use('/api', userRoutes);
app.use('/api', domainRoutes);
app.use('/api', coordinatorRoutes);
<<<<<<< HEAD
app.use('/api', sponsorRoutes);
// app.use('/uploads', express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "uploads")));
=======
app.use('/api', eventsRoutes);
app.use('/api', sponsorRoutes);
>>>>>>> 5235f94378089c75f695eb5029a50ce12a5f37d7
app.use('//', (req, res) => {
    res.send('Welcome :)')
});



// Server Connection
app.listen(PORT, () => {
    console.log(`Server is running at Port ${PORT}`);
})
