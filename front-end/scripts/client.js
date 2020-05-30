const BASE_SERVER_URL = ''
let gameSessionCode = ''
let playerUID = ''
let playerColor = undefined
let actionIndex = 0
const music = new Audio('/audio/Chess.wav')
music.volume = 0.5
const startSound = new Audio('/audio/StartGame.mp3')
const selectSound = new Audio('/audio/Select.mp3')
const moveSound = new Audio('/audio/Move.mp3')
const opponentMove = new Audio('/audio/OpponentMove.mp3')

// "on load" setup
$(() => {
  // the html default loop sucks, this removes the "gap" that happens between plays
  music.addEventListener('timeupdate', (e) => {
    let buffer = .44
    if(music.currentTime > music.duration - buffer) {
      music.currentTime = 0
      music.play()
    }
  })

  $('#music-volume').on('input', OnMusicVolumeChange)
  $('#music-volume').on('change', OnMusicVolumeChange)

  $('#chessboard').on('click', OnChessBoardClick)
  $('#chessboard').on('contextmenu', OnChessBoardClick)

  // did we refresh the window and have a session cookie?
  const cachedSessionCode = getCookie('gameSessionCode')
  const cachedPlayerUID = getCookie('playerUID')
  if (cachedSessionCode) {
    // get the state
    $.ajax({
      crossDomain: true,
      type: 'GET',
      method: 'GET',
      contentType: 'application/json; charset=utf-8',
      url: BASE_SERVER_URL + '/api/chess/' + cachedSessionCode,
      success: (session) => {
        HideWinner()
        gameSessionCode = session.code

        if (session.players.indexOf(cachedPlayerUID) >= 0) {
          playerUID = cachedPlayerUID
        } else {
          console.error('Something went wrong. Please start or join a new game.')
        }
  
        actionIndex = session.state.actionIndex
  
        // show the player's color
        playerColor = session.players.indexOf(playerUID) === 0 ? 'white' : 'black'
        $('#player').empty()
        $('#player')
          .append(`<p>You are: <span>${playerColor}</span></p>`)
  
        // show the session code
        $('#session-code').empty()
        $('#session-code')
          .append(`<p>Session Code: <span>${session.code}</span></p>`)
  
        // Play start sound
        startSound.play()
  
        RenderBoard(session.state.board)

        if (session.state.currentPlayer === playerColor) {
          SetGameState(GAME_STATE_SELECT_PIECE)
        } else {
          SetGameState(GAME_STATE_WAIT_FOR_OPPONENT)
        }
      },
      error: (response) => {
        console.log(response)
      }
    })
  }
})

function OnMusicVolumeChange(e) {
  const newVolume = $(e.target).val() / 100
  music.volume = newVolume

  const newFXVolume = newVolume * 1.1 // 10% louder
  startSound.volume = newFXVolume
  selectSound.volume = newFXVolume
  moveSound.volume = newFXVolume
  opponentMove.volume = newFXVolume
}

function ToggleMusic() {
  $('#music-icon').toggleClass('mute')
  if (music.paused) {
    music.play()
  } else {
    music.pause()
  }
}

function ShowHowTo() {
  $('#how-to').show()
}

function HideHowTo() {
  $('#how-to').hide()
}

function ShowWinner(winner) {
  $('#winner-background').show()

  if (winner === playerColor) {
    $('#winner-text').text(`You won!`)
  } else {
    $('#winner-text').text(`You loss...`)
  }
}

function HideWinner() {
  $('#winner-background').hide()
}

function StartNewGame() {
  // execute my post request to the backend
  $.ajax({
    method: 'POST',
    contentType: 'application/json; charset=utf-8',
    url: BASE_SERVER_URL + '/api/chess/session',
    success: (session) => {
      HideWinner()
      gameSessionCode = session.code
      playerUID = session.players[0]
      setCookie('gameSessionCode', gameSessionCode, 1)
      setCookie('playerUID', playerUID, 1)

      // show the player's color
      playerColor = session.players.indexOf(playerUID) === 0 ? 'white' : 'black'
      $('#player').empty()
      $('#player')
        .append(`<p>You are: <span>${playerColor}</span></p>`)

      // show the session code
      $('#session-code').empty()
      $('#session-code')
        .append(`<p>Session Code: <span>${session.code}</span></p>`)
        .append(`<p class="subtext">Share this code with a friend to play with them online</p>`)

      // Play start sound
      startSound.play()

      RenderBoard(session.state.board)
      DisplayGameState()
    }
  })
}

function ShowJoinGame() {
  $('#join-game-button').hide()
  $('#join-game').show()
}

function JoinGame() {
  // validate input
  const sessionCode = $('#join-session-code').val()
  if (sessionCode.length === 0) {
    alert('You must enter a session code to join a game')
    return
  }

  $.ajax({
    crossDomain: true,
    type: 'GET',
    method: 'GET',
    contentType: 'application/json; charset=utf-8',
    url: BASE_SERVER_URL + '/api/chess/session/' + sessionCode,
    success: (session) => {
      HideWinner()
      gameSessionCode = session.code
      setCookie('gameSessionCode', gameSessionCode, 1)
      setCookie('playerUID', playerUID, 1)

      actionIndex = session.state.actionIndex

      // show the player's color
      playerColor = session.players.indexOf(playerUID) === 0 ? 'white' : 'black'
      $('#player').empty()
      $('#player')
        .append(`<p>You are: <span>${playerColor}</span></p>`)

      // show the session code
      $('#session-code').empty()
      $('#session-code')
        .append(`<p>Session Code: <span>${session.code}</span></p>`)

      // Play start sound
      startSound.play()

      RenderBoard(session.state.board)
      SetGameState(GAME_STATE_WAIT_FOR_OPPONENT)
    },
    error: (response) => {
      console.log(response)
    }
  })
}

function RenderBoard(board) {
  // completely empty the board element
  const chessboard = $('#chessboard')
  chessboard.empty()

  // render the board
  let squareColorIndex = 0
  board.forEach((row) => {
    const rowElement = $('<div class="chessboard-row" />')
      .appendTo(chessboard)
    row.forEach((square) => {
      const squareElement = RenderSquare(square).appendTo(rowElement)

      if (squareColorIndex % 2 === 0) {
        squareElement.addClass('tile-white')
      } else {
        squareElement.addClass('tile-black')
      }
      ++squareColorIndex
    })
    ++squareColorIndex
  })

  chessboard.show()
}

function RenderSquare(squareData) {
  const element = $('<div class="chess-square" />')
    .data('squareData', squareData)

  if (squareData.piece) {
    element
      .addClass(squareData.color)

    $('<div/>')
      .addClass(squareData.piece)
      .addClass('chess-piece')
      .appendTo(element)
  }
  
  return element
}

function OnChessBoardClick(event) {
  event.preventDefault()
  if (event.which === 1) {
    HandleClick_CurrentGameState()
  } else {
    HandleRightClick_CurrentGameState()
  }
}

const GAME_STATE_SELECT_PIECE = 'GAME_STATE_SELECT_PIECE'
const GAME_STATE_SELECT_DESTINATION = 'GAME_STATE_SELECT_DESTINATION'
const GAME_STATE_WAIT_FOR_OPPONENT = 'GAME_STATE_WAIT_FOR_OPPONENT'
let gameState = GAME_STATE_SELECT_PIECE
const gameStateDisplays = {
  GAME_STATE_SELECT_PIECE: 'Select a piece to move',
  GAME_STATE_SELECT_DESTINATION: 'Select a tile to move to',
  GAME_STATE_WAIT_FOR_OPPONENT: 'Waiting for opponent'
}

const onSetGameState = {
  GAME_STATE_SELECT_PIECE: () => { currentSelectedPiece = null }, // on starting the 'select state' we should clear any previous selection
  GAME_STATE_SELECT_DESTINATION: () => {},
  GAME_STATE_WAIT_FOR_OPPONENT: () => {
    const requestData = { 
      playerColor: playerColor, 
      actionIndex: actionIndex 
    }

    $.ajax({
      method: 'GET',
      url: BASE_SERVER_URL + '/api/chess/' + gameSessionCode + '/wait-for-opponent',
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      data: requestData,
      success: (state) => {
        // always check for a winner, update index, and render board
        if (state.winner !== undefined) {
          ShowWinner(state.winner)
        }
        actionIndex = state.actionIndex
        RenderBoard(state.board)

        // if it is now my turn
        if (state.currentPlayer === playerColor) {
          // Play opponent did a move sound
          opponentMove.play()
          SetGameState(GAME_STATE_SELECT_PIECE)
        } else {
          // otherwise, it is still the opponent's turn, let's wait
          SetGameState(GAME_STATE_WAIT_FOR_OPPONENT)
        }
      },
      error: (response) => {
        if (confirm('Your opponent is taking a while. It is possible they have left the match. Do you want to keep waiting?')) {
          onSetGameState[GAME_STATE_WAIT_FOR_OPPONENT]()
        }
      }
    })
  },
}

let currentSelectedPiece = null

function SetGameState(state) {
  gameState = state
  onSetGameState[gameState]()
  DisplayGameState()
  SetAdditionalMessage('')
}

function DisplayGameState() {
  $('#game-state').text(gameStateDisplays[gameState])
}

function SetAdditionalMessage(message) {
  $('#additional-message').text(message)
}

function HandleClick_CurrentGameState() {
  switch (gameState) {
    case GAME_STATE_SELECT_PIECE:
      HandleClick_SelectPiece()
      break

    case GAME_STATE_SELECT_DESTINATION:
      HandleClick_SelectDestination()
      break

    case GAME_STATE_WAIT_FOR_OPPONENT:
      console.log("Waiting for opponent... Can't make any selections or moves yet")
      break
  }
}

function HandleClick_SelectPiece() {
  // get the square we just clicked
  const tileElement = $(event.target)
  const board = tileElement.closest('#chessboard')
  const row = tileElement.closest('.chessboard-row')
  const rowIndex = board.children().index(row)
  const columnIndex = row.children().index(tileElement)
  const selectedSquare = { row: rowIndex, column: columnIndex }

  // get the chess square data
  const pieceData = tileElement.data('squareData')
  
  // simple validation
  if (IsSquareDataAValidSelection(pieceData)) {

    // Play select sound
    selectSound.play()

    console.log(`Selected Piece at: ${selectedSquare.row}, ${selectedSquare.column}. This piece is a ${pieceData.color} ${pieceData.piece}.`)
    currentSelectedPiece = {selectedSquare, pieceData}
    tileElement.toggleClass('selected')
    SetGameState(GAME_STATE_SELECT_DESTINATION)
  } else {
    SetAdditionalMessage('You need to make a valid selection')
  }
}

function IsSquareDataAValidSelection(pieceData) {
  return pieceData.color == playerColor && pieceData.piece
}

function HandleClick_SelectDestination() {
  // get the square we just clicked
  const tileElement = $(event.target)
  const board = tileElement.closest('#chessboard')
  const row = tileElement.closest('.chessboard-row')
  const rowIndex = board.children().index(row)
  const columnIndex = row.children().index(tileElement)
  const targetDestination = { row: rowIndex, column: columnIndex }

  if (currentSelectedPiece.selectedSquare.row === targetDestination.row && currentSelectedPiece.selectedSquare.column === targetDestination.column) {
    UnselectPiece()
    return
  }

  // make a move request to the server
  const requestData = {
    currentSelectedPiece,
    targetDestination,
    playerColor: playerColor,
    actionIndex: actionIndex
  }
  
  $.ajax({
    method: 'POST',
    url: BASE_SERVER_URL + '/api/chess/' + gameSessionCode,
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify(requestData),
    success: (state) => {
      // Play move sound
      moveSound.play()

      if (state.winner !== undefined) {
        ShowWinner(state.winner)
      }

      actionIndex = state.actionIndex

      RenderBoard(state.board)

      // did we just get a pawn to the opposite side?
      CheckPawnReachedOppositeSide(currentSelectedPiece, targetDestination)
      SetGameState(GAME_STATE_WAIT_FOR_OPPONENT)
    },
    error: (error) => {
      console.warn(error.responseText)
      SetAdditionalMessage('You must choose a valid destination')
    }
  })
}

function HandleRightClick_CurrentGameState() {
  switch (gameState) {
    case GAME_STATE_SELECT_PIECE:
    case GAME_STATE_SELECT_DESTINATION:
      UnselectPiece()
      break

    case GAME_STATE_WAIT_FOR_OPPONENT:
      console.log("Waiting for opponent... Can't make any selections or moves yet")
      break
  }
}

function UnselectPiece() {
  if (gameState === GAME_STATE_SELECT_PIECE || gameState === GAME_STATE_SELECT_DESTINATION) {
    currentSelectedPiece = {}
    $('.selected').toggleClass('selected')
    SetGameState(GAME_STATE_SELECT_PIECE)
  }
}

function CheckPawnReachedOppositeSide(currentSelectedPiece, targetDestination) {
  if (currentSelectedPiece.pieceData.piece === 'pawn') {
    const targetRow = currentSelectedPiece.pieceData.color === 'white' ? 0 : 7

    if (targetDestination.row === targetRow) {
      // we just reached the row we need to get a piece!
      ShowPickPiece()
    }
  }

  return false
}

function ShowPickPiece() {
  $('#pick-piece-background').show()
}

function HidePickPiece() {
  $('#pick-piece-background').hide()
}

function PickPiece(piece) {
  HidePickPiece()

  const requestData = { 
    piece: piece,
    playerColor: playerColor
  }

  $.ajax({
    method: 'POST',
    contentType: 'application/json; charset=utf-8',
    url: BASE_SERVER_URL + '/api/chess/' + gameSessionCode + '/pick',
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify(requestData),
    success: (state) => {
      actionIndex = state.actionIndex
      RenderBoard(state.board)
    },
    error: (response) => {
      alert(response.responseText)
    }
  })
}

function setCookie(cname, cvalue, exdays) {
  const d = new Date()
  d.setTime(d.getTime() + (exdays*24*60*60*1000))
  const expires = "expires=" + d.toUTCString()
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/"
}

function getCookie(cname) {
  const name = cname + "="
  const decodedCookie = decodeURIComponent(document.cookie)
  const ca = decodedCookie.split(';')
  for(let i = 0; i <ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1)
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length)
    }
  }
  return ""
}