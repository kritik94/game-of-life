import { atom, map, computed, onMount, listenKeys, action } from 'nanostores'

const GAME_STATE_INIT = "init"
const GAME_STATE_PAUSE = "pause"
const GAME_STATE_PLAY = "play"

function log(...args) {
    if (process.env.NODE_ENV === "production") {
        return
    }
    args.forEach(arg => console.log(arg))
}

function initRandCells(cnt = 100, spread = 25) {
    let res = {}
    for (let i = 0; i < cnt; i++) {
        const x = Math.floor(Math.random() * spread * 2) - spread
        const y = Math.floor(Math.random() * spread * 2) - spread

        res[`${x}:${y}`] = true
    }

    return res
}

let canvasRef, ctx, cells, settings
let unbinds = []
function init(_canvasRef, _ctx, _cells, _settings) {
    log("init")
    canvasRef = _canvasRef || document.getElementById("app")
    ctx = _ctx || canvasRef.getContext("2d")

    cells = _cells || atom(initRandCells(100, 10))
    settings = _settings || map({
        timeout: 100,
        gridSize: 50,
        canvas: {
            x: 0,
            y: 0,
        },
        gameState: GAME_STATE_INIT,
    })
}

function load() {
    unbinds.push(
        onMount(settings, () => {
            const lst = window.addEventListener("resize", resizeCanvas)
            return () => window.removeEventListener("resize", lst)
        })
    )

    const store = computed(
        [settings, cells],
        (settings, cells) => ({settings, cells})
    )
    unbinds.push(
        store.listen(render)
    )

    const play = action(settings, "play", store => {
        log("play")
        if (![GAME_STATE_INIT, GAME_STATE_PAUSE].includes(store.get().gameState)) {
            return
        }

        store.setKey("gameState", GAME_STATE_PLAY)
        const next = () => {
            if (store.get().gameState !== GAME_STATE_PLAY) {
                return
            }

            const newCells = nextGeneration(cells.get())
            cells.set(newCells)

            const lst = setTimeout(next, settings.get().timeout)
            unbinds.push(() => clearTimeout(lst))
        }

        next()
    })

    const pause = action(settings, "pause", store => {
        store.setKey("gameState", GAME_STATE_PAUSE)
    })

    // setTimeout(play, settings.get().timeout)
    play()
}


document.addEventListener("DOMContentLoaded", () => {
    init()
    load()
    resizeCanvas()
})

if (module.hot) {
    module.hot.dispose(data => {
        data.canvasRef = canvasRef
        data.ctx = ctx
        data.cells = cells
        data.settings = settings

        unbinds.forEach(ub => ub())
        unbinds = []
    })

    module.hot.accept(data => {
        init(data.canvasRef, data.ctx, data.cells, data.settings)
        load()
        resizeCanvas()
    })
}


function crdTxy(crd) {
    const [x, y] = crd.split(":").map(str => parseInt(str))
    return {x, y}
}

function xyTcrd(x, y) {
    return `${x}:${y}`
}

function resizeCanvas() {
    canvasRef.width = window.innerWidth
    canvasRef.height = window.innerHeight
    document.body.scrollTop = 0

    settings.setKey("canvas", {
        x: window.innerWidth,
        y: window.innerHeight,
    })
}

function render({settings, cells}) {
    log("render")

    // render grid
    const {gridSize, canvas: {x, y}} = settings

    ctx.clearRect(0, 0, x, y)

    const cellWidth = Math.min(Math.floor(x / gridSize), Math.floor(y / gridSize))
    const paddingLeft = (x - Math.floor(x / cellWidth) * cellWidth) / 2
    const paddingTop = (y - Math.floor(y / cellWidth) * cellWidth) / 2
    const gridX = Math.floor(x / cellWidth) + 2
    const gridY = Math.floor(y / cellWidth) + 2

    for (let lineY = paddingTop; lineY <= y; lineY += cellWidth) {
        ctx.beginPath()
        ctx.moveTo(0, lineY)
        ctx.lineTo(x, lineY)
        ctx.stroke()
    }

    for (let lineX = paddingLeft; lineX <= x; lineX += cellWidth) {
        ctx.beginPath()
        ctx.moveTo(lineX, 0)
        ctx.lineTo(lineX, y)
        ctx.stroke()
    }

    // render cells
    Object.keys(cells).forEach(crd => {
        const {x, y} = crdTxy(crd)
        const cellX = (x + Math.floor(gridX / 2)) * cellWidth + paddingLeft
        const cellY = (y + Math.floor(gridY / 2)) * cellWidth + paddingTop

        ctx.fillRect(cellX, cellY, cellWidth, cellWidth)
    })
}

function nextGeneration(cells) {
    const possibleCells = Object.keys(cells)
        .flatMap(crd => {
            const {x, y} = crdTxy(crd)

            let res = []
            for (let i = x - 1; i <= x + 1; i++) {
                for (let j = y - 1; j <= y + 1; j++) {
                    if (i === x && j === y || cells[xyTcrd(i, j)]) {
                        continue
                    }
                    res.push(xyTcrd(i, j))
                }
            }
            return res
        })
        .reduce((acc, crd) => {
            acc[crd] ||= 0
            acc[crd]++
            return acc
        }, {})

    const newCells = Object.fromEntries(
        Object.entries(possibleCells)
            .filter(([_, cnt]) => cnt === 3)
            .map(([k, _]) => [k, true])
    )

    const survivingCells = Object.keys(cells)
        .filter(crd => {
            const {x, y} = crdTxy(crd)
            let cnt = 0
            for (let i = x - 1; i <= x + 1; i++) {
                for (let j = y - 1; j <= y + 1; j++) {
                    if (i === x && j === y) {
                        continue
                    }
                    if (cells[xyTcrd(i, j)]) {
                        cnt++
                    }

                    if (cnt > 3) {
                        return false
                    }
                }
            }

            return cnt >= 2
        })
        .reduce((acc, crd) => {
            acc[crd] = true
            return acc
        }, {})

    return {...survivingCells, ...newCells}
}

play = play
