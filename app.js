const path =require('path')
const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors({ origin: '*' }))

app.use(express.json())
app.use(express.static('front-end'))
app.use('/images', express.static(__dirname + '/front-end/images'))
app.use('/css', express.static(__dirname + '/front-end/css'))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'front-end/index.html'))
})

// add our chess controller
require('./chess-controller')(app)

const port = process.env.PORT || 4000
app.listen(port, () => { console.log(`Listening on port ${port}`) })