const app = require('express')();
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();
const authRoutes = require('./routes/auth.routes')

const { NODE_PORT, NODE_ENV, DATABASE_URL } = process.env;

// if NODE_PORT is not available then run at 8000
// const PORT = process.env.NODE_PORT || 8000;
const PORT = NODE_PORT || 8000;

// if you dont want to repeat you can use isDevelopment
// const isDevelopment = NODE_ENV === 'development';

if (NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

if (NODE_ENV === 'development') {
    // production
    // app.use(cors({ origin: CLIENT_URL, optionsSuccessStatus: 200 }))
    app.use(cors());
}

app.use('/api', authRoutes);

mongoose.connect(DATABASE_URL, {
    useCreateIndex : true,
    useUnifiedTopology : true,
    useFindAndModify : true,
    useNewUrlParser : true
}).then(() => {
    app.listen(PORT, () => {
    console.log(`DB connected and the server is running at ${PORT}-${NODE_ENV}`);
    })
}).catch((err) => {
    console.error('DB connection failed', err);
})