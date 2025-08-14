const createError = require('http-errors');
require('dotenv').config();
const bodyParser = require("body-parser");

const express = require('express');
const path = require('path');
const cors = require('cors');
// const usercontroller = require("./controllers/usercontroller");
const corsConfig = {
    origin:"*",
    Credential: true,
    methods:["GET","POST","PUT","DELETE"]
}
const cookieParser = require('cookie-parser');
const logger = require('morgan');
// const session = require('express-session');
const nocache = require('nocache');
const Dbconnection = require('./config/connection');
const app = express();
const adminRouter = require('./routes/admin');
const userRouter = require('./routes/user');
// View engine setup
app.set('views', path.join(__dirname,'views'));
// const expressLayout = require('express-ejs-layouts')
app.set('view engine', 'ejs');
app.use(cors(corsConfig))
app.use(nocache());
app.use(express.static(path.join(__dirname, 'public')));
// app.use(expressLayout)
// Database connection
Dbconnection();
// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// Routes
// app.post("/webhook", bodyParser.raw({ type: "application/json" }), usercontroller.stripeWebhookHandler);

app.use('/admin',adminRouter);
app.use('/',userRouter);
// app.use('/',userRouter);
app.use((req,res) => {
    try {
        res.status(404).render('404')
    } catch (error) {
        res.status(500).render('500')
    }
  })
const Port = process.env.PORT || 5001;
app.listen(Port, () => {
    console.log(`Server Listening on ${Port}...`);
});
