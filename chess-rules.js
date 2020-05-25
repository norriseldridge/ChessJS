const RULES = {
  pawn: (board, current, target) => {
    // pawns must move foward
    const moveDist = current.piece.color === 'white' ? current.row - target.row : target.row - current.row
    if (moveDist <= 0) {
      return false
    }

    // are we going to a square that has a piece on it
    if (target.piece.piece) { // NOTE: we have to check that there is some data here (empty {} is a valid state)
      if (Math.abs(current.column - target.column) === 1) { // we can move diagonal when attacking only
        if (target.piece.piece && moveDist === 1) { // NOTE: we have to check that there is some data here (empty {} is a valid state)
          return true
        }
      }
    } else {
      if (current.column === target.column) { // we can move diagonal when attacking only
        const isFirstMove = () => {
          return (current.piece.color === 'white' && current.row === 6) || (current.piece.color === 'black' && current.row === 1)
        }
        
        if (isFirstMove() && moveDist <= 2) { // if this is this pawn's first move, we can move up to 2 spaces
          return true
        } else {
          if (moveDist === 1) { // otherwise only 1 space
            return true
          }
        }
      }
    }

    return false
  },

  rook: (board, current, target) => {
    // moving within the column
    if (current.column === target.column && current.row !== target.row) {
      const col = current.column
      const high = Math.max(current.row, target.row)
      const low = Math.min(current.row, target.row)
      
      const intersections = []
      for (let row = low; row < high; ++row) {
        if (row !== current.row) {
          if (board[row][col].piece) {
            intersections.push({ row: row, column: col })
          }
        }
      }

      return (intersections.length === 0) || (intersections.length === 1 && target.row === intersections[0].row)
    }

    // moving within the row
    if (current.column !== target.column && current.row === target.row) {
      const row = current.row
      const high = Math.max(current.column, target.column)
      const low = Math.min(current.column, target.column)
      
      const intersections = []
      for (let col = low; col < high; ++col) {
        if (col !== current.column) {
          if (board[row][col].piece) {
            intersections.push({ row: row, column: col })
          }
        }
      }

      return (intersections.length === 0) || (intersections.length === 1 && target.column === intersections[0].column)
    }

    return false
  },

  knight: (board, current, target) => {
    const verticalMoveDist = Math.abs(current.row - target.row)
    const horizontalMoveDist = Math.abs(current.column - target.column)
    return (verticalMoveDist === 2 && horizontalMoveDist === 1) || (verticalMoveDist === 1 && horizontalMoveDist === 2)
  },

  bishop: (board, current, target) => {
    const rowDirection = (target.row - current.row)
    const columnDirection = (target.column - current.column)

    if (Math.abs(rowDirection) === Math.abs(columnDirection)) {
      let currentRow = current.row
      let currentColumn = current.column

      const intersections = []
      while (currentRow !== target.row) {
        currentRow += rowDirection > 0 ? 1 : -1
        currentColumn += columnDirection > 0 ? 1 : -1
        if (board[currentRow][currentColumn].piece) {
          intersections.push({ row: currentRow, column: currentColumn })
        }
      }

      return (intersections.length === 0) || (intersections.length === 1 && intersections[0].row === target.row && intersections[0].column === target.column)
    }
  },

  queen: (board, current, target) => {
    return RULES['rook'](board, current, target) || RULES['bishop'](board, current, target)
  },

  king: (board, current, target) => {
    return Math.abs(current.row - target.row) <= 1 && Math.abs(current.column - target.column) <= 1
  }
}

module.exports = RULES