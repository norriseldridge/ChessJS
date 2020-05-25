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
  playerColor: Joi.string().required()
}

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

    // this is a valid move so let's execute that now
    this.updateBoard(moveData.currentSelectedPiece, moveData.targetDestination)

    // TODO check for "checkmate" update: this.winner

    // update the player
    if (this.currentPlayer === 'white') {
      this.currentPlayer = 'black'
    } else {
      this.currentPlayer = 'white'
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
      console.error(`You can't attack the same color: ${targetPiece.color}`)
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
}

module.exports = Chess