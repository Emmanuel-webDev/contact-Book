const express = require('express');

const mongoose = require('mongoose');

const bcrypt = require('bcryptjs')

const jwt = require("jsonwebtoken");

const phone = require('./Model/PhoneBook')

const user = require('./Model/user')

const cookie = require('cookie-parser')

const cloudinary = require('./cloudinary')

require('dotenv').config();

const multer = require('multer');
const upload = multer({storage: multer.diskStorage({})})

const app = express()

mongoose.connect(process.env.URI, {UseNewUrlParser: true}).then(()=>{

app.use(express.json());
app.use(cookie());
app.use(express.static('public'))
app.use('/images',  express.static('images'))
app.use(express.urlencoded({extended: true}));

app.set("views", "UI")
app.set('view engine', 'ejs')

//homepage
app.get('/', (req,res)=>{
    res.status(200).render('signup')
})

//login page
app.get('/loginUser', (req, res)=>{
    res.status(200).render('Login')
})

//signup
app.post('/signUp', async (req, res)=>{
    const {Username, Email, password} = (req.body)

    if(!Username || !Email || !password){
        return res.send({message: 'Fill inputs'})
     }

     //Email checking
     const userExists = await user.findOne({Email: Email})
     if(userExists){
        res.redirect('/signUp');
     }

    //passsword hashing
        const hashed = await bcrypt.hash(password, 12)
        req.body.password= hashed
    const newUser = new user({
        Username: req.body.Username,
        Email: req.body.Email,
        password: req.body.password
    })

    if(!(newUser.Username && newUser.Email && newUser.password)){
        return res.status(403).send({message: "user needs to signup"})
    }

    await newUser.save();
    res.redirect('/loginUser')
}) 

//Login
app.post('/Login', async(req, res)=>{
    const password = req.body.password;
    const Email = req.body.Email

    const existingUser = await user.findOne({Email: Email})
    if(!existingUser){
         res.redirect('/loginUser')
        return
      }

    const check = await bcrypt.compare(password, existingUser.password)
    if(!check){
        return res.redirect('/loginUser')
    }
       

  //Registering tokens
  const token = jwt.sign({id: existingUser._id, Email: existingUser.Email}, process.env.JWT_SECRET, {expiresIn: "3d"})
  if(!token){
    return res.redirect('/loginUser')
  }
  return res.cookie("access_token", token, {
    httpOnly: true,
    secure: false
 }).redirect('/Contacts');

})

//middleware for checking tokens
const authorization = async (req, res, next)=>{
    const token = req.cookies.access_token
    if(!token){
        return res.status(403).send('<h1> Unauthorized activity </h1>');
    }
        
    const verify = jwt.verify(token, process.env.JWT_SECRET);
    const users = await user.findById(verify.id)
    req.user = users
          if(!verify){ 
            return res.status(403).send({message:"Error: Forbideen"})
          }
   
    next()
    
}

//get Contacts
app.get('/Contacts', authorization,  async (req, res)=>{

    const contacts = await phone.aggregate([
          {
        $match: {created_by: req.user._id}
          }
]).sort({_id: -1})
    
    res.status(200).render('contacts', {contacts : contacts})
})

//createContact
app.get('/NewContact', authorization, (req, res)=>{
    res.status(200).render('create');
})

//create Contacts
app.post('/newContacts', authorization, upload.single('img'), async (req,res)=>{
    const uploads = await cloudinary.v2.uploader.upload(req.file.path)
    const newContact = new phone({
        Name: req.body.Name,
        Tel: req.body.Tel,
        img: uploads.secure_url,
        created_at:new Date(),
        created_by: req.user._id
    })
    await newContact.save();
    res.redirect('/Contacts')
})

app.get('/updates/:id', authorization, async (req,res)=>{
    const contacts = await phone.findById(req.params.id);
    res.render('update', {contact : contacts})
})

//updating Contact
app.post('/update/:id', authorization, upload.single('img'), async(req, res)=>{
    const uploads = await cloudinary.v2.uploader.upload(req.file.path)
const updateContact = await phone.findByIdAndUpdate({_id: req.params.id}, {
    Name: req.body.Name,
    Tel: req.body.Tel,
    img: uploads.secure_url,
    created_at: new Date().toLocaleDateString()
})
res.status(200).redirect('/Contacts');
})

//Deleting
app.post('/del/:id', authorization, async (req, res)=>{
    const delContact = await phone.findByIdAndRemove(req.params.id);
    res.status(200).redirect('/Contacts')
})

//Logging users out
app.post('/logout', authorization, (req, res)=>{
 return res.clearCookie('access_token').redirect('/')
})

//searchbox
app.post('/getContacts', authorization, async (req, res)=>{
    const {Name} = req.body
    const payload = req.body.payload.trim();
    const search = await phone.find({Name: {$regex: new RegExp('^'+payload+'.*','i')}}).exec();

    res.send({payload: search})
})

app.get('/search', authorization, (req, res)=>{
    res.status(200).render('search')
})

app.listen(process.env.PORT, ()=>{
    console.log(`Server running on ${process.env.PORT}`)
})

})

