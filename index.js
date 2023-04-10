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
const { isAdmin } = require('./middleware')
const Chatroom = require('./models/chatroom')
const Post = require('./models/post')
const Broadcast = require('./models/broadcast')
const Chat = require('./models/chat')
const Message = require('./models/message')
const methodOverride = require('method-override');
const chat = require('./models/chat');

app.use(express.json())
//const userRoutes = require('./routes/users');

mongoose.connect('mongodb+srv://krifors:LKWsNIAMvoOC5Jeq@duckchat.blafzko.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true })
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
app.use(methodOverride('_method'))
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

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})

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
    console.log(req.user._id)
    req.flash('success', 'welcome back!');
    res.redirect('/ducks/api/channel')
})



//här visas alla chatrooms i en lista
app.get('/ducks/api/channel/',isLoggedIn, async (req, res) => {
    if(isLoggedIn){
    const chatrooms = await Chatroom.find({})
    console.log(chatrooms)
    res.render('start', { chatrooms })
    }else{
        res.redirect('/login')
    }
})



app.post('/ducks/api/channel', async (req, res) => {
    const chatroom = new Chatroom(req.body.chatroom);
    await chatroom.save();
  
    const postCollection = new chatroom.model({
      // add post properties here
      username: String,
      message: String
    });
    await postCollection.save();
  
    res.redirect(`/ducks/api/channel/${chatroom._id}`);
  });

//skapa ett nytt chatroom
app.get('/ducks/api/channel/new', isLoggedIn, (req, res) => {
    if(isLoggedIn){
    res.render('newChatroom')
    }else{
        res.redirect('/login')
    }
})
/*
app.put('/ducks/api/channel/', async (req, res) => {
    try {
      const existingChatroom = await Chatroom.findOne({ name: req.body.name });
      if (existingChatroom) {
        return res.status(409).send('Chatroom with this name already exists.');
      }
  
      const chatroom = new Chatroom({
        name: req.body.name
      });
  
      await chatroom.save();
  
      res.redirect("/ducks/api/channel/new");
    } catch (err) {
      console.error(err);
      return res.status(500).send('Internal server error');
    }
  });
*/
/*
app.put('/ducks/api/channel',async(req, res) => {
    const chatroom = req.body.chatroom;
 res.send(chatroom)
})
*/
app.put('/ducks/api/channel', async (req, res) => {
    try{
        const existingChatroom = await Chatroom.findOne({ name: req.body.chatroom.name});
        if(!existingChatroom){
            const chatroom = new Chatroom(req.body.chatroom);
        await chatroom.save();
        res.redirect(`/ducks/api/channel/${chatroom._id}`);
             
        }else{
            console.log('Chatroom with this name already exists.');
            return res.status(409).send('Chatroom with this name already exists.');
        }
    }catch(err){
        console.error(err);
        return res.status(500).send('Internal server error');
    }
    
})

/*
//denna måste göras om till PUT!!!
app.post('/ducks/api/channel', async (req, res) => {
    const chatroom = new Chatroom(req.body.chatroom);
    
    await chatroom.save()
    res.redirect(`/ducks/api/channel/${chatroom._id}`)
})
*/



//här visas ett specifikt val av chatroom
app.get('/ducks/api/channel/:id', async (req, res) => {
    const broadcasts = await Broadcast.find({})
    const chatroom = await Chatroom.findById(req.params.id);
    const posts = await Post.find({_id: chatroom.posts})
    res.render('showChat', { chatroom, posts, broadcasts });
})


/*
app.post('/ducks/api/channel/:id', async (req, res) => {
    const chatroomId = req.params.id;
    //res.send(chatroomId)
    const desiredChatroom = await Chatroom.findById(chatroomId)
    const desiredChatroomId = desiredChatroom._id;
    //res.send(desiredChatroomId)
    if(chatroomId == desiredChatroomId || desiredChatroom == (`${chatroom_}${desiredChatroom}`)){
        const newPost = req.body;
        const post = await Post.create(newPost);
        //const chatroom = await Chatroom.findById(chatroomId);
        desiredChatroom.posts.push(post._id);
        await desiredChatroom.save();
        res.redirect(`/ducks/api/channel/${desiredChatroom._id}`);
    }
    else{
        res.status(500).send('Error creating new post');
    }
});
*/



app.post('/ducks/api/channel/:id', async (req, res) => {
    const chatroomId = req.params.id;
    const newPost = req.body;
    try {
      const post = await Post.create(newPost);
      const chatroom = await Chatroom.findById(chatroomId);
      console.log(chatroomId); // check chatroomId value
      console.log(chatroom.posts); // check chatroom.posts value
      chatroom.posts.push(post._id);
      await chatroom.save();
      res.redirect(`/ducks/api/channel/${chatroom._id}`);
    } catch (error) {
      console.error(error);
      res.status(500).send('Error creating new post');
    }
  });
  
  app.delete('/ducks/api/channel/:id', isAdmin, async (req, res) => {
    if(isAdmin){
    const { id } = req.params;
    await Chatroom.findByIdAndDelete(id);
    res.redirect('/ducks/api/channel');
    }else{
        
        
        
    }
})




/*
app.put('/ducks/api/channel/:id', async(req, res) => {
    const { id } = req.params;
    const newPost = req.body;
    //res.send(newPost)
    
    const chatroom = await Chatroom.findByIdAndUpdate(id,{...req.body})
    
    
    res.redirect(`/ducks/api/channel/${chatroom._id}`)

})
*/
/*
app.post('/ducks/api/channel', async (req, res) => {
    const chatroom = new Chatroom(req.body.chatroom)
    await chatroom.save()
    res.redirect(`/ducks/api/channel${chatroom._id}`)
})*/
/*
app.get('/chat', isLoggedIn,async (req, res) => {
if(!isLoggedIn){
    req.flash('error', 'you have to login!')
    res.redirect('/login');
}
    
    res.render('chat', { messages: req.flash('success')})
})
*/
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

//teeesting!

app.get('/ducks/api/broadcast', isAdmin, async (req, res)=> {
    if(isAdmin){
    const broadcasts = await Broadcast.find({})
    console.log(broadcasts)
    res.render('broadcast', { broadcasts })
    }

})

app.post('/ducks/api/broadcast', isAdmin, async (req, res) => {
    const newPost = req.body;
    const post = await Post.create(newPost)
    const broadcast = await Broadcast.create(newPost)
    broadcast.posts.push(post._id)
    await broadcast.save();
    res.redirect('/ducks/api/broadcast')
    //res.send(newPost)
    /*
    try{
    const post = await Post.create(newPost);    
    const broadcast = await Broadcast.findOne(req.body.broadcast);
    broadcast.posts.push(newPost)
    await broadcast.save();
    res.redirect('/ducks/api/broadcast')
    } catch (error) {
        console.error(error);
        res.status(500).send('Error creating new post');
      }
      */
})




const server = app.listen(3000, function(){
    console.log('listening for requests on port 3000,');
});

//static files
app.use(express.static('views'));

// Socket setup & pass server

let io = socket(server);


io.on('connection', function(socket){
    console.log('made socket connection', socket.id);
    Chat.find({}, function(err, messages) {
      if (err) {
        console.error(err);
        return;
      }
      socket.emit('allMessages', messages);
    });

    //här tas all data från frontend och skickas till ALLA sockets
    //servern säger när jag hör that chatmessage kör jag denna function
    //2
    socket.on('chat', function(data){
        io.sockets.emit('chat', data);
        const chat = new Chat({
            handle: data.handle,
            message: data.message
          });
          chat.save((err) => {
            if (err) {
              console.error(err);
            }
        });
    })
    //här tar vi emot typing infon och broadcastar till alla sockets förutom den som skrev
    socket.on('typing', function(data){
        socket.broadcast.emit('typing', data)

    })
})
 


//local mongoose plug in har methoden user.register

//för att kolla om någon är inloggad får man automatiskt med 
//isAuthenticate med från passport.

//LKWsNIAMvoOC5Jeq password for db mongo