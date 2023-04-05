const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user')
const session = require('express-session');
const flash = require('connect-flash');
let socket = require('socket.io');
const { isLoggedIn } = require('./middleware');


app.use(express.json())
//const userRoutes = require('./routes/users');

mongoose.connect('mongodb://127.0.0.1:27017/annachat', { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
    console.log('mongo connection open!')
})
.catch(err => {
    console.log('oh no mongo connection error!!')
    console.log(err)
});



app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
/*
const sessionConfig = {
    sercret: 'thismustbeabettersecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }}
    */
   /*
    app.use(session({
        secret: 'thismustbeabettersecret',
        resave: false,
        saveUninitialized: false
      }));
      */
//app.use(session(sessionConfig)); //nåt knas, behöver inte båda??!
const sessionOptions = { secret: 'thisisnotagoodsecret', resave: false, saveUninitialized: false }
app.use(session(sessionOptions));

app.use(flash());

app.use(passport.session());

app.use(passport.initialize());

//hej passport vi vill att du använder local strategy som vi har i require.
//och methoden kommer från passport local mongoose.
passport.use(new LocalStrategy(User.authenticate()));



//dessa methoder kommer fron mongooselocal
//hur spara vi data i en session
passport.serializeUser(User.serializeUser());
//how to un store i en session
passport.deserializeUser(User.deserializeUser());

/*
app.use((req, res, next) => {
    res.locals.success = req.flash('sucess');
    res.locals.error = req.flash('error');
    next();
  })
*/
//app.use('/', userRoutes);


/*
app.get('/viewcount', (req, res) => {
   if(req.session.count){
    req.session.count += 1;
   } else{
    req.session.count = 1;
   }
   res.send(`you have viewd this page ${req.session.count} times`)
})*/

app.get('/', (req, res) => {
    res.send('workd')
});

app.get('/register', (req, res) => {
    res.render('register',{ messages: req.flash('success', 'error')})
})

//vi tar det vi vill ha från req.body
//sen lägger vi user name in an object into new User, sparar i variabel (user)
//sen kallar vi på user.register
//om man vill lägga till error handler kan man använda catchAsync, kolla det avsnittet
app.post('/register', async (req, res) => {
    
    const {username, password} = req.body;
    const user = new User({username});
    const registeredUser = await User.register(user, password);
    console.log(registeredUser);
    req.flash('success','now just login!');
    res.redirect('/login');
   // res.render('register')
    
})
//en middleware som går på alla requests, innan routesen kommer, har vi alltså acess i alla
//local routes

app.get('/login', (req, res) =>{
    res.render('login', { messages: req.flash('success', 'error')})
})


//passport ger oss en middleware som vi kan använda som heter passport.authenticate
//lägger in den på samma ställe som man vanligtvis lägger middlewares, i den förväntas vi 
//lägga en strategi som parameter, local (kan va google, twitter också tex)
//failureflash ger ett meddelande, failureredirect kör oss till /login om nåt går fel
app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login'}) ,async (req, res) => {
    
    req.flash('success', 'welcome back!');
    res.redirect('/chat')
})

app.get('/chat', isLoggedIn,async (req, res) => {
if(!isLoggedIn){
    req.flash('error', 'you have to login!')
    res.redirect('/login');
}
    
    res.render('chat', { messages: req.flash('success')})
})

app.get('/logout', (req, res) => {
    req.logout(function(err) {
      if (err) {
        console.log(err);
        req.flash('error', "Oops, something went wrong!");
      } else {
        req.flash('success', "Goodbye!");
      }
      res.redirect('/login');
    });
  });

/*
app.get('/logout', (req, res) => {
    req.logout();
    req.flash('success', 'Goodbye for now!');
    res.redirect('/login');
})
*/
const server = app.listen(3000, function(){
    console.log('listening for requests on port 3000,');
});

//static files
app.use(express.static('views'));

// Socket setup & pass server

let io = socket(server);

io.on('connection', function(socket){
    console.log('made socket connection', socket.id)
    //här tas all data från frontend och skickas till ALLA sockets
    //servern säger när jag hör that chatmessage kör jag denna function
    //2
    socket.on('chat', function(data){
        io.sockets.emit('chat', data)
    })
    //här tar vi emot typing infon och broadcastar till alla sockets förutom den som skrev
    socket.on('typing', function(data){
        socket.broadcast.emit('typing', data)

    })
})

//local mongoose plug in har methoden user.register

//för att kolla om någon är inloggad får man automatiskt med 
//isAuthenticate med från passport.