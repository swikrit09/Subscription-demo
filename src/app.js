const hbs = require("hbs");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000
const path = require("path");
const bcrypt = require('bcryptjs');
require("./db/conn")
const Register = require("./models/registers");
const Plan = require("./models/plan");
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const stripe = require('stripe')('sk_test_51Ni41wSDGtpgC1BWWm1Yft6oVzOryiCbYeHpLmFWQTU0YHsNpnOqDkRLGbMAuC3gcPkNOY1EoZUAiIuy1HXORelo00tzVhPNUI');

const session = require('express-session');

const static_path = path.join(__dirname, "../public");
app.use(express.static(static_path));

console.log(path.join("../templates/views"))
const template_path = path.join("templates/views")
// const partials_path=path.join("templates/partials")
app.use(express.json());
app.use(express.urlencoded({ extended: false }))

app.set("view engine", "hbs");
app.set("views", template_path);
// hbs.registerPartials(partials_path);



const secretKey = require("./sessions");
app.use(session({
    secret: secretKey, // Replace with your secret key
    resave: false,
    saveUninitialized: false,
}));




app.get("/", (req, res) => {
    // res.send("Hello");
    res.render("register");

})

app.get("/register", (req, res) => {
    res.render("register");
    // res.send("hello from the swikkicodes");
})
app.post('/register', async (req, res) => {
    try {
        const registerEmployee = new Register({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password,
            // password:  hashedpass,
            // cpassword: hashedcpass,
        })
        const token = await registerEmployee.generateAuthToken();
        const registered = await registerEmployee.save();
        req.session.user = registered;
        res.status(201).redirect("login");
    } catch (e) {
        res.status(400).send("data not filled");
    }
})


app.get("/login", (req, res) => {
    res.render("login");
    // res.send("hello from the swikkicodes");
})
app.post('/login', async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const userData = await Register.findOne({ email: email })

        const passwordMatch = await bcrypt.compare(password, userData.password)

        console.log(passwordMatch);
        if (passwordMatch) {
            req.session.user = userData;
            res.redirect("/dashboard");
        }
        else {
            res.send("<script>alert('invalid login details'); window.location.href='/login';</script>");
        }

    } catch (e) {
        res.send("<script>alert('User is not registered'); window.location.href='/login';</script>");
    }
})


app.get("/dashboard", async (req, res) => {
    if (req.session.user) {
        try {
            const userName = req.session.user.name;
            const user = await Register.findOne({ email: req.session.user.email });

            console.log("Retrieved user:", user); // Log the retrieved user object

            if (user && user.subscriptions && user.subscriptions.length > 0) {
                const plan = await Plan.findOne({ _id: user.subscriptions[0].plan });

                if (plan) {
                    const planName = plan.name;
                    const planPrice = plan.price;
                    const planStatus = user.subscriptions[0].status;
                    const startDate = user.subscriptions[0].startDate;
                    const endDate = user.subscriptions[0].endDate;
                    const formattedStartDate = startDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    const formattedEndDate = endDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    res.status(201).render('dashboard', {
                        userName,
                        planName,
                        planPrice,
                        planStatus,
                        formattedStartDate,
                        formattedEndDate
                    });
                } else {
                    console.log("Plan not found");
                    res.status(201).render('dashboard', { userName });
                }
            } else {
                console.log("No subscriptions found");
                res.status(201).render('dashboard', { userName });
            }
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            res.redirect('/error'); // Handle error scenario
        }
    } else {
        res.redirect('/login');
    }
});
app.get("/plans", (req, res) => {
    if (req.session.user) {
        try {
            res.render("plans");
        }
        catch (e) {
            console.log(e);
            res.status(500).render('error', { error: 'Internal server error' });
        }
    }
    else {
        // If the user is not authenticated, redirect them to the login page (or any other appropriate action)
        res.redirect('/login'); // Change '/login' to the appropriate login route
    }
})
app.get("/pay", async (req, res) => {


    if (req.session.user) {
        try {
            const selectedPlan = req.query.selectedPlan;
            // console.log(selectedPlan)
            const selectedP = await Plan.findOne({ name: selectedPlan });
            const price = selectedP.price
            const pid = selectedP.prodID; // Assuming the field name is 'prodId'
            // console.log(selectedP,pid)
            req.session.productId = pid;
            // console.log(selectedP.price);
            // const selectedDuration = req.query.selectedDuration;
            res.render("pay", { selectedPlan, price });
        } catch (e) {
            console.log(e);
            res.status(500).render('error', { error: 'Internal server error' });
        }
    }
    else {
        // If the user is not authenticated, redirect them to the login page (or any other appropriate action)
        res.redirect('/login'); // Change '/login' to the appropriate login route
    }
});

app.post("/payment-status", async (req, res) => {
    
    if (req.session.user) {

    const { cno, cval, cvv } = req.body; // Get the card details from the form
    const userMail = req.session.user.email;
    // console.log(userMail)
    const productId = req.session.productId; // Get the product ID from the session
    // Retrieve product details from your database using the productId
    const selectedP = await Plan.findOne({ prodID: productId });
    const priceId = selectedP.stripePriceId;
    try {
        // Create a Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email:userMail,
            client_reference_id:productId,
            // payment_method_data: {
            //     type: 'card',
            //     card: {
            //         number: cno,
            //         exp_month: cval.slice(5,7),
            //         exp_year: cval.slice(0,4),
            //         cvc: cvv,
            //       },
            // },
            
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: 'http://localhost:3000/dashboard',
            cancel_url: 'http://localhost:3000/cancel',
        });

            const user = await Register.findOne({ email: userMail });
            const startDate = new Date();
            const endDate = new Date();
            endDate.setMonth(startDate.getMonth() + 1); // Add one month to the start date
            user.subscriptions.push({
                plan: selectedP._id, // Assuming you're using MongoDB's _id
                startDate: startDate,
                endDate: endDate,
                status:"Active"
            });
            await user.save();
            console.log(user) ;

        res.redirect(session.url);

    } catch (error) {
        console.error('Error creating Checkout session:', error);
        res.redirect('/error'); // Handle error scenario
    }
}
else {
    // If the user is not authenticated, redirect them to the login page (or any other appropriate action)
    res.redirect('/login'); // Change '/login' to the appropriate login route
}
});

app.get("/cancel", async (req, res) => {
    if (req.session.user) {
        try {
            const user = await Register.findOne({ email: req.session.user.email });
            
            if (user.subscriptions.length > 0) {
                // Update the status of the first subscription to "cancelled"
                user.subscriptions[0].status = "Cancelled";
                await user.save();
            }

            res.redirect("/dashboard");
        } catch (error) {
            console.error("Error cancelling subscription:", error);
            res.redirect("/dashboard");
        }
    } else {
        res.redirect("/login");
    }
});


app.listen(port, () => {
    console.log(`listening at port no. ${port}`)
})