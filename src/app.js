const hbs= require("hbs");
const express= require("express");
const app = express();
const port= process.env.PORT || 3000
const path =require("path");
const bcrypt=require('bcryptjs');
require("./db/conn")
const Register= require("./models/registers");
const Plan = require("./models/plan");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const stripe = require('stripe')('sk_test_51Ni41wSDGtpgC1BWWm1Yft6oVzOryiCbYeHpLmFWQTU0YHsNpnOqDkRLGbMAuC3gcPkNOY1EoZUAiIuy1HXORelo00tzVhPNUI');

const session = require('express-session');

const static_path = path.join(__dirname,"../public");
app.use(express.static(static_path));

console.log(path.join("../templates/views"))
const template_path=path.join("../templates/views")
// const partials_path=path.join("templates/partials")
app.use(express.json());
app.use(express.urlencoded({extended:false}))

app.set("view engine","hbs");
app.set("views",template_path);
// hbs.registerPartials(partials_path);



const secretKey= require("./sessions");
app.use(session({
    secret:secretKey, // Replace with your secret key
    resave: false,
    saveUninitialized: false,
  }));

  


app.get("/",(req,res)=>{
    // res.send("Hello");
    res.render("register");

})

app.get("/register",(req,res)=>{
    res.render("register");
    // res.send("hello from the swikkicodes");
})
app.post('/register',async(req,res)=>{
    try{
            const registerEmployee = new Register({
                name:req.body.name,
                email:req.body.email,
                password:req.body.password,
                // password:  hashedpass,
                // cpassword: hashedcpass,
            })
            const token= await registerEmployee.generateAuthToken();
            const registered= await registerEmployee.save();
            req.session.user = registered;
            res.status(201).redirect("login");
    }catch(e){
        res.status(400).send("data not filled");
    }
})


app.get("/login",(req,res)=>{
    res.render("login");
    // res.send("hello from the swikkicodes");
})
app.post('/login',async(req,res)=>{
    try{
        const email= req.body.email;
        const password= req.body.password;
        const userData= await Register.findOne({email:email})
    
        const passwordMatch= await bcrypt.compare(password,userData.password)

        console.log(passwordMatch);
        if(passwordMatch){
            req.session.user = userData;
            res.redirect("/dashboard");
        }
        else{
            res.send("<script>alert('invalid login details'); window.location.href='/login';</script>");
        }

    }catch(e){
        res.send("<script>alert('User is not registered'); window.location.href='/login';</script>");
    }
})


app.get("/dashboard",(req,res)=>{
    if (req.session.user) {
        try {
            const userName=req.session.user.name;
            res.status(201).render('dashboard', { userName});
        } catch (e) {
          console.log(e);
          res.status(500).render('error', { error: 'Internal server error' });
        }
      } else {
        // If the user is not authenticated, redirect them to the login page (or any other appropriate action)
        res.redirect('/login'); // Change '/login' to the appropriate login route
      }
})
app.get("/plans",(req,res)=>{
    res.render("plans");
})
app.get("/pay", async (req, res) => {
    const selectedPlan = req.query.selectedPlan;
    const selectedP=await Plan.findOne({ name: selectedPlan }); 
    const price=selectedP.price
    // console.log(selectedP.price);
    const selectedDuration = req.query.selectedDuration;
    res.render("pay", { selectedPlan, selectedDuration,price });
});


// app.get("/pay", async (req, res) => {
//     const selectedPlan = req.query.selectedPlan;
//     const selectedP = await Plan.findOne({ name: selectedPlan });

//     if (!selectedP) {
//         console.error("Selected plan not found.");
//         return res.redirect("/error"); // Handle error scenario
//     }

//     const price = selectedP.price;
//     const stripePriceId = selectedP.stripePriceId;

//     try {
//         const session = await stripe.checkout.sessions.create({
//             payment_method_types: ['card'],
//             line_items: [
//                 {
//                     price: stripePriceId, // Use the Stripe Price ID
//                     quantity: 1,
//                 },
//             ],
//             mode: 'subscription', // or 'payment' for one-time payments
//             success_url: 'https://localhost:3000/success', // Redirect URL after successful payment
//             cancel_url: 'https://localhost:3000/cancel',   // Redirect URL after payment cancellation
//         });

//         res.redirect(session.url);
//     } catch (error) {
//         console.error('Error creating Checkout session:', error);
//         res.redirect('/error'); // Handle error scenario
//     }
// });



app.listen(port,()=>{
    console.log(`listening at port no. ${port}`)
})