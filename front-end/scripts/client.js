const BASE_SERVER_URL = ''
let gameSessionId = 0
let playerColor = undefined

// "on load" setup
$(() => {
  $('#chessboard').on('click', OnChessBoardClick)
  $('#chessboard').on('contextmenu', OnChessBoardClick)
})

function StartNewGame() {
  // execute my post request to the backend
  $.ajax({
    method: 'POST',
    contentType: 'application/json; charset=utf-8',
    url: BASE_SERVER_URL + '/api/chess/session',
    success: (session) => {
      gameSessionId = session.id

      // show the player's color
      playerColor = session.players.length === 1 ? 'white' : 'black'
      $('#player').empty()
      $('#player')
        .append(`<p>You are: <span>${playerColor}</span></p>`)

      // show the session code
      $('#session-code').empty()
      $('#session-code')
        .append(`<p>Session Code: <span>${session.code}</span></p>`)
        .append(`<p class="subtext">Share this code with a friend to play with them online</p>`)

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

  // attempt to join with session code
  $.ajax({
    crossDomain: true,
    type: 'GET',
    method: 'GET',
    contentType: 'application/json; charset=utf-8',
    url: BASE_SERVER_URL + '/api/chess/session/' + sessionCode,
    success: (session) => {
      gameSessionId = session.id

      // show the player's color
      playerColor = session.players.length === 1 ? 'white' : 'black'
      $('#player').empty()
      $('#player')
        .append(`<p>You are: <span>${playerColor}</span></p>`)

      // show the session code
      $('#session-code').empty()
      $('#session-code')
        .append(`<p>Session Code: <span>${session.code}</span></p>`)

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
    $.ajax({
      method: 'GET',
      url: BASE_SERVER_URL + '/api/chess/' + gameSessionId + '/wait-for-opponent',
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      data: { playerColor: playerColor },
      success: (state) => {
        RenderBoard(state.board)
        SetGameState(GAME_STATE_SELECT_PIECE)
      },
      error: (response) => {
        alert(response.responseText)
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

  // make a move request to the server
  const requestData = {
    currentSelectedPiece,
    targetDestination,
    playerColor: playerColor
  }
  
  $.ajax({
    method: 'POST',
    url: BASE_SERVER_URL + '/api/chess/' + gameSessionId,
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
    data: JSON.stringify(requestData),
    success: (state) => {
      RenderBoard(state.board)
      SetGameState(GAME_STATE_WAIT_FOR_OPPONENT)
    },
    error: (error) => {
      console.warn(error.responseText)
      SetAdditionalMessage('You must choose a valid destination')
    }
  })
}

function HandleRightClick_CurrentGameState() {
  console.log('right click!')
  switch (gameState) {
    case GAME_STATE_SELECT_PIECE:
    case GAME_STATE_SELECT_DESTINATION:
      currentSelectedPiece = {}
      $('.selected').toggleClass('selected')
      SetGameState(GAME_STATE_SELECT_PIECE)
      break

    case GAME_STATE_WAIT_FOR_OPPONENT:
      console.log("Waiting for opponent... Can't make any selections or moves yet")
      break
  }
}