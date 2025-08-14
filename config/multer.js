const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');

cloudinary.config({
    cloud_name: process.env.CLOUDNAME,
    api_key: process.env.API_KEY,
    api_secret:process.env.API_SECRET,
  })
  
  // Multer setup to save files locally
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/assets/uploads'); // Local folder to save images
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to the filename
    },
  })
  const upload = multer({ storage: storage });

  module.exports = upload