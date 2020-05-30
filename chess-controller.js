const sessions = {}
const Chess = require('./chess')

module.exports = (app) => {
  app.post('/api/chess/session', (req, res) => {
    let sessionCode = Date.now().toString(36)
    sessionCode = sessionCode.substring(sessionCode.length - 4)
    // create a new session
    const session = {
      state: new Chess(),
      code: sessionCode,
      players: []
    }

    // add a unique player id
    let playerUID = Date.now().toString(36)
    playerUID = playerUID.substring(playerUID.length - 8)
    session.players.push(playerUID)

    sessions[sessionCode] = session
    res.send(session)
  })

  app.get('/api/chess/session/:sessionCode', (req, res) => {
    const session = sessions[req.params.sessionCode]
    if (!session) {
      return res.status(404).send('Could not find a session with the provided session code.')
    }

    if (session.players.length <= 1) {
      // add a unique player id
      let playerUID = Date.now().toString(36)
      playerUID = playerUID.substring(playerUID.length - 8)
      session.players.push(playerUID)
    } else {
      return res.status(400).send('You cannot join this session, 2 players are already here.')
    }

    res.send(session)
  })

  app.get('/api/chess/:sessionCode', (req, res) => {
    const session = sessions[req.params.sessionCode]
    if (!session) {
      return res.status(404).send('Could not find a session with the provided id.')
    }

    res.send(session)
  })

  app.post('/api/chess/:sessionCode', (req, res) => {
    const session = sessions[req.params.sessionCode]
    if (!session) {
      return res.status(404).send('Could not find a session with the provided id.')
    }

    if (!session.state.validateMove(req.body)) {
      return res.status(400).send('This is not a valid move!')
    }

    res.send(session.state)
  })

  app.get('/api/chess/:sessionCode/wait-for-opponent', (req, res) => {
    const session = sessions[req.params.sessionCode]
    if (!session) {
      return res.status(404).send('Could not find a session with the provided id.')
    }

    let waitInterval = undefined
    let waitCount = 0
    new Promise((resolve, reject) => {
      waitInterval = setInterval(() => {
        // while the action index is the same as what we have, keep waiting
        if (session.state.actionIndex !== parseInt(req.query.actionIndex)) {
          resolve()
        }

        waitCount++
        if (waitCount > 60) {
          reject()
        }
      }, 1000)
    }).then(() => {
      clearInterval(waitInterval)
      res.send(session.state)
    }).catch(() => {
      res.status(408).send('Your opponent still has not made a move, it is possible they have left the match')
    })
  })

  app.post('/api/chess/:sessionCode/pick', (req, res) => {
    const session = sessions[req.params.sessionCode]
    if (!session) {
      return res.status(404).send('Could not find a session with the provided id.')
    }

    if (!session.state.validatePiecePick(req.body)) {
      return res.status(400).send('This is not a valid pick!')
    }

    res.send(session.state)
  })
}