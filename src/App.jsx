import './App.css'
import { useEffect, useState } from 'react'

const BOARD_ROWS = 9
const BOARD_COLUMNS = 8
const BOARD_TILE_COUNT = BOARD_ROWS * BOARD_COLUMNS
const TRAY_LIMIT = 5
const TARGET_SCORE = 21
const TIMER_LIMIT = 100

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function createBoardTiles(round) {
  return Array.from({ length: BOARD_TILE_COUNT }, (_, index) => ({
    id: `${round}-${index}`,
    value: randomInt(1, 13),
    row: Math.floor(index / BOARD_COLUMNS),
    column: index % BOARD_COLUMNS,
  }))
}

function createInitialState() {
  return {
    round: 1,
    boardTiles: createBoardTiles(1),
    tray: [],
    monsterTimer: 0,
    lastAction:
      'Build toward 21. The timer reaches game over at 100%.',
    gameOver: false,
    outcome: null,
  }
}

function scoreTray(tray) {
  return tray.reduce((total, tile) => total + tile.value, 0)
}

function isTileFree(tile, boardTiles) {
  const hasLeftNeighbor = boardTiles.some(
    (entry) => entry.row === tile.row && entry.column === tile.column - 1,
  )
  const hasRightNeighbor = boardTiles.some(
    (entry) => entry.row === tile.row && entry.column === tile.column + 1,
  )
  const hasTopNeighbor = boardTiles.some(
    (entry) => entry.row === tile.row - 1 && entry.column === tile.column,
  )
  const hasBottomNeighbor = boardTiles.some(
    (entry) => entry.row === tile.row + 1 && entry.column === tile.column,
  )

  return !hasLeftNeighbor || !hasRightNeighbor || !hasTopNeighbor || !hasBottomNeighbor
}

function App() {
  const [game, setGame] = useState(createInitialState)

  const trayScore = scoreTray(game.tray)

  useEffect(() => {
    if (game.gameOver) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setGame((current) => {
        if (current.gameOver) {
          return current
        }

        const nextTimer = clamp(current.monsterTimer + 2, 0, TIMER_LIMIT)

        if (nextTimer >= TIMER_LIMIT) {
          return {
            ...current,
            monsterTimer: nextTimer,
            lastAction: 'The timer reached 100%.',
            gameOver: true,
            outcome: 'lose',
          }
        }

        return {
          ...current,
          monsterTimer: nextTimer,
        }
      })
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [game.gameOver])

  function selectTile(tileId) {
    setGame((current) => {
      if (current.gameOver || current.tray.length >= TRAY_LIMIT) {
        return current
      }

      const tile = current.boardTiles.find((entry) => entry.id === tileId)

      if (!tile || !isTileFree(tile, current.boardTiles)) {
        return current
      }

      const nextBoardTiles = current.boardTiles.filter((entry) => entry.id !== tileId)
      const boardCleared = nextBoardTiles.length === 0

      return {
        ...current,
        tray: [...current.tray, tile],
        boardTiles: nextBoardTiles,
        lastAction: boardCleared
          ? `Tile ${tile.value} moved into the tray. You cleared the board.`
          : `Tile ${tile.value} moved into the tray.`,
        gameOver: boardCleared,
        outcome: boardCleared ? 'win' : current.outcome,
      }
    })
  }

  function submitTray() {
    setGame((current) => {
      if (current.gameOver || current.tray.length === 0) {
        return current
      }

      const total = scoreTray(current.tray)
      const trayMultiplier = current.tray.length / TRAY_LIMIT
      let monsterTimer = current.monsterTimer
      let lastAction = ''

      if (total > TARGET_SCORE) {
        const increase = 10 * trayMultiplier
        monsterTimer = clamp(monsterTimer + increase, 0, TIMER_LIMIT)
        lastAction = `Bust at ${total}. The timer jumps forward by ${increase.toFixed(1)}%.`
      } else if (total === TARGET_SCORE) {
        const reduction = 10 * trayMultiplier
        monsterTimer = clamp(monsterTimer - reduction, 0, TIMER_LIMIT)
        lastAction = `Blackjack at ${total}. The timer drops by ${reduction.toFixed(1)}%.`
      } else {
        const reduction = ((total / TARGET_SCORE) * 10) * trayMultiplier
        monsterTimer = clamp(monsterTimer - reduction, 0, TIMER_LIMIT)
        lastAction = `${total} lowers the timer by ${reduction.toFixed(1)}%.`
      }

      const boardCleared = current.boardTiles.length === 0
      const gameOver = monsterTimer >= TIMER_LIMIT || boardCleared

      return {
        round: current.round,
        boardTiles: current.boardTiles,
        tray: [],
        monsterTimer,
        lastAction: gameOver
          ? monsterTimer >= TIMER_LIMIT
            ? `${lastAction} The timer reached 100%.`
            : `${lastAction} You cleared the board.`
          : lastAction,
        gameOver,
        outcome: monsterTimer >= TIMER_LIMIT ? 'lose' : boardCleared ? 'win' : current.outcome,
      }
    })
  }

  function restartGame() {
    setGame(createInitialState())
  }

  return (
    <main className="game-shell">
      <section className="monster-panel">
        <div className="hud-title">
          <p className="eyebrow">Blackjack Tiles</p>
        </div>

        <div className="monster-card">
          <div className="health-group">
            <div className="health-row">
              <span>Timer</span>
              <strong>{Math.round(game.monsterTimer)}%</strong>
            </div>
            <div className="health-bar">
              <span
                style={{
                  width: `${game.monsterTimer}%`,
                }}
              />
            </div>
          </div>
          <button className="restart-button" type="button" onClick={restartGame}>
            Reset
          </button>
        </div>
      </section>

      <section className="tray-panel">
        <div className="tray-head">
          <p className="label">Tray</p>
          <div className={`score-pill ${trayScore > 21 ? 'danger' : ''}`}>
            {trayScore}
          </div>
        </div>

        <div className="tray-row">
          <div className="tray-slots">
            {Array.from({ length: TRAY_LIMIT }).map((_, index) => {
              const tile = game.tray[index]

              return tile ? (
                <div
                  key={tile.id}
                  className={`tile tile--tray tray-tile tile-tone-${tile.value % 5}`}
                >
                  <span className="tile-value">{tile.value}</span>
                </div>
              ) : (
                <div key={`slot-${index}`} className="tray-slot" />
              )
            })}
          </div>

          <button
            className="submit-button"
            disabled={game.tray.length === 0 || game.gameOver}
            type="button"
            onClick={submitTray}
          >
            Submit
          </button>
        </div>
      </section>

      <section className="board-panel">
        <div className="board">
          <div className="board-grid">
            {Array.from({ length: BOARD_TILE_COUNT }).map((_, index) => {
              const row = Math.floor(index / BOARD_COLUMNS)
              const column = index % BOARD_COLUMNS
              const tile = game.boardTiles.find(
                (entry) => entry.row === row && entry.column === column,
              )

              if (!tile) {
                return <div key={`cell-${row}-${column}`} className="board-cell" />
              }

              const free = isTileFree(tile, game.boardTiles)

              return (
                <div key={tile.id} className="board-cell">
                  <button
                    className={`tile tile-tone-${tile.value % 5} ${free ? '' : 'blocked'}`}
                    disabled={!free || game.gameOver || game.tray.length >= TRAY_LIMIT}
                    type="button"
                    onClick={() => selectTile(tile.id)}
                  >
                    {free ? <span className="tile-value">{tile.value}</span> : null}
                  </button>
                </div>
              )
            })}
          </div>

          {game.gameOver ? (
            <div className="overlay">
              <h3>{game.outcome === 'win' ? 'You Win' : 'Game Over'}</h3>
              <p>
                {game.outcome === 'win'
                  ? 'You cleared every tile on the board.'
                  : 'The timer reached 100%.'}
              </p>
              <button className="overlay-button" type="button" onClick={restartGame}>
                Restart
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}

export default App
