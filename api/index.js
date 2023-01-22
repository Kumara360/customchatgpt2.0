const { Configuration, OpenAIApi } = require("openai");

//const dotenv = require('dotenv')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

require('dotenv').config()

// mongodb
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL, () => console.log('Database is successfully connected.'))

// Chat schema
const Chat = require('./models/Chat')

// create a simple express api that calls the function above
const app = express()
const PORT = 3080 // server port - 3000 is typically used for react

// use body parser and cors
app.use(bodyParser.json())
app.use(cors())

const configuration = new Configuration({
    organization: process.env.OPENAI_ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// whenever you send a message
app.post('/', async (req, res) => {
    const { message, users, currentModel } = req.body;
    console.log("message: ", message)
    console.log("users: ", users)
    console.log("current model: ", currentModel)
    const response = await openai.createCompletion({
        model: `${currentModel}`, // "text-davinci-003",
        prompt: `${message}`,
        max_tokens: 100,
        temperature: 0.5,
    });
    res.json({
        message: response.data.choices[0].text,
    })

    // Pass messages and currentModel to MongoDB
    let messageToDatabase = message.split("\n")
    let userToDatabase = users.split("\n")
    let combinedArray = messageToDatabase.map((elem, index) => userToDatabase[index] + ": " + elem)

    // 1. CREATE ID
    // 2. IF ARRAY WITH ID EXISTS THEN UPDATE THAT ARRAY WITH APPROPRIATE CHATS AND MODEL (IF CHANGED)

    try {
        const chat = await Chat.create({ messages: combinedArray, model: currentModel })
        return res.status(201).json(chat)
    } catch (error) {
        console.log("ERROR: ", error.message)
        //return res.status(500).json(error.message)
    }
})

app.get('/models', async (req, res) => {
    const response = await openai.listEngines();
    console.log("response data: ", response.data.data)
    res.json({
        models: response.data.data
    })
});

app.listen(PORT, () => {
    console.log(`App is listening at http://localhost:${PORT}`)
})
