const Joi = require('joi')
const moveRequestSchema = {
  currentSelectedPiece: Joi.object().keys({
    pieceData: {
      color: Joi.string().required(),
      piece: Joi.string().required()
    },
    selectedSquare: {
      row: Joi.number().min(0).max(7).required(),
      column: Joi.number().min(0).max(7).required()
    }
  }).required(),
  targetDestination: Joi.object().keys({
    row: Joi.number().min(0).max(7).required(),
    column: Joi.number().min(0).max(7).required()
  }).required(),
  playerColor: Joi.string().required(),
  actionIndex: Joi.number().min(0).required()
}

const pickRequestSchema = {
  piece: Joi.string().required(),
  playerColor: Joi.string().required()
}

const VALID_PICK_PIECES = ['queen', 'bishop', 'knight', 'rook']

const CHESS_RULES = require('./chess-rules')

const WHITE_ROOK = { color: 'white', piece: 'rook' }
const WHITE_KNIGHT = { color: 'white', piece: 'knight' }
const WHITE_BISHOP = { color: 'white', piece: 'bishop' }
const WHITE_QUEEN = { color: 'white', piece: 'queen' }
const WHITE_KING = { color: 'white', piece: 'king' }
const WHITE_PAWN = { color: 'white', piece: 'pawn' }

const BLACK_ROOK = { color: 'black', piece: 'rook' }
const BLACK_KNIGHT = { color: 'black', piece: 'knight' }
const BLACK_BISHOP = { color: 'black', piece: 'bishop' }
const BLACK_QUEEN = { color: 'black', piece: 'queen' }
const BLACK_KING = { color: 'black', piece: 'king' }
const BLACK_PAWN = { color: 'black', piece: 'pawn' }

const EMPTY = { }

class Chess {
  constructor() {
    this.board = [
      [BLACK_ROOK, BLACK_KNIGHT, BLACK_BISHOP, BLACK_QUEEN, BLACK_KING, BLACK_BISHOP, BLACK_KNIGHT, BLACK_ROOK],
      [BLACK_PAWN, BLACK_PAWN, BLACK_PAWN, BLACK_PAWN, BLACK_PAWN, BLACK_PAWN, BLACK_PAWN, BLACK_PAWN],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [WHITE_PAWN, WHITE_PAWN, WHITE_PAWN, WHITE_PAWN, WHITE_PAWN, WHITE_PAWN, WHITE_PAWN, WHITE_PAWN],
      [WHITE_ROOK, WHITE_KNIGHT, WHITE_BISHOP, WHITE_QUEEN, WHITE_KING, WHITE_BISHOP, WHITE_KNIGHT, WHITE_ROOK]
    ]
    this.currentPlayer = 'white'
    this.winner = undefined // there is no winner to start
    this.kings = {
      white: {
        column: 4,
        row: 7
      },
      black: {
        column: 4,
        row: 0
      }
    },
    this.actionIndex = 0
  }

  validateMove(moveData) {
    // validate that the data received is the full data we need
    const { error } = Joi.validate(moveData, moveRequestSchema)
    if (error) {
      console.error(error)
      return false
    }

    // is it this player's turn
    if (moveData.playerColor !== this.currentPlayer) {
      return false
    }

    // check that the piece in the request is what we currently have on the session board
    if (!this.validateClientPiece(moveData.currentSelectedPiece)) {
      return false
    }

    // check that this piece can move to this target
    if (!this.validPieceDestination(moveData.currentSelectedPiece, moveData.targetDestination)) {
      return false
    }

    // cache the state of the board
    const preUpdateKings = Object.assign({}, this.kings)
    const preUpdateState = []
    this.board.forEach((col) => { preUpdateState.push(col.slice()) })

    // this is a valid move so let's execute that now
    this.updateBoard(moveData.currentSelectedPiece, moveData.targetDestination)

    // update the cached kings' locations
    this.updateKingLocations(moveData.currentSelectedPiece, moveData.targetDestination)

    // make sure I'm not putting my king into check
    if (this.kingIsInCheck(moveData.playerColor, this.kings[moveData.playerColor]).length > 0) {
      // put us back how we were before, fail
      this.kings = preUpdateKings
      this.board = preUpdateState
      return false
    }

    // check for "checkmate"
    if (this.checkForWinner(moveData.currentSelectedPiece)) {
      this.winner = this.currentPlayer
    }

    // update the action index
    this.actionIndex++

    // did a pawn make it to the other side?
    if (!this.checkIsPawnOnOppositeSide(this.currentPlayer)) {
      // only update the player if we've ended our turn
      // if a pawn is on the other side, we need to pick a piece to bring in
      this.updateCurrentPlayer()
    }

    return true
  }

  validateClientPiece(selectedPiece) {
    const selectedSquare = this.board[selectedPiece.selectedSquare.row][selectedPiece.selectedSquare.column]
    return selectedSquare.color === selectedPiece.pieceData.color && selectedSquare.piece === selectedPiece.pieceData.piece
  }

  validPieceDestination(selectedPiece, targetDestination) {
    const piece = this.board[selectedPiece.selectedSquare.row][selectedPiece.selectedSquare.column]
    const targetPiece = this.board[targetDestination.row][targetDestination.column] // NOTE: this can be an empty object

    // you can't "attack" same color pieces
    if (targetPiece.color === piece.color) { // NOTE: targetPiece might be an empty object, this is fine and valid
      return false
    }

    // is this move valid?
    if (!CHESS_RULES[piece.piece](
      this.board,
      { piece: piece, row: selectedPiece.selectedSquare.row, column: selectedPiece.selectedSquare.column },
      { piece: targetPiece, row: targetDestination.row, column: targetDestination.column })) {
      return false
    }

    return true
  }

  updateBoard(selectedPiece, targetDestination) {
    // get the current selected piece
    const piece = this.board[selectedPiece.selectedSquare.row][selectedPiece.selectedSquare.column]
    // set the target to this piece
    this.board[targetDestination.row][targetDestination.column] = piece
    // set the old location to empty
    this.board[selectedPiece.selectedSquare.row][selectedPiece.selectedSquare.column] = EMPTY
  }

  updateKingLocations(selectedPiece, targetDestination) {
    if (selectedPiece.pieceData.piece === 'king') {
      this.kings[selectedPiece.pieceData.color] = targetDestination
    }
  }

  checkForWinner(selectedPiece) {
    // is the opposing team's king in checkmate?
    const opposingColor = selectedPiece.pieceData.color === 'white' ? 'black' : 'white'
    const checkingPieces = this.kingIsInCheck(opposingColor, this.kings[opposingColor])
    if (checkingPieces.length > 0) {
      // can this king move anywhere to get out of check?
      for (let moveRow = -1; moveRow <= 1; ++moveRow) {
        for (let moveCol = -1; moveCol <= 1; ++moveCol) {
          const escapeSqare = this.kings[opposingColor]
          escapeSqare.column += moveCol
          escapeSqare.row += moveRow

          // if this is a valid board location
          if (escapeSqare.column >= 0 && escapeSqare.column < 8 && escapeSqare.row >= 0 && escapeSqare.row < 8) {
            if (this.board[escapeSqare.row][escapeSqare.column].color !== opposingColor && this.kingIsInCheck(opposingColor, escapeSqare).length === 0) {
              return false // the king can move and escape so not checkmate
            }
          }
        }
      }

      // one of the "checking pieces" can be killed
      if (checkingPieces.some((checkingPiece) => { return this.anyOfColorReach(selectedPiece.pieceData.color, checkingPiece.selectedSquare).length > 0 })) {
        return false
      }

      const canTeammateIntersect = () => {
        // look at every "checking piece", determine the potentially block tiles
        const inBetweenTiles = []
        checkingPieces.forEach((checkingPiece) => {
          let colDiff = checkingPiece.selectedSquare.column - this.kings[opposingColor].column
          let rowDiff = checkingPiece.selectedSquare.row - this.kings[opposingColor].row
          while (colDiff !== 0 && rowDiff !== 0) {
            if (colDiff < 0) {
              colDiff++
            } else {
              colDiff--
            }

            if (rowDiff < 0) {
              rowDiff++
            } else {
              rowDiff--
            }

            inBetweenTiles.push({ column: checkingPiece.selectedSquare.column - colDiff, row: checkingPiece.selectedSquare.row - rowDiff })
          }
        })

        // for every tile in between the checking piece and king, can a teammate move there and stop a check
        return inBetweenTiles.some((inBetweenTile) => {
          const canIntersect = this.anyOfColorReach(opposingColor, inBetweenTile).filter((intersectPice) => { return intersectPice.pieceData.piece !== 'king' })
          return canIntersect.length > 0
        })
      }

      if (canTeammateIntersect()) {
        return false
      }
      
      return true
    }
  }

  kingIsInCheck(kingColor, kingLocation) {
    const opposingColor = kingColor === 'white' ? 'black' : 'white'
    return this.anyOfColorReach(opposingColor, kingLocation)
  }

  anyOfColorReach(color, targetDestination) {
    // check every piece of color
    const pieces = []
    for (let row = 0; row < 8; ++row) {
      for (let col = 0; col < 8; ++col) {
        const piece = this.board[row][col]
        if (piece.color === color && piece.piece) {
          const currentSelectedPiece = {
            pieceData: piece,
            selectedSquare: { column: col, row: row }
          }

          if (this.validPieceDestination(currentSelectedPiece, targetDestination)) {
            pieces.push(currentSelectedPiece)
          }
        }
      }
    }

    return pieces
  }

  checkIsPawnOnOppositeSide(color) {
    const targetRow = color === 'white' ? 0 : 7
    return this.board[targetRow].find((boardPiece) => { return boardPiece.piece === 'pawn' && boardPiece.color === color })
  }

  validatePiecePick(pickData) {
    if (!Joi.validate(pickData, pickRequestSchema)) {
      return false
    }

    // is there a pawn in the target row
    const targetRow = pickData.playerColor === 'white' ? 0 : 7
    const targetPiece = this.board[targetRow].find((boardPiece) => { return boardPiece.piece === 'pawn' && boardPiece.color === pickData.playerColor })
    if (!targetPiece) {
      return false
    }

    const targetColumn = this.board[targetRow].indexOf(targetPiece)

    if (VALID_PICK_PIECES.indexOf(pickData.piece) < 0) {
      return false // client sent invalid piece
    }

    // valid request, let's update the board
    this.board[targetRow][targetColumn] = { color: pickData.playerColor, piece: pickData.piece }

    // update the action index
    this.actionIndex++

    // this now ended our turn, next player
    this.updateCurrentPlayer()
    return true
  }

  updateCurrentPlayer() {
    if (this.currentPlayer === 'white') {
      this.currentPlayer = 'black'
    } else {
      this.currentPlayer = 'white'
    }
  }
}

module.exports = Chess