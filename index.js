const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const User = require('./models/User')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const imageDownloader = require('image-downloader');
const bcryptSalt = bcryptjs.genSaltSync(10)
const secret = 'sfdfddvsfdsfsdsafgfgf'
const fs = require('fs')
const Place = require('./models/Place')
const BookingModel = require('./models/Booking')

require('dotenv').config()

const app = express()


app.use(cors()) 


app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://booking-frontend-pi.vercel.app");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});


app.use(express.json())
app.use(cookieParser())


app.use('/uploads',express.static(__dirname+'/uploads'))

mongoose.connect(process.env.MONGO_URL)


function getUserDataFromToken(req){
    
    return new Promise((resolve,reject) => {
        jwt.verify(req.cookies.token,secret,{}, async (err,userData) => {
          if(err) throw err;
          resolve(userData);
        });
   });
}

app.get('/test',(req,res) => {
    res.json('test ok')
})

app.post('/register',async (req,res)=>{
    const {name,email,password} = req.body;
    try {
        const userDoc = await User.create({
        name,
        email,
        password:bcryptjs.hashSync(password,bcryptSalt)
        })
        res.json(userDoc);
    } catch (error) {
        res.status(422).json(error);
    }
})

app.post('/login',async (req,res)=>{
     const {email,password} = req.body;

     try {
        const userDoc = await User.findOne({email});
        if(userDoc){
            const passOk = bcryptjs.compareSync(password,userDoc.password)
            if(passOk){
                 jwt.sign({email : userDoc.email , id:userDoc._id},secret,{},(err,token)=>{
                      if(err){
                         throw err;
                      } 
                      res.cookie('token',token,{
                        httpOnly:true
                      }).json(userDoc)
                });
               
            }
            else{
                res.status(422).json(null)
            }
        }
        else{
            res.status(422).json(null)
        }
     } catch (error) {
        
     }

})

app.get('/profile',(req,res)=>{
    const {token} = req.cookies;
    if(token){
      jwt.verify(token,secret,{}, async (err,userData) => {
              if(err) throw err
              const {name,email,_id} = await User.findById(userData.id)
              res.json({name,email,_id})
      })
    }else{
        res.json(null)
    }
    
})

app.post('/logout',(req,res)=>{
     res.cookie('token','').json(true)
})

app.post('/upload-by-link',async (req,res) => {
    const {link} = req.body
    const newname = 'photo'+Date.now()+ '.jpg';
    await imageDownloader.image({
        url: link,
        dest: __dirname+'/uploads/' + newname,
    })

    res.json(newname);
})



app.post('/places',(req,res)=>{
    const {token} = req.cookies;
    const {title,address,addedPhotos, description,price, perks, extraInfo, checkIn, checkOut, maxGuests} = req.body;
    jwt.verify(token,secret,{}, async (err,userData) => {
        if(err) throw err
        const placeDoc = await Place.create({
           owner: userData.id,
           title,
           address,
           photos : addedPhotos, 
           description, 
           price,
           perks, 
           extraInfo, 
           checkIn, 
           checkOut, 
           maxGuests,
    })
    res.json(placeDoc)
})
    })
    

app.get('/userplaces',(req,res) => {
    const {token} = req.cookies
    jwt.verify(token,secret,{}, async (err,userData) => {
                 const {id} = userData;
                 res.json(await Place.find({owner:id}))
    })
})

app.get('/places/:id',async (req,res) => {
    const {id} = req.params;
    res.json(await Place.findById(id))
})

app.put('/places',async (req,res) => {
    const {token} = req.cookies;
    const {id, title,address,addedPhotos, description, perks, extraInfo, checkIn, checkOut, maxGuests,price} = req.body;

    jwt.verify(token,secret,{}, async (err,userData) => {   
         const placeDoc = await Place.findById(id);
         if(userData.id === placeDoc.owner.toString()){
              placeDoc.set({
                title,
                address,
                photos : addedPhotos, 
                description, 
                perks, 
                extraInfo, 
                checkIn, 
                checkOut, 
                maxGuests,
                price,
              });
              await placeDoc.save();
              res.json('ok')
         }
    })

})

app.get('/places',async (req,res)=>{
    res.json(await Place.find());
})

app.post('/bookings',  async (req,res)=>{
    const userData = await getUserDataFromToken(req);
    const {place,checkIn,checkOut,numberOfGuests,name,phone,price} = req.body;
    BookingModel.create({
        place,checkIn,checkOut,numberOfGuests,name,phone,price,user:userData.id,
    }).then((doc) => {
        res.json(doc)
    }).catch((err)=>{
        throw err;
    })
})



app.get('/bookings',async (req,res)=>{
      const userData = await getUserDataFromToken(req);
      res.json(await BookingModel.find({user:userData.id}).populate('place'))
})
app.listen(process.env.PORT,()=>{
    console.log(`server starting at ${process.env.PORT}`);
})
